-- ============================================================
-- SaaS Attend-AI — Full Database Schema
-- Database: saas_attendai
-- Run: psql -U postgres -h localhost -f schema.sql
-- ============================================================

-- Create fresh database
CREATE DATABASE saas_attendai;
\c saas_attendai;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- GROUP 1: TENANT & AUTH
-- ============================================================

CREATE TABLE tenants (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT NOT NULL,                    -- "SE Asia Pvt Ltd"
    slug              TEXT UNIQUE NOT NULL,              -- "seasia" → seasia.attendai.com

    -- Contact
    email             TEXT UNIQUE NOT NULL,
    phone             TEXT,
    logo_url          TEXT,
    timezone          TEXT DEFAULT 'Asia/Kolkata',

    -- Dynamic Emp ID config
    emp_id_prefix     TEXT DEFAULT 'EMP',               -- "EMP", "DLA", "SEA"
    emp_id_digits     INTEGER DEFAULT 4,                -- EMP0001 ya EMP001

    -- Plan & Status
    plan              TEXT DEFAULT 'trial'
                      CHECK (plan IN ('trial','starter','growth','enterprise')),
    status            TEXT DEFAULT 'active'
                      CHECK (status IN ('active','suspended','cancelled')),

    -- Plan limits
    max_employees     INTEGER DEFAULT 10,
    max_cameras       INTEGER DEFAULT 1,
    trial_ends_at     TIMESTAMP,

    created_at        TIMESTAMP DEFAULT NOW(),
    updated_at        TIMESTAMP DEFAULT NOW()
);


CREATE TABLE tenant_users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    name          TEXT NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,                        -- bcrypt hashed
    role          TEXT DEFAULT 'admin'
                  CHECK (role IN ('super_admin','admin','hr','viewer')),
    is_active     BOOLEAN DEFAULT TRUE,
    last_login    TIMESTAMP,
    created_at    TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- GROUP 2: COMPANY SETUP
-- ============================================================

CREATE TABLE shifts (
    id              SERIAL PRIMARY KEY,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    name            TEXT NOT NULL,                      -- "General", "Morning", "Night"
    start_time      TIME NOT NULL,                      -- 09:00
    end_time        TIME NOT NULL,                      -- 18:00
    late_after      TIME,                               -- 09:30 ke baad = Late
    half_day_hours  NUMERIC(4,2) DEFAULT 4.0,           -- 4 ghante = Half Day
    full_day_hours  NUMERIC(4,2) DEFAULT 8.0,           -- 8 ghante = Full Day

    is_default      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW(),

    UNIQUE(tenant_id, name)
);


CREATE TABLE employees (
    id              SERIAL PRIMARY KEY,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    emp_id          TEXT NOT NULL,                      -- "3893", "EMP001", "SEA0042"
    name            TEXT NOT NULL,
    department      TEXT,
    designation     TEXT,
    email           TEXT,
    phone           TEXT,

    shift_id        INTEGER REFERENCES shifts(id),
    face_enrolled   BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    joining_date    DATE,
    created_at      TIMESTAMP DEFAULT NOW(),

    UNIQUE(tenant_id, emp_id)
);


CREATE TABLE cameras (
    id          SERIAL PRIMARY KEY,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    name        TEXT NOT NULL,                          -- "Main Gate"
    stream_url  TEXT NOT NULL,                          -- rtsp://192.168.1.100/stream
    type        TEXT NOT NULL
                CHECK (type IN ('entry','exit')),
    location    TEXT,                                   -- "Ground Floor Lobby"
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT NOW(),

    UNIQUE(tenant_id, name)
);


CREATE TABLE holidays (
    id          SERIAL PRIMARY KEY,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    name        TEXT NOT NULL,                          -- "Diwali", "Republic Day"
    date        DATE NOT NULL,
    type        TEXT DEFAULT 'public'
                CHECK (type IN ('public','optional','restricted')),

    UNIQUE(tenant_id, date)
);


