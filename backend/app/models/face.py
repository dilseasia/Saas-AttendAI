"""
models/face.py
──────────────
Pydantic schemas for Face Data: Enrollment, Vector Matching, and Photo Retrieval.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class FaceEnrollResponse(BaseModel):
    success: bool = True
    message: str
    emp_id: str
    face_image_id: int
    embedding_id: int
    file_size_bytes: int
    uploaded_at: datetime


class FaceMatchInfo(BaseModel):
    emp_id: str
    name: str
    department: Optional[str] = None
    similarity: float
    confidence_percent: float
    photo_url: Optional[str] = None


class FaceMatchResponse(BaseModel):
    success: bool = True
    matched: bool
    match: Optional[FaceMatchInfo] = None
    similarity: float
    threshold: float = 0.65
    message: str


class FaceImageMetadata(BaseModel):
    id: int
    tenant_id: str
    emp_id: str
    image_name: Optional[str] = None
    file_size: Optional[int] = None
    uploaded_at: datetime
