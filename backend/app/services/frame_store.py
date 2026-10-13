import os
from pathlib import Path
from typing import Optional

FRAME_DIR = Path("/tmp/saas_attendai_camera_frames")
FRAME_DIR.mkdir(parents=True, exist_ok=True)


def _path(camera_id: int) -> Path:
    return FRAME_DIR / f"{camera_id}.jpg"


def set_frame(camera_id: int, frame_bytes: bytes) -> None:
    path = _path(camera_id)
    tmp = FRAME_DIR / f"{camera_id}.tmp"

    try:
        with open(tmp, "wb") as f:
            f.write(frame_bytes)
        os.replace(tmp, path)
    except Exception:
        try:
            tmp.unlink(missing_ok=True)
        except Exception:
            pass


def get_frame(camera_id: int) -> Optional[bytes]:
    path = _path(camera_id)

    try:
        if path.exists():
            return path.read_bytes()
    except Exception:
        pass

    return None


def remove_frame(camera_id: int) -> None:
    try:
        _path(camera_id).unlink(missing_ok=True)
    except Exception:
        pass
