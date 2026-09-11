"""
services/company_service.py
────────────────────────────
Business logic for Employees, Cameras, and Holidays.
Includes plan limit checks (max_employees, max_cameras) and dynamic emp_id formatting.
"""

import logging
import asyncpg
from typing import List, Optional

from app.core.exceptions import ConflictError, NotFoundError, AuthorizationError
from app.services import tenant_service
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

logger = logging.getLogger(__name__)


# ── HELPERS ─────────────────────────────────────────────────────────
def _build_employee_response(row: asyncpg.Record) -> EmployeeResponse:
    return EmployeeResponse(
        id=row["id"],
        tenant_id=str(row["tenant_id"]),
        emp_id=row["emp_id"],
        name=row["name"],
        department=row["department"],
        designation=row["designation"],
        email=row["email"],
        phone=row["phone"],
        shift_id=row["shift_id"],
        face_enrolled=row["face_enrolled"],
        is_active=row["is_active"],
        joining_date=row["joining_date"],
        created_at=row["created_at"],
    )


def _build_camera_response(row: asyncpg.Record) -> CameraResponse:
    return CameraResponse(
        id=row["id"],
        tenant_id=str(row["tenant_id"]),
        name=row["name"],
        stream_url=row["stream_url"],
        type=row["type"],
        location=row["location"],
        is_active=row["is_active"],
        created_at=row["created_at"],
    )


def _build_holiday_response(row: asyncpg.Record) -> HolidayResponse:
    return HolidayResponse(
        id=row["id"],
        tenant_id=str(row["tenant_id"]),
        name=row["name"],
        holiday_date=row["date"],
        type=row["type"],
    )


# ───────────────────────────────────────────────────────────────────
#  1. EMPLOYEES SERVICE
# ───────────────────────────────────────────────────────────────────

async def create_employee(
    db: asyncpg.Connection, tenant_id: str, payload: CreateEmployeeRequest
) -> EmployeeResponse:

    # 1. Enforce max_employees plan limit
    tenant_row = await db.fetchrow(
        "SELECT max_employees FROM tenants WHERE id = $1", tenant_id
    )
    if not tenant_row:
        raise NotFoundError("Tenant")

    max_employees = tenant_row["max_employees"]
    current_count = await db.fetchval(
        "SELECT COUNT(*) FROM employees WHERE tenant_id = $1", tenant_id
    )

    if max_employees is not None and current_count >= max_employees:
        raise AuthorizationError(
            f"Employee limit reached ({current_count}/{max_employees}). Please upgrade your plan."
        )

    # 2. Determine emp_id (auto-generate if missing)
    if payload.emp_id and payload.emp_id.strip():
        emp_id = payload.emp_id.strip()
    else:
        emp_id = await tenant_service.generate_next_emp_id(db, tenant_id)

    # 3. Check duplicate emp_id for this tenant
    existing = await db.fetchval(
        "SELECT id FROM employees WHERE tenant_id = $1 AND emp_id = $2",
        tenant_id,
        emp_id,
    )
    if existing:
        raise ConflictError(f"Employee ID '{emp_id}' already exists in your company")

    # 4. Insert Employee (shift_id is None temporarily)
    row = await db.fetchrow(
        """
        INSERT INTO employees (
            tenant_id, emp_id, name, department, designation, email, phone, joining_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        """,
        tenant_id,
        emp_id,
        payload.name,
        payload.department,
        payload.designation,
        payload.email,
        payload.phone,
        payload.joining_date,
    )

    logger.info("👥 Employee created: %s (%s) for tenant_id=%s", payload.name, emp_id, tenant_id)
    return _build_employee_response(row)


async def get_employees(
    db: asyncpg.Connection,
    tenant_id: str,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
) -> EmployeeListResponse:

    query = "SELECT * FROM employees WHERE tenant_id = $1"
    params = [tenant_id]

    if is_active is not None:
        params.append(is_active)
        query += f" AND is_active = ${len(params)}"

    if search and search.strip():
        search_pattern = f"%{search.strip()}%"
        params.append(search_pattern)
        query += f" AND (name ILIKE ${len(params)} OR emp_id ILIKE ${len(params)} OR department ILIKE ${len(params)})"

    query += " ORDER BY created_at DESC"

    rows = await db.fetch(query, *params)
    employees = [_build_employee_response(r) for r in rows]
    return EmployeeListResponse(total=len(employees), employees=employees)


