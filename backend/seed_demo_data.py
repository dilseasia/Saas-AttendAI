"""
╔══════════════════════════════════════════════════════════════════════╗
║   SaaS Attend-AI — DEMO DATA SEEDER (Manager Presentation Mode)    ║
║   Generates realistic-looking multi-tenant demo data for dashboard  ║
╚══════════════════════════════════════════════════════════════════════╝

Usage:
    python seed_demo_data.py

This script:
  - Creates 8 realistic demo companies (tenants) on paid plans
  - Creates admin/HR/employee users per company
  - Adds employees with some having face enrolled
  - Seeds attendance_logs for last 30 days
  - Seeds payment_logs / subscriptions
  - Creates realistic leave requests
"""

import asyncio
import asyncpg
import hashlib
import os
import random
import uuid
from datetime import datetime, timedelta, date, time
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:daljeet%40123@localhost:5432/saas_attendai")

# Fix URL: urllib-decode percent encoding, then fix for asyncpg
import urllib.parse
_parsed = urllib.parse.urlparse(DATABASE_URL)
DATABASE_URL = DATABASE_URL.replace("%40", "@")

# asyncpg connection kwargs (more reliable than URL)
DB_KWARGS = {
    "host": _parsed.hostname or "localhost",
    "port": _parsed.port or 5432,
    "database": _parsed.path.lstrip("/"),
    "user": _parsed.username or "postgres",
    "password": urllib.parse.unquote(_parsed.password or ""),
}

def bcrypt_password(plain: str) -> str:
    """Hash using bcrypt directly."""
    import bcrypt as _bcrypt
    return _bcrypt.hashpw(plain.encode("utf-8"), _bcrypt.gensalt(rounds=12)).decode("utf-8")

# ── Demo Companies ─────────────────────────────────────────────────────────────
DEMO_COMPANIES = [
    {
        "name": "TechVision Solutions Pvt Ltd",
        "slug": "techvision",
        "email": "admin@techvision.com",
        "phone": "9876543210",
        "plan": "enterprise",
        "max_employees": 500,
        "max_cameras": 20,
        "emp_id_prefix": "TV",
        "emp_id_digits": 4,
        "employee_count": 38,
        "enrolled_count": 34,
        "monthly_amount": 450000,  # ₹4,500
    },
    {
        "name": "Zephyr InfoTech Ltd",
        "slug": "zephyr-infotech",
        "email": "hr@zephyrinfotech.in",
        "phone": "9811223344",
        "plan": "growth",
        "max_employees": 100,
        "max_cameras": 5,
        "emp_id_prefix": "ZI",
        "emp_id_digits": 4,
        "employee_count": 27,
        "enrolled_count": 22,
        "monthly_amount": 249900,  # ₹2,499
    },
    {
        "name": "NovaPulse Digital Agency",
        "slug": "novapulse",
        "email": "ops@novapulse.io",
        "phone": "9922334455",
        "plan": "growth",
        "max_employees": 100,
        "max_cameras": 5,
        "emp_id_prefix": "NP",
        "emp_id_digits": 4,
        "employee_count": 19,
        "enrolled_count": 15,
        "monthly_amount": 249900,
    },
    {
        "name": "Horizon Pharma India",
        "slug": "horizon-pharma",
        "email": "it@horizonpharma.co.in",
        "phone": "9734455667",
        "plan": "enterprise",
        "max_employees": 300,
        "max_cameras": 10,
        "emp_id_prefix": "HP",
        "emp_id_digits": 5,
        "employee_count": 52,
        "enrolled_count": 47,
        "monthly_amount": 450000,
    },
    {
        "name": "UrbanNest Real Estate",
        "slug": "urbannest",
        "email": "admin@urbannest.com",
        "phone": "9600001234",
        "plan": "starter",
        "max_employees": 25,
        "max_cameras": 2,
        "emp_id_prefix": "UN",
        "emp_id_digits": 3,
        "employee_count": 13,
        "enrolled_count": 10,
        "monthly_amount": 99900,
    },
    {
        "name": "Celestia Logistics Pvt Ltd",
        "slug": "celestia",
        "email": "hr@celestialogistics.in",
        "phone": "9500998877",
        "plan": "growth",
        "max_employees": 100,
        "max_cameras": 5,
        "emp_id_prefix": "CL",
        "emp_id_digits": 4,
        "employee_count": 31,
        "enrolled_count": 28,
        "monthly_amount": 249900,
    },
    {
        "name": "AlphaWave Consulting",
        "slug": "alphawave",
        "email": "admin@alphawave.consulting",
        "phone": "9312345678",
        "plan": "starter",
        "max_employees": 25,
        "max_cameras": 2,
        "emp_id_prefix": "AW",
        "emp_id_digits": 3,
        "employee_count": 11,
        "enrolled_count": 8,
        "monthly_amount": 99900,
    },
    {
        "name": "Vertex Manufacturing Works",
        "slug": "vertex-mfg",
        "email": "hr@vertexworks.in",
        "phone": "9123456789",
        "plan": "growth",
        "max_employees": 100,
        "max_cameras": 5,
        "emp_id_prefix": "VM",
        "emp_id_digits": 4,
        "employee_count": 41,
        "enrolled_count": 35,
        "monthly_amount": 249900,
    },
]

