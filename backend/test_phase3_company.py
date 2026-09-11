import asyncio
import asyncpg
from app.core.config import get_settings
from app.services import auth_service, tenant_service, company_service
from app.models.auth import RegisterRequest
from app.models.tenant import TenantSettingsUpdate
from app.models.company import (
    CreateEmployeeRequest,
    UpdateEmployeeRequest,
    CreateCameraRequest,
    CreateHolidayRequest,
)

settings = get_settings()

async def run_tests():
    print("🧪 Running Phase 3 (Company Setup) Integration Tests...\n")
    
    conn = await asyncpg.connect(settings.DATABASE_URL)
    
    try:
        # Clean test records if present
        await conn.execute("DELETE FROM tenant_users WHERE email = 'p3admin@company.com'")
        await conn.execute("DELETE FROM tenants WHERE slug LIKE 'p3-company%'")

        # 1. Register test tenant (Plan: starter -> max 25 employees, 2 cameras)
        reg_payload = RegisterRequest(
            company_name="P3 Company",
            company_email="p3admin@company.com",
            company_phone="9988776655",
            timezone="Asia/Kolkata",
            selected_plan="starter",
            admin_name="P3 Admin",
            password="Password123",
            confirm_password="Password123"
        )
        reg_res = await auth_service.register(conn, reg_payload)
        tenant_id = reg_res.tenant.id
        print(f"✅ Step 1: Registered P3 Tenant (ID: {tenant_id})")

        # Set custom prefix = 'DLA' and digits = 4
        await tenant_service.update_tenant_settings(
            conn, tenant_id, TenantSettingsUpdate(emp_id_prefix="DLA", emp_id_digits=4)
        )
        print("✅ Step 2: Configured Tenant prefix='DLA', digits=4")

        # 2. Test Employee Creation with Auto-Generated emp_id
        emp1_payload = CreateEmployeeRequest(
            name="Rahul Kumar",
            department="Engineering",
            designation="Software Developer",
            email="rahul@company.com",
            phone="9876500001"
        )
        emp1 = await company_service.create_employee(conn, tenant_id, emp1_payload)
        print(f"✅ Step 3: Created Employee -> ID: {emp1.id}, Auto Emp ID: '{emp1.emp_id}', Name: '{emp1.name}'")
        assert emp1.emp_id == "DLA0001", f"Expected DLA0001, got {emp1.emp_id}"

        # 3. Test Employee Creation with Custom emp_id
        emp2_payload = CreateEmployeeRequest(
            emp_id="DLA9999",
            name="Priya Sharma",
            department="Human Resources",
            designation="HR Lead",
            email="priya@company.com"
        )
        emp2 = await company_service.create_employee(conn, tenant_id, emp2_payload)
        print(f"✅ Step 4: Created Employee with Custom ID -> Emp ID: '{emp2.emp_id}', Name: '{emp2.name}'")

        # 4. Test Get Employees List & Search Filter
        emp_list = await company_service.get_employees(conn, tenant_id, search="Priya")
        print(f"✅ Step 5: Employee Search 'Priya' returned {emp_list.total} result(s).")
        assert emp_list.total == 1 and emp_list.employees[0].name == "Priya Sharma"

        # 5. Test Camera Creation
        cam1_payload = CreateCameraRequest(
            name="Main Gate Entrance",
            stream_url="rtsp://192.168.1.100:554/stream1",
            type="entry",
            location="Ground Floor Gate A"
        )
        cam1 = await company_service.create_camera(conn, tenant_id, cam1_payload)
        print(f"✅ Step 6: Created Camera -> ID: {cam1.id}, Name: '{cam1.name}', Type: '{cam1.type}'")

        # 6. Test Holiday Creation
        hol1_payload = CreateHolidayRequest(
            name="Republic Day",
            date="2026-01-26",
            type="public"
        )
        hol1 = await company_service.create_holiday(conn, tenant_id, hol1_payload)
        print(f"✅ Step 7: Created Holiday -> Name: '{hol1.name}', Date: '{hol1.holiday_date}'")

        holidays_list = await company_service.get_holidays(conn, tenant_id, year=2026)
        print(f"✅ Step 8: Listed 2026 Holidays -> Total: {holidays_list.total} holiday(s)")

        print("\n🎉 ALL PHASE 3 (COMPANY SETUP) TESTS PASSED PERFECTLY!")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(run_tests())
