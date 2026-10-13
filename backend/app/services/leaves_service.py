"""
services/leaves_service.py
───────────────────────────
Service logic for Leave Applications, Approvals, Balances, and Attendance Regularization.
All DB queries are scoped strictly by tenant_id.
"""

import uuid
import logging
import asyncpg
from datetime import date, datetime, time, timedelta
from typing import List, Optional, Union, Dict, Any

from app.core.exceptions import NotFoundError, ValidationError
from app.models.leaves import (
    ApplyLeaveRequest,
    LeaveReviewRequest,
    LeaveRequestResponse,
    LeaveBalanceRecord,
    LeaveBalanceResponse,
    ApplyAttendanceRequest,
    AttendanceRequestResponse,
    ReviewSingleRequest,
    BulkReviewRequest,
)

logger = logging.getLogger(__name__)


def _parse_uuid(tenant_id: Union[str, uuid.UUID]) -> uuid.UUID:
    if isinstance(tenant_id, uuid.UUID):
        return tenant_id
    return uuid.UUID(str(tenant_id))


# ── HELPER: Ensure Leave Types Exist for Tenant ──────────────────────
async def _get_or_create_leave_type(db: asyncpg.Connection, tenant_uuid: uuid.UUID, code: str) -> int:
    code_upper = code.upper()
    row = await db.fetchrow(
        "SELECT id FROM leave_types WHERE tenant_id = $1 AND UPPER(code) = $2",
        tenant_uuid,
        code_upper,
    )
    if row:
        return row["id"]

    # Seed default leave type
    name_map = {"CL": "Casual Leave", "SL": "Sick Leave", "PL": "Paid Leave"}
    name = name_map.get(code_upper, f"{code_upper} Leave")
    days = 12.0 if code_upper in ("CL", "SL") else 15.0

    new_row = await db.fetchrow(
        """
        INSERT INTO leave_types (tenant_id, name, code, days_per_year, carry_forward)
        VALUES ($1, $2, $3, $4, FALSE)
        RETURNING id
        """,
        tenant_uuid,
        name,
        code_upper,
        days,
    )
    return new_row["id"]


# ── 1. APPLY LEAVE ────────────────────────────────────────────────────
async def apply_leave(
    db: asyncpg.Connection,
    tenant_id: Union[str, uuid.UUID],
    emp_id: str,
    payload: ApplyLeaveRequest,
) -> LeaveRequestResponse:

    tenant_uuid = _parse_uuid(tenant_id)

    # 1. Fetch employee
    emp = await db.fetchrow(
        "SELECT name FROM employees WHERE tenant_id = $1 AND emp_id = $2 AND is_active = TRUE",
        tenant_uuid,
        emp_id,
    )
    if not emp:
        raise NotFoundError(f"Employee '{emp_id}'")

    if payload.to_date < payload.from_date:
        raise ValidationError("End date cannot be earlier than start date.")

    total_days = float((payload.to_date - payload.from_date).days + 1)
    leave_type_id = await _get_or_create_leave_type(db, tenant_uuid, payload.leave_type)

    row = await db.fetchrow(
        """
        INSERT INTO leave_requests (tenant_id, emp_id, name, leave_type_id, from_date, to_date, total_days, reason, status, applied_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW())
        RETURNING *
        """,
        tenant_uuid,
        emp_id,
        emp["name"],
        leave_type_id,
        payload.from_date,
        payload.to_date,
        total_days,
        payload.reason,
    )

    logger.info("📝 Leave applied: emp_id='%s', days=%s (%s to %s)", emp_id, total_days, payload.from_date, payload.to_date)

    return LeaveRequestResponse(
        id=row["id"],
        tenant_id=str(row["tenant_id"]),
        emp_id=row["emp_id"],
        name=row["name"],
        leave_type=payload.leave_type.upper(),
        from_date=row["from_date"],
        to_date=row["to_date"],
        total_days=float(row["total_days"]),
        reason=row["reason"],
        status=row["status"],
        applied_at=row["applied_at"],
    )