async def get_employee(db: asyncpg.Connection, tenant_id: str, emp_id_or_db_id: str) -> EmployeeResponse:
    if emp_id_or_db_id.isdigit():
        row = await db.fetchrow(
            "SELECT * FROM employees WHERE tenant_id = $1 AND (id = $2 OR emp_id = $3)",
            tenant_id,
            int(emp_id_or_db_id),
            emp_id_or_db_id,
        )
    else:
        row = await db.fetchrow(
            "SELECT * FROM employees WHERE tenant_id = $1 AND emp_id = $2",
            tenant_id,
            emp_id_or_db_id,
        )

    if not row:
        raise NotFoundError("Employee")
    return _build_employee_response(row)


async def update_employee(
    db: asyncpg.Connection, tenant_id: str, emp_db_id: int, payload: UpdateEmployeeRequest
) -> EmployeeResponse:

    existing = await db.fetchrow(
        "SELECT * FROM employees WHERE tenant_id = $1 AND id = $2", tenant_id, emp_db_id
    )
    if not existing:
        raise NotFoundError("Employee")

    name = payload.name if payload.name is not None else existing["name"]
    dept = payload.department if payload.department is not None else existing["department"]
    desig = payload.designation if payload.designation is not None else existing["designation"]
    email = payload.email if payload.email is not None else existing["email"]
    phone = payload.phone if payload.phone is not None else existing["phone"]
    active = payload.is_active if payload.is_active is not None else existing["is_active"]
    joining = payload.joining_date if payload.joining_date is not None else existing["joining_date"]

    updated_row = await db.fetchrow(
        """
        UPDATE employees
        SET
            name = $1,
            department = $2,
            designation = $3,
            email = $4,
            phone = $5,
            is_active = $6,
            joining_date = $7
        WHERE tenant_id = $8 AND id = $9
        RETURNING *
        """,
        name,
        dept,
        desig,
        email,
        phone,
        active,
        joining,
        tenant_id,
        emp_db_id,
    )

    logger.info("📝 Employee updated: ID %d (%s) for tenant_id=%s", emp_db_id, name, tenant_id)
    return _build_employee_response(updated_row)


async def delete_employee(db: asyncpg.Connection, tenant_id: str, emp_db_id: int) -> bool:
    res = await db.execute(
        "DELETE FROM employees WHERE tenant_id = $1 AND id = $2", tenant_id, emp_db_id
    )
    if res == "DELETE 0":
        raise NotFoundError("Employee")
    return True


# ───────────────────────────────────────────────────────────────────
#  2. CAMERAS SERVICE
# ───────────────────────────────────────────────────────────────────

async def create_camera(
    db: asyncpg.Connection, tenant_id: str, payload: CreateCameraRequest
) -> CameraResponse:

    # 1. Enforce max_cameras plan limit
    tenant_row = await db.fetchrow(
        "SELECT max_cameras FROM tenants WHERE id = $1", tenant_id
    )
    if not tenant_row:
        raise NotFoundError("Tenant")

    max_cameras = tenant_row["max_cameras"]
    current_count = await db.fetchval(
        "SELECT COUNT(*) FROM cameras WHERE tenant_id = $1", tenant_id
    )

    if max_cameras is not None and current_count >= max_cameras:
        raise AuthorizationError(
            f"Camera limit reached ({current_count}/{max_cameras}). Please upgrade your plan."
        )

    # 2. Check duplicate name per tenant
    existing = await db.fetchval(
        "SELECT id FROM cameras WHERE tenant_id = $1 AND name = $2",
        tenant_id,
        payload.name,
    )
    if existing:
        raise ConflictError(f"A camera named '{payload.name}' already exists")

    # 3. Insert camera
    row = await db.fetchrow(
        """
        INSERT INTO cameras (tenant_id, name, stream_url, type, location)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        """,
        tenant_id,
        payload.name,
        payload.stream_url,
        payload.type,
        payload.location,
    )

    logger.info("🎥 Camera added: %s (%s) for tenant_id=%s", payload.name, payload.type, tenant_id)
    return _build_camera_response(row)


