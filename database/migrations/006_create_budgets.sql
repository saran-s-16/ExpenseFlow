-- ============================================
-- 006 - CREATE BUDGETS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL,

    category VARCHAR(100) NOT NULL,

    amount NUMERIC(12, 2) NOT NULL
        CHECK (amount > 0),

    month INTEGER NOT NULL
        CHECK (month BETWEEN 1 AND 12),

    year INTEGER NOT NULL
        CHECK (year > 0),

    created_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_budgets_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_user_category_budget
        UNIQUE (user_id, category, month, year)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS
idx_budgets_user_date
ON budgets (user_id, month, year);

CREATE INDEX IF NOT EXISTS
idx_budgets_user_category
ON budgets (user_id, LOWER(category));
