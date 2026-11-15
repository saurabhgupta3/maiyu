
"use client";

import type { RefObject } from "react";

import type { SessionState } from "@heygen/liveavatar-web-sdk";

interface LiveAvatarStageProps {
    videoRef: RefObject<HTMLVideoElement | null>;
    sessionState: SessionState;
    isStreamReady: boolean;
    isLoading: boolean;
    error: string;
    onStartSession: () => void;
    onStopSession: () => void;
}

export default function LiveAvatarStage({
    videoRef,
    sessionState,
    isStreamReady,
    isLoading,
    error,
    onStartSession,
    onStopSession,
}: LiveAvatarStageProps) {
    return (
        <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-lg">

            <h2 className="mb-4 text-center text-2xl font-bold">
                Maiyu Live Mode
            </h2>

            {/* LiveAvatar video */}
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-gray-900">

                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="h-full w-full object-cover"
                />

                {!isStreamReady && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
                        <div className="text-5xl">🤖</div>

                        <p className="text-sm text-gray-300">
                            {isLoading
                                ? "Connecting to Maiyu..."
                                : "Maiyu is waiting for you"}
                        </p>
                    </div>
                )}
            </div>

            {/* Session status */}
            <div className="mt-4 text-center">

                <p className="text-sm text-gray-500">
                    Status: {String(sessionState)}
                </p>

                {isStreamReady && (
                    <p className="mt-1 text-sm font-medium text-green-600">
                        Live connection established
                    </p>
                )}

            </div>

            {/* Error message */}
            {error && (
                <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {error}
                </p>
            )}

            {/* Session controls */}
            <div className="mt-5 flex justify-center gap-3">

                <button
                    onClick={onStartSession}
                    disabled={isLoading || isStreamReady}
                    className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isLoading ? "Connecting..." : "Start Live"}
                </button>

                <button
                    onClick={onStopSession}
                    disabled={isLoading || !isStreamReady}
                    className="rounded-lg bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Stop Live
                </button>

            </div>

        </section>
    );
}
