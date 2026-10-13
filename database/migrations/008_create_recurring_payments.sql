-- ============================================
-- 008 - CREATE RECURRING PAYMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS recurring_payments (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL,

    title VARCHAR(150) NOT NULL,

    amount NUMERIC(12, 2) NOT NULL
        CHECK (amount > 0),

    category VARCHAR(100) NOT NULL,

    frequency VARCHAR(30) NOT NULL DEFAULT 'monthly',
        -- 'monthly', 'yearly', 'weekly', 'quarterly'

    next_due_date DATE NOT NULL,

    payment_method VARCHAR(50) DEFAULT 'upi',

    is_active BOOLEAN DEFAULT TRUE,

    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_recurring_payments_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS
idx_recurring_payments_user_id
ON recurring_payments (user_id);

CREATE INDEX IF NOT EXISTS
idx_recurring_payments_due_date
ON recurring_payments (user_id, next_due_date);
