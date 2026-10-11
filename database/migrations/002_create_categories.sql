-- ============================================
-- 002 - CREATE CATEGORIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL,

    name VARCHAR(100) NOT NULL,

    type VARCHAR(20) NOT NULL
        CHECK (type IN ('income', 'expense')),

    created_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_categories_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_user_category
        UNIQUE (user_id, name, type)
);


-- ============================================
-- INDEX
-- ============================================

CREATE INDEX IF NOT EXISTS
idx_categories_user_id
ON categories (user_id);