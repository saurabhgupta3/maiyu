"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export default function Home() {
    const [message, setMessage] = useState("");
    const [imgSrc, setImgSrc] = useState("/person.png");

    const [isRecording, setIsRecording] = useState(false);
    const [isStartingRecording, setIsStartingRecording] = useState(false);
    const [isProcessingAudio, setIsProcessingAudio] = useState(false);

    const [audioStatus, setAudioStatus] = useState("");
    const [recordedAudioUrl, setRecordedAudioUrl] = useState("");
    const [transcript, setTranscript] = useState("");
    const [chatReply, setChatReply] = useState("");
    const [avatarVideoUrl, setAvatarVideoUrl] = useState("");

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const audioUrlRef = useRef<string | null>(null);
    const avatarVideoRef = useRef<HTMLVideoElement | null>(null);

    // Call the existing backend message endpoint.
    const handleClick = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;

            if (!apiUrl) {
                throw new Error("API URL is not configured.");
            }

            const response = await fetch(
                `${apiUrl.replace(/\/+$/, "")}/api/msg`,
            );

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(data?.message || "API request failed.");
            }

            setMessage(data.message);
        } catch (error) {
            console.error("Error:", error);
            setMessage("Something went wrong.");
        }
    };

    // Animate Maiyu and speak the fixed greeting "Hi" when Active is clicked.
    const handleActiveClick = () => {
        setImgSrc("/person_blink.png");

        setTimeout(() => {
            setImgSrc("/person_hi.png");

            const speech = new SpeechSynthesisUtterance("Hi");
            const voices = window.speechSynthesis.getVoices();

            const maleVoice = voices.find(
                (voice) =>
                    voice.lang.startsWith("en") &&
                    /male|david|mark|daniel|alex/i.test(voice.name),
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

    // Cancel the talking video and bring back Maiyu's original image.
    const handleCancelVideo = () => {
        if (avatarVideoRef.current) {
            avatarVideoRef.current.pause();
            avatarVideoRef.current.currentTime = 0;
        }

        setAvatarVideoUrl("");
        setImgSrc("/person.png");
        setAudioStatus("Video closed. Maiyu is back.");
    };

    // Start recording audio from the microphone.
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

            // Clear the previous conversation result and recording.
            setTranscript("");
            setChatReply("");
            setAvatarVideoUrl("");
            setImgSrc("/person.png");
            setMessage("");
            setAudioStatus("Listening... Speak now.");

            if (audioUrlRef.current) {
                URL.revokeObjectURL(audioUrlRef.current);
                audioUrlRef.current = null;
                setRecordedAudioUrl("");
            }

            // Choose an audio format supported by the browser.
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

            // Called after the user clicks Stop Recording.
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

                // Keep a local playback option for the user's own recording.
                const audioUrl = URL.createObjectURL(audioBlob);

                if (audioUrlRef.current) {
                    URL.revokeObjectURL(audioUrlRef.current);
                }

                audioUrlRef.current = audioUrl;
                setRecordedAudioUrl(audioUrl);

                setIsProcessingAudio(true);
                setTranscript("");
                setChatReply("");
                setAvatarVideoUrl("");
                setMessage("");

                try {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

                    if (!apiUrl) {
                        throw new Error(
                            "NEXT_PUBLIC_API_URL is not configured.",
                        );
                    }

                    const baseUrl = apiUrl.replace(/\/+$/, "");

                    // STEP 1: Send the recorded audio to Gemini transcription.
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

                    // STEP 2: Send recognized text to the Gemini chat endpoint.
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

                    // STEP 3: Generate Gemini speech and submit it to Sync Labs.
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

                    // STEP 4: Poll until Sync Labs finishes generating the video.
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

                        if (status === "FAILED" || status === "REJECTED") {
                            throw new Error(
                                statusData?.error ||
                                    "Sync Labs could not generate the video.",
                            );
                        }

                        setAudioStatus(
                            `Creating Maiyu's talking video... (${status || "PROCESSING"})`,
                        );

                        // Check status every 10 seconds.
                        // 60 attempts gives the generation about 10 minutes.
                        if (attempt < 59) {
                            await new Promise((resolve) =>
                                setTimeout(resolve, 10000),
                            );
                        }
                    }

                    if (!videoReady) {
                        throw new Error(
                            `Video generation is still processing after about 10 minutes. Generation ID: ${generationId}. Check its status using GET /api/avatar/status/${generationId}.`,
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

    // Stop recording.
    const handleStopRecording = () => {
        const recorder = mediaRecorderRef.current;

        if (recorder && recorder.state !== "inactive") {
            recorder.stop();
            setAudioStatus("Preparing your recording...");
        }
    };

    // Automatically play the completed talking-avatar video.
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

    // Release microphone and local recording resources when leaving the page.
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

    return (
        <main className="flex min-h-screen flex-col items-center justify-evenly gap-5 px-4 py-8">
            <h1 className="text-center text-3xl font-bold">
                Maiyu — AI Talker
            </h1>

            <p className="max-w-xl text-center text-xl">
                Talk naturally with Maiyu, an interactive AI talker.
            </p>

            <button
                onClick={handleClick}
                className="rounded-md border border-green-500 bg-green-500 px-4 py-2 font-bold text-purple-500"
            >
                How to use
            </button>

            {/* Maiyu's image and generated video share this same area. */}
            <div className="flex flex-col items-center gap-3">
                <div className="relative h-[400px] w-[400px] max-w-full overflow-hidden">
                    {avatarVideoUrl ? (
                        <video
                            ref={avatarVideoRef}
                            src={avatarVideoUrl}
                            controls
                            autoPlay
                            playsInline
                            className="h-full w-full object-contain"
                            onPlay={() =>
                                setAudioStatus("Maiyu is speaking...")
                            }
                            onEnded={() =>
                                setAudioStatus(
                                    "Maiyu finished speaking. Press Cancel video to return to the image.",
                                )
                            }
                            onError={() =>
                                setAudioStatus(
                                    "The video could not be played. Please try again.",
                                )
                            }
                        />
                    ) : (
                        <Image
                            src={imgSrc}
                            alt="Maiyu character"
                            height={400}
                            width={400}
                            priority
                            className="h-full w-full object-contain"
                        />
                    )}
                </div>

                {/* Show the cancel button only when the generated video is visible. */}
                {avatarVideoUrl && (
                    <button
                        onClick={handleCancelVideo}
                        className="rounded-md bg-red-600 px-5 py-2 font-semibold text-white transition hover:bg-red-700"
                    >
                        Cancel video
                    </button>
                )}
            </div>

            <button
                onClick={handleActiveClick}
                className="rounded-md border border-green-500 bg-green-500 px-4 py-2 font-bold text-purple-500"
            >
                Active
            </button>

            {message && (
                <p className="text-center text-xl">{message}</p>
            )}

            <section className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border border-gray-200 p-5">
                <h2 className="text-xl font-semibold">
                    Talk to Maiyu
                </h2>

                <button
                    onClick={
                        isRecording
                            ? handleStopRecording
                            : handleStartRecording
                    }
                    disabled={isStartingRecording || isProcessingAudio}
                    className={`rounded-md px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                        isRecording
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-blue-600 hover:bg-blue-700"
                    }`}
                >
                    {isStartingRecording
                        ? "Opening microphone..."
                        : isProcessingAudio
                          ? "Processing..."
                          : isRecording
                            ? "Stop Recording"
                            : "Listen"}
                </button>

                {audioStatus && (
                    <p className="text-center text-sm text-gray-600">
                        {audioStatus}
                    </p>
                )}

                {recordedAudioUrl && (
                    <div className="flex w-full flex-col items-center gap-2">
                        <p className="text-sm font-medium">
                            Play your recording
                        </p>

                        <audio
                            controls
                            src={recordedAudioUrl}
                            className="w-full"
                        />
                    </div>
                )}

                {transcript && (
                    <div className="w-full space-y-2">
                        <p className="font-semibold">You said:</p>

                        <p className="rounded-lg bg-gray-100 p-3 text-gray-900">
                            {transcript}
                        </p>
                    </div>
                )}

                {chatReply && (
                    <div className="w-full space-y-2">
                        <p className="font-semibold">Maiyu replied:</p>

                        <p className="rounded-lg bg-blue-50 p-3 text-gray-900">
                            {chatReply}
                        </p>
                    </div>
                )}
            </section>
        </main>
    );
}