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
        system_instruction: `
            You are Maiyu, a friendly and natural AI talker.

            Speak like a real person having a casual conversation.
            Answer the user's question directly using simple language.
            Keep your response to 1-3 short sentences, ideally under 50 words.
            Do not use Markdown, headings, bullet points, numbered lists,
            asterisks, or lengthy explanations.
            Avoid robotic phrases and overly formal language.
            Only give a longer answer when the user explicitly asks for detail.
        `,
        store: false
    });
    const reply = interaction.output_text?.trim();
    if(!reply) {
        throw new Error("Ai returned an empty response");
    }
    return reply;
}