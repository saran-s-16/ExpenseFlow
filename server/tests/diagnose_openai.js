import { fileURLToPath } from "url";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config({
    path: fileURLToPath(new URL("../../.env", import.meta.url)),
});

async function diagnose() {
    const key = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL;
    const maxTokens = process.env.OPENAI_MAX_OUTPUT_TOKENS;

    console.log("--- SAFE DIAGNOSTIC REPORT ---");
    console.log("API Key configured:", !!key);
    console.log("API Key length:", key ? key.length : 0);
    console.log("API Key starts with:", key ? key.substring(0, 7) + "..." : "none");
    console.log("OPENAI_MODEL from .env:", model);
    console.log("OPENAI_MAX_OUTPUT_TOKENS from .env:", maxTokens);

    if (!key) {
        console.log("Result: OPENAI_API_KEY is missing.");
        return;
    }

    const openai = new OpenAI({ apiKey: key });

    console.log("\nTesting OpenAI API connection with configured model...");
    try {
        const res = await openai.chat.completions.create({
            model: model || "gpt-4o-mini",
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 10,
        });
        console.log("API Call SUCCESS!");
        console.log("Model used:", res.model);
        console.log("Tokens used:", res.usage);
    } catch (err) {
        console.log("\n--- DETAILED SAFE ERROR DETAILS ---");
        console.log("Error name:", err.name);
        console.log("HTTP status:", err.status);
        console.log("Error code:", err.code);
        console.log("Error type:", err.type);
        console.log("Error param:", err.param);
        console.log("Error message:", err.message);
    }
}

diagnose();
