-- ============================================
-- 009 - CREATE STOCK TRACKER TABLES
-- ============================================

-- Personal Watchlist
CREATE TABLE IF NOT EXISTS stock_watchlist (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL,

    symbol VARCHAR(50) NOT NULL,

    company_name VARCHAR(150) NOT NULL,

    exchange VARCHAR(20) DEFAULT 'NSE',

    created_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_stock_watchlist_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_user_stock_watchlist
        UNIQUE (user_id, symbol)
);

CREATE INDEX IF NOT EXISTS
idx_stock_watchlist_user_id
ON stock_watchlist (user_id);


-- Portfolio Transactions (Manual Buy & Sell records)
CREATE TABLE IF NOT EXISTS stock_transactions (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL,

    symbol VARCHAR(50) NOT NULL,

    company_name VARCHAR(150) NOT NULL,

    transaction_type VARCHAR(10) NOT NULL
        CHECK (transaction_type IN ('BUY', 'SELL')),

    quantity NUMERIC(12, 4) NOT NULL
        CHECK (quantity > 0),

    price_per_share NUMERIC(12, 2) NOT NULL
        CHECK (price_per_share > 0),

    brokerage_charges NUMERIC(10, 2) DEFAULT 0
        CHECK (brokerage_charges >= 0),

    transaction_date DATE NOT NULL,

    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_stock_transactions_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS
idx_stock_transactions_user_id
ON stock_transactions (user_id);

CREATE INDEX IF NOT EXISTS
idx_stock_transactions_user_symbol
ON stock_transactions (user_id, symbol);

CREATE INDEX IF NOT EXISTS
idx_stock_transactions_date
ON stock_transactions (user_id, transaction_date);
