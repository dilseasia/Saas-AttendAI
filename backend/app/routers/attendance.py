"""
routers/attendance.py
─────────────────────
Attendance Engine Router: Ingests check-in/out logs, calculates daily working hours,
serves live summary counters, and exports downloadable CSV reports.

Prefix: /api/v1/attendance
Tag: Attendance Engine
"""

import asyncpg
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response, status

from app.core.database import get_db
from app.core.dependencies import AuthUser
from app.models.attendance import (
    LogAttendanceRequest,
    AttendanceLogResponse,
    DailyAttendanceResponse,
    AttendanceSummaryResponse,
)
from app.services import attendance_service

router = APIRouter(prefix="/attendance", tags=["Attendance Engine"])


# ── POST /attendance/log ─────────────────────────────────────────────
@router.post(
    "/log",
    response_model=AttendanceLogResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record check-in or check-out attendance log",
)
async def log_attendance(
    user: AuthUser,
    payload: LogAttendanceRequest,
    db: asyncpg.Connection = Depends(get_db),
) -> AttendanceLogResponse:
    return await attendance_service.log_attendance(db, user.tenant_id, payload)


# ── GET /attendance/daily ────────────────────────────────────────────
@router.get(
    "/daily",
    response_model=DailyAttendanceResponse,
    summary="Fetch daily attendance sheet & working hours for target date",
)
async def get_daily_attendance(
    user: AuthUser,
    target_date: Optional[date] = Query(None, alias="date", description="Target date (defaults to today)"),
    department: Optional[str] = Query(None, description="Filter by department"),
    tenant_id: Optional[str] = Query(None, description="Super Admin can override tenant"),
    db: asyncpg.Connection = Depends(get_db),
) -> DailyAttendanceResponse:
    query_date = target_date or date.today()
    tid = tenant_id if (user.role == "super_admin" or user.email == "admin@seasia.com") and tenant_id else user.tenant_id
    return await attendance_service.get_daily_attendance(db, tid, query_date, department=department)


# ── GET /attendance/summary ──────────────────────────────────────────
@router.get(
    "/summary",
    response_model=AttendanceSummaryResponse,
    summary="Fetch today's live attendance dashboard summary counters",
)
async def get_attendance_summary(
    user: AuthUser,
    target_date: Optional[date] = Query(None, alias="date", description="Target date (defaults to today)"),
    tenant_id: Optional[str] = Query(None, description="Super Admin can override tenant"),
    db: asyncpg.Connection = Depends(get_db),
) -> AttendanceSummaryResponse:
    query_date = target_date or date.today()
    tid = tenant_id if (user.role == "super_admin" or user.email == "admin@seasia.com") and tenant_id else user.tenant_id
    return await attendance_service.get_attendance_summary(db, tid, query_date)


# ── GET /attendance/export-csv ───────────────────────────────────────
@router.get(
    "/export-csv",
    summary="Download attendance report CSV sheet for target date",
)
async def export_attendance_csv(
    user: AuthUser,
    target_date: Optional[date] = Query(None, alias="date", description="Target date (defaults to today)"),
    tenant_id: Optional[str] = Query(None, description="Super Admin can override tenant"),
    db: asyncpg.Connection = Depends(get_db),
):
    query_date = target_date or date.today()
    tid = tenant_id if (user.role == "super_admin" or user.email == "admin@seasia.com") and tenant_id else user.tenant_id
    csv_content = await attendance_service.export_attendance_csv(db, tid, query_date)
    filename = f"attendance_report_{query_date.strftime('%Y-%m-%d')}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── GET /attendance/raw-logs ─────────────────────────────────────────
