-- serendipity-web/sql/kingdom_migration_v2.sql
-- Database: postgres
-- Author: Santiago & Sofia (via Antigravity)
-- Date: 2026-04-20
-- Description: Schema update for PRARA Bond and Kingdom modules.

-- 1. Módulo PRARA Bond (M5)
CREATE TABLE IF NOT EXISTS "PraraAmortization" (
    "Id" SERIAL PRIMARY KEY,
    "BatchId" TEXT,
    "TotalAdvance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "CurrentBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "MonthlyQuota" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "LastPaymentDate" TIMESTAMP WITH TIME ZONE,
    "Status" TEXT DEFAULT 'Active',
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initial data seed for PRARA (example values for M5 molecule)
INSERT INTO "PraraAmortization" ("TotalAdvance", "CurrentBalance", "MonthlyQuota", "Status")
SELECT 100000.00, 85000.00, 4200.00, 'Active'
WHERE NOT EXISTS (SELECT 1 FROM "PraraAmortization");

-- 2. Estructura para Identidad de Nodos (Synapse Footer)
-- Used by sofia-inbox.js for dynamic email footers
CREATE TABLE IF NOT EXISTS node_identity (
    id          SERIAL PRIMARY KEY,
    email       TEXT UNIQUE NOT NULL,
    db_code     TEXT,
    node_id     TEXT NOT NULL,
    country_code TEXT DEFAULT 'VN',
    country_flag TEXT DEFAULT '🇻🇳',
    synapse_count INT DEFAULT 0,
    trust_score  INT DEFAULT 1,
    last_synapse TIMESTAMP
);

-- 3. Additional Kingdom Schema placeholder
-- Add any other kingdom-specific tables here if needed in the future
