-- Migration: 004_create_ai_tables.sql
-- Description: Creates user_ai_usage for strict 600-token lifetime allowance tracking and ai_chat_messages for user conversation history.

-- 1. Table for tracking per-user AI token allowance (Lifetime max: 600 tokens)
CREATE TABLE IF NOT EXISTS user_ai_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_tokens_used INTEGER NOT NULL DEFAULT 0,
    reserved_tokens INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_ai_usage UNIQUE (user_id),
    CONSTRAINT check_tokens_non_negative CHECK (total_tokens_used >= 0),
    CONSTRAINT check_reserved_non_negative CHECK (reserved_tokens >= 0)
);

CREATE INDEX IF NOT EXISTS idx_user_ai_usage_user ON user_ai_usage (user_id);

-- 2. Table for persisting AI chat conversation history
CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_date ON ai_chat_messages (user_id, created_at ASC);
