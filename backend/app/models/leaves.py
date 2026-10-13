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
    tenant_id: Optional[str] = Field(None, description="Company tenant ID (if admin/superadmin)")
    emp_id: Optional[str] = Field(None, description="Employee ID e.g. 'P6EMP01'")
    request_type: str = Field("manual_entry", description="Type: 'manual_entry', 'wfh', 'leave'")
    request_date: date = Field(..., description="Target date for regularization or leave start")
    to_date: Optional[date] = Field(None, description="Target end date for multi-day WFH or leave")
    in_time: Optional[str] = Field(None, description="In-time e.g. '09:30:00'")
    out_time: Optional[str] = Field(None, description="Out-time e.g. '18:30:00'")
    punch_time: Optional[str] = Field(None, description="Optional time alias for in_time")
    leave_type: Optional[str] = Field(None, description="Leave code (CL, SL, PL, LWP) if request_type='leave'")
    reason: str = Field(..., description="Reason for request")


class AttendanceRequestResponse(BaseModel):
    id: int
    tenant_id: str
    emp_id: str
    company_name: Optional[str] = None
    name: str
    request_type: str
    source_type: Optional[str] = "attendance"
    request_date: date
    to_date: Optional[date] = None
    in_time: Optional[str] = None
    out_time: Optional[str] = None
    punch_time: Optional[str] = None
    reason: str
    status: str
    applied_at: datetime
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    remarks: Optional[str] = None


class ReviewItem(BaseModel):
    id: int
    source_type: Optional[str] = "attendance"


class ReviewSingleRequest(BaseModel):
    id: int
    status: str = Field(..., description="'approved' or 'rejected'")
    remarks: Optional[str] = Field(None, description="Optional reviewer remarks")
    source_type: Optional[str] = Field("attendance", description="'attendance' or 'leave'")


class BulkReviewRequest(BaseModel):
    ids: Optional[List[int]] = Field(default=[], description="List of request IDs to review")
    items: Optional[List[dict]] = Field(default=None, description="List of items with id and source_type")
    source_type: Optional[str] = Field(None, description="Default source_type ('attendance' or 'leave') if items omitted")
    status: str = Field(..., description="'approved' or 'rejected'")
    remarks: Optional[str] = Field(None, description="Optional reviewer remarks")


