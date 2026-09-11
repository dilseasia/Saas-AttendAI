"""
services/leaves_service.py
───────────────────────────
Service logic for Leave Applications, Approvals, Balances, and Attendance Regularization.
All DB queries are scoped strictly by tenant_id.
"""

import uuid
import logging
import asyncpg
from datetime import date, datetime
from typing import List, Optional, Union

from app.core.exceptions import NotFoundError, ValidationError
from app.models.leaves import (
    ApplyLeaveRequest,
    LeaveReviewRequest,
    LeaveRequestResponse,
    LeaveBalanceRecord,
    LeaveBalanceResponse,
    ApplyAttendanceRequest,
    AttendanceRequestResponse,
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


# ── 6. ATTENDANCE REGULARIZATION / WFH REQUESTS ──────────────────────
async def apply_attendance_request(
    db: asyncpg.Connection,
    tenant_id: Union[str, uuid.UUID],
    emp_id: str,
    payload: ApplyAttendanceRequest,
) -> AttendanceRequestResponse:

    tenant_uuid = _parse_uuid(tenant_id)
    emp = await db.fetchrow("SELECT name FROM employees WHERE tenant_id = $1 AND emp_id = $2 AND is_active = TRUE", tenant_uuid, emp_id)
    if not emp:
        raise NotFoundError(f"Employee '{emp_id}'")

    row = await db.fetchrow(
        """
        INSERT INTO attendance_requests (tenant_id, emp_id, name, request_type, date, reason, status, requested_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
        RETURNING *
        """,
        tenant_uuid,
        emp_id,
        emp["name"],
        payload.request_type,
        payload.request_date,
        payload.reason,
    )

    return AttendanceRequestResponse(
        id=row["id"],
        tenant_id=str(row["tenant_id"]),
        emp_id=row["emp_id"],
        name=row["name"],
        request_type=row["request_type"],
        request_date=row["date"],
        reason=row["reason"],
        status=row["status"],
        applied_at=row["requested_at"],
    )


async def get_pending_attendance_requests(
    db: asyncpg.Connection,
    tenant_id: Union[str, uuid.UUID],
) -> List[AttendanceRequestResponse]:

    tenant_uuid = _parse_uuid(tenant_id)
    rows = await db.fetch(
        "SELECT * FROM attendance_requests WHERE tenant_id = $1 AND status = 'pending' ORDER BY requested_at ASC",
        tenant_uuid,
    )

    return [
        AttendanceRequestResponse(
            id=r["id"],
            tenant_id=str(r["tenant_id"]),
            emp_id=r["emp_id"],
            name=r["name"],
            request_type=r["request_type"],
            request_date=r["date"],
            reason=r["reason"],
            status=r["status"],
            applied_at=r["requested_at"],
            reviewed_by=r["reviewed_by"],
            reviewed_at=r["reviewed_at"],
            remarks=r["remarks"],
        )
        for r in rows
    ]


async def review_attendance_request(
    db: asyncpg.Connection,
    tenant_id: Union[str, uuid.UUID],
    request_id: int,
    reviewer_name: str,
    payload: LeaveReviewRequest,
) -> AttendanceRequestResponse:

    tenant_uuid = _parse_uuid(tenant_id)
    status_clean = payload.status.lower()

    row = await db.fetchrow("SELECT * FROM attendance_requests WHERE tenant_id = $1 AND id = $2", tenant_uuid, request_id)
    if not row:
        raise NotFoundError(f"Attendance request ID {request_id}")

    updated = await db.fetchrow(
        """
        UPDATE attendance_requests
        SET status = $1, reviewed_by = $2, reviewed_at = NOW(), remarks = $3
        WHERE tenant_id = $4 AND id = $5
        RETURNING *
        """,
        status_clean,
        reviewer_name,
        payload.remarks,
        tenant_uuid,
        request_id,
    )

    # If approved, insert entry punch in attendance_logs
    if status_clean == "approved":
        await db.execute(
            """
            INSERT INTO attendance_logs (tenant_id, emp_id, name, date, time, event_type, confidence)
            VALUES ($1, $2, $3, $4, '09:00:00', 'entry', 1.0)
            """,
            tenant_uuid,
            updated["emp_id"],
            updated["name"],
            updated["date"],
        )

    return AttendanceRequestResponse(
        id=updated["id"],
        tenant_id=str(updated["tenant_id"]),
        emp_id=updated["emp_id"],
        name=updated["name"],
        request_type=updated["request_type"],
        request_date=updated["date"],
        reason=updated["reason"],
        status=updated["status"],
        applied_at=updated["requested_at"],
        reviewed_by=updated["reviewed_by"],
        reviewed_at=updated["reviewed_at"],
        remarks=updated["remarks"],
    )