# ── 2. GET MY LEAVES ──────────────────────────────────────────────────
async def get_my_leaves(
    db: asyncpg.Connection,
    tenant_id: Union[str, uuid.UUID],
    emp_id: str,
) -> List[LeaveRequestResponse]:

    tenant_uuid = _parse_uuid(tenant_id)
    rows = await db.fetch(
        """
        SELECT lr.*, lt.code as leave_code
        FROM leave_requests lr
        LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
        WHERE lr.tenant_id = $1 AND lr.emp_id = $2
        ORDER BY lr.applied_at DESC
        """,
        tenant_uuid,
        emp_id,
    )

    return [
        LeaveRequestResponse(
            id=r["id"],
            tenant_id=str(r["tenant_id"]),
            emp_id=r["emp_id"],
            name=r["name"],
            leave_type=r["leave_code"] or "CL",
            from_date=r["from_date"],
            to_date=r["to_date"],
            total_days=float(r["total_days"]),
            reason=r["reason"],
            status=r["status"],
            applied_at=r["applied_at"],
            reviewed_by=r["reviewed_by"],
            reviewed_at=r["reviewed_at"],
            remarks=r["remarks"],
        )
        for r in rows
    ]


# ── 3. GET PENDING LEAVES (FOR HR/ADMIN) ──────────────────────────────
async def get_pending_leaves(
    db: asyncpg.Connection,
    tenant_id: Union[str, uuid.UUID],
) -> List[LeaveRequestResponse]:

    tenant_uuid = _parse_uuid(tenant_id)
    rows = await db.fetch(
        """
        SELECT lr.*, lt.code as leave_code
        FROM leave_requests lr
        LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
        WHERE lr.tenant_id = $1 AND lr.status = 'pending'
        ORDER BY lr.applied_at ASC
        """,
        tenant_uuid,
    )

    return [
        LeaveRequestResponse(
            id=r["id"],
            tenant_id=str(r["tenant_id"]),
            emp_id=r["emp_id"],
            name=r["name"],
            leave_type=r["leave_code"] or "CL",
            from_date=r["from_date"],
            to_date=r["to_date"],
            total_days=float(r["total_days"]),
            reason=r["reason"],
            status=r["status"],
            applied_at=r["applied_at"],
            reviewed_by=r["reviewed_by"],
            reviewed_at=r["reviewed_at"],
            remarks=r["remarks"],
        )
        for r in rows
    ]


# ── 4. REVIEW LEAVE (APPROVE / REJECT) ────────────────────────────────
async def review_leave(
    db: asyncpg.Connection,
    tenant_id: Union[str, uuid.UUID],
    leave_id: int,
    reviewer_name: str,
    payload: LeaveReviewRequest,
) -> LeaveRequestResponse:

    tenant_uuid = _parse_uuid(tenant_id)
    status_clean = payload.status.lower()
    if status_clean not in ("approved", "rejected"):
        raise ValidationError("Status must be 'approved' or 'rejected'")

    row = await db.fetchrow(
        "SELECT * FROM leave_requests WHERE tenant_id = $1 AND id = $2",
        tenant_uuid,
        leave_id,
    )
    if not row:
        raise NotFoundError(f"Leave request ID {leave_id}")

    updated = await db.fetchrow(
        """
        UPDATE leave_requests
        SET status = $1, reviewed_by = $2, reviewed_at = NOW(), remarks = $3
        WHERE tenant_id = $4 AND id = $5
        RETURNING *
        """,
        status_clean,
        reviewer_name,
        payload.remarks,
        tenant_uuid,
        leave_id,
    )

    # Fetch leave code
    lt_row = await db.fetchrow("SELECT code FROM leave_types WHERE id = $1", updated["leave_type_id"])
    leave_code = lt_row["code"] if lt_row else "CL"

    logger.info("✅ Leave request #%s reviewed -> status='%s' by %s", leave_id, status_clean, reviewer_name)

    return LeaveRequestResponse(
        id=updated["id"],
        tenant_id=str(updated["tenant_id"]),
        emp_id=updated["emp_id"],
        name=updated["name"],
        leave_type=leave_code,
        from_date=updated["from_date"],
        to_date=updated["to_date"],
        total_days=float(updated["total_days"]),
        reason=updated["reason"],
        status=updated["status"],
        applied_at=updated["applied_at"],
        reviewed_by=updated["reviewed_by"],
        reviewed_at=updated["reviewed_at"],
        remarks=updated["remarks"],
    )