@router.get(
    "/raw-logs",
    summary="Fetch raw individual punch events (entries/exits)",
)
async def get_raw_logs(
    user: AuthUser,
    target_date: Optional[date] = Query(None, alias="date"),
    tenant_id: Optional[str] = Query(None, description="Super Admin can override tenant"),
    db: asyncpg.Connection = Depends(get_db),
):
    query_date = target_date or date.today()
    tid = tenant_id if (user.role == "super_admin" or user.email == "admin@seasia.com") and tenant_id else user.tenant_id
    
    if (user.role == "super_admin" or user.email == "admin@seasia.com") and not tenant_id:
        rows = await db.fetch(
            """
            SELECT
              al.id,
              al.date,
              al.time,
              al.event_type as camera_type,
              e.emp_id,
              e.name,
              NULL::text AS photo_url,
              t.name as company_name,
              al.tenant_id
            FROM attendance_logs al
            JOIN employees e
              ON e.emp_id = al.emp_id
              AND e.tenant_id = al.tenant_id
            JOIN tenants t
              ON t.id = al.tenant_id
            WHERE al.date = $1
            ORDER BY al.date DESC, al.time DESC
            """,
            query_date
        )
    else:
        rows = await db.fetch(
            """
            SELECT
              al.id,
              al.date,
              al.time,
              al.event_type as camera_type,
              e.emp_id,
              e.name,
              NULL::text AS photo_url,
              t.name as company_name,
              al.tenant_id
            FROM attendance_logs al
            JOIN employees e
              ON e.emp_id = al.emp_id
              AND e.tenant_id = al.tenant_id
            JOIN tenants t
              ON t.id = al.tenant_id
            WHERE al.tenant_id = $1
              AND al.date = $2
            ORDER BY al.date DESC, al.time DESC
            """,
            tid, query_date
        )
    
    return {
        "success": True,
        "date": query_date.strftime("%Y-%m-%d"),
        "logs": [dict(r) for r in rows]
    }


# ── GET /attendance/anonymous-logs ────────────────────────────────────
@router.get(
    "/anonymous-logs",
    summary="List all anonymous face capture URLs for a specific date and tenant",
)
async def get_anonymous_logs(
    user: AuthUser,
    target_date: Optional[date] = Query(None, alias="date", description="Target date (defaults to today)"),
    tenant_id: Optional[str] = Query(None, description="Super Admin can override tenant"),
    db: asyncpg.Connection = Depends(get_db),
):
    import os
    query_date = target_date or date.today()
    date_str = query_date.strftime('%Y-%m-%d')

    # Allow super admin to view any tenant's anonymous logs
    tid = tenant_id if (user.role == "super_admin" or user.email == "admin@seasia.com") and tenant_id else user.tenant_id

    # Path is always relative to the backend/ directory where worker.py runs
    # worker.py saves: Anonymous/<tenant_id>/<date>/<camera_type>/photo.jpg
    # The backend app file lives at app/routers/attendance.py, so go up 3 levels to backend/
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    base_dir = os.path.join(backend_dir, "Anonymous", tid, date_str)

    logs = []
    if os.path.exists(base_dir):
        for cam_type in sorted(os.listdir(base_dir)):
            cam_dir = os.path.join(base_dir, cam_type)
            if os.path.isdir(cam_dir):
                for file_name in sorted(os.listdir(cam_dir)):
                    if file_name.lower().endswith(('.jpg', '.jpeg', '.png')):
                        # Build URL; pass tenant_id so super admin gets correct images
                        url = f"/api/v1/attendance/anonymous-photo?tenant_id={tid}&date={date_str}&cam_type={cam_type}&file={file_name}"
                        logs.append({
                            "time": file_name.split('.')[0].replace('-', ':'),
                            "camera_type": cam_type,
                            "url": url,
                        })

    # Sort by time descending
    logs.sort(key=lambda x: x["time"], reverse=True)
    return {"success": True, "date": date_str, "tenant_id": tid, "count": len(logs), "logs": logs}


# ── GET /attendance/anonymous-photo ─────────────────────────────────────
@router.get("/anonymous-photo")
async def serve_anonymous_photo(
    user: AuthUser,
    date: str,
    cam_type: str,
    file: str,
    tenant_id: Optional[str] = Query(None),
):
    import os
    tid = tenant_id if (user.role == "super_admin" or user.email == "admin@seasia.com") and tenant_id else user.tenant_id

    # Same backend/ dir calculation
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    file_path = os.path.join(backend_dir, "Anonymous", tid, date, cam_type, file)

    if not os.path.exists(file_path):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Photo not found: {file_path}")

    with open(file_path, "rb") as f:
        img_bytes = f.read()
    return Response(content=img_bytes, media_type="image/jpeg")
    # ── GET /attendance/recognized-photo ────────────────────────────────
@router.get("/recognized-photo")
async def get_recognized_photo(
    user: AuthUser,
    tenant_id: str,
    date: str,
    emp_id: str,
    cam_type: str,
    file: str,
):
    import os

    backend_dir = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )

    file_path = os.path.join(
        backend_dir,
        "recognized_photos",
        tenant_id,
        date,
        emp_id,
        cam_type,
        file,
    )

    if not os.path.exists(file_path):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Recognized photo not found")

    with open(file_path, "rb") as f:
        img_bytes = f.read()

    return Response(content=img_bytes, media_type="image/jpeg")
