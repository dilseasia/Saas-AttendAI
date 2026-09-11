"""
test_phase5_attendance.py
─────────────────────────
Phase 5 Integration Tests: Validates Check-In/Check-Out Log Ingestion,
Real-Time Working Hours Engine (First IN / Last OUT), Status Determination,
Today's Summary Counters, and CSV Report Export.
"""

import uuid
import asyncio
from datetime import date, datetime, timedelta
from fastapi.testclient import TestClient
from app.main import create_app


def run_phase5_tests():
    print("🧪 Running Phase 5 (Real-Time Attendance Engine & Reports) Integration Tests...\n")
    app = create_app()

    with TestClient(app) as client:
        # 1. Register Tenant & Admin
        uid = str(uuid.uuid4())[:8]
        reg_payload = {
            "company_name": f"P5 Attendance Corp {uid}",
            "company_email": f"p5_{uid}@company.com",
            "company_phone": "9876543210",
            "selected_plan": "pro",
            "admin_name": "P5 Admin",
            "password": "Password123",
            "confirm_password": "Password123"
        }
        res1 = client.post("/api/v1/auth/register", json=reg_payload)
        assert res1.status_code == 201, f"Tenant registration failed: {res1.text}"
        data1 = res1.json()
        token = data1["tokens"]["access_token"]
        tenant_id = data1["tenant"]["id"]
        headers = {"Authorization": f"Bearer {token}"}
        print(f"✅ Step 1: Registered P5 Tenant '{data1['tenant']['name']}' (ID: {tenant_id})")

        # 2. Create 2 Employees
        emp1_res = client.post("/api/v1/company/employees", json={"emp_id": "P5EMP01", "name": "Aman Verma", "department": "IT"}, headers=headers)
        assert emp1_res.status_code == 201
        emp2_res = client.post("/api/v1/company/employees", json={"emp_id": "P5EMP02", "name": "Simran Kaur", "department": "HR"}, headers=headers)
        assert emp2_res.status_code == 201
        print("✅ Step 2: Created 2 Employees ('Aman Verma' P5EMP01, 'Simran Kaur' P5EMP02)")

        # 3. Log Entry & Exit Punches for P5EMP01 (Aman Verma)
        today_str = date.today().strftime("%Y-%m-%d")
        entry_time = f"{today_str}T09:05:00"
        exit_time = f"{today_str}T17:35:00"

        log1_res = client.post("/api/v1/attendance/log", json={
            "emp_id": "P5EMP01",
            "log_type": "entry",
            "timestamp": entry_time,
            "confidence": 0.92
        }, headers=headers)
        assert log1_res.status_code == 201, f"Log entry failed: {log1_res.text}"

        log2_res = client.post("/api/v1/attendance/log", json={
            "emp_id": "P5EMP01",
            "log_type": "exit",
            "timestamp": exit_time,
            "confidence": 0.95
        }, headers=headers)
        assert log2_res.status_code == 201, f"Log exit failed: {log2_res.text}"

        print("✅ Step 3: Logged Entry (09:05:00) & Exit (17:35:00) for 'Aman Verma'")

        # 4. Fetch Daily Attendance Records
        daily_res = client.get(f"/api/v1/attendance/daily?date={today_str}", headers=headers)
        assert daily_res.status_code == 200
        daily_data = daily_res.json()
        assert daily_data["total"] == 2
        
        # Check Aman's record
        aman_rec = next(r for r in daily_data["records"] if r["emp_id"] == "P5EMP01")
        assert aman_rec["first_in"] == "09:05:00"
        assert aman_rec["last_out"] == "17:35:00"
        assert aman_rec["total_hours"] == 8.5
        assert aman_rec["status"] == "Present"

        # Check Simran's record (No punches -> Absent)
        simran_rec = next(r for r in daily_data["records"] if r["emp_id"] == "P5EMP02")
        assert simran_rec["status"] == "Absent"

        print(f"✅ Step 4: Daily Attendance Calculated -> Aman Verma: First IN={aman_rec['first_in']}, Last OUT={aman_rec['last_out']}, Hours={aman_rec['total_hours']}, Status='{aman_rec['status']}'")

        # 5. Fetch Summary Dashboard Counters
        summary_res = client.get(f"/api/v1/attendance/summary?date={today_str}", headers=headers)
        assert summary_res.status_code == 200
        sum_data = summary_res.json()
        assert sum_data["total_employees"] == 2
        assert sum_data["present_count"] == 1
        assert sum_data["absent_count"] == 1
        print(f"✅ Step 5: Summary Counters Verified -> Total: {sum_data['total_employees']}, Present: {sum_data['present_count']}, Absent: {sum_data['absent_count']}")

        # 6. Export Attendance CSV
        csv_res = client.get(f"/api/v1/attendance/export-csv?date={today_str}", headers=headers)
        assert csv_res.status_code == 200
        assert "text/csv" in csv_res.headers.get("content-type", "")
        csv_lines = csv_res.content.decode("utf-8").strip().split("\n")
        assert len(csv_lines) == 3  # Header + 2 Employees
        assert "P5EMP01,Aman Verma" in csv_lines[1]
        print(f"✅ Step 6: CSV Export Verified -> Generated {len(csv_lines)} lines of CSV data")

        print("\n🎉 ALL PHASE 5 (REAL-TIME ATTENDANCE ENGINE & REPORTS) TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    run_phase5_tests()
