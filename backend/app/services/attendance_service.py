"""
services/attendance_service.py
───────────────────────────────
Real-Time Attendance Engine: Handles check-in/check-out log ingestion,
dynamic working hours calculation (First IN / Last OUT), status determination,
and CSV exports scoped strictly by tenant_id.
"""

import csv
import io
import uuid
import logging
import asyncpg
import cv2

from datetime import date, datetime, time, timedelta
from typing import List, Optional, Tuple, Union

from app.core.exceptions import NotFoundError, ValidationError
from app.models.attendance import (
    LogAttendanceRequest,
    AttendanceLogResponse,
    DailyAttendanceRecord,
    DailyAttendanceResponse,
    AttendanceSummaryResponse,
)

logger = logging.getLogger(__name__)


def _parse_uuid(tenant_id: Union[str, uuid.UUID]) -> uuid.UUID:
    if isinstance(tenant_id, uuid.UUID):
        return tenant_id
    return uuid.UUID(str(tenant_id))


# ── 1. LOG ATTENDANCE ─────────────────────────────────────────────────
async def log_attendance(
    db: asyncpg.Connection,
    tenant_id: Union[str, uuid.UUID],
    payload: LogAttendanceRequest,
) -> AttendanceLogResponse:

    tenant_uuid = _parse_uuid(tenant_id)

    # 1. Verify employee exists in tenant
    emp = await db.fetchrow(
        """
        SELECT id, name
        FROM employees
        WHERE tenant_id = $1
          AND emp_id = $2
          AND is_active = TRUE
        """,
        tenant_uuid,
        payload.emp_id,
    )

    if not emp:
        raise NotFoundError(
            f"Active employee with ID '{payload.emp_id}'"
        )

    log_dt = payload.timestamp or datetime.now()
    log_date = log_dt.date()
    log_time = log_dt.time()

    event_type = (payload.log_type or "entry").lower()

    if event_type not in ("entry", "exit"):
        event_type = "entry"

    # 2. Insert into attendance_logs table
    row = await db.fetchrow(
        """
        INSERT INTO attendance_logs (
            tenant_id,
            emp_id,
            name,
            date,
            time,
            camera_id,
            event_type,
            confidence
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        """,
        tenant_uuid,
        payload.emp_id,
        emp["name"],
        log_date,
        log_time,
        payload.camera_id,
        event_type,
        payload.confidence,
    )

    combined_timestamp = datetime.combine(
        row["date"],
        row["time"],
    )

    logger.info(
        "📌 Logged attendance [%s]: emp_id='%s' (%s) at %s "
        "(camera_id=%s, confidence=%s)",
        event_type,
        payload.emp_id,
        emp["name"],
        combined_timestamp.strftime("%Y-%m-%d %H:%M:%S"),
        payload.camera_id,
        payload.confidence,
    )

    return AttendanceLogResponse(
        id=row["id"],
        tenant_id=str(row["tenant_id"]),
        emp_id=row["emp_id"],
        camera_id=row["camera_id"],
        timestamp=combined_timestamp,
        log_type=row["event_type"],
        confidence=(
            float(row["confidence"])
            if row["confidence"] is not None
            else None
        ),
    )


