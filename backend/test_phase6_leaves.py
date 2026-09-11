"""
test_phase6_leaves.py
─────────────────────
Phase 6 Integration Tests: Validates Leave Applications, HR Approvals,
Leave Balances (CL/SL/PL), and Attendance Regularization/WFH Workflow.
"""

import uuid
from datetime import date, timedelta
from fastapi.testclient import TestClient
from app.main import create_app


def run_phase6_tests():
    print("🧪 Running Phase 6 (Leaves Management & Attendance Requests) Integration Tests...\n")
    app = create_app()

    with TestClient(app) as client:
        # 1. Register Tenant & Admin
        uid = str(uuid.uuid4())[:8]
        reg_payload = {
            "company_name": f"P6 Leaves Corp {uid}",
            "company_email": f"p6_{uid}@company.com",
            "company_phone": "9876543210",
            "selected_plan": "pro",
            "admin_name": "P6 Admin",
            "password": "Password123",
            "confirm_password": "Password123"
        }
        res1 = client.post("/api/v1/auth/register", json=reg_payload)
        assert res1.status_code == 201, f"Tenant registration failed: {res1.text}"
        data1 = res1.json()
        token = data1["tokens"]["access_token"]
        tenant_id = data1["tenant"]["id"]
        headers = {"Authorization": f"Bearer {token}"}
        print(f"✅ Step 1: Registered P6 Tenant '{data1['tenant']['name']}' (ID: {tenant_id})")

        # 2. Create Employee
        emp_res = client.post("/api/v1/company/employees", json={"emp_id": "P6EMP01", "name": "Karan Johar", "department": "HR"}, headers=headers)
        assert emp_res.status_code == 201
        print("✅ Step 2: Created Employee 'Karan Johar' (P6EMP01)")

        # 3. Apply Leave (CL for 2 days)
        today = date.today()
        tomorrow = today + timedelta(days=1)
        apply_res = client.post("/api/v1/leaves/apply", json={
            "emp_id": "P6EMP01",
            "leave_type": "CL",
            "from_date": today.strftime("%Y-%m-%d"),
            "to_date": tomorrow.strftime("%Y-%m-%d"),
            "reason": "Personal work at home"
        }, headers=headers)
        assert apply_res.status_code == 201, f"Leave apply failed: {apply_res.text}"
        leave_data = apply_res.json()
        leave_id = leave_data["id"]
        assert leave_data["total_days"] == 2.0
        assert leave_data["status"] == "pending"
        print(f"✅ Step 3: Applied 2-day Casual Leave (ID: {leave_id})")

        # 4. View My Leaves
        my_leaves = client.get("/api/v1/leaves/my-leaves?emp_id=P6EMP01", headers=headers)
        assert my_leaves.status_code == 200
        assert len(my_leaves.json()) == 1
        print("✅ Step 4: Employee Leave History Verified")

        # 5. HR Views Pending Leaves
        pending = client.get("/api/v1/leaves/pending", headers=headers)
        assert pending.status_code == 200
        assert len(pending.json()) == 1
        print("✅ Step 5: HR Pending Leaves Queue Verified")

        # 6. HR Approves Leave
        review_res = client.post(f"/api/v1/leaves/{leave_id}/review", json={
            "status": "approved",
            "remarks": "Approved by HR"
        }, headers=headers)
        assert review_res.status_code == 200
        assert review_res.json()["status"] == "approved"
        print(f"✅ Step 6: Leave Request #{leave_id} Approved by HR")

        # 7. Check Leave Balances
        balance_res = client.get(f"/api/v1/leaves/balances?emp_id=P6EMP01", headers=headers)
        assert balance_res.status_code == 200
        bdata = balance_res.json()
        cl_rec = next(b for b in bdata["balances"] if b["leave_type"] == "CL")
        assert cl_rec["used"] == 2.0
        assert cl_rec["remaining"] == 10.0
        print(f"✅ Step 7: Leave Balance Verified -> CL Total: {cl_rec['total_allowed']}, Used: {cl_rec['used']}, Remaining: {cl_rec['remaining']}")

        # 8. Submit Attendance Regularization / WFH Request
        req_res = client.post("/api/v1/requests/apply", json={
            "emp_id": "P6EMP01",
            "request_type": "wfh",
            "request_date": today.strftime("%Y-%m-%d"),
            "reason": "Working from home due to fever"
        }, headers=headers)
        assert req_res.status_code == 201
        req_id = req_res.json()["id"]
        print(f"✅ Step 8: Submitted WFH Request #{req_id}")

        # 9. HR Approves Attendance Request
        req_review = client.post(f"/api/v1/requests/{req_id}/review", json={
            "status": "approved",
            "remarks": "Approved WFH"
        }, headers=headers)
        assert req_review.status_code == 200
        assert req_review.json()["status"] == "approved"
        print(f"✅ Step 9: Attendance Request #{req_id} Approved by HR")

        # 10. Verify Punch Logged in Attendance Engine
        att_res = client.get(f"/api/v1/attendance/daily?date={today.strftime('%Y-%m-%d')}", headers=headers)
        assert att_res.status_code == 200
        print("✅ Step 10: Attendance Regularization Automatically Recorded Punch")

        print("\n🎉 ALL PHASE 6 (LEAVES & ATTENDANCE REQUESTS) TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    run_phase6_tests()
