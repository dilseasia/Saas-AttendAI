import os
import sys
import time
import asyncio
import logging
from datetime import datetime

import cv2
import asyncpg

# Ensure the backend directory is in the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import get_settings
from app.services.camera_engine import MultiTenantCameraEngine, create_rtsp_connection

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler(), logging.FileHandler("worker.log")],
)
logger = logging.getLogger("worker")

settings = get_settings()

engine = MultiTenantCameraEngine()

# Keep track of active camera tasks: camera_id -> asyncio.Task
active_tasks = {}
# Keep track of the cancellation flags: camera_id -> asyncio.Event
cancel_events = {}

async def process_camera_stream(pool: asyncpg.Pool, camera_id: int, tenant_id: str, camera_type: str, stream_url: str, cancel_event: asyncio.Event):
    """
    Runs continuously for a specific camera.
    Reads frames, applies throttling, and sends them to the unified engine.
    """
    logger.info(f"🎥 Starting stream processing for Camera #{camera_id} (Tenant: {tenant_id})")
    
    # Load tenant embeddings into cache (if not already loaded)
    async with pool.acquire() as conn:
        await engine.cache.reload_tenant(conn, tenant_id)

    cap = await asyncio.to_thread(create_rtsp_connection, stream_url)
    if cap is None:
        logger.error(f"❌ Could not connect to Camera #{camera_id} stream. Task exiting.")
        return

    frame_interval = 1.0  # Min seconds between frames to process
    skip_frames = 3
    
    last_frame_time = time.time()
    frame_counter = 0

    try:
        while not cancel_event.is_set():
            # Reading from RTSP is blocking, offload to thread
            ret, frame = await asyncio.to_thread(cap.read)
            now = datetime.now()
            now_time = time.time()

            if not ret or frame is None:
                logger.warning(f"⚠️ Camera #{camera_id} stream disconnected. Attempting reconnect in 5s...")
                cap.release()
                await asyncio.sleep(5)
                if cancel_event.is_set():
                    break
                cap = await asyncio.to_thread(create_rtsp_connection, stream_url)
                continue

            frame_counter += 1
            if frame_counter % (skip_frames + 1) != 0:
                continue

            if now_time - last_frame_time < frame_interval:
                continue
                
            last_frame_time = now_time

            # The process_frame contains some synchronous CPU work (app.get).
            # If the server lags, we may need to wrap parts of process_frame in to_thread, 
            # but for now we await it as written in the engine.
            async with pool.acquire() as conn:
                try:
                    await engine.process_frame(conn, tenant_id, camera_id, camera_type, frame, now)
                except Exception as e:
                    logger.error(f"❌ Error processing frame for Camera #{camera_id}: {e}")
            
            # Yield control to the event loop so other cameras can process
            await asyncio.sleep(0.01)
            
    except asyncio.CancelledError:
        logger.info(f"🛑 Camera #{camera_id} task was cancelled.")
    except Exception as e:
        logger.exception(f"💥 Camera #{camera_id} loop crashed: {e}")
    finally:
        cap.release()
        logger.info(f"🔌 Camera #{camera_id} stream released.")


async def sync_cameras(pool: asyncpg.Pool):
    """
    Polls the database every 60 seconds to find new active cameras,
    spawns tasks for them, and kills tasks for cameras that were deleted or deactivated.
    """
    while True:
        try:
            async with pool.acquire() as conn:
                # Fetch all ACTIVE cameras for ACTIVE tenants
                rows = await conn.fetch(
                    """
                    SELECT c.id, c.tenant_id, c.type, c.stream_url
                    FROM cameras c
                    JOIN tenants t ON t.id = c.tenant_id
                    WHERE c.is_active = TRUE AND t.status = 'active'
                    """
                )
                
            active_db_cameras = {r["id"]: dict(r) for r in rows}
            
            # 1. Kill tasks for cameras that are no longer active in DB
            for cam_id in list(active_tasks.keys()):
                if cam_id not in active_db_cameras:
                    logger.info(f"🛑 Camera #{cam_id} deactivated or deleted. Stopping task...")
                    cancel_events[cam_id].set()
                    active_tasks[cam_id].cancel()
                    del active_tasks[cam_id]
                    del cancel_events[cam_id]

            # 2. Spawn tasks for newly activated cameras
            for cam_id, cam_data in active_db_cameras.items():
                if cam_id not in active_tasks:
                    logger.info(f"✨ Found new active Camera #{cam_id}. Spawning task...")
                    cancel_event = asyncio.Event()
                    cancel_events[cam_id] = cancel_event
                    
                    task = asyncio.create_task(
                        process_camera_stream(
                            pool,
                            cam_id,
                            str(cam_data["tenant_id"]),
                            cam_data["type"],
                            cam_data["stream_url"],
                            cancel_event
                        )
                    )
                    active_tasks[cam_id] = task

            # 3. Reload embeddings for active tenants every hour? Or just rely on 60s check if needed.
            # Currently embeddings are loaded once per camera spawn. 
            
        except Exception as e:
            logger.error(f"❌ Error syncing cameras: {e}")
            
        await asyncio.sleep(30)


async def main():
    logger.info("🚀 Starting Multi-Tenant Camera Engine Worker...")
    
    # Initialize DB connection pool
    pool = await asyncpg.create_pool(settings.DATABASE_URL, min_size=2, max_size=20)
    
    # Pre-initialize AI model so it doesn't block the first camera
    logger.info("🧠 Loading InsightFace model...")
    await asyncio.to_thread(engine.initialize_ai_model)
    logger.info("✅ InsightFace model loaded.")

    try:
        # Run the syncing loop forever
        await sync_cameras(pool)
    except KeyboardInterrupt:
        logger.info("🛑 Shutting down Camera Engine Worker...")
    finally:
        for ev in cancel_events.values():
            ev.set()
        for task in active_tasks.values():
            task.cancel()
        await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
