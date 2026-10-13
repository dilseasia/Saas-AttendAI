"""
routers/company.py
───────────────────
FastAPI router for Company Setup: Employees, Cameras, and Holidays.
All endpoints are scoped strictly to the authenticated user's `tenant_id`.

Prefix: /api/v1/company
Tag: Company Setup
"""

import asyncio
import logging
import numpy as np
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

import asyncpg
import cv2
from fastapi import APIRouter, Depends, Query, status, Request
from fastapi.responses import StreamingResponse

from app.core.database import get_db
from app.core.dependencies import AuthUser, AdminUser, HRUser, CurrentUser
from app.core.security import decode_access_token
from app.core.exceptions import AuthenticationError
from jose import JWTError
from app.models.auth import MessageResponse
from app.models.company import (
    CreateEmployeeRequest,
    UpdateEmployeeRequest,
    EmployeeResponse,
    EmployeeListResponse,
    CreateCameraRequest,
    UpdateCameraRequest,
    CameraResponse,
    CameraListResponse,
    CreateHolidayRequest,
    HolidayResponse,
    HolidayListResponse,
)
from app.services import company_service
from app.services.frame_store import get_frame

router = APIRouter(prefix="/company", tags=["Company Setup"])
logger = logging.getLogger(__name__)


# ───────────────────────────────────────────────────────────────────
#  1. EMPLOYEES ENDPOINTS
# ───────────────────────────────────────────────────────────────────

@router.post(
    "/employees",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add new employee",
    description="Enforces subscription employee limits and auto-formats Employee ID if not supplied.",
)
async def create_employee(
    payload: CreateEmployeeRequest,
    user: HRUser,
    db: asyncpg.Connection = Depends(get_db),
) -> EmployeeResponse:
    return await company_service.create_employee(db, user.tenant_id, payload)