# ── 5. GET LEAVE BALANCES ─────────────────────────────────────────────
async def get_leave_balances(
    db: asyncpg.Connection,
    tenant_id: Union[str, uuid.UUID],
    emp_id: str,
    year: Optional[int] = None,
) -> LeaveBalanceResponse:

    tenant_uuid = _parse_uuid(tenant_id)
    target_year = year or date.today().year

    # Seed leave types if not exist
    for code in ("CL", "SL", "PL"):
        await _get_or_create_leave_type(db, tenant_uuid, code)

    types = await db.fetch("SELECT id, code, name, days_per_year FROM leave_types WHERE tenant_id = $1", tenant_uuid)

    records: List[LeaveBalanceRecord] = []

    for t in types:
        lt_id = t["id"]
        code = t["code"]
        total_days = float(t["days_per_year"])

        # Fetch used days from approved leaves
        used_row = await db.fetchrow(
            """
            SELECT COALESCE(SUM(total_days), 0) as used
            FROM leave_requests
            WHERE tenant_id = $1 AND emp_id = $2 AND leave_type_id = $3 AND status = 'approved'
              AND EXTRACT(YEAR FROM from_date) = $4
            """,
            tenant_uuid,
            emp_id,
            lt_id,
            target_year,
        )
        used = float(used_row["used"]) if used_row else 0.0
        remaining = max(0.0, total_days - used)

        records.append(
            LeaveBalanceRecord(
                leave_type=code,
                total_allowed=total_days,
                used=used,
                remaining=remaining,
            )
        )

    return LeaveBalanceResponse(
        success=True,
        emp_id=emp_id,
        year=target_year,
        balances=records,
    )


# ── Helper for time parsing ──────────────────────────────────────────
def _parse_time_str(time_str: Optional[str], default_time: Optional[time] = None) -> Optional[time]:
    if not time_str:
        return default_time
    ts = time_str.strip()
    for fmt in ("%H:%M:%S", "%H:%M", "%I:%M %p", "%I:%M%p", "%I:%M:%S %p", "%I:%M:%S%p"):
        try:
            return datetime.strptime(ts, fmt).time()
        except ValueError:
            pass
    return default_time


