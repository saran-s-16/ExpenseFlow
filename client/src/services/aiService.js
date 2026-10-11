import api from "./api";

/**
 * Send a user message to the ExpenseFlow AI assistant
 */
export async function sendChatMessage(message) {
    const res = await api.post("/ai/chat", { message });
    return res.data;
}

/**
 * Fetch the current user's AI token usage allowance
 */
export async function getAiUsage() {
    const res = await api.get("/ai/usage");
    return res.data;
}

/**
 * Fetch the current user's AI chat history
 */
export async function getAiHistory() {
    const res = await api.get("/ai/history");
    return res.data;
}

/**
 * Clear the current user's conversation history
 */
export async function clearAiHistory() {
    const res = await api.delete("/ai/history");
    return res.data;
}
