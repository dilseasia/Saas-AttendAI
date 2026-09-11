"""
routers/face.py
───────────────
Face Recognition API Router: Handles employee face photo enrollment,
serving binary image responses directly from PostgreSQL `BYTEA`,
and performing tenant-isolated vector matching.

Prefix: /api/v1/face
Tag: Face Recognition
"""

import asyncpg
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, UploadFile, Query, Response, status

from app.core.database import get_db
from app.core.dependencies import AuthUser, HRUser, AdminUser
from app.models.auth import MessageResponse
from app.models.face import FaceEnrollResponse, FaceMatchResponse
from app.services import face_service

router = APIRouter(prefix="/face", tags=["Face Recognition"])


# ── POST /face/enroll ───────────────────────────────────────────────
@router.post(
    "/enroll",
    response_model=FaceEnrollResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Enroll employee face photo & vector into database (BYTEA)",
)
async def enroll_face(
    tenant_id: Optional[str] = Form(None, description="Target Tenant UUID"),
    emp_id: str = Form(..., description="Employee ID e.g. SEA0001"),
    photo: UploadFile = File(..., description="JPEG/PNG photo file"),
    db: asyncpg.Connection = Depends(get_db),
) -> FaceEnrollResponse:
    image_bytes = await photo.read()
    image_name = photo.filename or f"{emp_id}.jpg"

    if not tenant_id:
        emp_row = await db.fetchrow("SELECT tenant_id FROM employees WHERE emp_id = $1 LIMIT 1", emp_id)
        if not emp_row:
            from app.core.exceptions import NotFoundError
            raise NotFoundError(f"Employee with ID '{emp_id}'")
        tenant_id = str(emp_row["tenant_id"])

    return await face_service.enroll_face(db, tenant_id, emp_id, image_bytes, image_name)


# ── POST /face/superadmin/enroll ───────────────────────────────────
@router.post(
    "/superadmin/enroll",
    response_model=FaceEnrollResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Super Admin enroll employee face photo & vector for target tenant company",
)
async def superadmin_enroll_face(
    tenant_id: str = Form(..., description="Target Tenant UUID"),
    emp_id: str = Form(..., description="Employee ID e.g. SEA0001"),
    photo: UploadFile = File(..., description="JPEG/PNG photo file"),
    db: asyncpg.Connection = Depends(get_db),
) -> FaceEnrollResponse:
    image_bytes = await photo.read()
    image_name = photo.filename or f"{emp_id}.jpg"
    return await face_service.enroll_face(db, tenant_id, emp_id, image_bytes, image_name)


# ── GET /face/photo/{emp_id} ─────────────────────────────────────────
@router.get(
    "/photo/{emp_id}",
    summary="Fetch employee binary photo file directly from Database (BYTEA)",
)
async def get_employee_photo(
    emp_id: str,
    tenant_id: Optional[str] = Query(None, description="Optional tenant_id"),
    db: asyncpg.Connection = Depends(get_db),
):
    if not tenant_id:
        emp_row = await db.fetchrow("SELECT tenant_id FROM employees WHERE emp_id = $1 LIMIT 1", emp_id)
        if not emp_row:
            from app.core.exceptions import NotFoundError
            raise NotFoundError(f"Employee photo for '{emp_id}'")
        tenant_id = str(emp_row["tenant_id"])

    image_bytes, image_name, mime_type = await face_service.get_employee_photo(db, tenant_id, emp_id)
    return Response(
        content=image_bytes,
        media_type=mime_type,
        headers={"Content-Disposition": f'inline; filename="{image_name}"'},
    )



# ── POST /face/match ─────────────────────────────────────────────────
@router.post(
    "/match",
    response_model=FaceMatchResponse,
    status_code=status.HTTP_200_OK,
    summary="Match camera/mobile photo frame against tenant face templates",
)
async def match_face(
    user: AuthUser,
    photo: UploadFile = File(..., description="Query photo frame"),
    threshold: float = Query(0.65, ge=0.4, le=0.95, description="Similarity threshold"),
    db: asyncpg.Connection = Depends(get_db),
) -> FaceMatchResponse:
    image_bytes = await photo.read()
    return await face_service.match_face(db, user.tenant_id, image_bytes, threshold=threshold)


# ── DELETE /face/photo/{emp_id} ──────────────────────────────────────
@router.delete(
    "/photo/{emp_id}",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete employee enrolled face photo & vector embeddings",
)
async def delete_employee_face(
    emp_id: str,
    user: AdminUser,
    db: asyncpg.Connection = Depends(get_db),
) -> MessageResponse:
    await face_service.delete_employee_face(db, user.tenant_id, emp_id)
    return MessageResponse(success=True, message=f"Face photo & templates deleted for employee '{emp_id}'")
