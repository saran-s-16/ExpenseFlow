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

    description VARCHAR(255),

    payment_method VARCHAR(50),

    transaction_date DATE NOT NULL,

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
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS
idx_transactions_user_id
ON transactions (user_id);


CREATE INDEX IF NOT EXISTS
idx_transactions_date
ON transactions (transaction_date);


CREATE INDEX IF NOT EXISTS
idx_transactions_user_date
ON transactions (user_id, transaction_date);


CREATE INDEX IF NOT EXISTS
idx_transactions_type
ON transactions (user_id, type);