# ── 6. ATTENDANCE REGULARIZATION / WFH / LEAVE UNIFIED APPLY ──────────
async def apply_attendance_request(
    db: asyncpg.Connection,
    tenant_id: Union[str, uuid.UUID],
    emp_id: str,
    payload: ApplyAttendanceRequest,
) -> AttendanceRequestResponse:

    active_tenant = payload.tenant_id or tenant_id
    tenant_uuid = _parse_uuid(active_tenant)
    emp = await db.fetchrow(
        "SELECT name FROM employees WHERE tenant_id = $1 AND emp_id = $2 AND is_active = TRUE",
        tenant_uuid,
        emp_id,
    )
    if not emp:
        raise NotFoundError(f"Employee '{emp_id}'")

    req_type_raw = (payload.request_type or "").strip().lower()

    # Case A: If user applies for Leave via this unified endpoint
    if req_type_raw in ("leave", "casual leave", "sick leave", "paid leave", "cl", "sl", "pl", "lwp"):
        code = (payload.leave_type or req_type_raw).upper()
        if code not in ("CL", "SL", "PL", "LWP"):
            code = "CL"
        leave_payload = ApplyLeaveRequest(
            emp_id=emp_id,
            leave_type=code,
            from_date=payload.request_date,
            to_date=payload.to_date or payload.request_date,
            reason=payload.reason,
        )
        leave_res = await apply_leave(db, tenant_uuid, emp_id, leave_payload)
        return AttendanceRequestResponse(
            id=leave_res.id,
            tenant_id=str(tenant_uuid),
            emp_id=emp_id,
            company_name=None,
            name=emp["name"],
            request_type=f"{code} Leave",
            source_type="leave",
            request_date=leave_res.from_date,
            to_date=leave_res.to_date,
            reason=leave_res.reason,
            status=leave_res.status,
            applied_at=leave_res.applied_at,
        )

    # Case B: Attendance Regularization / WFH
    if req_type_raw in ("wfh", "work_from_home", "work from home"):
        normalized_type = "wfh"
    else:
        normalized_type = "manual_entry"

    in_t = _parse_time_str(payload.in_time or payload.punch_time, time(9, 30))
    out_t = _parse_time_str(payload.out_time, time(18, 30))

    start_date = payload.request_date
    end_date = payload.to_date or payload.request_date
    if end_date < start_date:
        end_date = start_date

    last_inserted_row = None
    cur_date = start_date
    while cur_date <= end_date:
        last_inserted_row = await db.fetchrow(
            """
            INSERT INTO attendance_requests (
                tenant_id, emp_id, name, request_type, date, in_time, out_time, reason, status, requested_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW())
            ON CONFLICT (tenant_id, emp_id, date, request_type) DO UPDATE
            SET in_time = EXCLUDED.in_time,
                out_time = EXCLUDED.out_time,
                reason = EXCLUDED.reason,
                status = 'pending',
                requested_at = NOW()
            RETURNING *
            """,
            tenant_uuid,
            emp_id,
            emp["name"],
            normalized_type,
            cur_date,
            in_t,
            out_t,
            payload.reason,
        )
        cur_date += timedelta(days=1)

    row = last_inserted_row
    return AttendanceRequestResponse(
        id=row["id"],
        tenant_id=str(row["tenant_id"]),
        emp_id=row["emp_id"],
        name=row["name"],
        request_type="WFH" if row["request_type"] == "wfh" else "Manual Entry",
        source_type="attendance",
        request_date=start_date,
        to_date=end_date if end_date > start_date else None,
        in_time=row["in_time"].strftime("%I:%M %p") if row["in_time"] else None,
        out_time=row["out_time"].strftime("%I:%M %p") if row["out_time"] else None,
        reason=row["reason"] or "",
        status=row["status"],
        applied_at=row["requested_at"],
    )


async def get_pending_attendance_requests(
    db: asyncpg.Connection,
    tenant_id: Union[str, uuid.UUID],
) -> List[AttendanceRequestResponse]:

    tenant_uuid = _parse_uuid(tenant_id)
    rows = await db.fetch(
        """
        SELECT * FROM attendance_requests
        WHERE tenant_id = $1 AND status = 'pending'
        ORDER BY requested_at ASC
        """,
        tenant_uuid,
    )

    return [
        AttendanceRequestResponse(
            id=r["id"],
            tenant_id=str(r["tenant_id"]),
            emp_id=r["emp_id"],
            name=r["name"],
            request_type="WFH" if r["request_type"] == "wfh" else "Manual Entry",
            source_type="attendance",
            request_date=r["date"],
            in_time=r["in_time"].strftime("%I:%M %p") if r["in_time"] else None,
            out_time=r["out_time"].strftime("%I:%M %p") if r["out_time"] else None,
            reason=r["reason"] or "",
            status=r["status"],
            applied_at=r["requested_at"],
            reviewed_by=r["reviewed_by"],
            reviewed_at=r["reviewed_at"],
            remarks=r["remarks"],
        )
        for r in rows
    ]