-- ============================================================
-- GROUP 3: FACE DATA (Stored in DB)
-- ============================================================

CREATE TABLE face_images (
    id          SERIAL PRIMARY KEY,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    emp_id      TEXT NOT NULL,

    image_data  BYTEA NOT NULL,                         -- Actual image bytes
    image_name  TEXT,                                   -- "front_1.jpg"
    file_size   INTEGER,                                -- bytes

    uploaded_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY (tenant_id, emp_id)
        REFERENCES employees(tenant_id, emp_id)
        ON DELETE CASCADE
);


CREATE TABLE face_embeddings (
    id              SERIAL PRIMARY KEY,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    emp_id          TEXT NOT NULL,
    face_image_id   INTEGER REFERENCES face_images(id) ON DELETE CASCADE,

    embedding       BYTEA NOT NULL,                     -- numpy array → pickle → BYTEA
    model_version   TEXT DEFAULT 'v1',

    created_at      TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY (tenant_id, emp_id)
        REFERENCES employees(tenant_id, emp_id)
        ON DELETE CASCADE
);


-- ============================================================
-- GROUP 4: ATTENDANCE
-- ============================================================

CREATE TABLE attendance_logs (
    id              SERIAL PRIMARY KEY,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    emp_id          TEXT NOT NULL,
    name            TEXT NOT NULL,
    date            DATE NOT NULL,
    time            TIME NOT NULL,
    camera_id       INTEGER REFERENCES cameras(id),
    event_type      TEXT NOT NULL
                    CHECK (event_type IN ('entry','exit')),
    location_type   TEXT DEFAULT 'office'
                    CHECK (location_type IN ('office','wfh')),
    confidence      NUMERIC(5,4),                       -- Face match confidence 0.0-1.0
    snapshot_id     INTEGER REFERENCES face_images(id), -- Captured frame reference

    created_at      TIMESTAMP DEFAULT NOW()
);

-- No daily_summary table — computed real-time from attendance_logs


-- ============================================================
-- GROUP 5: LEAVES & REQUESTS
-- ============================================================

CREATE TABLE leave_types (
    id              SERIAL PRIMARY KEY,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    name            TEXT NOT NULL,                      -- "Casual Leave"
    code            TEXT NOT NULL,                      -- "CL", "SL", "PL"
    days_per_year   INTEGER DEFAULT 12,
    carry_forward   BOOLEAN DEFAULT FALSE,

    UNIQUE(tenant_id, code)
);


CREATE TABLE leave_balances (
    id              SERIAL PRIMARY KEY,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    emp_id          TEXT NOT NULL,
    leave_type_id   INTEGER REFERENCES leave_types(id) ON DELETE CASCADE,
    year            INTEGER NOT NULL,                   -- 2026

    total_days      NUMERIC(5,1),
    used_days       NUMERIC(5,1) DEFAULT 0,
    pending_days    NUMERIC(5,1) DEFAULT 0,
    remaining_days  NUMERIC(5,1),                       -- Computed: total - used - pending

    UNIQUE(tenant_id, emp_id, leave_type_id, year)
);


CREATE TABLE leave_requests (
    id              SERIAL PRIMARY KEY,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    emp_id          TEXT NOT NULL,
    name            TEXT NOT NULL,
    leave_type_id   INTEGER REFERENCES leave_types(id),

    from_date       DATE NOT NULL,
    to_date         DATE NOT NULL,
    total_days      NUMERIC(5,1),
    reason          TEXT,

    status          TEXT DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','cancelled')),
    applied_at      TIMESTAMP DEFAULT NOW(),
    reviewed_by     TEXT,
    reviewed_at     TIMESTAMP,
    remarks         TEXT
);


