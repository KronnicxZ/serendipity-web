-- phase3_mes_schema.sql
-- MES: Chemicals · Formulas · Production Orders · Batches
-- Run: psql -U postgres -d sofia -f sql/phase3_mes_schema.sql

-- ============================================================
-- 1. CHEMICALS CATALOG
-- ============================================================
CREATE TABLE IF NOT EXISTS chemicals (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    category    TEXT NOT NULL, -- 'Base' | 'Pigmento' | 'Ligante' | 'Acabado' | 'Penetrante' | 'Solvente' | 'Otro'
    unit        TEXT DEFAULT 'kg',
    unit_cost   NUMERIC(10,4),
    supplier    TEXT,
    min_stock   NUMERIC(10,3) DEFAULT 0,
    stock_kg    NUMERIC(10,3) DEFAULT 0,
    owner       TEXT DEFAULT 'Serendipity', -- 'Serendipity' | 'PRARA'
    notes       TEXT,
    active      BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 2. ARTICLES CATALOG (approved products)
-- ============================================================
CREATE TABLE IF NOT EXISTS articles (
    id              SERIAL PRIMARY KEY,
    code            TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    crust_type      TEXT,
    crust_supplier  TEXT,
    crust_cost_sf   NUMERIC(10,4),
    sell_price_sf   NUMERIC(10,4),
    thickness_mm    NUMERIC(4,2),
    status          TEXT DEFAULT 'ACTIVE', -- 'ACTIVE' | 'SAMPLE' | 'DISCONTINUED'
    notes           TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3. FORMULAS
-- ============================================================
CREATE TABLE IF NOT EXISTS formulas (
    id          SERIAL PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    description TEXT,
    article_id  INTEGER REFERENCES articles(id),
    version     INTEGER DEFAULT 1,
    status      TEXT DEFAULT 'DRAFT', -- 'DRAFT' | 'APPROVED' | 'ARCHIVED'
    created_by  TEXT DEFAULT 'Thanh',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 4. FORMULA LAYERS (ordered steps — chemical OR mechanical)
-- ============================================================
CREATE TABLE IF NOT EXISTS formula_layers (
    id              SERIAL PRIMARY KEY,
    formula_id      INTEGER NOT NULL REFERENCES formulas(id) ON DELETE CASCADE,
    layer_order     INTEGER NOT NULL,
    layer_type      TEXT NOT NULL CHECK (layer_type IN ('CHEMICAL', 'MECHANICAL')),
    name            TEXT NOT NULL,
    -- Chemical layer
    chemical_id     INTEGER REFERENCES chemicals(id),
    qty_per_sf      NUMERIC(10,6), -- kg per SF
    pct_in_mix      NUMERIC(5,2),  -- % in the prepared mix
    -- Mechanical layer
    machine         TEXT,
    temperature_c   INTEGER,
    passes          INTEGER,
    speed           TEXT,
    plate_ref       TEXT,
    -- Common
    notes           TEXT,
    UNIQUE(formula_id, layer_order)
);

-- ============================================================
-- 5. PRODUCTION ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS production_orders (
    id              SERIAL PRIMARY KEY,
    po_number       TEXT NOT NULL UNIQUE,
    order_id        INTEGER REFERENCES "Orders"(id),
    article_id      INTEGER REFERENCES articles(id),
    formula_id      INTEGER REFERENCES formulas(id),
    sf_target       NUMERIC(12,2) NOT NULL,
    sf_produced     NUMERIC(12,2) DEFAULT 0,
    owner           TEXT DEFAULT 'Serendipity',
    status          TEXT DEFAULT 'PENDING', -- 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
    assigned_to     TEXT DEFAULT 'Thanh',
    notes           TEXT,
    started_at      TIMESTAMP WITH TIME ZONE,
    completed_at    TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 6. BATCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS batches (
    id              SERIAL PRIMARY KEY,
    batch_number    TEXT NOT NULL UNIQUE,
    po_id           INTEGER REFERENCES production_orders(id),
    formula_id      INTEGER REFERENCES formulas(id),
    sf_produced     NUMERIC(12,2) NOT NULL,
    owner           TEXT DEFAULT 'Serendipity',
    status          TEXT DEFAULT 'OPEN', -- 'OPEN' | 'CLOSED' | 'ANOMALY'
    executed_by     TEXT DEFAULT 'Thanh',
    notes           TEXT,
    sheet_synced    BOOLEAN DEFAULT FALSE,
    started_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at       TIMESTAMP WITH TIME ZONE
);

-- ============================================================
-- 7. BATCH LAYERS (actual usage per step)
-- ============================================================
CREATE TABLE IF NOT EXISTS batch_layers (
    id              SERIAL PRIMARY KEY,
    batch_id        INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    layer_id        INTEGER REFERENCES formula_layers(id),
    layer_order     INTEGER NOT NULL,
    layer_type      TEXT NOT NULL,
    chemical_id     INTEGER REFERENCES chemicals(id),
    qty_prepared_kg NUMERIC(10,3),
    qty_used_kg     NUMERIC(10,3),
    waste_kg        NUMERIC(10,3) GENERATED ALWAYS AS (
                        CASE WHEN qty_prepared_kg IS NOT NULL AND qty_used_kg IS NOT NULL
                        THEN qty_prepared_kg - qty_used_kg ELSE NULL END
                    ) STORED,
    waste_pct       NUMERIC(5,2) GENERATED ALWAYS AS (
                        CASE WHEN qty_prepared_kg > 0 AND qty_used_kg IS NOT NULL
                        THEN ROUND(((qty_prepared_kg - qty_used_kg) / qty_prepared_kg) * 100, 2)
                        ELSE NULL END
                    ) STORED,
    is_anomaly      BOOLEAN DEFAULT FALSE,
    anomaly_note    TEXT,
    executed_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 8. STOCK MOVEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_movements (
    id          SERIAL PRIMARY KEY,
    chemical_id INTEGER NOT NULL REFERENCES chemicals(id),
    type        TEXT NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUST')),
    qty_kg      NUMERIC(10,3) NOT NULL,
    reason      TEXT, -- 'batch_use' | 'purchase' | 'adjustment' | 'waste'
    batch_id    INTEGER REFERENCES batches(id),
    unit_cost   NUMERIC(10,4),
    moved_by    TEXT DEFAULT 'system',
    moved_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_formula_layers_formula   ON formula_layers(formula_id);
CREATE INDEX IF NOT EXISTS idx_batches_po               ON batches(po_id);
CREATE INDEX IF NOT EXISTS idx_batch_layers_batch       ON batch_layers(batch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_chemical ON stock_movements(chemical_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_status ON production_orders(status);
CREATE INDEX IF NOT EXISTS idx_batches_status           ON batches(status);

-- ============================================================
-- AUTO-NUMBER: batches and production orders
-- ============================================================
CREATE OR REPLACE FUNCTION generate_po_number() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
        NEW.po_number := 'PO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEW.id::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_batch_number() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.batch_number IS NULL OR NEW.batch_number = '' THEN
        NEW.batch_number := 'BT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEW.id::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_po_number   ON production_orders;
DROP TRIGGER IF EXISTS trg_batch_number ON batches;

CREATE TRIGGER trg_po_number
    BEFORE INSERT ON production_orders
    FOR EACH ROW EXECUTE FUNCTION generate_po_number();

CREATE TRIGGER trg_batch_number
    BEFORE INSERT ON batches
    FOR EACH ROW EXECUTE FUNCTION generate_batch_number();

-- ============================================================
-- STOCK DEDUCTION TRIGGER: auto-deduct on batch layer save
-- ============================================================
CREATE OR REPLACE FUNCTION deduct_stock_on_batch_layer() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.chemical_id IS NOT NULL AND NEW.qty_used_kg IS NOT NULL THEN
        UPDATE chemicals
        SET stock_kg = stock_kg - NEW.qty_used_kg
        WHERE id = NEW.chemical_id;

        INSERT INTO stock_movements (chemical_id, type, qty_kg, reason, batch_id, moved_by)
        VALUES (NEW.chemical_id, 'OUT', NEW.qty_used_kg, 'batch_use',
                NEW.batch_id, 'system');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deduct_stock ON batch_layers;

CREATE TRIGGER trg_deduct_stock
    AFTER INSERT ON batch_layers
    FOR EACH ROW EXECUTE FUNCTION deduct_stock_on_batch_layer();

-- ============================================================
-- SEED: Chemical catalog
-- ============================================================
INSERT INTO chemicals (name, category, unit, owner) VALUES
    ('Poliuretano base',     'Base',       'kg', 'Serendipity'),
    ('Nitrocelulosa',        'Base',       'kg', 'Serendipity'),
    ('Caseína',              'Base',       'kg', 'Serendipity'),
    ('Sellador base',        'Base',       'kg', 'Serendipity'),
    ('Pigmento negro',       'Pigmento',   'kg', 'Serendipity'),
    ('Pigmento color',       'Pigmento',   'kg', 'Serendipity'),
    ('Pigmento blanco',      'Pigmento',   'kg', 'Serendipity'),
    ('Ligante acrílico',     'Ligante',    'kg', 'Serendipity'),
    ('Resina acrílica',      'Ligante',    'kg', 'Serendipity'),
    ('Reticulante',          'Ligante',    'kg', 'Serendipity'),
    ('Endurecedor',          'Ligante',    'kg', 'Serendipity'),
    ('Cera natural',         'Acabado',    'kg', 'Serendipity'),
    ('Top coat brillante',   'Acabado',    'kg', 'Serendipity'),
    ('Top coat mate',        'Acabado',    'kg', 'Serendipity'),
    ('Top coat satinado',    'Acabado',    'kg', 'Serendipity'),
    ('Fijador',              'Acabado',    'kg', 'Serendipity'),
    ('Aceite penetrante',    'Penetrante', 'kg', 'Serendipity'),
    ('Agua desmineralizada', 'Solvente',   'L',  'Serendipity'),
    ('Diluyente',            'Solvente',   'L',  'Serendipity'),
    ('Alcohol isopropílico', 'Solvente',   'L',  'Serendipity')
ON CONFLICT (name) DO NOTHING;