async def get_all_requests_with_stats(
    db: asyncpg.Connection,
    tenant_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    type_filter: Optional[str] = None,
    search_query: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
):
    """
    Unifies Attendance Requests (WFH & Manual Entry) and Leave Requests (CL, SL, PL)
    with total / approved / rejected / pending stats.
    """
    params = []
    param_idx = 1

    where_clauses = ["1=1"]

    if tenant_id and tenant_id.upper() != "ALL":
        try:
            t_uuid = _parse_uuid(tenant_id)
            where_clauses.append(f"u.tenant_id = ${param_idx}")
            params.append(t_uuid)
            param_idx += 1
        except Exception:
            pass

    if status_filter and status_filter.lower() not in ("all", "all status"):
        where_clauses.append(f"LOWER(u.status) = ${param_idx}")
        params.append(status_filter.lower())
        param_idx += 1

    if type_filter and type_filter.lower() not in ("all", "all types"):
        tf = type_filter.lower()
        if "wfh" in tf:
            where_clauses.append(f"LOWER(u.request_type) LIKE '%wfh%'")
        elif "manual" in tf or "regular" in tf:
            where_clauses.append(f"LOWER(u.request_type) LIKE '%manual%'")
        elif "leave" in tf:
            where_clauses.append(f"u.source_type = 'leave'")

    if search_query:
        s_term = f"%{search_query.lower()}%"
        where_clauses.append(
            f"(LOWER(u.name) LIKE ${param_idx} OR LOWER(u.emp_id) LIKE ${param_idx} OR LOWER(u.company_name) LIKE ${param_idx} OR LOWER(u.request_type) LIKE ${param_idx})"
        )
        params.append(s_term)
        param_idx += 1

    if from_date:
        where_clauses.append(f"u.request_date >= ${param_idx}")
        params.append(from_date)
        param_idx += 1

    if to_date:
        where_clauses.append(f"u.request_date <= ${param_idx}")
        params.append(to_date)
        param_idx += 1

    where_sql = " AND ".join(where_clauses)

    union_sql = f"""
    WITH unified_requests AS (
        SELECT 
            ar.id, 
            ar.tenant_id, 
            COALESCE(t.name, 'My Company') as company_name, 
            ar.emp_id, 
            ar.name,
            CASE 
                WHEN ar.request_type = 'wfh' THEN 'WFH'
                ELSE 'Manual Entry'
            END as request_type, 
            'attendance' as source_type,
            ar.date as request_date, 
            ar.date as to_date,
            TO_CHAR(ar.in_time, 'HH12:MI AM') as in_time,
            TO_CHAR(ar.out_time, 'HH12:MI AM') as out_time,
            ar.reason, 
            ar.status, 
            ar.requested_at as applied_at,
            ar.reviewed_by, 
            ar.reviewed_at, 
            ar.remarks
        FROM attendance_requests ar
        LEFT JOIN tenants t ON ar.tenant_id = t.id

        UNION ALL

        SELECT 
            lr.id, 
            lr.tenant_id, 
            COALESCE(t.name, 'My Company') as company_name, 
            lr.emp_id, 
            lr.name,
            COALESCE(lt.name, 'Leave') as request_type, 
            'leave' as source_type,
            lr.from_date as request_date, 
            lr.to_date as to_date,
            NULL as in_time,
            NULL as out_time,
            lr.reason, 
            lr.status, 
            lr.applied_at,
            lr.reviewed_by, 
            lr.reviewed_at, 
            lr.remarks
        FROM leave_requests lr
        LEFT JOIN tenants t ON lr.tenant_id = t.id
        LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
    )
    SELECT * FROM unified_requests u
    WHERE {where_sql}
    ORDER BY u.applied_at DESC
    """

    rows = await db.fetch(union_sql, *params)

    # Metrics across unified requests
    tenant_stats_where = ""
    stats_params = []
    if tenant_id and tenant_id.upper() != "ALL":
        try:
            t_uuid = _parse_uuid(tenant_id)
            tenant_stats_where = "WHERE tenant_id = $1"
            stats_params = [t_uuid]
        except Exception:
            pass

    stats_sql = f"""
    WITH unified_all AS (
        SELECT tenant_id, status FROM attendance_requests
        UNION ALL
        SELECT tenant_id, status FROM leave_requests
    )
    SELECT status, COUNT(*) as count 
    FROM unified_all 
    {tenant_stats_where}
    GROUP BY status
    """
    stats_rows = await db.fetch(stats_sql, *stats_params)

    counts = {"pending": 0, "approved": 0, "rejected": 0}
    for sr in stats_rows:
        st = (sr["status"] or "").lower()
        if st in counts:
            counts[st] += int(sr["count"])

    total = sum(counts.values())
    approved_pct = round((counts["approved"] / total * 100)) if total > 0 else 0
    rejected_pct = round((counts["rejected"] / total * 100)) if total > 0 else 0
    pending_pct = round((counts["pending"] / total * 100)) if total > 0 else 0

    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "tenant_id": str(r["tenant_id"]),
            "company_name": r["company_name"],
            "emp_id": r["emp_id"],
            "name": r["name"],
            "avatar_url": f"/api/v1/face/photo/{r['emp_id']}?tenant_id={r['tenant_id']}",
            "request_type": r["request_type"],
            "source_type": r["source_type"],
            "from_date": r["request_date"].isoformat() if r["request_date"] else None,
            "to_date": r["to_date"].isoformat() if r["to_date"] else None,
            "in_time": r["in_time"],
            "out_time": r["out_time"],
            "reason": r["reason"] or "",
            "status": (r["status"] or "pending").capitalize(),
            "applied_at": r["applied_at"].isoformat() if r["applied_at"] else None,
            "requested_on": r["applied_at"].strftime("%m/%d/%Y %I:%M %p") if r["applied_at"] else None,
            "reviewed_by": r["reviewed_by"],
            "reviewed_at": r["reviewed_at"].isoformat() if r["reviewed_at"] else None,
            "remarks": r["remarks"],
        })

    return {
        "success": True,
        "requests": results,
        "stats": {
            "total": total,
            "approved": counts["approved"],
            "approved_pct": approved_pct,
            "rejected": counts["rejected"],
            "rejected_pct": rejected_pct,
            "pending": counts["pending"],
            "pending_pct": pending_pct,
        },
    }


