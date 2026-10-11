import React, { useState, useEffect, useRef } from "react";
import {
    Sparkles,
    Send,
    Bot,
    User,
    RotateCcw,
    AlertCircle,
    Trash2,
    ShieldCheck,
    Coins,
    ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
    sendChatMessage,
    getAiUsage,
    getAiHistory,
    clearAiHistory,
} from "../services/aiService";
import SafeMarkdown from "../components/SafeMarkdown";
import "../styles/ai.css";

const SUGGESTED_QUESTIONS = [
    "How much did I spend this month?",
    "Which category costs me the most?",
    "Compare this month's income and expenses.",
    "How much did I spend last month?",
    "Am I staying within my budgets?",
    "Show my largest expenses.",
    "How can I reduce my spending?",
];

const EXACT_EXHAUSTED_MESSAGE =
    "You've used your 50,000 AI tokens for today. Your allowance refreshes at midnight IST.";

export default function AiAssistant() {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [errorBanner, setErrorBanner] = useState(null); // { message, canRetry, lastFailedPrompt }
    const [tokenUsage, setTokenUsage] = useState({
        totalAllowed: 50000,
        confirmedUsage: 0,
        reservedUsage: 0,
        totalUsage: 0,
        remainingTokens: 50000,
        isExhausted: false,
        resetAt: "12:00 AM IST",
        nextResetTime: null,
    });

    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const conversationScrollRef = useRef(null);
    const isSendingRef = useRef(false);

    // Load initial usage and chat history
    useEffect(() => {
        let isMounted = true;

        async function initData() {
            try {
                const [usageData, historyData] = await Promise.allSettled([
                    getAiUsage(),
                    getAiHistory(),
                ]);

                if (!isMounted) return;

                if (usageData.status === "fulfilled" && usageData.value) {
                    setTokenUsage({
                        totalAllowed: usageData.value.totalAllowed ?? 50000,
                        confirmedUsage: usageData.value.confirmedUsage ?? 0,
                        reservedUsage: usageData.value.reservedUsage ?? 0,
                        totalUsage: usageData.value.totalUsage ?? 0,
                        remainingTokens: usageData.value.remainingTokens ?? 50000,
                        isExhausted: !!usageData.value.isExhausted,
                        resetAt: usageData.value.resetAt ?? "12:00 AM IST",
                        nextResetTime: usageData.value.nextResetTime ?? null,
                    });
                }

                if (
                    historyData.status === "fulfilled" &&
                    historyData.value?.messages?.length > 0
                ) {
                    setMessages(
                        historyData.value.messages.map((m) => ({
                            id: m.id,
                            role: m.role,
                            content: m.content,
                            tokensUsed: m.tokensUsed,
                            createdAt: m.createdAt,
                        }))
                    );
                }
            } catch (err) {
                console.error("Error initializing AI assistant:", err);
            } finally {
                if (isMounted) setInitialLoading(false);
            }
        }

        initData();

        return () => {
            isMounted = false;
        };
    }, []);

    // Auto-scroll to latest message when messages change or while loading
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, loading]);

    // Handle sending a message (with isRetry flag to prevent duplicate optimistic messages)
    const handleSendMessage = async (textToSend, isRetry = false) => {
        const query = (typeof textToSend === "string" ? textToSend : inputMessage).trim();
        if (!query || isSendingRef.current || loading) return;

        // Check if allowance is exhausted
        if (tokenUsage.isExhausted || tokenUsage.remainingTokens <= 0) {
            setErrorBanner({
                message: EXACT_EXHAUSTED_MESSAGE,
                canRetry: false,
                lastFailedPrompt: null,
            });
            return;
        }

        // Set synchronous guard immediately to block double clicks or race conditions
        isSendingRef.current = true;
        setLoading(true);

        // Clear existing error banner
        setErrorBanner(null);

        // Optimistically add user message ONLY if this is a fresh user prompt, NOT a retry
        if (!isRetry) {
            const tempUserMsg = {
                id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                role: "user",
                content: query,
                createdAt: new Date().toISOString(),
            };

            setMessages((prev) => [...prev, tempUserMsg]);
            setInputMessage("");

            // Reset textarea height
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
            }
        }

        try {
            const response = await sendChatMessage(query);

            if (response.success) {
                const assistantMsg = {
                    id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    role: "assistant",
                    content: response.message,
                    tokensUsed: response.tokensUsedInTurn,
                    createdAt: new Date().toISOString(),
                };
                setMessages((prev) => [...prev, assistantMsg]);

                if (response.usage) {
                    setTokenUsage({
                        totalAllowed: response.usage.totalAllowed ?? 50000,
                        confirmedUsage: response.usage.confirmedUsage ?? 0,
                        reservedUsage: response.usage.reservedUsage ?? 0,
                        totalUsage: response.usage.totalUsage ?? 0,
                        remainingTokens: response.usage.remainingTokens ?? 0,
                        isExhausted: !!response.usage.isExhausted,
                        resetAt: response.usage.resetAt ?? "12:00 AM IST",
                        nextResetTime: response.usage.nextResetTime ?? null,
                    });
                }
            }
        } catch (error) {
            console.error("AI chat error:", error);
            const status = error.response?.status;
            const errData = error.response?.data;
            const code = errData?.code;

            if (errData?.usage) {
                setTokenUsage({
                    totalAllowed: errData.usage.totalAllowed ?? 50000,
                    confirmedUsage: errData.usage.confirmedUsage ?? 0,
                    reservedUsage: errData.usage.reservedUsage ?? 0,
                    totalUsage: errData.usage.totalUsage ?? 0,
                    remainingTokens: errData.usage.remainingTokens ?? 0,
                    isExhausted: !!errData.usage.isExhausted,
                    resetAt: errData.usage.resetAt ?? "12:00 AM IST",
                    nextResetTime: errData.usage.nextResetTime ?? null,
                });
            }

            let userMsg = "We couldn't connect to AI Assistant. Please check your connection and try again.";
            let canRetry = true;

            if (code === "ALLOWANCE_EXHAUSTED" || tokenUsage.remainingTokens <= 0) {
                userMsg = EXACT_EXHAUSTED_MESSAGE;
                canRetry = false;
            } else if (code === "PROVIDER_CREDITS_EXHAUSTED") {
                userMsg =
                    errData?.message ||
                    "AI Assistant is temporarily unavailable because your OpenAI account has run out of API credits. Please check your billing balance in the OpenAI platform dashboard.";
                canRetry = false;
            } else if (
                code === "PROVIDER_QUOTA_EXCEEDED" ||
                code === "PROVIDER_BILLING_EXHAUSTED"
            ) {
                userMsg =
                    errData?.message ||
                    "AI Assistant is temporarily unavailable because the AI service has reached its usage limit. Please try again later.";
                canRetry = false;
            } else if (code === "RATE_LIMIT_EXCEEDED" || status === 429) {
                userMsg =
                    "AI Assistant is receiving too many requests right now. Please wait a moment and try again.";
                canRetry = true;
            } else if (code === "INVALID_API_KEY") {
                userMsg =
                    errData?.message ||
                    "AI Assistant is temporarily unavailable due to invalid API credentials.";
                canRetry = false;
            } else if (code === "CONFIG_ERROR") {
                userMsg =
                    errData?.message ||
                    "AI Assistant is temporarily unavailable due to a configuration issue. Please contact the administrator.";
                canRetry = false;
            } else if (code === "MODEL_NOT_FOUND") {
                userMsg =
                    errData?.message ||
                    "The configured AI model is not accessible with this API key. Please check your model configuration.";
                canRetry = false;
            } else if (code === "INVALID_MESSAGE") {

                userMsg = "Please enter a valid message before sending.";
                canRetry = false;
            } else if (code === "OUTPUT_LIMIT_REACHED") {
                userMsg = "My response reached its length limit. Please ask me to continue.";
                canRetry = false;
            } else if (errData?.message) {
                userMsg = errData.message;
            }

            setErrorBanner({
                message: userMsg,
                canRetry,
                lastFailedPrompt: query,
            });
        } finally {
            isSendingRef.current = false;
            setLoading(false);
        }
    };

    // Retry failed message safely without duplicating the user's prompt in the conversation
    const handleRetry = () => {
        if (errorBanner?.lastFailedPrompt && !isSendingRef.current && !loading) {
            const prompt = errorBanner.lastFailedPrompt;
            setErrorBanner(null);
            handleSendMessage(prompt, true);
        }
    };

    // Clear chat history
    const handleClearHistory = async () => {
        if (messages.length === 0 || loading || isSendingRef.current) return;
        const confirmClear = window.confirm(
            "Clear conversation history? This will delete previous messages but will not reset your token usage."
        );
        if (!confirmClear) return;

        try {
            await clearAiHistory();
            setMessages([]);
            setErrorBanner(null);
        } catch (err) {
            console.error("Failed to clear chat history:", err);
        }
    };

    // Keyboard handlers (Enter = Send, Shift+Enter = New line)
    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            if (e.nativeEvent?.isComposing) return;
            e.preventDefault();
            if (!loading && !isSendingRef.current && inputMessage.trim()) {
                handleSendMessage();
            }
        }
    };

    const handleTextareaChange = (e) => {
        setInputMessage(e.target.value);
        // Auto-expand textarea height
        e.target.style.height = "auto";
        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
    };


    const isExhausted =
        tokenUsage.isExhausted || (tokenUsage.remainingTokens !== undefined && tokenUsage.remainingTokens <= 0);

    const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

    return (
        <div className="ai-assistant-page">
            {/* Header */}
            <header className="ai-header">
                <div className="ai-header-left">
                    <div className="ai-assistant-avatar">
                        <Sparkles size={22} />
                    </div>
                    <div className="ai-header-titles">
                        <h1>
                            ExpenseFlow AI
                            <span className="ai-data-badge">
                                <ShieldCheck size={11} style={{ marginRight: 4 }} />
                                Live Financial Data
                            </span>
                        </h1>
                        <p>Your personal financial assistant</p>
                    </div>
                </div>

                <div className="ai-header-right">
                    {/* Live Token Usage Indicator */}
                    <div
                        className={`ai-token-pill ${
                            isExhausted
                                ? "exhausted"
                                : tokenUsage.remainingTokens <= 2500
                                ? "low"
                                : ""
                        }`}
                        title="Daily allowance: 50,000 AI tokens per day (Resets at 12:00 AM IST)"
                    >
                        <span className="ai-token-pill-dot" />
                        <Coins size={14} style={{ opacity: 0.85 }} />
                        <span>
                            AI tokens remaining:{" "}
                            <strong>
                                {Math.max(0, tokenUsage.remainingTokens).toLocaleString("en-IN")}
                            </strong>{" "}
                            / {(tokenUsage.totalAllowed || 50000).toLocaleString("en-IN")}
                        </span>
                        <span className="ai-token-reset-tag">
                            (Resets midnight IST)
                        </span>
                    </div>

                    {messages.length > 0 && (
                        <button
                            className="ai-btn-ghost"
                            onClick={handleClearHistory}
                            title="Clear conversation history"
                        >
                            <Trash2 size={15} />
                            <span>Clear</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Conversation Area */}
            <div className="ai-conversation-scroll" ref={conversationScrollRef}>
                {/* Welcome Hero Area (Shown when empty conversation) */}
                {messages.length === 0 && !initialLoading && (
                    <div className="ai-welcome-box">
                        <div className="ai-welcome-icon-wrap">
                            <div className="ai-assistant-avatar large">
                                <Bot size={30} />
                            </div>
                        </div>
                        <h2>Welcome to ExpenseFlow AI</h2>
                        <p>
                            Hi! I'm your ExpenseFlow AI assistant. I can help you understand your spending,
                            compare income and expenses, review budgets, and discover ways to save.
                        </p>
                        <div className="ai-privacy-note">
                            <ShieldCheck size={14} />
                            <span>
                                Secure, read-only analysis using only your authenticated financial data
                            </span>
                        </div>
                    </div>
                )}

                {/* Suggested Questions Grid (Always shown when empty or at top) */}
                {messages.length === 0 && !initialLoading && (
                    <div className="ai-suggestions-container">
                        <div className="ai-suggestions-header">
                            <Sparkles size={14} />
                            <span>Suggested Questions</span>
                        </div>
                        <div className="ai-suggestions-grid">
                            {SUGGESTED_QUESTIONS.map((q, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    className="ai-suggestion-card"
                                    onClick={() => handleSendMessage(q, false)}
                                    disabled={loading || isExhausted || isSendingRef.current}
                                >

                                    <span>{q}</span>
                                    <ChevronRight size={14} className="ai-suggestion-arrow" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Message List */}
                {messages.map((msg, index) => {
                    const isUser = msg.role === "user";
                    const formattedTime = msg.createdAt
                        ? new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                          })
                        : "";

                    return (
                        <div
                            key={msg.id || index}
                            className={`ai-message-row ${isUser ? "user" : "assistant"}`}
                        >
                            {!isUser && (
                                <div className="ai-msg-avatar assistant">
                                    <Sparkles size={17} />
                                </div>
                            )}

                            <div className="ai-message-bubble">
                                {isUser ? (
                                    msg.content
                                ) : (
                                    <SafeMarkdown content={msg.content} />
                                )}

                                <div className="ai-message-meta">
                                    {formattedTime && <span>{formattedTime}</span>}
                                    {!isUser && msg.tokensUsed > 0 && (
                                        <span className="ai-token-chip">
                                            {msg.tokensUsed} tokens
                                        </span>
                                    )}
                                </div>
                            </div>

                            {isUser && (
                                <div className="ai-msg-avatar user">{userInitial}</div>
                            )}
                        </div>
                    );
                })}

                {/* Typing / Loading Indicator */}
                {loading && (
                    <div className="ai-message-row assistant">
                        <div className="ai-msg-avatar assistant">
                            <Sparkles size={17} />
                        </div>
                        <div className="ai-message-bubble">
                            <div className="ai-typing-indicator">
                                <span className="ai-typing-dot" />
                                <span className="ai-typing-dot" />
                                <span className="ai-typing-dot" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Inline Error Banner with Retry */}
                {errorBanner && (
                    <div className="ai-error-banner" role="alert">
                        <div className="ai-error-content">
                            <AlertCircle size={18} style={{ flexShrink: 0 }} />
                            <span>{errorBanner.message}</span>
                        </div>
                        {errorBanner.canRetry && !isExhausted && (
                            <button
                                className="ai-retry-btn"
                                onClick={handleRetry}
                                disabled={loading}
                            >
                                <RotateCcw size={13} />
                                <span>Retry</span>
                            </button>
                        )}
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Exhausted Limit Banner */}
            {isExhausted && (
                <div className="ai-exhausted-banner">
                    <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                        <strong>Token Allowance Exhausted</strong>
                        {EXACT_EXHAUSTED_MESSAGE}
                    </div>
                </div>
            )}

            {/* Message Composer */}
            <div className="ai-composer-wrapper">
                <div className={`ai-composer-box ${isExhausted ? "disabled" : ""}`}>
                    <textarea
                        ref={textareaRef}
                        className="ai-composer-input"
                        placeholder={
                            isExhausted
                                ? "You've used your 50,000 AI tokens for today. Your allowance refreshes at midnight IST."
                                : "Ask about your income, expenses, or budgets..."
                        }
                        rows={1}
                        value={inputMessage}
                        onChange={handleTextareaChange}
                        onKeyDown={handleKeyDown}
                        disabled={loading || isExhausted || isSendingRef.current}
                        aria-label="Ask ExpenseFlow AI"
                    />

                    <button
                        type="button"
                        className="ai-send-btn"
                        onClick={() => handleSendMessage()}
                        disabled={!inputMessage.trim() || loading || isExhausted || isSendingRef.current}
                        title={
                            isExhausted
                                ? "Allowance exhausted"
                                : "Send message (Enter)"
                        }
                        aria-label="Send message"
                    >

                        <Send size={18} />
                    </button>
                </div>

                <div className="ai-composer-hints">
                    <span>
                        Answers are generated using your real transactions and budgets.
                    </span>
                    <span>Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for a new line</span>
                </div>
            </div>
        </div>
    );
}
