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

export const transcribeAudio = async (
    audioBuffer: Buffer,
    mimeType: string,
): Promise<string> => {
    if (audioBuffer.length === 0) {
        throw new Error("Audio file is empty.");
    }

    const normalizedMimeType = mimeType.split(";")[0].toLowerCase();

    const supportedTypes = [
        "audio/webm",
        "audio/mp4",
        "audio/ogg",
        "audio/wav",
        "audio/mpeg",
        "audio/mp3",
        "audio/aac",
        "audio/m4a",
    ];

    if (!supportedTypes.includes(normalizedMimeType)) {
        throw new Error("Unsupported audio format.");
    }

    const ai = getAiClient();

    // Convert the uploaded buffer into a Blob for Gemini's Files API.
    const audioBlob = new Blob(
        [new Uint8Array(audioBuffer)],
        { type: normalizedMimeType },
    );

    let uploadedFile:
        Awaited<ReturnType<typeof ai.files.upload>> | undefined;

    try {
        uploadedFile = await ai.files.upload({
            file: audioBlob,
            config: {
                mimeType: normalizedMimeType,
            },
        });

        const interaction = await ai.interactions.create({
            model: "gemini-3.5-transcribe",
            input: [
                {
                    type: "audio",
                    uri: uploadedFile.uri,
                    mime_type: uploadedFile.mimeType ?? normalizedMimeType,
                },
            ],
            store: false,
        });

        const transcript = interaction.output_text?.trim();

        if (!transcript) {
            throw new Error("Gemini returned an empty transcript.");
        }

        return transcript;
    } finally {
        // Delete the uploaded audio file after processing.
        if (uploadedFile?.name) {
            try {
                await ai.files.delete({ name: uploadedFile.name });
            } catch (error) {
                console.error("Failed to delete uploaded audio file:", error);
            }
        }
    }
};