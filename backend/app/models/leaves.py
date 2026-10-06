"""
models/leaves.py
────────────────
Pydantic models for Leave Applications, Balances, and Attendance Regularization/WFH Requests.
"""

from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class ApplyLeaveRequest(BaseModel):
    emp_id: Optional[str] = Field(None, description="Employee ID e.g. 'P6EMP01' (defaults to current user)")
    leave_type: str = Field(..., description="Type of leave: 'CL', 'SL', 'PL', or custom string")
    from_date: date = Field(..., description="Leave start date")
    to_date: date = Field(..., description="Leave end date")
    reason: str = Field(..., description="Reason for leave application")


class LeaveReviewRequest(BaseModel):
    status: str = Field(..., description="Review status: 'approved' or 'rejected'")
    remarks: Optional[str] = Field(None, description="Reviewer remarks/comments")


class LeaveRequestResponse(BaseModel):
    id: int
    tenant_id: str
    emp_id: str
    name: str
    leave_type: str
    from_date: date
    to_date: date
    total_days: float
    reason: str
    status: str
    applied_at: datetime
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    remarks: Optional[str] = None


class LeaveBalanceRecord(BaseModel):
    leave_type: str
    total_allowed: float
    used: float
    remaining: float


class LeaveBalanceResponse(BaseModel):
    success: bool = True
    emp_id: str
    year: int
    balances: List[LeaveBalanceRecord]


# ── Attendance Regularization / WFH Request Models ───────────────────
class ApplyAttendanceRequest(BaseModel):
    emp_id: Optional[str] = Field(None, description="Employee ID e.g. 'P6EMP01'")
    request_type: str = Field("manual_punch", description="Type: 'manual_punch', 'wfh', 'photo_capture'")
    request_date: date = Field(..., description="Target date for regularization")
    punch_time: Optional[str] = Field(None, description="Optional time e.g. '09:15:00'")
    reason: str = Field(..., description="Reason for regularization request")


class AttendanceRequestResponse(BaseModel):
    id: int
    tenant_id: str
    emp_id: str
    company_name: Optional[str] = None
    name: str
    request_type: str
    request_date: date
    to_date: Optional[date] = None
    punch_time: Optional[str] = None
    reason: str
    status: str
    applied_at: datetime
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    remarks: Optional[str] = None


class BulkReviewRequest(BaseModel):
    ids: List[int] = Field(..., description="List of request IDs to review")
    status: str = Field(..., description="'approved' or 'rejected'")
    remarks: Optional[str] = Field(None, description="Optional reviewer remarks")

