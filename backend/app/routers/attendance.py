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
from fastapi import APIRouter, Depends, Query, Response, status, HTTPException

from app.core.database import get_db
from app.core.dependencies import AuthUser
from app.models.attendance import (
    LogAttendanceRequest,
    AttendanceLogResponse,
    DailyAttendanceRecord,
    DailyAttendanceResponse,
    AttendanceSummaryResponse,
    ConvertAnonymousRequest,
    ConvertAnonymousResponse,
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
    tenant_id: Optional[str] = Query(None),
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Fast raw attendance endpoint.

    Super Admin:
      - no tenant_id -> all tenants
      - tenant_id -> selected tenant

    Normal user:
      - always restricted to their own tenant.
    """
    query_date = target_date or date.today()

    is_super_admin = (
        user.role == "super_admin"
        or user.email == "admin@seasia.com"
    )

    try:
        if is_super_admin and not tenant_id:
            rows = await db.fetch(
                """
                SELECT
                    al.id,
                    al.date,
                    al.time,
                    al.event_type AS camera_type,
                    al.emp_id,
                    COALESCE(e.name, 'Unknown Employee') AS name,
                    t.name AS company_name,
                    al.tenant_id,
                    '/api/v1/face/photo/' || al.emp_id::text ||
                    '?tenant_id=' || al.tenant_id::text AS photo_url
                FROM attendance_logs al
                LEFT JOIN employees e
                    ON e.emp_id = al.emp_id
                   AND e.tenant_id = al.tenant_id
                LEFT JOIN tenants t
                    ON t.id = al.tenant_id
                WHERE al.date = $1
                ORDER BY al.time DESC
                """,
                query_date,
            )
        else:
            effective_tenant = (
                tenant_id if is_super_admin and tenant_id
                else user.tenant_id
            )

            rows = await db.fetch(
                """
                SELECT
                    al.id,
                    al.date,
                    al.time,
                    al.event_type AS camera_type,
                    al.emp_id,
                    COALESCE(e.name, 'Unknown Employee') AS name,
                    t.name AS company_name,
                    al.tenant_id,
                    '/api/v1/face/photo/' || al.emp_id::text ||
                    '?tenant_id=' || al.tenant_id::text AS photo_url
                FROM attendance_logs al
                LEFT JOIN employees e
                    ON e.emp_id = al.emp_id
                   AND e.tenant_id = al.tenant_id
                LEFT JOIN tenants t
                    ON t.id = al.tenant_id
                WHERE al.tenant_id = $1
                  AND al.date = $2
                ORDER BY al.time DESC
                """,
                effective_tenant,
                query_date,
            )

        return {
            "success": True,
            "date": query_date.strftime("%Y-%m-%d"),
            "logs": [dict(row) for row in rows],
        }

    except Exception as exc:
        import logging
        logging.getLogger(__name__).exception(
            "Failed to fetch raw attendance logs"
        )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch attendance logs: {str(exc)}",
        )


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
                            "file_name": file_name,
                            "date": date_str,
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


# ── DELETE /attendance/anonymous-photo ──────────────────────────────────
@router.delete("/anonymous-photo")
async def delete_anonymous_photo(
    user: AuthUser,
    date: str,
    cam_type: str,
    file: str,
    tenant_id: Optional[str] = Query(None),
):
    import os
    from fastapi import HTTPException
    tid = tenant_id if (user.role == "super_admin" or user.email == "admin@seasia.com") and tenant_id else str(user.tenant_id)

    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    file_path = os.path.join(backend_dir, "Anonymous", tid, date, cam_type, file)

    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            return {"success": True, "message": "Anonymous photo deleted successfully"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete photo: {str(e)}")
    raise HTTPException(status_code=404, detail="Photo not found")


# ── GET /attendance/recognized-photo ────────────────────────────────
@router.get("/recognized-photo")
async def get_recognized_photo(
    user: AuthUser,
    tenant_id: str,
    date: str,
    emp_id: str,
    cam_type: str = "entry",
    file: Optional[str] = Query(None),
    time: Optional[str] = Query(None),
):
    import os
    from pathlib import Path
    from fastapi import HTTPException
    from fastapi.responses import Response

    # Resolve both supported storage locations.
    backend_dir = Path(__file__).resolve().parents[2]
    project_root = backend_dir.parent

    # Prevent path traversal from URL parameters.
    for value in (tenant_id, date, emp_id, cam_type):
        if value and (value in (".", "..") or "/" in value or "\\" in value):
            raise HTTPException(status_code=400, detail="Invalid photo path")
    if file and (file in (".", "..") or "/" in file or "\\" in file):
        raise HTTPException(status_code=400, detail="Invalid file parameter")

    is_admin = (
        user.role == "super_admin"
        or user.email == "admin@seasia.com"
    )
    if not is_admin and str(user.tenant_id) != tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")

    cam_clean = cam_type.lower().strip() if cam_type else "entry"

    base_dirs = [
        project_root / "recognized_photos" / tenant_id / date / emp_id,
        backend_dir / "recognized_photos" / tenant_id / date / emp_id,
    ]

    file_path = None

    def _parse_to_secs(t_str: str) -> Optional[int]:
        if not t_str:
            return None
        clean = t_str.split(".")[0].replace("-", ":")
        parts = clean.split(":")
        if len(parts) >= 2:
            try:
                h = int(parts[0])
                m = int(parts[1])
                s = int(parts[2]) if len(parts) > 2 else 0
                return h * 3600 + m * 60 + s
            except Exception:
                pass
        return None

    target_secs = _parse_to_secs(file) if file else None
    if target_secs is None and time:
        target_secs = _parse_to_secs(time)

    # 1. Exact match if file provided
    if file:
        for base in base_dirs:
            p = base / cam_clean / file
            if p.is_file():
                file_path = p
                break

    # 2. Match within the specific camera type folder on this date
    if file_path is None:
        for base in base_dirs:
            cam_dir = base / cam_clean
            if cam_dir.is_dir():
                valid_files = [f for f in cam_dir.iterdir() if f.is_file() and f.suffix.lower() in (".jpg", ".jpeg", ".png")]
                if valid_files:
                    if target_secs is not None:
                        best_diff = float("inf")
                        best_f = None
                        for vf in valid_files:
                            vf_secs = _parse_to_secs(vf.name)
                            if vf_secs is not None:
                                diff = abs(target_secs - vf_secs)
                                if diff < best_diff:
                                    best_diff = diff
                                    best_f = vf
                        if best_f:
                            file_path = best_f
                            break
                    else:
                        file_path = sorted(valid_files, key=lambda x: x.name, reverse=True)[0]
                        break

    # 3. If not found in requested cam_type, check other camera subdirectories on this date
    if file_path is None:
        for base in base_dirs:
            if base.is_dir():
                for sub_dir in base.iterdir():
                    if sub_dir.is_dir() and sub_dir.name.lower() in ("entry", "exit"):
                        valid_files = [f for f in sub_dir.iterdir() if f.is_file() and f.suffix.lower() in (".jpg", ".jpeg", ".png")]
                        if valid_files:
                            file_path = sorted(valid_files, key=lambda x: x.name, reverse=True)[0]
                            break
                if file_path:
                    break

    # 4. If still not found, check across recent dates for this employee
    if file_path is None:
        for root in [project_root / "recognized_photos" / tenant_id, backend_dir / "recognized_photos" / tenant_id]:
            if root.is_dir():
                date_dirs = sorted([d for d in root.iterdir() if d.is_dir()], key=lambda x: x.name, reverse=True)
                for d in date_dirs:
                    emp_cam_dir = d / emp_id / cam_clean
                    if emp_cam_dir.is_dir():
                        valid_files = [f for f in emp_cam_dir.iterdir() if f.is_file() and f.suffix.lower() in (".jpg", ".jpeg", ".png")]
                        if valid_files:
                            file_path = sorted(valid_files, key=lambda x: x.name, reverse=True)[0]
                            break
                    emp_dir = d / emp_id
                    if emp_dir.is_dir() and not file_path:
                        for s_dir in emp_dir.iterdir():
                            if s_dir.is_dir():
                                valid_files = [f for f in s_dir.iterdir() if f.is_file() and f.suffix.lower() in (".jpg", ".jpeg", ".png")]
                                if valid_files:
                                    file_path = sorted(valid_files, key=lambda x: x.name, reverse=True)[0]
                                    break
                    if file_path:
                        break
            if file_path:
                break

    if file_path is None or not file_path.is_file():
        raise HTTPException(status_code=404, detail="No camera snapshot found for this recognition record")

    return Response(
        content=file_path.read_bytes(),
        media_type="image/jpeg",
        headers={
            "Cache-Control": "no-cache",
            "X-Photo-Source": "camera_capture",
            "X-Photo-File": file_path.name,
        },
    )



# ── POST /attendance/convert-anonymous ─────────────────────────────
@router.post(
    "/convert-anonymous",
    response_model=ConvertAnonymousResponse,
    summary="Convert an anonymous face capture to a recognized employee",
)
async def convert_anonymous(
    user: AuthUser,
    payload: ConvertAnonymousRequest,
    db: asyncpg.Connection = Depends(get_db),
) -> ConvertAnonymousResponse:
    import os
    import uuid
    import shutil
    import logging
    from datetime import datetime, time
    from pathlib import Path

    logger = logging.getLogger(__name__)

    # Directory traversal prevention
    for val in (payload.date, payload.cam_type, payload.file, payload.emp_id):
        if ".." in val or "/" in val or "\\" in val:
            raise HTTPException(status_code=400, detail="Invalid path parameter")

    is_super_admin = user.role == "super_admin" or user.email == "admin@seasia.com"
    tid_str = payload.tenant_id if is_super_admin and payload.tenant_id else str(user.tenant_id)

    try:
        tenant_uuid = uuid.UUID(tid_str)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid tenant UUID: {tid_str}")

    # 1. Look up employee in database
    emp_row = await db.fetchrow(
        "SELECT id, emp_id, name, department FROM employees WHERE tenant_id = $1 AND emp_id = $2",
        tenant_uuid,
        payload.emp_id,
    )
    if not emp_row:
        raise HTTPException(
            status_code=404,
            detail=f"Employee '{payload.emp_id}' not found for tenant '{tid_str}'",
        )

    # 2. Locate Anonymous photo file
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    project_root = os.path.dirname(backend_dir)
    anon_path = os.path.join(backend_dir, "Anonymous", tid_str, payload.date, payload.cam_type, payload.file)

    if not os.path.exists(anon_path):
        raise HTTPException(
            status_code=404,
            detail=f"Anonymous photo file '{payload.file}' not found",
        )

    with open(anon_path, "rb") as f:
        img_bytes = f.read()

    # 3. Parse punch time & date
    try:
        time_stem = os.path.splitext(payload.file)[0].replace("-", ":")
        time_splits = [int(p) for p in time_stem.split(":")[:3]]
        if len(time_splits) == 3:
            p_time = time(time_splits[0], time_splits[1], time_splits[2])
        elif len(time_splits) == 2:
            p_time = time(time_splits[0], time_splits[1], 0)
        else:
            p_time = datetime.now().time()
    except Exception:
        p_time = datetime.now().time()

    try:
        p_date = datetime.strptime(payload.date, "%Y-%m-%d").date()
    except Exception:
        p_date = datetime.now().date()

    ev_type = "exit" if "exit" in payload.cam_type.lower() else "entry"

    # 4. Mark attendance punch if requested
    if payload.mark_attendance:
        await db.execute(
            """
            INSERT INTO attendance_logs (tenant_id, emp_id, name, date, time, camera_id, event_type, confidence)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """,
            tenant_uuid,
            emp_row["emp_id"],
            emp_row["name"],
            p_date,
            p_time,
            payload.camera_id,
            ev_type,
            1.0,
        )

        # Copy image to recognized_photos directories
        for base in [project_root, backend_dir]:
            rec_dir = os.path.join(base, "recognized_photos", tid_str, payload.date, emp_row["emp_id"], ev_type)
            os.makedirs(rec_dir, exist_ok=True)
            rec_file = os.path.join(rec_dir, payload.file)
            try:
                shutil.copy2(anon_path, rec_file)
            except Exception as copy_err:
                logger.warning("Could not copy recognized photo to %s: %s", rec_file, copy_err)

    # Note: Preserving original employee face enroll and embeddings untouched.
    # Anonymous capture only marks attendance and saves recognized snapshot.

    # 5. Delete anonymous file
    try:
        if os.path.exists(anon_path):
            os.remove(anon_path)
    except Exception as del_err:
        logger.warning("Failed to remove anon file %s: %s", anon_path, del_err)

    return ConvertAnonymousResponse(
        success=True,
        message=f"Successfully converted anonymous detection to {emp_row['name']} ({emp_row['emp_id']})",
        emp_id=emp_row["emp_id"],
        name=emp_row["name"],
        event_type=ev_type,
        date=str(p_date),
        time=str(p_time),
    )

