-- phase4_inventory_and_purchasing.sql
-- Leather inventory · Purchase requests · PO status extensions
-- Run: psql -U postgres -d sofia -f sql/phase4_inventory_and_purchasing.sql

-- ============================================================
-- 1. LEATHER INVENTORY (crust stock)
-- ============================================================
CREATE TABLE IF NOT EXISTS leather_inventory (
    id              SERIAL PRIMARY KEY,
    article_id      INTEGER REFERENCES articles(id),
    crust_type      TEXT NOT NULL,
    supplier        TEXT,
    lot_ref         TEXT,
    qty_sf          NUMERIC(12,2) DEFAULT 0,  -- available SF
    reserved_sf     NUMERIC(12,2) DEFAULT 0,  -- reserved by active POs
    unit_cost_sf    NUMERIC(10,4),
    owner           TEXT DEFAULT 'Serendipity',
    location        TEXT DEFAULT 'Kho B+C',
    received_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiry_date     DATE,
    notes           TEXT
);

-- ============================================================
-- 2. LEATHER STOCK MOVEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS leather_movements (
    id              SERIAL PRIMARY KEY,
    leather_id      INTEGER NOT NULL REFERENCES leather_inventory(id),
    type            TEXT NOT NULL CHECK (type IN ('IN', 'OUT', 'RESERVE', 'RELEASE', 'ADJUST')),
    qty_sf          NUMERIC(12,2) NOT NULL,
    reason          TEXT,
    po_id           INTEGER REFERENCES production_orders(id),
    moved_by        TEXT DEFAULT 'system',
    moved_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3. PURCHASE REQUESTS (chemicals or leather)
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_requests (
    id              SERIAL PRIMARY KEY,
    type            TEXT NOT NULL CHECK (type IN ('CHEMICAL', 'LEATHER')),
    item_name       TEXT NOT NULL,
    chemical_id     INTEGER REFERENCES chemicals(id),
    leather_crust   TEXT,
    qty_needed      NUMERIC(12,3) NOT NULL,
    unit            TEXT DEFAULT 'kg',
    qty_in_stock    NUMERIC(12,3) DEFAULT 0,
    reason          TEXT,
    po_id           INTEGER REFERENCES production_orders(id),
    status          TEXT DEFAULT 'PENDING',  -- 'PENDING' | 'APPROVED' | 'ORDERED' | 'RECEIVED' | 'CANCELLED'
    urgency         TEXT DEFAULT 'NORMAL',   -- 'NORMAL' | 'URGENT'
    requested_by    TEXT DEFAULT 'system',
    approved_by     TEXT,
    supplier        TEXT,
    estimated_cost  NUMERIC(12,2),
    notes           TEXT,
    requested_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at     TIMESTAMP WITH TIME ZONE,
    received_at     TIMESTAMP WITH TIME ZONE
);

-- ============================================================
-- 4. EXTEND production_orders: packing columns
-- ============================================================
ALTER TABLE production_orders
    ADD COLUMN IF NOT EXISTS sf_packed       NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS packed_by       TEXT,
    ADD COLUMN IF NOT EXISTS packed_at       TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS leather_id      INTEGER REFERENCES leather_inventory(id),
    ADD COLUMN IF NOT EXISTS inventory_ok    BOOLEAN,
    ADD COLUMN IF NOT EXISTS inventory_checked_at TIMESTAMP WITH TIME ZONE;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leather_inv_article   ON leather_inventory(article_id);
CREATE INDEX IF NOT EXISTS idx_leather_inv_owner     ON leather_inventory(owner);
CREATE INDEX IF NOT EXISTS idx_purchase_req_status   ON purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_purchase_req_po       ON purchase_requests(po_id);
CREATE INDEX IF NOT EXISTS idx_leather_mov_leather   ON leather_movements(leather_id);
