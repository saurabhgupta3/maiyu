import { generateSpeech } from "./speech.service.js";

interface SyncGenerationResponse {
    id: string;
    status: string;
    outputUrl?: string;
    error?: string;
}

const SYNC_API_URL = "https://api.sync.so/v2";

export const generateAvatarVideo = async (
    text: string,
): Promise<SyncGenerationResponse> => {
    const apiKey = process.env.SYNC_API_KEY;
    const imageUrl = process.env.MAIYU_AVATAR_IMAGE_URL;

    if (!apiKey) {
        throw new Error("SYNC_API_KEY is not configured.");
    }

    if (!imageUrl) {
        throw new Error("MAIYU_AVATAR_IMAGE_URL is not configured.");
    }

    // 1. Generate speech audio using Gemini.
    const audioBuffer = await generateSpeech(text);

    // 2. Prepare the Sync Labs request.
    const formData = new FormData();

    formData.append("model", "sync-3");

    formData.append(
        "input",
        JSON.stringify([
            {
                type: "image",
                url: imageUrl,
            },
        ]),
    );

    formData.append(
        "audio",
        new Blob([new Uint8Array(audioBuffer)], {
            type: "audio/wav",
        }),
        "maiyu.wav",
    );

    // 3. Request talking video generation.
    const response = await fetch(`${SYNC_API_URL}/generate`, {
        method: "POST",
        headers: {
            "x-api-key": apiKey,
        },
        body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message || data.error || "Sync Labs generation failed.",
        );
    }

    if (!data.id) {
        throw new Error("Sync Labs did not return a generation ID.");
    }

    return {
        id: data.id,
        status: data.status,
        outputUrl: data.outputUrl,
        error: data.error,
    };
};

export const getAvatarVideoStatus = async (
    videoId: string,
): Promise<SyncGenerationResponse> => {
    const apiKey = process.env.SYNC_API_KEY;

    if (!apiKey) {
        throw new Error("SYNC_API_KEY is not configured.");
    }

    const response = await fetch(
        `${SYNC_API_URL}/generate/${encodeURIComponent(videoId)}`,
        {
            method: "GET",
            headers: {
                "x-api-key": apiKey,
            },
        },
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message || data.error || "Failed to fetch video status.",
        );
    }

    return {
        id: data.id,
        status: data.status,
        outputUrl: data.outputUrl,
        error: data.error,
    };
};