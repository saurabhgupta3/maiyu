import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | undefined;

const getAiClient = (): GoogleGenAI => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured.");
    }

    if (!aiClient) {
        aiClient = new GoogleGenAI({ apiKey });
    }

    return aiClient;
};

export const generateSpeech = async (
    text: string,
): Promise<Buffer> => {
    if (!text.trim()) {
        throw new Error("Text cannot be empty.");
    }

    const ai = getAiClient();

    const interaction = await ai.interactions.create({
        model: "gemini-3.8-flash-tts",

        input: [
            {
                type: "user_input",
                content: [
                    {
                        type: "text",
                        text: text.trim(),
                        annotations: [
                            {
                                type: "speech_metadata",
                                style: "Speak warmly and naturally, like a friendly person having a casual conversation. Use a relaxed pace and clear pronunciation.",
                            },
                        ],
                    },
                ],
            },
        ],

        response_format: {
            type: "audio",
        },

        generation_config: {
            speech_config: [
                {
                    voice: "Achird",
                },
            ],
        },
    });

    const audioData = interaction.output_audio?.data;

    if (!audioData) {
        throw new Error("Gemini did not generate audio.");
    }

    return Buffer.from(audioData, "base64");
};