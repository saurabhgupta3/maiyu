import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | undefined;

const getAiClient = () : GoogleGenAI => {
    const apiKey = process.env.GEMINI_API_KEY;
     if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured.");
    }
    if (!aiClient) {
        aiClient = new GoogleGenAI({ apiKey });
    }
    return aiClient;
}

export const generateChatReply = async (msg: string) : Promise<string> => {
    const ai = getAiClient();
    const interaction = await ai.interactions.create({
        model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
        input: msg,
        store: false
    });
    const reply = interaction.output_text?.trim();
    if(!reply) {
        throw new Error("Ai returned an empty response");
    }
    return reply;
}