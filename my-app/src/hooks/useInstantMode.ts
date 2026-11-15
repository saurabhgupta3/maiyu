"use client";

import { useEffect, useRef, useState } from "react";

export const useInstantMode = () => {
    // --------------------------------
    // RECORDING STATES
    // --------------------------------

    const [isRecording, setIsRecording] = useState(false);

    const [isStartingRecording, setIsStartingRecording] = useState(false);

    const [isProcessingAudio, setIsProcessingAudio] = useState(false);

    // --------------------------------
    // CONVERSATION STATES
    // --------------------------------

    const [audioStatus, setAudioStatus] = useState("");

    const [recordedAudioUrl, setRecordedAudioUrl] = useState("");

    const [transcript, setTranscript] = useState("");

    const [chatReply, setChatReply] = useState("");

    const [speechAudioUrl, setSpeechAudioUrl] = useState("");

    // Tracks actual audio playback for avatar animation.

    const [isSpeaking, setIsSpeaking] = useState(false);

    // Tracks whether the audio analyser detects speech energy.

    const [isMouthOpen, setIsMouthOpen] = useState(false);

    // Actual duration of generated speech.

    const [speechDuration, setSpeechDuration] = useState(0);

    // --------------------------------
    // REFS
    // --------------------------------

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    const streamRef = useRef<MediaStream | null>(null);

    const audioChunksRef = useRef<Blob[]>([]);

    const audioUrlRef = useRef<string | null>(null);

    const speechAudioUrlRef = useRef<string | null>(null);

    const speechAudioRef = useRef<HTMLAudioElement | null>(null);

    // --------------------------------
    // CLEAR PREVIOUS RESPONSE AUDIO
    // --------------------------------

    const clearSpeechAudio = () => {
        if (speechAudioRef.current) {
            speechAudioRef.current.pause();

            speechAudioRef.current.currentTime = 0;

            speechAudioRef.current = null;
        }

        setIsSpeaking(false);

        setIsMouthOpen(false);

        setSpeechDuration(0);

        if (speechAudioUrlRef.current) {
            URL.revokeObjectURL(speechAudioUrlRef.current);

            speechAudioUrlRef.current = null;
        }

        setSpeechAudioUrl("");
    };

    // --------------------------------
    // START MICROPHONE RECORDING
    // --------------------------------

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
                    "Audio recording is not supported in this browser."
                );
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });

            streamRef.current = stream;

            audioChunksRef.current = [];

            // Clear previous conversation data.

            setTranscript("");

            setChatReply("");

            setAudioStatus("Listening... Speak now.");

            clearSpeechAudio();

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
                MediaRecorder.isTypeSupported(type)
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

            // --------------------------------
            // PROCESS AUDIO AFTER RECORDING
            // --------------------------------

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

                // No audio captured.

                if (audioBlob.size === 0) {
                    setAudioStatus(
                        "No audio was captured. Please try again."
                    );

                    stopMicrophone();

                    return;
                }

                // Create playback URL for user's recording.

                const recordingUrl = URL.createObjectURL(audioBlob);

                if (audioUrlRef.current) {
                    URL.revokeObjectURL(audioUrlRef.current);
                }

                audioUrlRef.current = recordingUrl;

                setRecordedAudioUrl(recordingUrl);

                setIsProcessingAudio(true);

                try {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

                    if (!apiUrl) {
                        throw new Error(
                            "NEXT_PUBLIC_API_URL is not configured."
                        );
                    }

                    const baseUrl = apiUrl.replace(/\/+$/, "");

                    // --------------------------------
                    // STEP 1: TRANSCRIBE AUDIO
                    // --------------------------------

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
                        `recording.${extension}`
                    );

                    const transcriptionResponse = await fetch(
                        `${baseUrl}/api/transcribe`,
                        {
                            method: "POST",
                            body: formData,
                        }
                    );

                    const transcriptionData = await transcriptionResponse
                        .json()
                        .catch(() => null);

                    if (!transcriptionResponse.ok) {
                        throw new Error(
                            transcriptionData?.message ||
                                "Speech transcription failed."
                        );
                    }

                    const spokenText = transcriptionData?.transcript;

                    if (
                        typeof spokenText !== "string" ||
                        !spokenText.trim()
                    ) {
                        throw new Error(
                            "No speech was recognized. Please try again."
                        );
                    }

                    setTranscript(spokenText);

                    // --------------------------------
                    // STEP 2: GET GEMINI CHAT RESPONSE
                    // --------------------------------

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
                        }
                    );

                    const chatData = await chatResponse
                        .json()
                        .catch(() => null);

                    if (!chatResponse.ok) {
                        throw new Error(
                            chatData?.message ||
                                "Could not get a response from Maiyu."
                        );
                    }

                    const reply =
                        typeof chatData?.reply === "string"
                            ? chatData.reply
                            : chatData?.msg;

                    if (
                        typeof reply !== "string" ||
                        !reply.trim()
                    ) {
                        throw new Error(
                            "Maiyu returned an empty response."
                        );
                    }

                    setChatReply(reply);

                    // --------------------------------
                    // STEP 3: GENERATE GEMINI TTS
                    // --------------------------------

                    setAudioStatus("Generating Maiyu's voice...");

                    const speechResponse = await fetch(
                        `${baseUrl}/api/speak`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                text: reply,
                            }),
                        }
                    );

                    if (!speechResponse.ok) {
                        const errorData = await speechResponse
                            .json()
                            .catch(() => null);

                        throw new Error(
                            errorData?.message ||
                                "Could not generate Maiyu's voice."
                        );
                    }

                    const speechBlob = await speechResponse.blob();

                    if (speechBlob.size === 0) {
                        throw new Error(
                            "Maiyu's voice response was empty."
                        );
                    }

                    // Create URL for generated speech.

                    const responseAudioUrl =
                        URL.createObjectURL(speechBlob);

                    if (speechAudioUrlRef.current) {
                        URL.revokeObjectURL(speechAudioUrlRef.current);
                    }

                    speechAudioUrlRef.current = responseAudioUrl;

                    setSpeechAudioUrl(responseAudioUrl);

                    setAudioStatus("Maiyu's response is ready.");
                } catch (error) {
                    console.error(
                        "Instant conversation error:",
                        error
                    );

                    setAudioStatus(
                        error instanceof Error
                            ? error.message
                            : "Something went wrong. Please try again."
                    );
                } finally {
                    stopMicrophone();

                    setIsProcessingAudio(false);
                }
            };

            // --------------------------------
            // RECORDING ERROR
            // --------------------------------

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
                    : "Microphone access denied or unavailable."
            );
        } finally {
            setIsStartingRecording(false);
        }
    };

    // --------------------------------
    // STOP MICROPHONE RECORDING
    // --------------------------------

    const handleStopRecording = () => {
        const recorder = mediaRecorderRef.current;

        if (recorder && recorder.state !== "inactive") {
            recorder.stop();

            setAudioStatus("Preparing your recording...");
        }
    };

    // --------------------------------
    // STOP GENERATED SPEECH
    // --------------------------------

    const handleStopSpeech = () => {
        if (speechAudioRef.current) {
            speechAudioRef.current.pause();

            speechAudioRef.current.currentTime = 0;
        }

        setIsSpeaking(false);

        setIsMouthOpen(false);

        setAudioStatus("Maiyu's speech stopped.");
    };

    // --------------------------------
    // REPLAY GENERATED SPEECH
    // --------------------------------

    const handleReplaySpeech = async () => {
        const audio = speechAudioRef.current;

        if (!audio) {
            return;
        }

        try {
            audio.currentTime = 0;

            await audio.play();

            setAudioStatus("Maiyu is speaking...");
        } catch (error) {
            console.error("Could not replay Maiyu's voice:", error);

            setAudioStatus("Could not replay Maiyu's voice.");
        }
    };

    // --------------------------------
    // AUTOMATICALLY PLAY GEMINI TTS
    // --------------------------------

    useEffect(() => {
        if (!speechAudioUrl) {
            setIsSpeaking(false);

            setIsMouthOpen(false);

            setSpeechDuration(0);

            return;
        }

        const audio = new Audio(speechAudioUrl);

        speechAudioRef.current = audio;

        let audioContext: AudioContext | null = null;

        let analyser: AnalyserNode | null = null;

        let source: MediaElementAudioSourceNode | null = null;

        let animationFrameId = 0;

        let mouthCurrentlyOpen = false;

        let smoothedRms = 0;

        // --------------------------------
        // CREATE AUDIO ANALYSER
        // --------------------------------

        try {
            if (window.AudioContext) {
                audioContext = new window.AudioContext();

                analyser = audioContext.createAnalyser();

                analyser.fftSize = 512;

                analyser.smoothingTimeConstant = 0.75;

                source = audioContext.createMediaElementSource(audio);

                source.connect(analyser);

                analyser.connect(audioContext.destination);
            }
        } catch (error) {
            console.warn(
                "Audio analysis is unavailable; audio will still play.",
                error
            );

            analyser = null;
        }

        const samples = analyser
            ? new Uint8Array(analyser.fftSize)
            : null;

        // --------------------------------
        // ANALYSE AUDIO ENERGY
        // --------------------------------

        const analyseAudio = () => {
            if (!analyser || !samples) {
                return;
            }

            analyser.getByteTimeDomainData(samples);

            let sum = 0;

            for (let index = 0; index < samples.length; index += 1) {
                const sample = (samples[index] - 128) / 128;

                sum += sample * sample;
            }

            const rms = Math.sqrt(sum / samples.length);

            // Smooth audio energy to avoid rapid image flickering.

            smoothedRms = smoothedRms * 0.72 + rms * 0.28;

            // Use separate thresholds for opening and closing.
            // This prevents the mouth from rapidly switching
            // when audio energy is near the threshold.

            const shouldOpen = mouthCurrentlyOpen
                ? smoothedRms > 0.018
                : smoothedRms > 0.035;

            if (shouldOpen !== mouthCurrentlyOpen) {
                mouthCurrentlyOpen = shouldOpen;

                setIsMouthOpen(shouldOpen);
            }

            animationFrameId =
                window.requestAnimationFrame(analyseAudio);
        };

        // --------------------------------
        // AUDIO METADATA
        // --------------------------------

        audio.onloadedmetadata = () => {
            setSpeechDuration(
                Number.isFinite(audio.duration) ? audio.duration : 0
            );
        };

        // --------------------------------
        // AUDIO STARTS
        // --------------------------------

        audio.onplay = () => {
            setIsSpeaking(true);

            setAudioStatus("Maiyu is speaking...");

            if (audioContext?.state === "suspended") {
                void audioContext.resume();
            }

            if (analyser) {
                cancelAnimationFrame(animationFrameId);

                animationFrameId =
                    window.requestAnimationFrame(analyseAudio);
            }
        };

        // --------------------------------
        // AUDIO PAUSES
        // --------------------------------

        audio.onpause = () => {
            setIsSpeaking(false);

            mouthCurrentlyOpen = false;

            setIsMouthOpen(false);

            cancelAnimationFrame(animationFrameId);
        };

        // --------------------------------
        // AUDIO ENDS
        // --------------------------------

        audio.onended = () => {
            setIsSpeaking(false);

            mouthCurrentlyOpen = false;

            setIsMouthOpen(false);

            cancelAnimationFrame(animationFrameId);

            setAudioStatus("Maiyu finished speaking.");
        };

        // --------------------------------
        // AUDIO ERROR
        // --------------------------------

        audio.onerror = () => {
            setIsSpeaking(false);

            setIsMouthOpen(false);

            setAudioStatus("Could not play Maiyu's voice.");
        };

        // --------------------------------
        // PLAY AUDIO
        // --------------------------------

        audio.play().catch((error) => {
            console.warn("Audio autoplay was blocked:", error);

            setIsSpeaking(false);

            setIsMouthOpen(false);

            setAudioStatus(
                "Maiyu's voice is ready. Press Play to listen."
            );
        });

        // --------------------------------
        // CLEANUP
        // --------------------------------

        return () => {
            cancelAnimationFrame(animationFrameId);

            audio.pause();

            audio.onplay = null;

            audio.onpause = null;

            audio.onended = null;

            audio.onerror = null;

            audio.onloadedmetadata = null;

            try {
                source?.disconnect();

                analyser?.disconnect();
            } catch {
                // Audio nodes may already be disconnected.
            }

            if (audioContext && audioContext.state !== "closed") {
                void audioContext.close();
            }

            if (speechAudioRef.current === audio) {
                speechAudioRef.current = null;
            }
        };
    }, [speechAudioUrl]);

    // --------------------------------
    // RELEASE RESOURCES ON UNMOUNT
    // --------------------------------

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

            if (speechAudioRef.current) {
                speechAudioRef.current.pause();
            }

            if (speechAudioUrlRef.current) {
                URL.revokeObjectURL(speechAudioUrlRef.current);
            }
        };
    }, []);

    // --------------------------------
    // RETURN
    // --------------------------------

    return {
        isRecording,

        isStartingRecording,

        isProcessingAudio,

        audioStatus,

        recordedAudioUrl,

        transcript,

        chatReply,

        speechAudioUrl,

        // Used by page.tsx for avatar animation.

        isSpeaking,

        isMouthOpen,

        speechDuration,

        handleStartRecording,

        handleStopRecording,

        handleStopSpeech,

        handleReplaySpeech,
    };
};