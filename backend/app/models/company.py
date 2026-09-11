"""
models/company.py
─────────────────
Pydantic schemas for Company Setup: Employees, Cameras, and Holidays.
(Note: Shifts system is temporarily bypassed as requested).
"""

from datetime import date as PyDate, datetime
from typing import Literal, List, Optional
from pydantic import BaseModel, Field, field_validator


# ── EMPLOYEE SCHEMAS ────────────────────────────────────────────────
class CreateEmployeeRequest(BaseModel):
    emp_id: Optional[str] = Field(None, description="Optional custom emp ID. If omitted, auto-generated using tenant prefix & digits.")
    name: str = Field(..., min_length=2, max_length=255, description="Full name of employee")
    department: Optional[str] = Field(None, max_length=100)
    designation: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, description="Employee email")
    phone: Optional[str] = Field(None, max_length=20)
    joining_date: Optional[PyDate] = Field(None, description="Date of joining")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return v.strip().lower()
        return v


class UpdateEmployeeRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    department: Optional[str] = Field(None, max_length=100)
    designation: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None)
    phone: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = Field(None)
    joining_date: Optional[PyDate] = Field(None)


class EmployeeResponse(BaseModel):
    id: int
    tenant_id: str
    emp_id: str
    name: str
    department: Optional[str] = None
    designation: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    shift_id: Optional[int] = None
    face_enrolled: bool = False
    is_active: bool = True
    joining_date: Optional[PyDate] = None
    created_at: datetime


class EmployeeListResponse(BaseModel):
    success: bool = True
    total: int
    employees: List[EmployeeResponse]


# ── CAMERA SCHEMAS ─────────────────────────────────────────────────
class CreateCameraRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Camera display name, e.g. Main Entrance Gate")
    stream_url: str = Field(..., description="RTSP or HTTP stream URI")
    type: Literal["entry", "exit"] = Field(..., description="Camera direction type")
    location: Optional[str] = Field(None, max_length=255, description="Physical location")


class UpdateCameraRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    stream_url: Optional[str] = Field(None)
    type: Optional[Literal["entry", "exit"]] = Field(None)
    location: Optional[str] = Field(None)
    is_active: Optional[bool] = Field(None)


class CameraResponse(BaseModel):
    id: int
    tenant_id: str
    name: str
    stream_url: str
    type: Literal["entry", "exit"]
    location: Optional[str] = None
    is_active: bool = True
    created_at: datetime


class CameraListResponse(BaseModel):
    success: bool = True
    total: int
    cameras: List[CameraResponse]


# ── HOLIDAY SCHEMAS ────────────────────────────────────────────────
class CreateHolidayRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Holiday name e.g. Diwali")
    holiday_date: PyDate = Field(..., alias="date", description="Holiday date")
    type: Literal["public", "optional", "restricted"] = Field("public", description="Holiday classification")

    class Config:
        populate_by_name = True


class HolidayResponse(BaseModel):
    id: int
    tenant_id: str
    name: str
    holiday_date: PyDate = Field(..., alias="date")
    type: str

    class Config:
        populate_by_name = True


class HolidayListResponse(BaseModel):
    success: bool = True
    total: int
    holidays: List[HolidayResponse]