# ── APPROVAL ENGINE: LOG CREATION ON APPROVE ─────────────────────────
async def _process_approved_attendance_request(
    db: asyncpg.Connection,
    req_row: asyncpg.Record,
):
    """
    Inserts or updates 'entry' and 'exit' records into attendance_logs table
    so the daily attendance system immediately reflects the employee as Present (Office or WFH).
    """
    tenant_uuid = req_row["tenant_id"]
    emp_id = req_row["emp_id"]
    name = req_row["name"]
    req_date = req_row["date"]
    loc_type = "wfh" if req_row["request_type"] == "wfh" else "office"

    in_t = req_row["in_time"] or time(9, 30)
    out_t = req_row["out_time"] or time(18, 30)

    # 1. Entry log
    existing_in = await db.fetchrow(
        """
        SELECT id FROM attendance_logs
        WHERE tenant_id = $1 AND emp_id = $2 AND date = $3 AND event_type = 'entry'
        """,
        tenant_uuid,
        emp_id,
        req_date,
    )
    if existing_in:
        await db.execute(
            """
            UPDATE attendance_logs
            SET time = $1, location_type = $2, confidence = 1.0
            WHERE id = $3
            """,
            in_t,
            loc_type,
            existing_in["id"],
        )
    else:
        await db.execute(
            """
            INSERT INTO attendance_logs (tenant_id, emp_id, name, date, time, event_type, location_type, confidence)
            VALUES ($1, $2, $3, $4, $5, 'entry', $6, 1.0)
            """,
            tenant_uuid,
            emp_id,
            name,
            req_date,
            in_t,
            loc_type,
        )

    # 2. Exit log
    if out_t:
        existing_out = await db.fetchrow(
            """
            SELECT id FROM attendance_logs
            WHERE tenant_id = $1 AND emp_id = $2 AND date = $3 AND event_type = 'exit'
            """,
            tenant_uuid,
            emp_id,
            req_date,
        )
        if existing_out:
            await db.execute(
                """
                UPDATE attendance_logs
                SET time = $1, location_type = $2, confidence = 1.0
                WHERE id = $3
                """,
                out_t,
                loc_type,
                existing_out["id"],
            )
        else:
            await db.execute(
                """
                INSERT INTO attendance_logs (tenant_id, emp_id, name, date, time, event_type, location_type, confidence)
                VALUES ($1, $2, $3, $4, $5, 'exit', $6, 1.0)
                """,
                tenant_uuid,
                emp_id,
                name,
                req_date,
                out_t,
                loc_type,
            )


