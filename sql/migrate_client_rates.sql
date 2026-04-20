-- serendipity-web/sql/migrate_client_rates.sql
-- Database: sofia
-- Author: Santiago & Sofia (via Antigravity)
-- Date: 2026-04-20
-- Description: Migration for client_rates table to support gross margin calculations.

-- 1. Ensure client_rates table exists with the correct column
CREATE TABLE IF NOT EXISTS client_rates (
    id SERIAL PRIMARY KEY,
    client_name TEXT UNIQUE NOT NULL,
    rate_per_sqft DECIMAL(18,4) NOT NULL,
    currency TEXT DEFAULT 'USD',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. If the column rate_usd existed previously, migrate it (uncomment if necessary)
-- DO $$ 
-- BEGIN 
--   IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_rates' AND column_name='rate_usd') THEN
--     UPDATE client_rates SET rate_per_sqft = rate_usd WHERE rate_per_sqft IS NULL;
--   END IF;
-- END $$;

-- 3. Sample data for gross margin verification (M1/M4 molecules)
INSERT INTO client_rates (client_name, rate_per_sqft)
VALUES 
    ('PRARA', 0.2850),
    ('GUCCI', 0.4200),
    ('ADIDAS', 0.3500)
ON CONFLICT (client_name) DO UPDATE 
SET rate_per_sqft = EXCLUDED.rate_per_sqft,
    updated_at = EXCLUDED.updated_at;
