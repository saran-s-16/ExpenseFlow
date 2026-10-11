import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config({
    path: fileURLToPath(new URL("../../.env", import.meta.url)),
});

import { Groq } from "groq-sdk";

async function testGroq() {
    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL;

    console.log("--- SAFE GROQ DIAGNOSTIC ---");
    console.log("GROQ_API_KEY configured:", !!apiKey);
    console.log("GROQ_API_KEY length:", apiKey ? apiKey.length : 0);
    console.log("GROQ_API_KEY prefix:", apiKey ? apiKey.substring(0, 7) + "..." : "none");
    console.log("GROQ_MODEL from .env:", model);

    if (!apiKey) {
        console.error("No GROQ_API_KEY found in .env");
        process.exit(1);
    }

    const groq = new Groq({ apiKey });

    // Test 1: List models
    try {
        const modelsList = await groq.models.list();
        const availableIds = modelsList.data.map((m) => m.id);
        console.log("\nTotal available Groq models:", availableIds.length);
        console.log("Is configured model in list?", availableIds.includes(model));
        if (!availableIds.includes(model)) {
            console.log("Available models include:", availableIds.slice(0, 10));
        }
    } catch (err) {
        console.error("Failed to list models:", err.status, err.message);
    }

    // Test 2: Send a simple test completion with configured model
    try {
        console.log(`\nAttempting chat completion with model '${model}'...`);
        const chat = await groq.chat.completions.create({
            model: model,
            messages: [{ role: "user", content: "Say hello in 3 words" }],
            max_tokens: 20,
        });
        console.log("Chat completion SUCCESS!");
        console.log("Response text:", chat.choices[0]?.message?.content);
        console.log("Usage info:", chat.usage);
    } catch (err) {
        console.error("Chat completion FAILED with configured model:");
        console.error("HTTP status:", err.status);
        console.error("Error code:", err.code);
        console.error("Error message:", err.message);
    }
}

testGroq();
