"use client";

import { useEffect, useRef, useState } from "react";

import {
    LiveAvatarSession,
    SessionEvent,
    SessionState,
} from "@heygen/liveavatar-web-sdk";

export const useLiveAvatar = () => {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const sessionRef = useRef<LiveAvatarSession | null>(null);

    const [sessionState, setSessionState] = useState(
        SessionState.INACTIVE,
    );

    const [isStreamReady, setIsStreamReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Start a LiveAvatar session.
    const handleStartSession = async () => {
        if (sessionRef.current || isLoading) {
            return;
        }

        setIsLoading(true);
        setError("");
        setIsStreamReady(false);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;

            if (!apiUrl) {
                throw new Error("API URL is not configured.");
            }

            const baseUrl = apiUrl.replace(/\/+$/, "");

            // STEP 1: Get a session token from our backend.
            const response = await fetch(
                `${baseUrl}/api/liveavatar/token`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                },
            );

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(
                    data?.message ||
                        "Could not create LiveAvatar session.",
                );
            }

            const sessionToken = data?.sessionToken;

            if (
                typeof sessionToken !== "string" ||
                !sessionToken
            ) {
                throw new Error(
                    "LiveAvatar session token was not returned.",
                );
            }

            // STEP 2: Create the SDK session.
            const session = new LiveAvatarSession(sessionToken, {
                autoKeepAlive: true,
            });

            sessionRef.current = session;

            // Listen for session state changes.
            session.on(
                SessionEvent.SESSION_STATE_CHANGED,
                (state) => {
                    setSessionState(state);
                },
            );

            // Listen for video and audio stream readiness.
            session.on(SessionEvent.SESSION_STREAM_READY, () => {
                setIsStreamReady(true);
            });

            // Listen when the session disconnects.
            session.on(SessionEvent.SESSION_DISCONNECTED, () => {
                setIsStreamReady(false);
                sessionRef.current = null;
            });

            // STEP 3: Start the LiveAvatar session.
            setSessionState(SessionState.CONNECTING);

            await session.start();

        } catch (err) {
            console.error("LiveAvatar connection error:", err);

            setError(
                err instanceof Error
                    ? err.message
                    : "Could not start LiveAvatar session.",
            );

            sessionRef.current = null;
            setIsStreamReady(false);
            setSessionState(SessionState.DISCONNECTED);
        } finally {
            setIsLoading(false);
        }
    };

    // Attach LiveAvatar's incoming stream to the video element.
    useEffect(() => {
        if (!isStreamReady || !videoRef.current) {
            return;
        }

        const session = sessionRef.current;

        if (!session) {
            return;
        }

        const video = videoRef.current;

        session.attach(video);

        video.play().catch((err) => {
            console.warn("LiveAvatar autoplay was blocked:", err);
        });

    }, [isStreamReady]);

    // Stop the LiveAvatar session.
    const handleStopSession = async () => {
        const session = sessionRef.current;

        if (!session) {
            return;
        }

        setIsLoading(true);

        try {
            await session.stop();
        } catch (err) {
            console.error("LiveAvatar stop error:", err);

            setError("Could not stop the LiveAvatar session properly.");
        } finally {
            sessionRef.current = null;

            setIsStreamReady(false);
            setSessionState(SessionState.DISCONNECTED);

            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.srcObject = null;
            }

            setIsLoading(false);
        }
    };

    // Release the session when leaving the component.
    useEffect(() => {
        return () => {
            const session = sessionRef.current;

            if (session) {
                void session.stop().catch((err) => {
                    console.error(
                        "LiveAvatar cleanup error:",
                        err,
                    );
                });

                sessionRef.current = null;
            }
        };
    }, []);

    return {
        videoRef,

        sessionState,
        isStreamReady,
        isLoading,
        error,

        handleStartSession,
        handleStopSession,
    };
};