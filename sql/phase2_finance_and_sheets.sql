-- serendipity-web/sql/phase2_finance_and_sheets.sql
-- Phase 2: Finance module + Google Sheets sync tables
-- Run against: psql -U postgres -d sofia -f sql/phase2_finance_and_sheets.sql

-- ============================================================
-- 1. ORDERS (Google Sheets sync target + manual PO management)
-- ============================================================
CREATE TABLE IF NOT EXISTS "Orders" (
    id              SERIAL PRIMARY KEY,
    po_client       TEXT UNIQUE,
    po_internal     TEXT,
    customer        TEXT NOT NULL,
    article         TEXT NOT NULL,
    color           TEXT,
    type            TEXT DEFAULT 'bulk',
    qty             TEXT DEFAULT '0',
    unit            TEXT DEFAULT 'SF',
    status          TEXT DEFAULT 'NEW',
    eta             TEXT,
    notes           TEXT,
    delivery        TEXT,
    swatch          TEXT,
    crust_supplier  TEXT,
    crust_cost      NUMERIC(12,2),
    crust_status    TEXT,
    sell_price      NUMERIC(12,2),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 2. QR SCAN LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS "QrScans" (
    id          SERIAL PRIMARY KEY,
    order_id    INTEGER REFERENCES "Orders"(id) ON DELETE CASCADE,
    lot_id      TEXT,
    action      TEXT NOT NULL,
    station     TEXT NOT NULL,
    scanned_by  TEXT,
    notes       TEXT,
    scanned_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3. ORDER STATUS HISTORY (audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS "OrderStatusHistory" (
    id          SERIAL PRIMARY KEY,
    order_id    INTEGER REFERENCES "Orders"(id) ON DELETE CASCADE,
    status      TEXT NOT NULL,
    changed_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    changed_by  TEXT DEFAULT 'system'
);

-- ============================================================
-- 4. USERS (local auth — replaces Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS "GoogleUsers" (
    id              SERIAL PRIMARY KEY,
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    name            TEXT NOT NULL,
    role            TEXT DEFAULT 'OPERATIVO',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 5. FINANCE STATE (single-row running totals)
-- ============================================================
CREATE TABLE IF NOT EXISTS finances_state (
    id              INTEGER PRIMARY KEY DEFAULT 1,
    total_balance   NUMERIC(18,2) DEFAULT 0,
    reserve_fund    NUMERIC(18,2) DEFAULT 0,
    reserve_target  NUMERIC(18,2) DEFAULT 41000,
    debt_remaining  NUMERIC(18,2) DEFAULT 0,
    debt_total      NUMERIC(18,2) DEFAULT 0,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO finances_state (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. TRANSACTIONS (income/expense ledger)
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
    id          SERIAL PRIMARY KEY,
    type        TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    amount      NUMERIC(18,2) NOT NULL,
    category    TEXT,
    description TEXT,
    date        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by  TEXT DEFAULT 'system'
);

-- ============================================================
-- 7. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_customer  ON "Orders"(customer);
CREATE INDEX IF NOT EXISTS idx_orders_status    ON "Orders"(status);
CREATE INDEX IF NOT EXISTS idx_qrscans_order    ON "QrScans"(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
