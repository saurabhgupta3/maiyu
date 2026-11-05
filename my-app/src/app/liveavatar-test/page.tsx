"use client";

import { useEffect, useRef, useState } from "react";
import {
    LiveAvatarSession,
    SessionEvent,
    SessionState,
} from "@heygen/liveavatar-web-sdk";

export default function LiveAvatarTest() {
    const videoRef = useRef<HTMLVideoElement>(null);
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

            // STEP 1: Get a session token from our Express backend.
            const response = await fetch(
                `${apiUrl.replace(/\/+$/, "")}/api/liveavatar/token`,
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
                    data?.message || "Could not create LiveAvatar session.",
                );
            }

            const sessionToken = data?.sessionToken;

            if (typeof sessionToken !== "string" || !sessionToken) {
                throw new Error("Session token was not returned.");
            }

            // STEP 2: Create the LiveAvatar SDK session.
            const session = new LiveAvatarSession(sessionToken, {
                autoKeepAlive: true,
            });

            sessionRef.current = session;

            // Listen for session state changes.
            session.on(SessionEvent.SESSION_STATE_CHANGED, (state) => {
                setSessionState(state);
            });

            // Wait until both video and audio tracks are ready.
            session.on(SessionEvent.SESSION_STREAM_READY, () => {
                setIsStreamReady(true);
            });

            session.on(SessionEvent.SESSION_DISCONNECTED, () => {
                setIsStreamReady(false);
                sessionRef.current = null;
            });

            // STEP 3: Connect to LiveAvatar.
            // The microphone starts automatically by default.
            setSessionState(SessionState.CONNECTING);

            await session.start();

        } catch (err) {
            console.error("LiveAvatar error:", err);

            setError(
                err instanceof Error
                    ? err.message
                    : "Could not start LiveAvatar.",
            );

            sessionRef.current = null;
            setIsStreamReady(false);
            setSessionState(SessionState.DISCONNECTED);
        } finally {
            setIsLoading(false);
        }
    };

    // Attach the incoming LiveAvatar video and audio to the video element.
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
            console.warn("Video autoplay was blocked:", err);
        });

    }, [isStreamReady]);

    // Stop the session and release the video stream.
    const handleStopSession = async () => {
        const session = sessionRef.current;

        if (!session) {
            return;
        }

        setIsLoading(true);

        try {
            await session.stop();
        } catch (err) {
            console.error("Session stop error:", err);
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

    // Clean up the session when the user leaves the page.
    useEffect(() => {
        return () => {
            const session = sessionRef.current;

            if (session) {
                void session.stop();
                sessionRef.current = null;
            }
        };
    }, []);

    return (
        <main className="flex min-h-screen flex-col items-center gap-6 bg-gray-950 px-4 py-10 text-white">

            <h1 className="text-3xl font-bold">
                Maiyu — LiveAvatar Test
            </h1>

            <p className="max-w-lg text-center text-gray-400">
                Test real-time AI conversations with a LiveAvatar
                connected to Gemini Live.
            </p>

            {/* Avatar video */}
            <div className="relative flex aspect-square w-full max-w-md items-center justify-center overflow-hidden rounded-2xl border border-gray-700 bg-black">

                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className={`h-full w-full object-contain ${
                        isStreamReady ? "block" : "hidden"
                    }`}
                />

                {!isStreamReady && (
                    <div className="px-5 text-center text-gray-400">
                        {isLoading
                            ? "Connecting to LiveAvatar..."
                            : "Your avatar will appear here."}
                    </div>
                )}

                {isStreamReady && (
                    <div className="absolute left-3 top-3 rounded-full bg-green-600 px-3 py-1 text-xs font-semibold">
                        LIVE
                    </div>
                )}
            </div>

            {/* Session status */}
            <div className="text-center">
                <p className="text-sm text-gray-400">
                    Session status
                </p>

                <p className="font-semibold text-green-400">
                    {sessionState}
                </p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap justify-center gap-3">

                <button
                    onClick={handleStartSession}
                    disabled={isLoading || !!sessionRef.current}
                    className="rounded-lg bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isLoading && !isStreamReady
                        ? "Connecting..."
                        : "Start Live Session"}
                </button>

                <button
                    onClick={handleStopSession}
                    disabled={!sessionRef.current || isLoading}
                    className="rounded-lg bg-red-600 px-6 py-3 font-semibold hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    End Session
                </button>

            </div>

            {/* Instructions */}
            {isStreamReady && (
                <p className="max-w-md text-center text-sm text-gray-300">
                    Your microphone is active. Speak naturally to
                    the avatar and listen to its response.
                </p>
            )}

            {error && (
                <div className="max-w-md rounded-lg border border-red-500 bg-red-950 p-4 text-center text-sm text-red-300">
                    {error}
                </div>
            )}

        </main>
    );
}