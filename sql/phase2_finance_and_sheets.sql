-- 1. Orders Table Update: Add unique constraint for upsert functionality
-- This is required for the ON CONFLICT (po_client) DO UPDATE logic
ALTER TABLE "Orders" ADD CONSTRAINT orders_po_client_unique UNIQUE (po_client);

-- 2. Finance State Table: Stores the current financial snapshot (one row)
CREATE TABLE IF NOT EXISTS finances_state (
    id SERIAL PRIMARY KEY,
    total_balance DECIMAL(15,2) DEFAULT 0,
    reserve_fund DECIMAL(15,2) DEFAULT 0,
    reserve_target DECIMAL(15,2) DEFAULT 0,
    debt_remaining DECIMAL(15,2) DEFAULT 0,
    debt_total DECIMAL(15,2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed initial finance state if empty (id=1 is used by FinanceService)
INSERT INTO finances_state (id, total_balance, reserve_fund, reserve_target, debt_remaining, debt_total)
VALUES (1, 24500.00, 21000.00, 41000.00, 15000.00, 40000.00)
ON CONFLICT (id) DO NOTHING;

-- 3. Transactions Table: Ledger of income and expenses
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP NOT NULL DEFAULT NOW(),
    type VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    amount DECIMAL(15,2) NOT NULL,
    category VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Seed some sample transactions for the current month if empty to verify functionality
INSERT INTO transactions (date, type, amount, category, description)
SELECT date_trunc('month', NOW()), 'INCOME', 12500.00, 'Ventas', 'Ingresos del mes base'
WHERE NOT EXISTS (SELECT 1 FROM transactions LIMIT 1);

INSERT INTO transactions (date, type, amount, category, description)
SELECT date_trunc('month', NOW()) + interval '1 day', 'EXPENSE', 3200.00, 'Planta & Energía', 'Gastos operativos planta'
WHERE NOT EXISTS (SELECT 1 FROM transactions WHERE category = 'Planta & Energía');
