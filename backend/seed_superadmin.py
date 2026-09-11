import asyncio
from app.core.config import get_settings
from app.core.security import hash_password_sync
import asyncpg

settings = get_settings()

async def main():
    print(f"Connecting to DB: {settings.DATABASE_URL}")
    conn = await asyncpg.connect(settings.DATABASE_URL)
    
    # 1. Check or insert tenant
    tenant_row = await conn.fetchrow("SELECT id FROM tenants WHERE slug = 'superadmin' OR slug = 'seasia-tech'")
    if not tenant_row:
        tenant_id = await conn.fetchval("""
            INSERT INTO tenants (name, slug, email, plan, status, max_employees, max_cameras)
            VALUES ('SaaS Attend-AI Platform HQ', 'superadmin', 'superadmin@attendai.com', 'enterprise', 'active', 99999, 999)
            RETURNING id
        """)
    else:
        tenant_id = tenant_row['id']
        
    pwd_hash = hash_password_sync("Admin@12345")
    
    # 2. Check or insert superadmin user
    user_row = await conn.fetchrow("SELECT id FROM tenant_users WHERE email = 'superadmin@attendai.com'")
    if user_row:
        await conn.execute("""
            UPDATE tenant_users 
            SET role = 'super_admin', password_hash = $1, is_active = TRUE
            WHERE email = 'superadmin@attendai.com'
        """, pwd_hash)
        print("✅ Super Admin account updated: superadmin@attendai.com / Admin@12345")
    else:
        await conn.execute("""
            INSERT INTO tenant_users (tenant_id, name, email, password_hash, role, is_active)
            VALUES ($1, 'Master Super Admin', 'superadmin@attendai.com', $2, 'super_admin', TRUE)
        """, tenant_id, pwd_hash)
        print("✅ Super Admin account created: superadmin@attendai.com / Admin@12345")
        
    # Also update admin@seasia.com as Company Admin test account
    admin_hash = hash_password_sync("Admin@12345")
    await conn.execute("""
        UPDATE tenant_users 
        SET password_hash = $1, role = 'admin', is_active = TRUE 
        WHERE email = 'admin@seasia.com'
    """, admin_hash)
    print("✅ Company Admin account ready: admin@seasia.com / Admin@12345")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
