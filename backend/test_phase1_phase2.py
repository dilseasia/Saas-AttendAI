import asyncio
import asyncpg
from app.core.config import get_settings
from app.core.security import create_token_pair
from app.services import auth_service, tenant_service
from app.models.auth import RegisterRequest, LoginRequest
from app.models.tenant import TenantSettingsUpdate, CreateTenantUserRequest

settings = get_settings()

async def run_tests():
    print("🧪 Running Phase 1 & Phase 2 Integration Tests...\n")
    
    conn = await asyncpg.connect(settings.DATABASE_URL)
    
    try:
        # Clean test records if present
        await conn.execute("DELETE FROM tenant_users WHERE email LIKE 'test%@company.com'")
        await conn.execute("DELETE FROM tenants WHERE slug LIKE 'test-%'")

        # 1. Test Tenant Registration
        reg_payload = RegisterRequest(
            company_name="Test Company SEAsia",
            company_email="testadmin@company.com",
            company_phone="9876543210",
            timezone="Asia/Kolkata",
            selected_plan="starter",
            admin_name="Test Admin",
            password="Password123",
            confirm_password="Password123"
        )
        
        reg_res = await auth_service.register(conn, reg_payload)
        tenant_id = reg_res.tenant.id
        user_id = reg_res.user.id
        print(f"✅ Step 1: Registered Tenant successfully! Tenant ID: {tenant_id}, Slug: {reg_res.tenant.slug}")
        
        # 2. Test Login
        login_payload = LoginRequest(email="testadmin@company.com", password="Password123")
        login_res = await auth_service.login(conn, login_payload)
        print(f"✅ Step 2: Authenticated user. User Role: {login_res.user.role}, Access Token Generated.")

        # 3. Test Get Tenant Settings
        tenant_details = await tenant_service.get_tenant_details(conn, tenant_id)
        print(f"✅ Step 3: Default Tenant Config -> Prefix: '{tenant_details.tenant.emp_id_prefix}', Digits: {tenant_details.tenant.emp_id_digits}")

        # 4. Test Update Tenant Settings (Prefix = 'SEA', Digits = 4)
        update_payload = TenantSettingsUpdate(
            emp_id_prefix="SEA",
            emp_id_digits=4,
            logo_url="https://company.com/logo.png"
        )
        updated_tenant = await tenant_service.update_tenant_settings(conn, tenant_id, update_payload)
        print(f"✅ Step 4: Updated Tenant Settings -> Prefix: '{updated_tenant.tenant.emp_id_prefix}', Digits: {updated_tenant.tenant.emp_id_digits}, Logo: '{updated_tenant.tenant.logo_url}'")

        # 5. Test Dynamic Next Employee ID Generation
        next_emp_id = await tenant_service.generate_next_emp_id(conn, tenant_id)
        print(f"✅ Step 5: Dynamic Next Employee ID Generated: '{next_emp_id}'")
        assert next_emp_id == "SEA0001", f"Expected SEA0001, got {next_emp_id}"

        # 6. Test Create Secondary Tenant User (HR)
        hr_payload = CreateTenantUserRequest(
            name="Test HR Manager",
            email="testhr@company.com",
            password="Password123",
            role="hr"
        )
        hr_user = await tenant_service.create_tenant_user(conn, tenant_id, hr_payload)
        print(f"✅ Step 6: Created HR User -> ID: {hr_user.id}, Role: {hr_user.role}, Email: {hr_user.email}")

        # 7. Test List Tenant Users
        users_list = await tenant_service.get_tenant_users(conn, tenant_id)
        print(f"✅ Step 7: Listed Tenant Users -> Total: {len(users_list.users)} users found.")
        
        print("\n🎉 ALL PHASE 1 & PHASE 2 TESTS PASSED PERFECTLY!")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(run_tests())