async def review_single_request(
    db: asyncpg.Connection,
    request_id: int,
    reviewer_name: str,
    status: str,
    source_type: Optional[str] = None,
    remarks: Optional[str] = None,
):
    status_clean = status.lower()
    if status_clean not in ("approved", "rejected"):
        raise ValidationError("Status must be 'approved' or 'rejected'")

    # Check if it's in leave_requests
    if source_type == "leave":
        updated_leave = await db.fetchrow(
            """
            UPDATE leave_requests
            SET status = $1, reviewed_by = $2, reviewed_at = NOW(), remarks = $3
            WHERE id = $4
            RETURNING *
            """,
            status_clean,
            reviewer_name,
            remarks,
            request_id,
        )
        return {"success": True, "updated": 1, "source_type": "leave"}

    # Try attendance_requests first
    att_row = await db.fetchrow(
        """
        UPDATE attendance_requests
        SET status = $1, reviewed_by = $2, reviewed_at = NOW(), remarks = $3
        WHERE id = $4
        RETURNING *
        """,
        status_clean,
        reviewer_name,
        remarks,
        request_id,
    )

    if att_row:
        if status_clean == "approved":
            await _process_approved_attendance_request(db, att_row)
        return {"success": True, "updated": 1, "source_type": "attendance"}

    # Fallback to leave_requests if not found in attendance_requests
    leave_row = await db.fetchrow(
        """
        UPDATE leave_requests
        SET status = $1, reviewed_by = $2, reviewed_at = NOW(), remarks = $3
        WHERE id = $4
        RETURNING *
        """,
        status_clean,
        reviewer_name,
        remarks,
        request_id,
    )
    return {"success": True, "updated": 1 if leave_row else 0, "source_type": "leave"}


async def bulk_review_attendance_requests(
    db: asyncpg.Connection,
    request_ids: List[int],
    reviewer_name: str,
    status: str,
    remarks: Optional[str] = None,
    source_type: Optional[str] = None,
    items: Optional[List[dict]] = None,
):
    status_clean = status.lower()
    if status_clean not in ("approved", "rejected"):
        raise ValidationError("Status must be 'approved' or 'rejected'")

    updated_count = 0

    if items and len(items) > 0:
        for itm in items:
            iid = itm.get("id")
            stype = itm.get("source_type", "attendance")
            if iid:
                res = await review_single_request(db, iid, reviewer_name, status_clean, stype, remarks)
                updated_count += res.get("updated", 0)
        return {"success": True, "updated_count": updated_count}

    if not request_ids:
        return {"success": True, "updated_count": 0}

    # 1. Update attendance_requests
    att_rows = await db.fetch(
        """
        UPDATE attendance_requests
        SET status = $1, reviewed_by = $2, reviewed_at = NOW(), remarks = $3
        WHERE id = ANY($4::int[])
        RETURNING *
        """,
        status_clean,
        reviewer_name,
        remarks,
        request_ids,
    )

    if status_clean == "approved":
        for r in att_rows:
            await _process_approved_attendance_request(db, r)

    updated_count += len(att_rows)

    # 2. Update leave_requests for remaining / matching ids
    leave_rows = await db.fetch(
        """
        UPDATE leave_requests
        SET status = $1, reviewed_by = $2, reviewed_at = NOW(), remarks = $3
        WHERE id = ANY($4::int[])
        RETURNING id
        """,
        status_clean,
        reviewer_name,
        remarks,
        request_ids,
    )
    updated_count += len(leave_rows)

    return {"success": True, "updated_count": updated_count}


