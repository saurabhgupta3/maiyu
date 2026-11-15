"use client";

import { useEffect, useRef, useState } from "react";

export const useStudioMode = (onAvatarReset: () => void) => {
    // Recording states
    const [isRecording, setIsRecording] = useState(false);
    const [isStartingRecording, setIsStartingRecording] = useState(false);
    const [isProcessingAudio, setIsProcessingAudio] = useState(false);

    // Conversation states
    const [audioStatus, setAudioStatus] = useState("");
    const [recordedAudioUrl, setRecordedAudioUrl] = useState("");
    const [transcript, setTranscript] = useState("");
    const [chatReply, setChatReply] = useState("");
    const [avatarVideoUrl, setAvatarVideoUrl] = useState("");

    // Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const audioUrlRef = useRef<string | null>(null);
    const avatarVideoRef = useRef<HTMLVideoElement | null>(null);

    // Stop the video and restore Maiyu's image.
    const handleCancelVideo = () => {
        if (avatarVideoRef.current) {
            avatarVideoRef.current.pause();
            avatarVideoRef.current.currentTime = 0;
        }

        setAvatarVideoUrl("");
        onAvatarReset();
        setAudioStatus("Video closed. Maiyu is back.");
    };

    // Start microphone recording.
    const handleStartRecording = async () => {
        if (isStartingRecording || isRecording || isProcessingAudio) {
            return;
        }

        setIsStartingRecording(true);

        try {
            if (
                !navigator.mediaDevices?.getUserMedia ||
                typeof MediaRecorder === "undefined"
            ) {
                throw new Error(
                    "Audio recording is not supported in this browser.",
                );
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });

            streamRef.current = stream;
            audioChunksRef.current = [];

            // Reset the previous conversation.
            setTranscript("");
            setChatReply("");
            setAvatarVideoUrl("");
            setAudioStatus("Listening... Speak now.");

            onAvatarReset();

            if (audioUrlRef.current) {
                URL.revokeObjectURL(audioUrlRef.current);
                audioUrlRef.current = null;
                setRecordedAudioUrl("");
            }

            // Select a supported recording format.
            const supportedTypes = [
                "audio/webm;codecs=opus",
                "audio/mp4",
                "audio/ogg;codecs=opus",
            ];

            const mimeType = supportedTypes.find((type) =>
                MediaRecorder.isTypeSupported(type),
            );

            const options: MediaRecorderOptions = {};

            if (mimeType) {
                options.mimeType = mimeType;
            }

            const recorder = new MediaRecorder(stream, options);

            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            // Process recording when the user stops.
            recorder.onstop = async () => {
                setIsRecording(false);

                const stopMicrophone = () => {
                    stream.getTracks().forEach((track) => track.stop());

                    if (streamRef.current === stream) {
                        streamRef.current = null;
                    }

                    if (mediaRecorderRef.current === recorder) {
                        mediaRecorderRef.current = null;
                    }
                };

                const audioBlob = new Blob(audioChunksRef.current, {
                    type: recorder.mimeType || "audio/webm",
                });

                if (audioBlob.size === 0) {
                    setAudioStatus(
                        "No audio was captured. Please try again.",
                    );

                    stopMicrophone();
                    return;
                }

                // Save the user's recording locally.
                const audioUrl = URL.createObjectURL(audioBlob);

                if (audioUrlRef.current) {
                    URL.revokeObjectURL(audioUrlRef.current);
                }

                audioUrlRef.current = audioUrl;
                setRecordedAudioUrl(audioUrl);

                setIsProcessingAudio(true);
                setTranscript("");
                setChatReply("");

                try {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

                    if (!apiUrl) {
                        throw new Error(
                            "NEXT_PUBLIC_API_URL is not configured.",
                        );
                    }

                    const baseUrl = apiUrl.replace(/\/+$/, "");

                    // STEP 1: Transcribe recorded audio.
                    setAudioStatus("Converting your voice into text...");

                    const audioType = audioBlob.type.toLowerCase();

                    const extension = audioType.includes("mp4")
                        ? "m4a"
                        : audioType.includes("ogg")
                          ? "ogg"
                          : "webm";

                    const formData = new FormData();

                    formData.append(
                        "audio",
                        audioBlob,
                        `recording.${extension}`,
                    );

                    const transcriptionResponse = await fetch(
                        `${baseUrl}/api/transcribe`,
                        {
                            method: "POST",
                            body: formData,
                        },
                    );

                    const transcriptionData = await transcriptionResponse
                        .json()
                        .catch(() => null);

                    if (!transcriptionResponse.ok) {
                        throw new Error(
                            transcriptionData?.message ||
                                "Speech transcription failed.",
                        );
                    }

                    const spokenText = transcriptionData?.transcript;

                    if (
                        typeof spokenText !== "string" ||
                        !spokenText.trim()
                    ) {
                        throw new Error(
                            "No speech was recognized. Please try again.",
                        );
                    }

                    setTranscript(spokenText);

                    // STEP 2: Get Gemini's response.
                    setAudioStatus("Maiyu is thinking...");

                    const chatResponse = await fetch(
                        `${baseUrl}/api/chat`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                message: spokenText,
                            }),
                        },
                    );

                    const chatData = await chatResponse
                        .json()
                        .catch(() => null);

                    if (!chatResponse.ok) {
                        throw new Error(
                            chatData?.message ||
                                "Could not get a response from Maiyu.",
                        );
                    }

                    const reply =
                        typeof chatData?.reply === "string"
                            ? chatData.reply
                            : chatData?.msg;

                    if (typeof reply !== "string" || !reply.trim()) {
                        throw new Error(
                            "Maiyu returned an empty response.",
                        );
                    }

                    setChatReply(reply);

                    // STEP 3: Generate the talking avatar video.
                    setAudioStatus("Creating Maiyu's talking video...");

                    const avatarResponse = await fetch(
                        `${baseUrl}/api/avatar/generate`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ text: reply }),
                        },
                    );

                    const avatarData = await avatarResponse
                        .json()
                        .catch(() => null);

                    if (!avatarResponse.ok) {
                        throw new Error(
                            avatarData?.message ||
                                "Avatar video generation could not be started.",
                        );
                    }

                    const generationId = avatarData?.generationId;

                    if (
                        typeof generationId !== "string" ||
                        !generationId.trim()
                    ) {
                        throw new Error(
                            "Sync Labs did not return a generation ID.",
                        );
                    }

                    // STEP 4: Poll Sync Labs for the completed video.
                    let videoReady = false;

                    for (let attempt = 0; attempt < 60; attempt++) {
                        const statusResponse = await fetch(
                            `${baseUrl}/api/avatar/status/${encodeURIComponent(generationId)}`,
                        );

                        const statusData = await statusResponse
                            .json()
                            .catch(() => null);

                        if (!statusResponse.ok) {
                            throw new Error(
                                statusData?.message ||
                                    "Could not check the avatar video status.",
                            );
                        }

                        const status = String(
                            statusData?.status || "",
                        ).toUpperCase();

                        if (status === "COMPLETED") {
                            const videoUrl = statusData?.videoUrl;

                            if (
                                typeof videoUrl !== "string" ||
                                !videoUrl.trim()
                            ) {
                                throw new Error(
                                    "Video generation completed, but no video URL was returned.",
                                );
                            }

                            setAvatarVideoUrl(videoUrl);
                            setAudioStatus("Maiyu's video is ready.");

                            videoReady = true;
                            break;
                        }

                        if (
                            status === "FAILED" ||
                            status === "REJECTED"
                        ) {
                            throw new Error(
                                statusData?.error ||
                                    "Sync Labs could not generate the video.",
                            );
                        }

                        setAudioStatus(
                            `Creating Maiyu's talking video... (${status || "PROCESSING"})`,
                        );

                        if (attempt < 59) {
                            await new Promise((resolve) =>
                                setTimeout(resolve, 10000),
                            );
                        }
                    }

                    if (!videoReady) {
                        throw new Error(
                            `Video generation is still processing. Generation ID: ${generationId}`,
                        );
                    }
                } catch (error) {
                    console.error("Voice conversation error:", error);

                    setAudioStatus(
                        error instanceof Error
                            ? error.message
                            : "Something went wrong. Please try again.",
                    );
                } finally {
                    stopMicrophone();
                    setIsProcessingAudio(false);
                }
            };

            recorder.onerror = () => {
                setAudioStatus("Recording failed. Please try again.");
                setIsRecording(false);

                stream.getTracks().forEach((track) => track.stop());

                if (streamRef.current === stream) {
                    streamRef.current = null;
                }

                if (mediaRecorderRef.current === recorder) {
                    mediaRecorderRef.current = null;
                }
            };

            recorder.start();

            setIsRecording(true);
            setAudioStatus("Listening... Speak now.");
        } catch (error) {
            console.error("Microphone error:", error);

            streamRef.current?.getTracks().forEach((track) => track.stop());

            streamRef.current = null;
            mediaRecorderRef.current = null;

            setIsRecording(false);

            setAudioStatus(
                error instanceof Error
                    ? error.message
                    : "Microphone access denied or unavailable.",
            );
        } finally {
            setIsStartingRecording(false);
        }
    };

    // Stop microphone recording.
    const handleStopRecording = () => {
        const recorder = mediaRecorderRef.current;

        if (recorder && recorder.state !== "inactive") {
            recorder.stop();
            setAudioStatus("Preparing your recording...");
        }
    };

    // Automatically play completed video.
    useEffect(() => {
        if (!avatarVideoUrl || !avatarVideoRef.current) {
            return;
        }

        const video = avatarVideoRef.current;

        video.currentTime = 0;

        video.play()
            .then(() => {
                setAudioStatus("Maiyu is speaking...");
            })
            .catch((error) => {
                console.warn("Video autoplay was blocked:", error);

                setAudioStatus(
                    "Maiyu's video is ready. Press Play to watch.",
                );
            });
    }, [avatarVideoUrl]);

    // Clean up resources when the component using this hook unmounts.
    useEffect(() => {
        return () => {
            const recorder = mediaRecorderRef.current;

            if (recorder && recorder.state !== "inactive") {
                recorder.onstop = null;
                recorder.stop();
            }

            streamRef.current?.getTracks().forEach((track) => track.stop());

            if (audioUrlRef.current) {
                URL.revokeObjectURL(audioUrlRef.current);
            }

            window.speechSynthesis?.cancel();
        };
    }, []);

    return {
        isRecording,
        isStartingRecording,
        isProcessingAudio,

        audioStatus,
        recordedAudioUrl,
        transcript,
        chatReply,
        avatarVideoUrl,

        avatarVideoRef,

        handleStartRecording,
        handleStopRecording,
        handleCancelVideo,
    };
};