# ── 2. GET DAILY ATTENDANCE & WORKING HOURS ───────────────────────────
async def get_daily_attendance(
    db: asyncpg.Connection,
    tenant_id: Union[str, uuid.UUID],
    target_date: date,
    department: Optional[str] = None,
) -> DailyAttendanceResponse:

    tenant_uuid = _parse_uuid(tenant_id)

    # 1. Fetch active employees
    if department:
        emp_rows = await db.fetch(
            """
            SELECT emp_id, name, department
            FROM employees
            WHERE tenant_id = $1
              AND is_active = TRUE
              AND department = $2
            ORDER BY name ASC
            """,
            tenant_uuid,
            department,
        )
    else:
        emp_rows = await db.fetch(
            """
            SELECT emp_id, name, department
            FROM employees
            WHERE tenant_id = $1
              AND is_active = TRUE
            ORDER BY name ASC
            """,
            tenant_uuid,
        )

    if not emp_rows:
        return DailyAttendanceResponse(
            success=True,
            attendance_date=target_date,
            total=0,
            records=[],
        )

    # 2. Fetch logs for target_date
    logs = await db.fetch(
        """
        SELECT id, emp_id, date, time, event_type
        FROM attendance_logs
        WHERE tenant_id = $1
          AND date = $2
        ORDER BY time ASC
        """,
        tenant_uuid,
        target_date,
    )

    # 3. Fetch approved leaves for target_date
    leaves = await db.fetch(
        """
        SELECT emp_id
        FROM leave_requests
        WHERE tenant_id = $1
          AND status = 'approved'
          AND $2 BETWEEN from_date AND to_date
        """,
        tenant_uuid,
        target_date,
    )

    on_leave_emp_ids = {r["emp_id"] for r in leaves}

    # 4. Group logs by employee
    emp_logs = {}

    for log in logs:
        eid = log["emp_id"]

        if eid not in emp_logs:
            emp_logs[eid] = []

        emp_logs[eid].append(log)

    records: List[DailyAttendanceRecord] = []

    # 5. Build daily attendance records
    for emp in emp_rows:

        eid = emp["emp_id"]
        logs_list = emp_logs.get(eid, [])

        first_in: Optional[str] = None
        last_out: Optional[str] = None

        first_in_dt: Optional[datetime] = None
        last_out_dt: Optional[datetime] = None
        last_out_image_url: Optional[str] = None

        total_hours: float = 0.0
        status: str = "Absent"

        # Initialize these for every employee
        entry_logs = []
        exit_logs = []
        first_in_log = None

        # ------------------------------------------------------------
        # ON LEAVE
        # ------------------------------------------------------------
        if eid in on_leave_emp_ids:

            status = "On-Leave"

        # ------------------------------------------------------------
        # ATTENDANCE LOGS EXIST
        # ------------------------------------------------------------
        elif logs_list:

            entry_logs = [
                l
                for l in logs_list
                if (l["event_type"] or "").lower() == "entry"
            ]

            exit_logs = [
                l
                for l in logs_list
                if (l["event_type"] or "").lower() == "exit"
            ]

            # --------------------------------------------------------
            # FIRST ENTRY
            # --------------------------------------------------------
            if entry_logs:

                first_in_log = entry_logs[0]

                first_in_dt = datetime.combine(
                    target_date,
                    first_in_log["time"],
                )

            else:

                first_in_dt = datetime.combine(
                    target_date,
                    logs_list[0]["time"],
                )

            # --------------------------------------------------------
            # LAST EXIT
            # --------------------------------------------------------
            last_out_log = None

            if exit_logs:
               last_out_log = exit_logs[-1]

               last_out_dt = datetime.combine(
                    target_date,
                    exit_logs[-1]["time"],
                )

            elif len(logs_list) > 1:
               last_out_log = logs_list[-1]

               last_out_dt = datetime.combine(
                    target_date,
                    logs_list[-1]["time"],
                )
            # --------------------------------------------------------
            # FORMAT TIMES
            # --------------------------------------------------------
            first_in = (
                first_in_dt.strftime("%H:%M:%S")
                if first_in_dt
                else None
            )

            last_out = (
                last_out_dt.strftime("%H:%M:%S")
                if last_out_dt
                else None
            )

            # --------------------------------------------------------
            # TOTAL HOURS
            # --------------------------------------------------------
            if (
                first_in_dt
                and last_out_dt
                and last_out_dt > first_in_dt
            ):

                diff_seconds = (
                    last_out_dt - first_in_dt
                ).total_seconds()

                total_hours = round(
                    diff_seconds / 3600.0,
                    2,
                )

            # --------------------------------------------------------
            # STATUS
            # --------------------------------------------------------
            if total_hours >= 6.5:

                status = "Present"

            elif total_hours >= 3.5:

                status = "Half-Day"

            elif first_in_dt:

                status = "Present"

            else:

                status = "Absent"

        # ------------------------------------------------------------
        # CREATE RESPONSE RECORD
        # ------------------------------------------------------------
        records.append(
            DailyAttendanceRecord(
                emp_id=eid,
                name=emp["name"],
                department=emp["department"],
                attendance_date=target_date,

                first_in=first_in,

                # Exact recognized image used for first entry
                first_in_image_url=(
                    f"/api/v1/attendance/recognized-photo"
                    f"?tenant_id={tenant_uuid}"
                    f"&date={target_date}"
                    f"&emp_id={eid}"
                    f"&cam_type={first_in_log['event_type']}"
                    f"&file={first_in_log['time'].strftime('%H-%M-%S')}.jpg"
                )
                if first_in_log
                else None,
                last_out_image_url=(
                    f"/api/v1/attendance/recognized-photo"
                    f"?tenant_id={tenant_uuid}"
                    f"&date={target_date}"
                    f"&emp_id={eid}"
                    f"&cam_type={last_out_log['event_type']}"
                    f"&file={last_out_log['time'].strftime('%H-%M-%S')}.jpg"
                )                    
                if  last_out_log
                else None,

                last_out=last_out,
                total_hours=total_hours,
                entry_count=len(entry_logs),
                exit_count=len(exit_logs),
                status=status,
            )
        )

    # 6. Return response
    return DailyAttendanceResponse(
        success=True,
        attendance_date=target_date,
        total=len(records),
        records=records,
    )


# ── 3. ATTENDANCE SUMMARY DASHBOARD METRICS ───────────────────────────
async def get_attendance_summary(
    db: asyncpg.Connection,
    tenant_id: Union[str, uuid.UUID],
    target_date: date,
) -> AttendanceSummaryResponse:

    daily_res = await get_daily_attendance(
        db,
        tenant_id,
        target_date,
    )

    total_employees = daily_res.total

    present_count = 0
    absent_count = 0
    late_count = 0
    on_leave_count = 0

    for rec in daily_res.records:

        if rec.status == "Present":
            present_count += 1

        elif rec.status == "Late":
            present_count += 1
            late_count += 1

        elif rec.status == "Half-Day":
            present_count += 1

        elif rec.status == "On-Leave":
            on_leave_count += 1

        else:
            absent_count += 1

    return AttendanceSummaryResponse(
        success=True,
        attendance_date=target_date,
        total_employees=total_employees,
        present_count=present_count,
        absent_count=absent_count,
        late_count=late_count,
        on_leave_count=on_leave_count,
    )


# ── 4. EXPORT ATTENDANCE CSV REPORT ───────────────────────────────────
async def export_attendance_csv(
    db: asyncpg.Connection,
    tenant_id: Union[str, uuid.UUID],
    target_date: date,
) -> str:

    daily_res = await get_daily_attendance(
        db,
        tenant_id,
        target_date,
    )

    output = io.StringIO()
    writer = csv.writer(output)

    # Write Header
    writer.writerow(
        [
            "Emp ID",
            "Name",
            "Department",
            "Date",
            "First IN",
            "Last OUT",
            "Total Hours",
            "Status",
        ]
    )

    # Write Records
    for r in daily_res.records:

        writer.writerow(
            [
                r.emp_id,
                r.name,
                r.department or "",
                r.attendance_date.strftime("%Y-%m-%d"),
                r.first_in or "",
                r.last_out or "",
                r.total_hours or 0.0,
                r.status,
            ]
        )

    return output.getvalue()