CREATE TABLE attendance_requests (
    id              SERIAL PRIMARY KEY,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    emp_id          TEXT NOT NULL,
    name            TEXT NOT NULL,
    request_type    TEXT NOT NULL
                    CHECK (request_type IN ('wfh','manual_entry','manual_capture')),
    date            DATE NOT NULL,
    in_time         TIME,
    out_time        TIME,
    reason          TEXT,

    status          TEXT DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected')),
    requested_at    TIMESTAMP DEFAULT NOW(),
    reviewed_by     TEXT,
    reviewed_at     TIMESTAMP,
    remarks         TEXT,

    UNIQUE(tenant_id, emp_id, date, request_type)
);


-- ============================================================
-- GROUP 6: BILLING
-- ============================================================

CREATE TABLE plans (
    id              SERIAL PRIMARY KEY,
    name            TEXT UNIQUE NOT NULL,
    display_name    TEXT,
    price_monthly   INTEGER,                            -- paise (₹999 = 99900)
    max_employees   INTEGER,                            -- NULL = unlimited
    max_cameras     INTEGER,
    features        JSONB,
    is_active       BOOLEAN DEFAULT TRUE
);

-- Seed plan data
INSERT INTO plans (name, display_name, price_monthly, max_employees, max_cameras, features) VALUES
('trial',      'Free Trial',   0,      10,   1,    '{"reports":false,"leave":false,"csv_export":false}'),
('starter',    'Starter',      99900,  25,   2,    '{"reports":true,"leave":true,"csv_export":true}'),
('growth',     'Growth',       249900, 100,  5,    '{"reports":true,"leave":true,"csv_export":true,"analytics":true}'),
('enterprise', 'Enterprise',   NULL,   NULL, NULL, '{"all":true}');


CREATE TABLE subscriptions (
    id              SERIAL PRIMARY KEY,
    tenant_id       UUID UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id         INTEGER REFERENCES plans(id),

    started_at      TIMESTAMP DEFAULT NOW(),
    ends_at         TIMESTAMP,
    is_active       BOOLEAN DEFAULT TRUE,

    razorpay_sub_id TEXT
);


CREATE TABLE payment_logs (
    id              SERIAL PRIMARY KEY,
    tenant_id       UUID REFERENCES tenants(id),
    plan_id         INTEGER REFERENCES plans(id),

    amount          INTEGER,                            -- paise
    currency        TEXT DEFAULT 'INR',
    payment_id      TEXT,                               -- Razorpay ID
    status          TEXT
                    CHECK (status IN ('success','failed','refunded')),
    paid_at         TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- INDEXES (Performance)
-- ============================================================

CREATE INDEX idx_attendance_logs_tenant_date  ON attendance_logs(tenant_id, date);
CREATE INDEX idx_attendance_logs_tenant_emp   ON attendance_logs(tenant_id, emp_id);
CREATE INDEX idx_attendance_logs_tenant_event ON attendance_logs(tenant_id, event_type);
CREATE INDEX idx_employees_tenant             ON employees(tenant_id);
CREATE INDEX idx_employees_tenant_active      ON employees(tenant_id, is_active);
CREATE INDEX idx_face_embeddings_tenant_emp   ON face_embeddings(tenant_id, emp_id);
CREATE INDEX idx_leave_requests_tenant_status ON leave_requests(tenant_id, status);
CREATE INDEX idx_attendance_requests_status   ON attendance_requests(tenant_id, status);
CREATE INDEX idx_cameras_tenant               ON cameras(tenant_id, is_active);
CREATE INDEX idx_tenant_users_email           ON tenant_users(email);


-- ============================================================
-- DONE
-- ============================================================
\echo '✅ saas_attendai database schema created successfully!'
\echo '📊 Tables: tenants, tenant_users, shifts, employees, cameras, holidays,'
\echo '           face_images, face_embeddings, attendance_logs,'
\echo '           leave_types, leave_balances, leave_requests, attendance_requests,'
\echo '           plans, subscriptions, payment_logs'
