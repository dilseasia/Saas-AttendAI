import os
import sys
import time
import queue
import threading
import asyncio
import logging
from datetime import datetime
from typing import Dict

import cv2
import asyncpg

# Ensure the backend directory is in the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import get_settings
from app.services.camera_engine import MultiTenantCameraEngine, create_rtsp_connection
from app.services.frame_store import set_frame, remove_frame

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler(), logging.FileHandler("worker.log")],
)
logger = logging.getLogger("worker")

settings = get_settings()
engine = MultiTenantCameraEngine()

# Shared frame queue: camera threads push frames -> processor consumes frames
frame_queue = queue.Queue(maxsize=30)
camera_threads: Dict[int, "CameraReaderThread"] = {}



class CameraReaderThread(threading.Thread):
    """
    Dedicated thread per active camera.
    Reads RTSP frames continuously, throttles to ~2 FPS, and pushes to shared queue.
    """

    def __init__(self, camera_id: int, tenant_id: str, camera_type: str, stream_url: str):
        super().__init__(daemon=True, name=f"CamThread-{camera_id}")
        self.camera_id = camera_id
        self.tenant_id = tenant_id
        self.camera_type = camera_type
        self.stream_url = stream_url
        self.cap = None
        self.running = True

    def run(self):
        logger.info("🎥 [CamThread #%d] Starting RTSP reader for tenant %s...", self.camera_id, self.tenant_id)
        last_frame_time = 0.0
        frame_interval = 0.5  # 2 FPS per camera

        while self.running:
            if self.cap is None or not self.cap.isOpened():
                self.cap = create_rtsp_connection(self.stream_url)
                if self.cap is None:
                    logger.warning("⚠️ [CamThread #%d] Connection failed. Retrying in 5s...", self.camera_id)
                    time.sleep(5)
                    continue

            ret, frame = self.cap.read()
            now_time = time.time()

            # TEMP diagnostic: capture one original-resolution frame from camera 49.
            if ret and frame is not None and self.camera_id == 49:
                capture_path = "/tmp/camera49_original.jpg"
                if not os.path.exists(capture_path):
                    if cv2.imwrite(capture_path, frame):
                        logger.info("Diagnostic original frame saved: %s shape=%s", capture_path, frame.shape)

            if not ret or frame is None:
                logger.warning("⚠️ [CamThread #%d] Frame read failed. Reconnecting...", self.camera_id)
                if self.cap:
                    self.cap.release()
                self.cap = None
                time.sleep(2)
                continue

            if now_time - last_frame_time < frame_interval:
                continue
            last_frame_time = now_time

            # Keep a small JPEG preview of the latest frame.
            # This uses the SAME RTSP frame already captured by this worker.
            try:
                preview = cv2.resize(frame, (854, 480))
                ok, buffer = cv2.imencode(
                    ".jpg",
                    preview,
                    [int(cv2.IMWRITE_JPEG_QUALITY), 70],
                )
                if ok:
                    set_frame(self.camera_id, buffer.tobytes())
            except Exception as exc:
                logger.debug(
                    "Preview frame encode failed for camera #%d: %s",
                    self.camera_id,
                    exc,
                )

            item = {
                "camera_id": self.camera_id,
                "tenant_id": self.tenant_id,
                "camera_type": self.camera_type,
                "frame": frame,
                "now": datetime.now(),
            }

            try:
                frame_queue.put_nowait(item)
            except queue.Full:
                pass  # Drop frame if queue is full to avoid backlog lag

        if self.cap:
            self.cap.release()
        remove_frame(self.camera_id)
        logger.info("🔌 [CamThread #%d] Reader thread stopped.", self.camera_id)

    def stop(self):
        self.running = False


async def process_queue(pool: asyncpg.Pool):
    """
    Pulls frames from shared queue and processes them through MultiTenantCameraEngine.
    """
    logger.info("⚙️ Async Frame Processor active...")
    while True:
        try:
            try:
                item = frame_queue.get_nowait()
            except queue.Empty:
                await asyncio.sleep(0.05)
                continue

            async with pool.acquire() as conn:
                try:
                    await engine.process_frame(
                        conn,
                        item["tenant_id"],
                        item["camera_id"],
                        item["camera_type"],
                        item["frame"],
                        item["now"],
                    )
                except Exception as exc:
                    logger.error("❌ Error processing frame for Cam #%d: %s", item["camera_id"], exc)

        except Exception as e:
            logger.error("💥 Queue processing loop error: %s", e)
            await asyncio.sleep(0.1)


async def sync_cameras(pool: asyncpg.Pool):
    """
    Polls DB for active cameras, spawns new reader threads, and stops deactivated threads.
    """
    while True:
        try:
            async with pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT c.id, c.tenant_id, c.type, c.stream_url
                    FROM cameras c
                    JOIN tenants t ON t.id = c.tenant_id
                    WHERE c.is_active = TRUE AND t.status = 'active'
                    """
                )
                # Also reload embeddings for active tenants
                for r in rows:
                    await engine.cache.reload_tenant(conn, str(r["tenant_id"]))

            active_db_cams = {r["id"]: dict(r) for r in rows}

            # 1. Stop threads for cameras no longer active
            for cam_id in list(camera_threads.keys()):
                if cam_id not in active_db_cams:
                    logger.info("🛑 Camera #%d deactivated/deleted. Stopping thread...", cam_id)
                    camera_threads[cam_id].stop()
                    del camera_threads[cam_id]

            # 2. Start threads for new active cameras
            for cam_id, cam_data in active_db_cams.items():
                if cam_id not in camera_threads:
                    logger.info("✨ Found new active Camera #%d. Starting thread...", cam_id)
                    thread = CameraReaderThread(
                        camera_id=cam_id,
                        tenant_id=str(cam_data["tenant_id"]),
                        camera_type=cam_data["type"],
                        stream_url=cam_data["stream_url"],
                    )
                    thread.start()
                    camera_threads[cam_id] = thread

        except Exception as e:
            logger.error("❌ Error syncing cameras: %s", e)

        await asyncio.sleep(30)


async def main():
    logger.info("🚀 Starting Multi-Tenant Camera Engine Worker...")

    pool = await asyncpg.create_pool(settings.DATABASE_URL, min_size=5, max_size=25)

    logger.info("🧠 Initializing InsightFace AI model...")
    await asyncio.to_thread(engine.initialize_ai_model)
    logger.info("✅ InsightFace model ready.")

    # Start queue processor task and camera sync task concurrently
    processor_task = asyncio.create_task(process_queue(pool))
    sync_task = asyncio.create_task(sync_cameras(pool))

    try:
        await asyncio.gather(processor_task, sync_task)
    except KeyboardInterrupt:
        logger.info("🛑 Shutting down Camera Engine Worker...")
    finally:
        for t in camera_threads.values():
            t.stop()
        await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