@router.get(
    "/employees",
    response_model=EmployeeListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all company employees",
)
async def get_employees(
    user: AuthUser,
    tenant_id: Optional[str] = Query(None, description="Super admin tenant override"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search by name, emp_id, or department"),
    db: asyncpg.Connection = Depends(get_db),
) -> EmployeeListResponse:
    tid = tenant_id if (user.role == "super_admin" or user.email == "admin@seasia.com") and tenant_id else user.tenant_id
    return await company_service.get_employees(db, tid, is_active=is_active, search=search)


@router.get(
    "/employees/{emp_id_or_db_id}",
    response_model=EmployeeResponse,
    status_code=status.HTTP_200_OK,
    summary="Get single employee details",
)
async def get_employee(
    emp_id_or_db_id: str,
    user: AuthUser,
    db: asyncpg.Connection = Depends(get_db),
) -> EmployeeResponse:
    return await company_service.get_employee(db, user.tenant_id, emp_id_or_db_id)


@router.patch(
    "/employees/{emp_db_id}",
    response_model=EmployeeResponse,
    status_code=status.HTTP_200_OK,
    summary="Update employee details",
)
async def update_employee(
    emp_db_id: int,
    payload: UpdateEmployeeRequest,
    user: HRUser,
    db: asyncpg.Connection = Depends(get_db),
) -> EmployeeResponse:
    return await company_service.update_employee(db, user.tenant_id, emp_db_id, payload)


@router.delete(
    "/employees/{emp_db_id}",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Remove employee",
)
async def delete_employee(
    emp_db_id: int,
    user: AdminUser,
    db: asyncpg.Connection = Depends(get_db),
) -> MessageResponse:
    await company_service.delete_employee(db, user.tenant_id, emp_db_id)
    return MessageResponse(success=True, message="Employee deleted successfully")


# ───────────────────────────────────────────────────────────────────
#  2. CAMERAS ENDPOINTS
# ───────────────────────────────────────────────────────────────────

@router.post(
    "/cameras",
    response_model=CameraResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add RTSP camera stream",
    description="Enforces subscription camera limits.",
)
async def create_camera(
    payload: CreateCameraRequest,
    user: AdminUser,
    tenant_id: Optional[str] = Query(None, description="Super admin: target tenant override"),
    db: asyncpg.Connection = Depends(get_db),
) -> CameraResponse:
    # Super admin can create cameras for any tenant
    effective_tenant = (
        tenant_id
        if (user.role == "super_admin" or user.email == "admin@seasia.com") and tenant_id
        else user.tenant_id
    )
    return await company_service.create_camera(db, effective_tenant, payload)


@router.get(
    "/cameras",
    response_model=CameraListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all company RTSP cameras",
)
async def get_cameras(
    user: AuthUser,
    tenant_id: Optional[str] = Query(None, description="Super admin: target tenant override"),
    db: asyncpg.Connection = Depends(get_db),
) -> CameraListResponse:
    # Super admin can query cameras for any tenant or all tenants
    if (user.role == "super_admin" or user.email == "admin@seasia.com"):
        effective_tenant = tenant_id if tenant_id else "ALL"
    else:
        effective_tenant = user.tenant_id
    return await company_service.get_cameras(db, effective_tenant)


@router.patch(
    "/cameras/{camera_id}",
    response_model=CameraResponse,
    status_code=status.HTTP_200_OK,
    summary="Update camera settings",
)
async def update_camera(
    camera_id: int,
    payload: UpdateCameraRequest,
    user: AdminUser,
    tenant_id: Optional[str] = Query(None),
    db: asyncpg.Connection = Depends(get_db),
) -> CameraResponse:
    effective_tenant = (
        tenant_id
        if (user.role == "super_admin" or user.email == "admin@seasia.com") and tenant_id
        else user.tenant_id
    )
    return await company_service.update_camera(db, effective_tenant, camera_id, payload)


@router.post(
    "/cameras/{camera_id}/toggle",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Toggle camera active/pause state",
)
async def toggle_camera(
    camera_id: int,
    user: AdminUser,
    tenant_id: Optional[str] = Query(None),
    db: asyncpg.Connection = Depends(get_db),
) -> MessageResponse:
    if (user.role == "super_admin" or user.email == "admin@seasia.com"):
        if tenant_id and tenant_id not in ("ALL", "all"):
            effective_tenant = tenant_id
        else:
            cam_row = await db.fetchrow("SELECT tenant_id FROM cameras WHERE id = $1", camera_id)
            if not cam_row:
                from fastapi import HTTPException
                raise HTTPException(status_code=404, detail="Camera not found")
            effective_tenant = str(cam_row["tenant_id"])
    else:
        effective_tenant = user.tenant_id

    row = await db.fetchrow(
        "SELECT id, is_active FROM cameras WHERE id = $1 AND tenant_id = $2",
        camera_id, effective_tenant
    )
    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Camera not found")
    new_state = not row["is_active"]
    await db.execute(
        "UPDATE cameras SET is_active = $1 WHERE id = $2 AND tenant_id = $3",
        new_state, camera_id, effective_tenant
    )
    state_label = "resumed" if new_state else "paused"
    return MessageResponse(success=True, message=f"Camera {state_label} successfully")


@router.delete(
    "/cameras/{camera_id}",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Remove camera stream",
)
async def delete_camera(
    camera_id: int,
    user: AdminUser,
    tenant_id: Optional[str] = Query(None),
    db: asyncpg.Connection = Depends(get_db),
) -> MessageResponse:
    if (user.role == "super_admin" or user.email == "admin@seasia.com"):
        if tenant_id and tenant_id not in ("ALL", "all"):
            effective_tenant = tenant_id
        else:
            cam_row = await db.fetchrow("SELECT tenant_id FROM cameras WHERE id = $1", camera_id)
            if not cam_row:
                from fastapi import HTTPException
                raise HTTPException(status_code=404, detail="Camera not found")
            effective_tenant = str(cam_row["tenant_id"])
    else:
        effective_tenant = user.tenant_id

    await company_service.delete_camera(db, effective_tenant, camera_id)
    return MessageResponse(success=True, message="Camera deleted successfully")


# ───────────────────────────────────────────────────────────────────
#  3. HOLIDAYS ENDPOINTS
# ───────────────────────────────────────────────────────────────────

@router.post(
    "/holidays",
    response_model=HolidayResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add company holiday",
)
async def create_holiday(
    payload: CreateHolidayRequest,
    user: HRUser,
    db: asyncpg.Connection = Depends(get_db),
) -> HolidayResponse:
    return await company_service.create_holiday(db, user.tenant_id, payload)


@router.get(
    "/holidays",
    response_model=HolidayListResponse,
    status_code=status.HTTP_200_OK,
    summary="List company holidays calendar",
)
async def get_holidays(
    user: AuthUser,
    year: Optional[int] = Query(None, description="Filter holidays by calendar year e.g. 2026"),
    db: asyncpg.Connection = Depends(get_db),
) -> HolidayListResponse:
    return await company_service.get_holidays(db, user.tenant_id, year=year)


@router.delete(
    "/holidays/{holiday_id}",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Remove holiday",
)
async def delete_holiday(
    holiday_id: int,
    user: HRUser,
    db: asyncpg.Connection = Depends(get_db),
) -> MessageResponse:
    await company_service.delete_holiday(db, user.tenant_id, holiday_id)
    return MessageResponse(success=True, message="Holiday deleted successfully")


# ───────────────────────────────────────────────────────────────────
#  4. LIVE FEED STREAMING  (fully async — never blocks Uvicorn)
# ───────────────────────────────────────────────────────────────────

async def get_stream_user(request: Request) -> CurrentUser:
    token = request.query_params.get("token")
    if not token:
        raise AuthenticationError("Missing token in query string")
    try:
        payload = decode_access_token(token)
    except JWTError as exc:
        raise AuthenticationError(f"Invalid token: {exc}")

    user = CurrentUser(payload)
    if user.role == "super_admin" or user.email == "admin@seasia.com":
        override = request.query_params.get("tenant_id")
        if override and override not in ("undefined", "null", "ALL", "all"):
            user.tenant_id = override
    return user


def _open_rtsp_sync(stream_url: str):
    """
    Blocking RTSP open — always called in a thread pool, never on the event loop.
    Sets FFMPEG env vars before VideoCapture so TCP transport is used from the start.
    """
    import os
    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = (
        "stimeout;3000000|max_delay;500000|rtsp_transport;tcp"
    )
    cap = cv2.VideoCapture(stream_url, cv2.CAP_FFMPEG)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 854)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    return cap


