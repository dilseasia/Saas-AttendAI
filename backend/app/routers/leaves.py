"""
routers/leaves.py
─────────────────
Leaves & Attendance Requests Router: Handles Leave Applications, Balances,
Approvals/Rejections, and Attendance Regularization/WFH Requests.

Prefixes: /api/v1/leaves and /api/v1/requests
"""

import asyncpg
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status

from app.core.database import get_db
from app.core.dependencies import AuthUser, HRUser
from app.models.leaves import (
    ApplyLeaveRequest,
    LeaveReviewRequest,
    LeaveRequestResponse,
    LeaveBalanceResponse,
    ApplyAttendanceRequest,
    AttendanceRequestResponse,
)
from app.services import leaves_service

leaves_router = APIRouter(prefix="/leaves", tags=["Leaves Management"])
requests_router = APIRouter(prefix="/requests", tags=["Attendance Requests"])


# ── LEAVES ENDPOINTS ──────────────────────────────────────────────────
@leaves_router.post(
    "/apply",
    response_model=LeaveRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Apply for leave (CL, SL, PL)",
)
async def apply_leave(
    user: AuthUser,
    payload: ApplyLeaveRequest,
    db: asyncpg.Connection = Depends(get_db),
) -> LeaveRequestResponse:
    emp_id = payload.emp_id or user.email
    return await leaves_service.apply_leave(db, user.tenant_id, emp_id, payload)


@leaves_router.get(
    "/my-leaves",
    response_model=List[LeaveRequestResponse],
    summary="Get my applied leave history",
)
async def get_my_leaves(
    user: AuthUser,
    emp_id: Optional[str] = Query(None, description="Employee ID"),
    db: asyncpg.Connection = Depends(get_db),
) -> List[LeaveRequestResponse]:
    target_emp_id = emp_id or user.email
    return await leaves_service.get_my_leaves(db, user.tenant_id, target_emp_id)


@leaves_router.get(
    "/pending",
    response_model=List[LeaveRequestResponse],
    summary="Get pending leave applications (HR / Admin only)",
)
async def get_pending_leaves(
    user: HRUser,
    db: asyncpg.Connection = Depends(get_db),
) -> List[LeaveRequestResponse]:
    return await leaves_service.get_pending_leaves(db, user.tenant_id)


@leaves_router.post(
    "/{leave_id}/review",
    response_model=LeaveRequestResponse,
    summary="Approve or Reject leave request (HR / Admin only)",
)
async def review_leave(
    leave_id: int,
    payload: LeaveReviewRequest,
    user: HRUser,
    db: asyncpg.Connection = Depends(get_db),
) -> LeaveRequestResponse:
    return await leaves_service.review_leave(db, user.tenant_id, leave_id, user.name or user.email, payload)


@leaves_router.get(
    "/balances",
    response_model=LeaveBalanceResponse,
    summary="Get leave balance summary (CL, SL, PL)",
)
async def get_leave_balances(
    user: AuthUser,
    emp_id: Optional[str] = Query(None, description="Employee ID"),
    year: Optional[int] = Query(None, description="Year (defaults to current year)"),
    db: asyncpg.Connection = Depends(get_db),
) -> LeaveBalanceResponse:
    target_emp_id = emp_id or user.email
    return await leaves_service.get_leave_balances(db, user.tenant_id, target_emp_id, year=year)


# ── ATTENDANCE REGULARIZATION REQUESTS ENDPOINTS ──────────────────────
@requests_router.post(
    "/apply",
    response_model=AttendanceRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit attendance regularization / WFH request",
)
async def apply_attendance_request(
    user: AuthUser,
    payload: ApplyAttendanceRequest,
    db: asyncpg.Connection = Depends(get_db),
) -> AttendanceRequestResponse:
    emp_id = payload.emp_id or user.email
    return await leaves_service.apply_attendance_request(db, user.tenant_id, emp_id, payload)


@requests_router.get(
    "/pending",
    response_model=List[AttendanceRequestResponse],
    summary="Get pending attendance regularization requests (HR / Admin only)",
)
async def get_pending_attendance_requests(
    user: HRUser,
    db: asyncpg.Connection = Depends(get_db),
) -> List[AttendanceRequestResponse]:
    return await leaves_service.get_pending_attendance_requests(db, user.tenant_id)


@requests_router.post(
    "/{request_id}/review",
    response_model=AttendanceRequestResponse,
    summary="Approve or Reject attendance request (HR / Admin only)",
)
async def review_attendance_request(
    request_id: int,
    payload: LeaveReviewRequest,
    user: HRUser,
    db: asyncpg.Connection = Depends(get_db),
) -> AttendanceRequestResponse:
    return await leaves_service.review_attendance_request(db, user.tenant_id, request_id, user.name or user.email, payload)
