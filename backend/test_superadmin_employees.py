"""
test_superadmin_employees.py
──────────────────────────────
Integration test for Super Admin Employee Management endpoints including face photo enrollment.
"""

import io
import uuid
from PIL import Image
from fastapi.testclient import TestClient
from app.main import create_app

app = create_app()


def _generate_test_face_image() -> bytes:
    img = Image.new("RGB", (200, 200), color=(128, 128, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_superadmin_employee_workflow():
    print("🧪 Running Super Admin Employee Management API Tests...\n")

    with TestClient(app) as client:
        unique_id = str(uuid.uuid4())[:8]
        company_email = f"sa_alpha_{unique_id}@company.com"

        # 1. Register Test Tenant Company
        reg_payload = {
            "company_name": f"SuperAdmin Alpha Corp {unique_id}",
            "company_email": company_email,
            "company_phone": "9876543210",
            "timezone": "Asia/Kolkata",
            "selected_plan": "pro",
            "admin_name": "SA Admin",
            "password": "Password123",
            "confirm_password": "Password123"
        }
        reg_res = client.post("/api/v1/auth/register", json=reg_payload)
        assert reg_res.status_code in (200, 201)
        tenant_data = reg_res.json()["tenant"]
        tenant_slug = tenant_data["slug"]
        tenant_id = tenant_data["id"]
        print(f"✅ Step 1: Registered Company for SuperAdmin Test -> Slug: '{tenant_slug}' (ID: {tenant_id})")

        # 2. Get All Platform Employees
        all_emp_res = client.get("/api/v1/billing/superadmin/employees")
        assert all_emp_res.status_code == 200
        all_data = all_emp_res.json()
        assert all_data["success"] is True
        print(f"✅ Step 2: Super Admin List All Employees -> Total: {all_data['total_employees']} employees across platform")

        # 3. Create Employee for Target Company Slug
        new_emp_payload = {
            "company_slug": tenant_slug,
            "name": "Rohan Deshmukh",
            "department": "Engineering",
            "designation": "Senior AI Architect",
            "email": f"rohan_{unique_id}@alpha.com",
            "phone": "9988776655"
        }
        create_res = client.post("/api/v1/billing/superadmin/employees", json=new_emp_payload)
        assert create_res.status_code == 201
        emp_data = create_res.json()
        assert emp_data["name"] == "Rohan Deshmukh"
        assert emp_data["company_slug"] == tenant_slug
        emp_id = emp_data["emp_id"]
        print(f"✅ Step 3: Created Employee for Company '{tenant_slug}' -> ID: {emp_id}, Name: '{emp_data['name']}'")

        # 4. Enroll Face Photo for Employee
        face_bytes = _generate_test_face_image()
        files = {"photo": ("face.jpg", face_bytes, "image/jpeg")}
        data = {"tenant_id": tenant_id, "emp_id": emp_id}
        enroll_res = client.post("/api/v1/face/enroll", data=data, files=files)
        assert enroll_res.status_code == 201
        enroll_data = enroll_res.json()
        assert enroll_data["success"] is True
        print(f"✅ Step 4: Enrolled Face Photo for '{emp_id}' -> Vector & Image stored in PostgreSQL BYTEA!")

        # 5. Filter Employees by Target Company Slug
        filter_res = client.get(f"/api/v1/billing/superadmin/employees?company_slug={tenant_slug}")
        assert filter_res.status_code == 200
        filtered_data = filter_res.json()
        assert filtered_data["total_employees"] >= 1
        found_emp = next((e for e in filtered_data["employees"] if e["email"] == f"rohan_{unique_id}@alpha.com"), None)
        assert found_emp is not None
        assert found_emp["face_enrolled"] is True
        print(f"✅ Step 5: Filtered Employees by Slug '{tenant_slug}' -> Face Enrolled: {found_emp['face_enrolled']}!")

        print("\n🎉 ALL SUPER ADMIN EMPLOYEE API & FACE ENROLLMENT TESTS PASSED PERFECTLY!")


if __name__ == "__main__":
    test_superadmin_employee_workflow()