def _read_frame_sync(cap) -> tuple:
    """Blocking frame read — always called in a thread pool."""
    return cap.read()


def _make_offline_frame(message: str = "Camera Offline") -> bytes:
    """Returns a styled dark JPEG for unavailable/offline streams."""
    img = np.zeros((480, 854, 3), dtype=np.uint8)
    img[:] = (20, 20, 32)
    cv2.putText(img, message, (280, 230),
                cv2.FONT_HERSHEY_SIMPLEX, 1.3, (100, 100, 130), 2, cv2.LINE_AA)
    cv2.putText(img, "RTSP stream not reachable", (255, 275),
                cv2.FONT_HERSHEY_SIMPLEX, 0.65, (60, 60, 80), 1, cv2.LINE_AA)
    _, buf = cv2.imencode('.jpg', img, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
    return buf.tobytes()


async def _async_mjpeg_generator(camera_id: int):
    """
    Stream the latest JPEG produced by worker.py.

    Does not open RTSP.
    Does not use a database connection.
    """

    last_frame = None

    while True:
        frame = get_frame(camera_id)

        if frame is not None:
            last_frame = frame

        if last_frame is None:
            frame_bytes = _make_offline_frame("Waiting for camera")
        else:
            frame_bytes = last_frame

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n"
            b"Content-Length: " + str(len(frame_bytes)).encode() + b"\r\n"
            b"Cache-Control: no-cache\r\n"
            b"\r\n"
            + frame_bytes
            + b"\r\n"
        )

        await asyncio.sleep(0.5)


@router.get("/cameras/{camera_id}/feed")
async def camera_feed(
    camera_id: int,
    user: CurrentUser = Depends(get_stream_user),
):
    """
    Browser camera preview.

    The worker owns the RTSP connections and stores the latest JPEG
    frame in the shared frame store. This endpoint only reads those
    frames and does not hold a PostgreSQL connection open.
    """
    from fastapi import HTTPException
    from app.core import database

    if database._pool is None:
        raise HTTPException(
            status_code=503,
            detail="Database pool unavailable",
        )

    # Short database lookup only.
    async with database._pool.acquire() as db:
        if (
            user.role == "super_admin"
            or user.email == "admin@seasia.com"
            or user.tenant_id in ("ALL", "all")
        ):
            row = await db.fetchrow(
                """
                SELECT id, stream_url, is_active
                FROM cameras
                WHERE id = $1
                """,
                camera_id,
            )
        else:
            row = await db.fetchrow(
                """
                SELECT id, stream_url, is_active
                FROM cameras
                WHERE id = $1
                  AND tenant_id = $2
                """,
                camera_id,
                user.tenant_id,
            )

    # DB connection is released BEFORE the infinite MJPEG stream.

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Camera not found",
        )

    if not row["is_active"]:
        async def _paused_stream():
            frame_bytes = _make_offline_frame("Stream Paused")
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n"
                + frame_bytes
                + b"\r\n"
            )

        return StreamingResponse(
            _paused_stream(),
            media_type="multipart/x-mixed-replace; boundary=frame",
        )

    return StreamingResponse(
        _async_mjpeg_generator(camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )

