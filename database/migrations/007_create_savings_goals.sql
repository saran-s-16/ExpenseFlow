-- ============================================
-- 007 - CREATE SAVINGS GOALS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS savings_goals (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL,

    name VARCHAR(150) NOT NULL,

    target_amount NUMERIC(12, 2) NOT NULL
        CHECK (target_amount > 0),

    current_amount NUMERIC(12, 2) NOT NULL DEFAULT 0
        CHECK (current_amount >= 0),

    target_date DATE NOT NULL,

    category VARCHAR(100) DEFAULT 'General',

    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_savings_goals_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS
idx_savings_goals_user_id
ON savings_goals (user_id);

CREATE INDEX IF NOT EXISTS
idx_savings_goals_target_date
ON savings_goals (user_id, target_date);