DEPARTMENTS = ["Engineering", "Sales", "HR", "Finance", "Operations", "Marketing", "Product", "Support", "Design", "Legal"]
DESIGNATIONS = ["Software Engineer", "Team Lead", "Manager", "Analyst", "Coordinator", "Executive", "Director", "Specialist", "Associate", "Consultant"]
FIRST_NAMES = ["Arjun", "Priya", "Rahul", "Neha", "Vivek", "Anjali", "Rohit", "Kavya", "Sanjay", "Meera",
               "Amit", "Pooja", "Karan", "Sunita", "Deepak", "Ritu", "Manish", "Shweta", "Gaurav", "Divya",
               "Nikhil", "Sneha", "Ashok", "Pallavi", "Vijay", "Nisha", "Suresh", "Rekha", "Ajay", "Preeti",
               "Harish", "Smita", "Rajesh", "Geeta", "Pankaj", "Komal", "Sandeep", "Alka", "Arun", "Sona"]
LAST_NAMES = ["Sharma", "Kumar", "Singh", "Patel", "Gupta", "Verma", "Mehta", "Shah", "Joshi", "Yadav",
              "Pandey", "Nair", "Iyer", "Reddy", "Chauhan", "Bhatia", "Kapoor", "Saxena", "Agarwal", "Malhotra"]


async def main():
    print("🚀 Connecting to database...")
    conn = await asyncpg.connect(**DB_KWARGS)


    print("🧹 Cleaning up existing demo data (non-real tenants)...")
    # Delete demo tenants (keep real ones based on known slugs)
    real_slugs = ["demo-face-ai", "p3-company", "p4-face-ai-ltd"]
    demo_slugs = [c["slug"] for c in DEMO_COMPANIES]

    # Only delete our demo slugs if they exist
    for slug in demo_slugs:
        await conn.execute("DELETE FROM tenants WHERE slug = $1", slug)

    print("🏢 Creating demo companies & users...\n")

    inserted_tenant_ids = []

    for company in DEMO_COMPANIES:
        tenant_id = str(uuid.uuid4())

        # Insert tenant
        await conn.execute("""
            INSERT INTO tenants (
                id, name, slug, email, phone, plan, status,
                max_employees, max_cameras, emp_id_prefix, emp_id_digits,
                trial_ends_at, created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,'active',$7,$8,$9,$10,NULL,
                NOW() - INTERVAL '2 months', NOW())
        """,
            tenant_id, company["name"], company["slug"], company["email"],
            company["phone"], company["plan"],
            company["max_employees"], company["max_cameras"],
            company["emp_id_prefix"], company["emp_id_digits"]
        )

        # Insert admin user
        pw_hash = bcrypt_password("Demo@1234")
        await conn.execute("""
            INSERT INTO tenant_users (id, tenant_id, name, email, password_hash, role, is_active, created_at)
            VALUES ($1,$2,$3,$4,$5,'admin',true, NOW() - INTERVAL '2 months')
            ON CONFLICT (email) DO NOTHING
        """,
            str(uuid.uuid4()), tenant_id,
            f"Admin {company['name'].split()[0]}",
            f"admin@{company['slug'].replace('-','')}.demo.com",
            pw_hash
        )

        # Insert HR user
        await conn.execute("""
            INSERT INTO tenant_users (id, tenant_id, name, email, password_hash, role, is_active, created_at)
            VALUES ($1,$2,$3,$4,$5,'hr',true, NOW() - INTERVAL '2 months')
            ON CONFLICT (email) DO NOTHING
        """,
            str(uuid.uuid4()), tenant_id,
            f"HR Manager {company['name'].split()[0]}",
            f"hr@{company['slug'].replace('-','')}.demo.com",
            pw_hash
        )

        # Insert default shift
        shift_id = await conn.fetchval("""
            INSERT INTO shifts (tenant_id, name, start_time, end_time, late_after, half_day_hours, full_day_hours, is_default)
            VALUES ($1, 'General', '09:00', '18:00', '09:30', 4.0, 8.0, true)
            ON CONFLICT (tenant_id, name) DO NOTHING
            RETURNING id
        """, tenant_id)

        if not shift_id:
            shift_id = await conn.fetchval("SELECT id FROM shifts WHERE tenant_id=$1 LIMIT 1", tenant_id)

        # Insert cameras
        await conn.execute("""
            INSERT INTO cameras (tenant_id, name, stream_url, type, location, is_active)
            VALUES ($1,'Main Entry Gate','rtsp://192.168.1.100/stream1','entry','Ground Floor Lobby',true)
            ON CONFLICT (tenant_id, name) DO NOTHING
        """, tenant_id)
        await conn.execute("""
            INSERT INTO cameras (tenant_id, name, stream_url, type, location, is_active)
            VALUES ($1,'Exit Gate','rtsp://192.168.1.101/stream2','exit','Building Exit',true)
            ON CONFLICT (tenant_id, name) DO NOTHING
        """, tenant_id)

        # Insert employees
        emp_count = company["employee_count"]
        enrolled_count = company["enrolled_count"]
        prefix = company["emp_id_prefix"]
        digits = company["emp_id_digits"]

        employee_emp_ids = []
        random.shuffle(FIRST_NAMES)
        random.shuffle(LAST_NAMES)

        for i in range(1, emp_count + 1):
            first = FIRST_NAMES[i % len(FIRST_NAMES)]
            last = LAST_NAMES[i % len(LAST_NAMES)]
            name = f"{first} {last}"
            emp_id = f"{prefix}{str(i).zfill(digits)}"
            dept = DEPARTMENTS[i % len(DEPARTMENTS)]
            desig = DESIGNATIONS[i % len(DESIGNATIONS)]
            email = f"{first.lower()}.{last.lower()}{i}@{company['slug'].replace('-','')}.demo.com"
            is_enrolled = i <= enrolled_count

            await conn.execute("""
                INSERT INTO employees
                    (tenant_id, emp_id, name, department, designation, email, shift_id, face_enrolled, is_active, joining_date, created_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,
                    CURRENT_DATE - INTERVAL '1 year' * $9,
                    NOW() - INTERVAL '1 year' * $10)
                ON CONFLICT (tenant_id, emp_id) DO NOTHING
            """,
                tenant_id, emp_id, name, dept, desig, email,
                shift_id, is_enrolled,
                random.uniform(0, 3), random.uniform(0, 3)
            )

            employee_emp_ids.append((emp_id, name, is_enrolled))

        # Seed attendance logs for last 30 days
        today = date.today()
        for emp_id, emp_name, is_enrolled in employee_emp_ids:
            if not is_enrolled:
                continue
            for day_offset in range(30):
                log_date = today - timedelta(days=day_offset)
                # Skip weekends
                if log_date.weekday() >= 5:
                    continue
                # 85% attendance rate
                if random.random() > 0.85:
                    continue

                # Entry time: 8:45 – 9:45 AM
                entry_hour = 9
                entry_min = random.randint(-15, 45)
                entry_time = time(entry_hour, max(0, min(59, entry_min)), random.randint(0, 59))

                # Exit time: 5:30 – 7:30 PM
                exit_hour = random.randint(17, 19)
                exit_min = random.randint(0, 59)
                exit_time = time(exit_hour, exit_min, random.randint(0, 59))

                await conn.execute("""
                    INSERT INTO attendance_logs
                        (tenant_id, emp_id, name, date, time, event_type, location_type, confidence, created_at)
                    VALUES ($1,$2,$3,$4,$5,'entry','office',$6, $7)
                    ON CONFLICT DO NOTHING
                """,
                    tenant_id, emp_id, emp_name, log_date, entry_time,
                    round(random.uniform(0.87, 0.99), 4),
                    datetime.combine(log_date, entry_time)
                )
                await conn.execute("""
                    INSERT INTO attendance_logs
                        (tenant_id, emp_id, name, date, time, event_type, location_type, confidence, created_at)
                    VALUES ($1,$2,$3,$4,$5,'exit','office',$6, $7)
                    ON CONFLICT DO NOTHING
                """,
                    tenant_id, emp_id, emp_name, log_date, exit_time,
                    round(random.uniform(0.87, 0.99), 4),
                    datetime.combine(log_date, exit_time)
                )

        # Insert subscription
        plan_id = await conn.fetchval("SELECT id FROM plans WHERE name=$1", company["plan"])
        if plan_id:
            await conn.execute("""
                INSERT INTO subscriptions (tenant_id, plan_id, started_at, is_active)
                VALUES ($1, $2, NOW() - INTERVAL '2 months', true)
                ON CONFLICT (tenant_id) DO UPDATE SET plan_id = EXCLUDED.plan_id, is_active = true
            """, tenant_id, plan_id)

        # Insert payment logs (last 3 months)
        for month_offset in range(3):
            paid_at = datetime.now() - timedelta(days=30 * month_offset)
            await conn.execute("""
                INSERT INTO payment_logs (tenant_id, plan_id, amount, currency, payment_id, status, paid_at)
                VALUES ($1,$2,$3,'INR',$4,'success',$5)
            """,
                tenant_id, plan_id, company["monthly_amount"],
                f"pay_{uuid.uuid4().hex[:16]}",
                paid_at
            )

        inserted_tenant_ids.append(tenant_id)
        print(f"  ✅ {company['name']} — {emp_count} employees, {enrolled_count} enrolled, plan: {company['plan'].upper()}")

    # ── Final Summary ────────────────────────────────────────────────────────
    total_tenants = await conn.fetchval("SELECT COUNT(*) FROM tenants")
    total_employees = await conn.fetchval("SELECT COUNT(*) FROM employees")
    total_enrolled = await conn.fetchval("SELECT COUNT(*) FROM employees WHERE face_enrolled = true")
    total_logs = await conn.fetchval("SELECT COUNT(*) FROM attendance_logs")
    total_subs = await conn.fetchval("SELECT COUNT(*) FROM subscriptions WHERE is_active = true")

    print(f"""
╔══════════════════════════════════════════════════════╗
║        ✅ DEMO DATA SEED COMPLETE                    ║
╠══════════════════════════════════════════════════════╣
║  🏢 Total Companies (Tenants) : {total_tenants:<5}                 ║
║  👥 Total Employees           : {total_employees:<5}                 ║
║  🟢 Face Enrolled             : {total_enrolled:<5}                 ║
║  📋 Attendance Logs           : {total_logs:<6}                ║
║  💳 Active Subscriptions      : {total_subs:<5}                 ║
╚══════════════════════════════════════════════════════╝
    """)

    await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
