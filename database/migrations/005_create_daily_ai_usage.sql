-- Migration: 005_create_daily_ai_usage.sql
-- Description: Creates user_ai_daily_usage table for tracking daily token usage (50,000 tokens per user per day) resetting at midnight IST.

CREATE TABLE IF NOT EXISTS user_ai_daily_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL,
    total_tokens_used INTEGER NOT NULL DEFAULT 0,
    reserved_tokens INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_daily_ai_usage UNIQUE (user_id, usage_date),
    CONSTRAINT check_daily_tokens_non_negative CHECK (total_tokens_used >= 0),
    CONSTRAINT check_daily_reserved_non_negative CHECK (reserved_tokens >= 0)
);

CREATE INDEX IF NOT EXISTS idx_user_ai_daily_usage_user_date ON user_ai_daily_usage (user_id, usage_date);
