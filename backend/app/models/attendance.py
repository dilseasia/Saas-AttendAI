"""
models/attendance.py
────────────────────
Pydantic models for Attendance Log Ingestion, Working Hours Engine, and Summary Reports.
"""

from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class LogAttendanceRequest(BaseModel):
    emp_id: str = Field(..., description="Employee ID e.g. DLA0001")
    camera_id: Optional[int] = Field(None, description="Database Camera ID")
    log_type: str = Field("entry", description="Log type: 'entry' or 'exit'")
    timestamp: Optional[datetime] = Field(None, description="Custom timestamp (defaults to current time)")
    confidence: Optional[float] = Field(None, description="Face recognition similarity score")


class AttendanceLogResponse(BaseModel):
    id: int
    tenant_id: str
    emp_id: str
    camera_id: Optional[int] = None
    timestamp: datetime
    log_type: str
    confidence: Optional[float] = None


class DailyAttendanceRecord(BaseModel):
    emp_id: str
    name: str
    department: Optional[str] = None
    attendance_date: date = Field(..., alias="date")
    first_in: Optional[str] = None
    first_in_image_url: Optional[str] = None
    last_out: Optional[str] = None
    last_out_image_url: Optional[str] = None
    entry_count: int = 0
    exit_count: int = 0
    total_hours: Optional[float] = 0.0
    status: str = Field("Absent", description="Status: 'Present', 'Late', 'Half-Day', 'Absent', 'On-Leave'")

    class Config:
        populate_by_name = True


class DailyAttendanceResponse(BaseModel):
    success: bool = True
    attendance_date: date = Field(..., alias="date")
    total: int
    records: List[DailyAttendanceRecord]

    class Config:
        populate_by_name = True


class AttendanceSummaryResponse(BaseModel):
    success: bool = True
    attendance_date: date = Field(..., alias="date")
    total_employees: int
    present_count: int
    absent_count: int
    late_count: int
    on_leave_count: int

    class Config:
        populate_by_name = True
