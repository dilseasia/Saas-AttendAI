"""
services/camera_engine.py
──────────────────────────
Unified Multi-Tenant RTSP Camera Stream & Face Recognition Engine.

Incorporates the complete core logic from legacy `entry.py` and `exit.py`:
1. RTSP Connection Resilience (TCP fallback, buffer size=1, timeout control, reconnects)
2. CPU-Aware Load Balancing (CPUMonitor & BackgroundQueue for high-density check-in waves)
3. Multi-Tenant Scoping (loads embeddings per tenant_id from database face_embeddings table)
4. Vectorized NumPy Cosine Similarity Matching (InsightFace ONNX model)
5. Attendance Punch Logging & Anonymous Unknown Face Archiving
"""

import os
import time
import logging
import asyncio
from datetime import datetime
from collections import deque, defaultdict
from typing import Dict, List, Tuple, Optional

import cv2
import numpy as np
import psutil
import asyncpg
from insightface.app import FaceAnalysis

logger = logging.getLogger(__name__)

# === ENGINE CONFIGURATION ===
COSINE_THRESHOLD = 0.5            # Max distance threshold (1 - similarity > threshold)
FRAME_INTERVAL = 1.0              # Min time between frame checks (sec)
SKIP_FRAMES = 3                   # Skip frames count
UNKNOWN_COOLDOWN = 10             # Seconds between saving duplicate unknown face
UNKNOWN_MIN_AREA = 2000           # Minimum bounding box area for unknown face crop
PUNCH_COOLDOWN = 60               # Seconds between duplicate punches per employee

CPU_CHECK_INTERVAL = 2.0          # CPU monitor update interval
CPU_HIGH_THRESHOLD = 800          # High CPU load percent threshold
CPU_CRITICAL_THRESHOLD = 1000     # Critical CPU load percent threshold
MAX_FACES_NORMAL = 15             # Max faces in normal mode
MAX_FACES_HIGH = 8                # Max faces in high load mode
MAX_FACES_CRITICAL = 4            # Max faces in critical load mode
BATCH_QUEUE_SIZE = 50             # Deferred background processing queue size


# ── 1. CPU MONITOR ──────────────────────────────────────────────────
class CPUMonitor:
    """Monitors live CPU usage and dynamically adjusts processing load."""
    
    def __init__(self):
        self.last_check = 0.0
        self.current_cpu = 0.0
        self.cpu_history = deque(maxlen=5)
        self.mode = "normal"

    def update(self) -> Tuple[str, float]:
        now = time.time()
        if now - self.last_check >= CPU_CHECK_INTERVAL:
            self.current_cpu = psutil.cpu_percent(interval=0.1)
            self.cpu_history.append(self.current_cpu)
            self.last_check = now

            avg_cpu = sum(self.cpu_history) / len(self.cpu_history)
            if avg_cpu >= CPU_CRITICAL_THRESHOLD:
                self.mode = "critical"
            elif avg_cpu >= CPU_HIGH_THRESHOLD:
                self.mode = "high"
            else:
                self.mode = "normal"
        return self.mode, self.current_cpu

    def get_max_faces(self) -> int:
        if self.mode == "critical":
            return MAX_FACES_CRITICAL
        elif self.mode == "high":
            return MAX_FACES_HIGH
        return MAX_FACES_NORMAL


# ── 2. BACKGROUND QUEUE ─────────────────────────────────────────────
class BackgroundQueue:
    """Queue for deferred face processing when CPU utilization spikes."""

    def __init__(self, max_size: int = BATCH_QUEUE_SIZE):
        self.queue = deque(maxlen=max_size)
        self.processed_count = 0
        self.dropped_count = 0

    def add(self, face_data: dict) -> bool:
        if len(self.queue) >= BATCH_QUEUE_SIZE:
            self.dropped_count += 1
            return False
        self.queue.append(face_data)
        return True


