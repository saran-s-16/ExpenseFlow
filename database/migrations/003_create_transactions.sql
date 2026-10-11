-- ============================================
-- 003 - CREATE TRANSACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL,

    category_id INTEGER,

    type VARCHAR(20) NOT NULL
        CHECK (type IN ('income', 'expense')),

    amount NUMERIC(12, 2) NOT NULL
        CHECK (amount > 0),

    category VARCHAR(100) NOT NULL,

    description VARCHAR(500) NOT NULL,

    date DATE NOT NULL,

    payment_method VARCHAR(50) DEFAULT 'cash',

    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_transactions_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_transactions_category
        FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE SET NULL
);

-- ============================================
-- BACKWARD COMPATIBILITY COLUMN CHECKS
-- ============================================

DO $$ 
BEGIN 
    -- Ensure category column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'category'
    ) THEN
        ALTER TABLE transactions ADD COLUMN category VARCHAR(100) DEFAULT 'General';
    END IF;

    -- Ensure date column exists (rename transaction_date if older table exists)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'date'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transactions' AND column_name = 'transaction_date'
        ) THEN
            ALTER TABLE transactions RENAME COLUMN transaction_date TO date;
        ELSE
            ALTER TABLE transactions ADD COLUMN date DATE DEFAULT CURRENT_DATE;
        END IF;
    END IF;

    -- Ensure notes column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'notes'
    ) THEN
        ALTER TABLE transactions ADD COLUMN notes TEXT;
    END IF;

    -- Ensure payment_method column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE transactions ADD COLUMN payment_method VARCHAR(50) DEFAULT 'cash';
    END IF;
END $$;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS
idx_transactions_user_id
ON transactions (user_id);

CREATE INDEX IF NOT EXISTS
idx_transactions_date
ON transactions (date);

CREATE INDEX IF NOT EXISTS
idx_transactions_user_date
ON transactions (user_id, date);

CREATE INDEX IF NOT EXISTS
idx_transactions_type
ON transactions (user_id, type);

CREATE INDEX IF NOT EXISTS
idx_transactions_category
ON transactions (user_id, LOWER(category));