async def get_cameras(db: asyncpg.Connection, tenant_id: str) -> CameraListResponse:
    rows = await db.fetch(
        "SELECT * FROM cameras WHERE tenant_id = $1 ORDER BY created_at ASC", tenant_id
    )
    cameras = [_build_camera_response(r) for r in rows]
    return CameraListResponse(total=len(cameras), cameras=cameras)


async def update_camera(
    db: asyncpg.Connection, tenant_id: str, camera_id: int, payload: UpdateCameraRequest
) -> CameraResponse:

    existing = await db.fetchrow(
        "SELECT * FROM cameras WHERE tenant_id = $1 AND id = $2", tenant_id, camera_id
    )
    if not existing:
        raise NotFoundError("Camera")

    name = payload.name if payload.name is not None else existing["name"]
    url = payload.stream_url if payload.stream_url is not None else existing["stream_url"]
    cam_type = payload.type if payload.type is not None else existing["type"]
    location = payload.location if payload.location is not None else existing["location"]
    active = payload.is_active if payload.is_active is not None else existing["is_active"]

    updated_row = await db.fetchrow(
        """
        UPDATE cameras
        SET
            name = $1,
            stream_url = $2,
            type = $3,
            location = $4,
            is_active = $5
        WHERE tenant_id = $6 AND id = $7
        RETURNING *
        """,
        name,
        url,
        cam_type,
        location,
        active,
        tenant_id,
        camera_id,
    )

    return _build_camera_response(updated_row)


async def delete_camera(db: asyncpg.Connection, tenant_id: str, camera_id: int) -> bool:
    res = await db.execute(
        "DELETE FROM cameras WHERE tenant_id = $1 AND id = $2", tenant_id, camera_id
    )
    if res == "DELETE 0":
        raise NotFoundError("Camera")
    return True


# ───────────────────────────────────────────────────────────────────
#  3. HOLIDAYS SERVICE
# ───────────────────────────────────────────────────────────────────

async def create_holiday(
    db: asyncpg.Connection, tenant_id: str, payload: CreateHolidayRequest
) -> HolidayResponse:

    existing = await db.fetchval(
        "SELECT id FROM holidays WHERE tenant_id = $1 AND date = $2",
        tenant_id,
        payload.holiday_date,
    )
    if existing:
        raise ConflictError(f"A holiday is already scheduled on date {payload.holiday_date}")

    row = await db.fetchrow(
        """
        INSERT INTO holidays (tenant_id, name, date, type)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        """,
        tenant_id,
        payload.name,
        payload.holiday_date,
        payload.type,
    )

    logger.info("🏖️ Holiday created: %s on %s for tenant_id=%s", payload.name, payload.holiday_date, tenant_id)
    return _build_holiday_response(row)


async def get_holidays(
    db: asyncpg.Connection, tenant_id: str, year: Optional[int] = None
) -> HolidayListResponse:

    if year:
        rows = await db.fetch(
            "SELECT * FROM holidays WHERE tenant_id = $1 AND EXTRACT(YEAR FROM date) = $2 ORDER BY date ASC",
            tenant_id,
            year,
        )
    else:
        rows = await db.fetch(
            "SELECT * FROM holidays WHERE tenant_id = $1 ORDER BY date ASC", tenant_id
        )

    holidays = [_build_holiday_response(r) for r in rows]
    return HolidayListResponse(total=len(holidays), holidays=holidays)


async def delete_holiday(db: asyncpg.Connection, tenant_id: str, holiday_id: int) -> bool:
    res = await db.execute(
        "DELETE FROM holidays WHERE tenant_id = $1 AND id = $2", tenant_id, holiday_id
    )
    if res == "DELETE 0":
        raise NotFoundError("Holiday")
    return True