# ── 3. RTSP CONNECTION FACTORY ──────────────────────────────────────
def create_rtsp_connection(rtsp_url: str, timeout_ms: int = 10000) -> Optional[cv2.VideoCapture]:
    """
    Creates an optimized RTSP Video Capture stream with TCP fallback,
    minimal buffering latency, and timeout parameters.
    """
    logger.info("🔗 Connecting to camera RTSP stream: %s", rtsp_url[:40])
    
    rtsp_tcp_url = rtsp_url + ("&tcp" if "?" in rtsp_url else "?tcp")
    attempts = [
        (rtsp_tcp_url, "TCP transport"),
        (rtsp_url, "Default transport"),
    ]

    for attempt_url, method in attempts:
        try:
            cap = cv2.VideoCapture(attempt_url, cv2.CAP_FFMPEG)
            cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, timeout_ms)
            cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, timeout_ms)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            cap.set(cv2.CAP_PROP_FPS, 15)

            if cap.isOpened():
                ret, test_frame = cap.read()
                if ret and test_frame is not None:
                    logger.info("✅ Connection established via %s", method)
                    return cap
                cap.release()
        except Exception as exc:
            logger.warning("⚠️ Connection attempt failed via %s: %s", method, exc)

    logger.error("❌ Failed to connect to camera RTSP feed after all retries")
    return None


# ── 4. MULTI-TENANT FACE EMBEDDING LOADER ───────────────────────────
class TenantEmbeddingCache:
    """Caches enrolled face embeddings grouped per tenant_id from database."""

    def __init__(self):
        # tenant_id -> list of (emp_db_id, emp_id, name)
        self.tenant_metadata: Dict[str, List[Tuple[int, str, str]]] = defaultdict(list)
        # tenant_id -> 2D numpy array of float32 embeddings
        self.tenant_vectors: Dict[str, np.ndarray] = {}

    async def reload_tenant(self, db: asyncpg.Connection, tenant_id: str):
        """Reloads embeddings for a single tenant from DB."""
        rows = await db.fetch(
            """
            SELECT fe.emp_id AS emp_db_id, fe.embedding, e.emp_id, e.name
            FROM face_embeddings fe
            JOIN employees e ON e.id = fe.emp_id
            WHERE fe.tenant_id = $1 AND e.is_active = TRUE
            """,
            tenant_id,
        )

        metadata = []
        vectors = []

        for r in rows:
            raw_emb = r["embedding"]
            if isinstance(raw_emb, bytes):
                vec = np.frombuffer(raw_emb, dtype=np.float32)
            elif isinstance(raw_emb, list):
                vec = np.array(raw_emb, dtype=np.float32)
            else:
                continue

            if vec.shape[0] == 512:
                metadata.append((r["emp_db_id"], r["emp_id"], r["name"]))
                vectors.append(vec)

        self.tenant_metadata[tenant_id] = metadata
        if vectors:
            self.tenant_vectors[tenant_id] = np.array(vectors, dtype=np.float32)
        else:
            self.tenant_vectors[tenant_id] = np.empty((0, 512), dtype=np.float32)

        logger.info("🧠 Loaded %d face vectors for tenant %s", len(vectors), tenant_id)

    def match(self, tenant_id: str, face_emb: np.ndarray) -> Optional[Tuple[int, str, str, float]]:
        """Vectorized cosine similarity search for a given tenant."""
        vectors = self.tenant_vectors.get(tenant_id)
        metadata = self.tenant_metadata.get(tenant_id)

        if vectors is None or len(vectors) == 0 or metadata is None:
            return None

        # Compute cosine similarity
        norm_v = np.linalg.norm(vectors, axis=1)
        norm_f = np.linalg.norm(face_emb)
        if norm_f == 0:
            return None

        similarities = np.dot(vectors, face_emb) / (norm_v * norm_f + 1e-6)
        best_idx = int(np.argmax(similarities))
        best_sim = float(similarities[best_idx])

        if best_sim >= (1.0 - COSINE_THRESHOLD):
            emp_db_id, emp_id, name = metadata[best_idx]
            return emp_db_id, emp_id, name, best_sim

        return None


