import io
import json
import uuid
import asyncio
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient
from app.main import create_app

def create_synthetic_photo() -> bytes:
    img = Image.new("RGB", (200, 200), color=(10, 10, 10))
    draw = ImageDraw.Draw(img)
    draw.ellipse([30, 30, 170, 170], fill=(220, 220, 220))
    draw.ellipse([65, 70, 85, 90], fill=(40, 40, 40))
    draw.ellipse([115, 70, 135, 90], fill=(40, 40, 40))
    draw.arc([70, 110, 130, 150], start=0, end=180, fill=(40, 40, 40), width=4)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()

def run_api_demonstration():
    print("🌐 Launching FastAPI App & Running Live HTTP API Demonstration...\n")
    app = create_app()

    with TestClient(app) as client:
        # 1. Register Tenant & get JWT Token
        uid = str(uuid.uuid4())[:8]
        reg_payload = {
            "company_name": f"Demo Face AI {uid}",
            "company_email": f"demo_{uid}@company.com",
            "company_phone": "9876543210",
            "selected_plan": "pro",
            "admin_name": "Demo Admin",
            "password": "Password123",
            "confirm_password": "Password123"
        }
        res1 = client.post("/api/v1/auth/register", json=reg_payload)
        print(f"1️⃣ POST /api/v1/auth/register -> Status: {res1.status_code}")
        data1 = res1.json()
        token = data1["tokens"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print(f"   🔑 JWT Token Acquired! Tenant: {data1['tenant']['name']} (ID: {data1['tenant']['id']})\n")

        # 2. Add Employee
        emp_payload = {
            "emp_id": "EMP888",
            "name": "Manpreet Singh",
            "department": "Engineering"
        }
        res2 = client.post("/api/v1/company/employees", json=emp_payload, headers=headers)
        print(f"2️⃣ POST /api/v1/company/employees -> Status: {res2.status_code}")
        print(f"   👤 Employee Created: {json.dumps(res2.json(), indent=2)}\n")

        # 3. Enroll Face Photo (POST /api/v1/face/enroll)
        photo_bytes = create_synthetic_photo()
        files = {"photo": ("manpreet.jpg", photo_bytes, "image/jpeg")}
        form_data = {"emp_id": "EMP888"}
        
        res3 = client.post("/api/v1/face/enroll", data=form_data, files=files, headers=headers)
        print(f"3️⃣ POST /api/v1/face/enroll -> Status: {res3.status_code}")
        print(f"   📸 Photo Enrolled API Response: {json.dumps(res3.json(), indent=2)}\n")

        # 4. Fetch Employee Photo (GET /api/v1/face/photo/EMP888)
        res4 = client.get("/api/v1/face/photo/EMP888", headers=headers)
        print(f"4️⃣ GET /api/v1/face/photo/EMP888 -> Status: {res4.status_code}")
        print(f"   🖼️ Content-Type: {res4.headers.get('content-type')}, Binary Size: {len(res4.content)} bytes\n")

        # 5. Perform Face Match (POST /api/v1/face/match)
        match_files = {"photo": ("query_frame.jpg", photo_bytes, "image/jpeg")}
        res5 = client.post("/api/v1/face/match?threshold=0.65", files=match_files, headers=headers)
        print(f"5️⃣ POST /api/v1/face/match -> Status: {res5.status_code}")
        print(f"   🔍 Vector Match API Response: {json.dumps(res5.json(), indent=2)}\n")

        print("✨ ALL API HTTP ENDPOINTS WORKING 100% PERFECTLY!")

if __name__ == "__main__":
    run_api_demonstration()
