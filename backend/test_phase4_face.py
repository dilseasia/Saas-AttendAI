import asyncio
import asyncpg
import numpy as np
import cv2
from app.core.config import get_settings
from app.services import auth_service, company_service, face_service
from app.models.auth import RegisterRequest
from app.models.company import CreateEmployeeRequest

settings = get_settings()

from PIL import Image, ImageDraw
import io

def create_synthetic_face_image() -> bytes:
    """Generate a valid JPEG image buffer for testing."""
    img = Image.new("RGB", (200, 200), color=(0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse([30, 30, 170, 170], fill=(200, 200, 200)) # face
    draw.ellipse([65, 70, 85, 90], fill=(50, 50, 50))       # left eye
    draw.ellipse([115, 70, 135, 90], fill=(50, 50, 50))     # right eye
    draw.arc([70, 110, 130, 150], start=0, end=180, fill=(50, 50, 50), width=3) # smile
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()

async def run_tests():
    print("🧪 Running Phase 4 (Face Recognition & DB BYTEA Storage) Integration Tests...\n")
    
    conn = await asyncpg.connect(settings.DATABASE_URL)
    
    try:
        # Clean test records
        await conn.execute("DELETE FROM tenant_users WHERE email LIKE 'p4%@company.com'")
        await conn.execute("DELETE FROM tenants WHERE slug LIKE 'p4-%'")

        # 1. Register Test Tenant
        reg = await auth_service.register(
            conn,
            RegisterRequest(
                company_name="P4 Face AI Ltd",
                company_email="p4admin@company.com",
                company_phone="9911223344",
                selected_plan="pro",
                admin_name="P4 Admin",
                password="Password123",
                confirm_password="Password123"
            )
        )
        tenant_id = reg.tenant.id
        print(f"✅ Step 1: Registered P4 Tenant (ID: {tenant_id})")

        # 2. Add Employee
        emp = await company_service.create_employee(
            conn, tenant_id, CreateEmployeeRequest(emp_id="P4EMP01", name="Vikram Singh", department="AI Labs")
        )
        print(f"✅ Step 2: Created Employee: '{emp.name}' (Emp ID: {emp.emp_id})")
        assert emp.face_enrolled == False

        # 3. Enroll Employee Face Photo (Stores raw image & embedding in DB BYTEA)
        sample_photo = create_synthetic_face_image()
        enroll_res = await face_service.enroll_face(conn, tenant_id, emp.emp_id, sample_photo, "vikram_front.jpg")
        print(f"✅ Step 3: Enrolled Face Photo -> Image ID: {enroll_res.face_image_id}, Embedding ID: {enroll_res.embedding_id}, Size: {enroll_res.file_size_bytes} bytes")

        # Verify DB records directly
        img_count = await conn.fetchval("SELECT COUNT(*) FROM face_images WHERE tenant_id = $1 AND emp_id = $2", tenant_id, emp.emp_id)
        emb_count = await conn.fetchval("SELECT COUNT(*) FROM face_embeddings WHERE tenant_id = $1 AND emp_id = $2", tenant_id, emp.emp_id)
        enrolled_status = await conn.fetchval("SELECT face_enrolled FROM employees WHERE tenant_id = $1 AND emp_id = $2", tenant_id, emp.emp_id)
        print(f"✅ Step 4: DB Verified -> face_images: {img_count}, face_embeddings: {emb_count}, face_enrolled: {enrolled_status}")
        assert img_count == 1 and emb_count == 1 and enrolled_status == True

        # 4. Fetch Photo Raw Binary Bytes from DB
        img_bytes, img_name, mime = await face_service.get_employee_photo(conn, tenant_id, emp.emp_id)
        print(f"✅ Step 5: Retrieved Photo from DB -> Name: '{img_name}', MIME: '{mime}', Bytes: {len(img_bytes)}")
        assert len(img_bytes) == len(sample_photo)

        # 5. Test Face Matching
        match_res = await face_service.match_face(conn, tenant_id, sample_photo, threshold=0.60)
        print(f"✅ Step 6: Face Match Result -> Matched: {match_res.matched}, Similarity: {match_res.similarity}, Message: '{match_res.message}'")
        assert match_res.matched == True and match_res.match.emp_id == "P4EMP01"

        # 6. Test Multi-Tenant Data Isolation (Querying from a different tenant returns NO match)
        other_tenant_id = "00000000-0000-0000-0000-000000000000"
        other_match = await face_service.match_face(conn, other_tenant_id, sample_photo)
        print(f"✅ Step 7: Multi-Tenant Scoping Verified -> Other Tenant Match: {other_match.matched}")
        assert other_match.matched == False

        print("\n🎉 ALL PHASE 4 (FACE RECOGNITION & DB BYTEA STORAGE) TESTS PASSED PERFECTLY!")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(run_tests())