# ── 5. CAMERA ENGINE PROCESSOR ──────────────────────────────────────
class MultiTenantCameraEngine:
    """Unified Stream Manager executing entry/exit AI face recognition for all tenants."""

    def __init__(self):
        self.app: Optional[FaceAnalysis] = None
        self.cache = TenantEmbeddingCache()
        self.cpu_monitor = CPUMonitor()
        self.seen_known: Dict[Tuple[str, str], float] = {}  # (tenant_id, emp_id) -> timestamp
        self.seen_unknown: set = set()
        self.unknown_cooldowns: Dict[tuple, float] = {}

    def initialize_ai_model(self):
        """Initializes InsightFace ONNX Model."""
        if self.app is None:
            logger.info("🚀 Initializing InsightFace 'buffalo_l' Model...")
            self.app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
            self.app.prepare(ctx_id=0, det_size=(480, 480))
            logger.info("✅ InsightFace model ready.")

    async def process_frame(
        self,
        db: asyncpg.Connection,
        tenant_id: str,
        camera_id: int,
        camera_type: str,
        frame: np.ndarray,
        now: datetime,
    ) -> List[dict]:
        """
        Processes a single frame for a tenant's camera feed:
        Detects faces, performs matching, logs attendance, and archives photos.
        """
        if self.app is None:
            self.initialize_ai_model()

        now_time = time.time()
        mode, _ = self.cpu_monitor.update()
        max_faces = self.cpu_monitor.get_max_faces()

        faces = self.app.get(frame)
        num_faces = len(faces)

        if num_faces > max_faces:
            # Sort by area descending
            faces_sorted = sorted(
                faces,
                key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]),
                reverse=True,
            )
            faces_to_process = faces_sorted[:max_faces]
        else:
            faces_to_process = faces

        punches_logged = []

        for face in faces_to_process:
            emb = face.embedding
            bbox = face.bbox.astype(int)
            x1, y1, x2, y2 = bbox
            area = (x2 - x1) * (y2 - y1)

            # Match face against tenant's enrolled vectors
            match_res = self.cache.match(tenant_id, emb)

            if match_res:
                emp_db_id, emp_id, name, sim = match_res
                key = (tenant_id, emp_id)
                last_seen = self.seen_known.get(key, 0.0)

                # Check cooldown
                if now_time - last_seen >= PUNCH_COOLDOWN:
                    # Log attendance in database
                    ts_str = now.strftime("%Y-%m-%d %H:%M:%S")
                    await db.execute(
                        """
                        INSERT INTO attendance_logs (tenant_id, emp_id, camera_id, timestamp, punch_type, confidence)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        """,
                        tenant_id,
                        emp_id,
                        camera_id,
                        now,
                        camera_type,
                        sim,
                    )
                    self.seen_known[key] = now_time

                    # Save recognized snapshot
                    photo_dir = os.path.join("recognized_photos", tenant_id, now.strftime("%Y-%m-%d"), emp_id, camera_type)
                    os.makedirs(photo_dir, exist_ok=True)
                    photo_path = os.path.join(photo_dir, f"{now.strftime('%H-%M-%S')}.jpg")
                    cv2.imwrite(photo_path, frame)

                    logger.info("✅ [%s] Attendance Logged: %s (%s) via Cam #%d", camera_type.upper(), name, emp_id, camera_id)
                    punches_logged.append({
                        "tenant_id": tenant_id,
                        "emp_id": emp_id,
                        "name": name,
                        "punch_type": camera_type,
                        "timestamp": ts_str,
                        "confidence": sim,
                    })
            else:
                # Handle unknown face
                if area >= UNKNOWN_MIN_AREA:
                    emb_key = tuple(np.round(emb[:30], 3))
                    if emb_key not in self.seen_unknown:
                        last_u = self.unknown_cooldowns.get(emb_key, 0.0)
                        if now_time - last_u >= UNKNOWN_COOLDOWN:
                            anon_dir = os.path.join("Anonymous", tenant_id, now.strftime("%Y-%m-%d"), camera_type)
                            os.makedirs(anon_dir, exist_ok=True)
                            photo_name = f"{now.strftime('%H-%M-%S')}.jpg"
                            photo_path = os.path.join(anon_dir, photo_name)
                            cv2.imwrite(photo_path, frame)

                            self.unknown_cooldowns[emb_key] = now_time
                            self.seen_unknown.add(emb_key)
                            logger.info("📸 Unknown face captured for tenant %s under %s", tenant_id, photo_name)

        return punches_logged


# Global singleton instance of MultiTenantCameraEngine
camera_engine = MultiTenantCameraEngine()
