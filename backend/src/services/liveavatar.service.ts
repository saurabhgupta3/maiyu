const LIVEAVATAR_API_URL = "https://api.liveavatar.com/v1";

export const createLiveAvatarSession = async () => {
    const apiKey = process.env.LIVEAVATAR_API_KEY;
    const secretId = process.env.LIVEAVATAR_GEMINI_SECRET_ID;
    const avatarId = process.env.LIVEAVATAR_AVATAR_ID;

    if (!apiKey || !secretId || !avatarId) {
        throw new Error("LiveAvatar environment variables are missing.");
    }

    const response = await fetch(
        `${LIVEAVATAR_API_URL}/sessions/token`,
        {
            method: "POST",
            headers: {
                "X-API-KEY": apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                mode: "LITE",
                avatar_id: avatarId,
                is_sandbox: false,
                max_session_duration: 60,
                gemini_realtime_config: {
                    secret_id: secretId,
                    voice: "Puck",
                    model: "gemini-3.1-flash-live-preview",
                    temperature: 0.8,
                },
            }),
        },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(
            data?.message ||
                data?.detail ||
                `LiveAvatar request failed: ${response.status}`,
        );
    }

    const sessionToken = data?.data?.session_token;
    const sessionId = data?.data?.session_id;

    if (typeof sessionToken !== "string" || !sessionToken) {
        throw new Error("LiveAvatar did not return a session token.");
    }

    return {
        sessionToken,
        sessionId,
    };
};