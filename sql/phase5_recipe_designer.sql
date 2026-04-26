-- phase5_recipe_designer.sql
-- Recipe/Formula Designer: processes (columns) + lines (rows) grid
-- Separate from MES formula_layers (which is SF-based for production execution)
-- Run: psql -U postgres -d sofia -f sql/phase5_recipe_designer.sql

-- ============================================================
-- 1. RECIPE FORMULAS (header)
-- ============================================================
CREATE TABLE IF NOT EXISTS recipe_formulas (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    article     TEXT,
    color_ref   TEXT,
    description TEXT,
    notes       TEXT,
    status      TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','ARCHIVED')),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. RECIPE PROCESSES (columns of the grid)
-- ============================================================
CREATE TABLE IF NOT EXISTS recipe_processes (
    id             SERIAL PRIMARY KEY,
    formula_id     INTEGER NOT NULL REFERENCES recipe_formulas(id) ON DELETE CASCADE,
    process_order  INTEGER NOT NULL,
    name           TEXT NOT NULL,
    type           TEXT NOT NULL CHECK (type IN ('CHEMICAL','MECHANICAL')),
    machine        TEXT,
    -- CHEMICAL / spray params
    pressure_bar   NUMERIC(6,2),
    speed_mpm      NUMERIC(6,2),
    passes         INTEGER,
    -- MECHANICAL params
    temperature_c  NUMERIC(6,1),
    load_kg        NUMERIC(8,2),
    duration_min   NUMERIC(8,2),
    notes          TEXT,
    UNIQUE(formula_id, process_order)
);

-- ============================================================
-- 3. RECIPE LINES (cells: chemical × process)
-- Sparse: only rows where grams > 0 or is_variable = true
-- ============================================================
CREATE TABLE IF NOT EXISTS recipe_lines (
    id          SERIAL PRIMARY KEY,
    process_id  INTEGER NOT NULL REFERENCES recipe_processes(id) ON DELETE CASCADE,
    chemical_id INTEGER REFERENCES chemicals(id),
    grams       NUMERIC(10,3) NOT NULL DEFAULT 0,
    is_variable BOOLEAN DEFAULT FALSE,
    notes       TEXT,
    UNIQUE(process_id, chemical_id)
);

CREATE INDEX IF NOT EXISTS idx_recipe_processes_formula ON recipe_processes(formula_id);
CREATE INDEX IF NOT EXISTS idx_recipe_lines_process     ON recipe_lines(process_id);
CREATE INDEX IF NOT EXISTS idx_recipe_lines_chemical    ON recipe_lines(chemical_id);

-- Auto-update updated_at on recipe_formulas
CREATE OR REPLACE FUNCTION touch_recipe_formula() RETURNS TRIGGER AS $$
BEGIN
    UPDATE recipe_formulas SET updated_at = NOW() WHERE id = NEW.formula_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_formula_on_process ON recipe_processes;
CREATE TRIGGER trg_touch_formula_on_process
    AFTER INSERT OR UPDATE ON recipe_processes
    FOR EACH ROW EXECUTE FUNCTION touch_recipe_formula();
