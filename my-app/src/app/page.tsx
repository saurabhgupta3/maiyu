"use client";

import { useEffect, useState } from "react";

import AvatarStage from "../components/maiyu/AvatarStage";

import VoiceControls from "../components/maiyu/VoiceControls";

import ModeSelector from "../components/maiyu/ModeSelector";

import LiveAvatarStage from "../components/maiyu/LiveAvatarStage";

import { useStudioMode } from "../hooks/useStudioMode";

import { useInstantMode } from "../hooks/useInstantMode";

import { useLiveAvatar } from "../hooks/useLiveAvatar";

import type { ConversationMode } from "../types/maiyu";

export default function Home() {
    const [message, setMessage] = useState("");

    const [imgSrc, setImgSrc] = useState("/person.png");
    const [isInstantBlinking, setIsInstantBlinking] = useState(false);

    // Instant Mode is selected by default.

    const [selectedMode, setSelectedMode] =
        useState<ConversationMode>("instant");

    // --------------------------------
    // STUDIO MODE
    // --------------------------------

    const {
        isRecording: studioIsRecording,

        isStartingRecording: studioIsStartingRecording,

        isProcessingAudio: studioIsProcessingAudio,

        audioStatus: studioAudioStatus,

        recordedAudioUrl: studioRecordedAudioUrl,

        transcript: studioTranscript,

        chatReply: studioChatReply,

        avatarVideoUrl,

        avatarVideoRef,

        handleStartRecording: startStudioRecording,

        handleStopRecording: stopStudioRecording,

        handleCancelVideo,
    } = useStudioMode(() => {
        setImgSrc("/person.png");
    });

    // --------------------------------
    // INSTANT MODE
    // --------------------------------

    const {
        isRecording: instantIsRecording,

        isStartingRecording: instantIsStartingRecording,

        isProcessingAudio: instantIsProcessingAudio,

        audioStatus: instantAudioStatus,

        recordedAudioUrl: instantRecordedAudioUrl,

        transcript: instantTranscript,

        chatReply: instantChatReply,

        speechAudioUrl,

        isSpeaking: instantIsSpeaking,

        isMouthOpen: instantIsMouthOpen,

        speechDuration: instantSpeechDuration,

        handleStartRecording: startInstantRecording,

        handleStopRecording: stopInstantRecording,

        handleStopSpeech,

        handleReplaySpeech,
    } = useInstantMode();

    // --------------------------------
    // LIVE MODE
    // --------------------------------

    const {
        videoRef: liveVideoRef,

        sessionState: liveSessionState,

        isStreamReady: liveIsStreamReady,

        isLoading: liveIsLoading,

        error: liveError,

        handleStartSession: startLiveSession,

        handleStopSession: stopLiveSession,
    } = useLiveAvatar();

    // --------------------------------
    // INSTANT AVATAR BLINK ANIMATION
    // --------------------------------

    // Mouth movement comes from actual audio analysis.
    // Blinking is estimated using sentence-ending punctuation.

    useEffect(() => {
        if (selectedMode !== "instant" || !instantIsSpeaking) {
            setIsInstantBlinking(false);
            return;
        }

        const blinkTimers: ReturnType<typeof setTimeout>[] = [];

        let fallbackBlinkInterval:
            | ReturnType<typeof setInterval>
            | undefined;

        const blinkAt = (delay: number) => {
            const timer = setTimeout(() => {
                setIsInstantBlinking(true);

                const closeEyesTimer = setTimeout(() => {
                    setIsInstantBlinking(false);
                }, 160);

                blinkTimers.push(closeEyesTimer);
            }, Math.max(0, delay));

            blinkTimers.push(timer);
        };

        const reply = instantChatReply.trim();

        const sentenceEndings = reply
            ? Array.from(reply.matchAll(/[.!?]+(?=\s|$)/g))
            : [];

        if (instantSpeechDuration > 0 && sentenceEndings.length > 0) {
            sentenceEndings.forEach((match) => {
                const characterPosition =
                    (match.index ?? 0) + match[0].length;

                const estimatedTime =
                    (characterPosition / reply.length) *
                    instantSpeechDuration;

                if (
                    estimatedTime > 0.35 &&
                    estimatedTime < instantSpeechDuration - 0.15
                ) {
                    blinkAt(estimatedTime * 1000);
                }
            });
        } else {
            // If sentence timing cannot be estimated,
            // blink periodically.

            fallbackBlinkInterval = setInterval(() => {
                setIsInstantBlinking(true);

                setTimeout(() => {
                    setIsInstantBlinking(false);
                }, 160);
            }, 5000);
        }

        return () => {
            blinkTimers.forEach(clearTimeout);

            if (fallbackBlinkInterval) {
                clearInterval(fallbackBlinkInterval);
            }

            setIsInstantBlinking(false);
        };
    }, [
        selectedMode,
        instantIsSpeaking,
        instantChatReply,
        instantSpeechDuration,
    ]);

    // --------------------------------
    // INSTANT AVATAR IMAGE SWITCHING
    // --------------------------------

    // Blink image takes priority over mouth animation.

    useEffect(() => {
        if (selectedMode !== "instant" || !instantIsSpeaking) {
            setImgSrc("/person.png");
            return;
        }

        if (isInstantBlinking) {
            setImgSrc("/person_blink.png");
        } else {
            setImgSrc(
                instantIsMouthOpen ? "/person_hi.png" : "/person.png"
            );
        }
    }, [
        selectedMode,
        instantIsSpeaking,
        instantIsMouthOpen,
        isInstantBlinking,
    ]);

    // --------------------------------
    // MODE SWITCHING
    // --------------------------------

    const isModeBusy =
        studioIsRecording ||
        studioIsStartingRecording ||
        studioIsProcessingAudio ||
        instantIsRecording ||
        instantIsStartingRecording ||
        instantIsProcessingAudio ||
        liveIsLoading;

    const handleModeChange = (mode: ConversationMode) => {
        if (isModeBusy) {
            return;
        }

        if (selectedMode === "studio" && avatarVideoUrl) {
            handleCancelVideo();
        }

        if (selectedMode === "instant") {
            handleStopSpeech();
        }

        if (selectedMode === "live" && liveIsStreamReady) {
            void stopLiveSession();
        }

        setImgSrc("/person.png");

        setSelectedMode(mode);
    };

    // --------------------------------
    // EXISTING MESSAGE ENDPOINT
    // --------------------------------

    const handleClick = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;

            if (!apiUrl) {
                throw new Error("API URL is not configured.");
            }

            const response = await fetch(
                `${apiUrl.replace(/\/+$/, "")}/api/msg`
            );

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(
                    data?.message || "API request failed."
                );
            }

            setMessage(data.message);
        } catch (error) {
            console.error("Error:", error);

            setMessage("Something went wrong.");
        }
    };

    // --------------------------------
    // EXISTING ACTIVE BUTTON
    // --------------------------------

    const handleActiveClick = () => {
        setImgSrc("/person_blink.png");

        setTimeout(() => {
            setImgSrc("/person_hi.png");

            const speech = new SpeechSynthesisUtterance("Hi");

            const voices = window.speechSynthesis.getVoices();

            const maleVoice = voices.find(
                (voice) =>
                    voice.lang.startsWith("en") &&
                    /male|david|mark|daniel|alex/i.test(voice.name)
            );

            if (maleVoice) {
                speech.voice = maleVoice;
            }

            speech.rate = 0.85;

            speech.pitch = 0.9;

            speech.volume = 1;

            window.speechSynthesis.cancel();

            window.speechSynthesis.speak(speech);

            setTimeout(() => {
                setImgSrc("/person.png");
            }, 800);
        }, 200);
    };

    // --------------------------------
    // HOMEPAGE
    // --------------------------------

    return (
        <main className="flex min-h-screen flex-col items-center justify-evenly gap-5 px-4 py-8">
            <h1 className="text-center text-3xl font-bold">
                Maiyu — AI Talker
            </h1>

            <p className="max-w-xl text-center text-xl">
                Talk naturally with Maiyu, an interactive AI talker.
            </p>

            <ModeSelector
                selectedMode={selectedMode}
                onModeChange={handleModeChange}
                disabled={isModeBusy}
            />

            <button
                onClick={handleClick}
                className="rounded-md border border-green-500 bg-green-500 px-4 py-2 font-bold text-purple-500"
            >
                How to use
            </button>

            {/* Shared avatar display */}

            {selectedMode !== "live" && (
                <AvatarStage
                    imgSrc={imgSrc}
                    avatarVideoUrl={
                        selectedMode === "studio"
                            ? avatarVideoUrl
                            : ""
                    }
                    avatarVideoRef={avatarVideoRef}
                    onCancelVideo={handleCancelVideo}
                    onVideoPlay={() =>
                        console.log("Maiyu is speaking...")
                    }
                    onVideoEnded={() =>
                        console.log("Maiyu finished speaking.")
                    }
                    onVideoError={() =>
                        console.error(
                            "The generated video could not be played."
                        )
                    }
                />
            )}

            <button
                onClick={handleActiveClick}
                className="rounded-md border border-green-500 bg-green-500 px-4 py-2 font-bold text-purple-500"
            >
                Active
            </button>

            {message && (
                <p className="text-center text-xl">
                    {message}
                </p>
            )}

            {/* INSTANT MODE */}

            {selectedMode === "instant" && (
                <VoiceControls
                    isRecording={instantIsRecording}
                    isStartingRecording={instantIsStartingRecording}
                    isProcessingAudio={instantIsProcessingAudio}
                    audioStatus={instantAudioStatus}
                    recordedAudioUrl={instantRecordedAudioUrl}
                    transcript={instantTranscript}
                    chatReply={instantChatReply}
                    responseAudioUrl={speechAudioUrl}
                    isSpeaking={instantIsSpeaking}
                    onStartRecording={startInstantRecording}
                    onStopRecording={stopInstantRecording}
                    onReplayResponseAudio={handleReplaySpeech}
                />
            )}

            {/* LIVE MODE */}

            {selectedMode === "live" && (
                <LiveAvatarStage
                    videoRef={liveVideoRef}
                    sessionState={liveSessionState}
                    isStreamReady={liveIsStreamReady}
                    isLoading={liveIsLoading}
                    error={liveError}
                    onStartSession={startLiveSession}
                    onStopSession={stopLiveSession}
                />
            )}

            {/* STUDIO MODE */}

            {selectedMode === "studio" && (
                <VoiceControls
                    isRecording={studioIsRecording}
                    isStartingRecording={studioIsStartingRecording}
                    isProcessingAudio={studioIsProcessingAudio}
                    audioStatus={studioAudioStatus}
                    recordedAudioUrl={studioRecordedAudioUrl}
                    transcript={studioTranscript}
                    chatReply={studioChatReply}
                    onStartRecording={startStudioRecording}
                    onStopRecording={stopStudioRecording}
                    onReplayResponseAudio={() => {}}
                />
            )}
        </main>
    );
}