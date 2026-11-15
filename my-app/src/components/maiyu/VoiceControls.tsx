
"use client";

interface VoiceControlsProps {
    isRecording: boolean;
    isStartingRecording: boolean;
    isProcessingAudio: boolean;

    audioStatus: string;
    recordedAudioUrl: string;
    transcript: string;
    chatReply: string;

    responseAudioUrl?: string;
    isSpeaking?: boolean;

    onStartRecording: () => void | Promise<void>;
    onStopRecording: () => void;
    onReplayResponseAudio: () => void;
}

const VoiceControls = ({
    isRecording,
    isStartingRecording,
    isProcessingAudio,
    audioStatus,
    recordedAudioUrl,
    transcript,
    chatReply,
    responseAudioUrl,
    isSpeaking = false,
    onStartRecording,
    onStopRecording,
    onReplayResponseAudio,
}: VoiceControlsProps) => {
    return (
        <section className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border border-gray-200 p-5">

            <h2 className="text-xl font-semibold">
                Talk to Maiyu
            </h2>

            {/* RECORDING BUTTON */}

            <button
                type="button"
                onClick={
                    isRecording
                        ? onStopRecording
                        : onStartRecording
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

            {/* AUDIO STATUS */}

            {audioStatus && (
                <p className="text-center text-sm text-gray-600">
                    {audioStatus}
                </p>
            )}

            {/* USER RECORDING */}

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

            {/* TRANSCRIPT */}

            {transcript && (
                <div className="w-full space-y-2">
                    <p className="font-semibold">
                        You said:
                    </p>

                    <p className="rounded-lg bg-gray-100 p-3 text-gray-900">
                        {transcript}
                    </p>
                </div>
            )}

            {/* MAIYU RESPONSE */}

            {chatReply && (
                <div className="w-full space-y-2">
                    <p className="font-semibold">
                        Maiyu replied:
                    </p>

                    <p className="rounded-lg bg-blue-50 p-3 text-gray-900">
                        {chatReply}
                    </p>
                </div>
            )}

            {/* REPLAY RESPONSE AUDIO */}

            {responseAudioUrl && (
                <div className="flex w-full flex-col items-center gap-2">
                    <p className="font-semibold">
                        Listen to Maiyu:
                    </p>

                    <button
                        type="button"
                        onClick={onReplayResponseAudio}
                        className="w-full rounded-md bg-purple-600 px-5 py-3 font-bold text-white transition hover:bg-purple-700"
                    >
                        {isSpeaking ? "Replay Maiyu's Voice" : "Replay"}
                    </button>

                    <p className="text-xs text-gray-500">
                        Replays the voice with avatar animation.
                    </p>
                </div>
            )}

        </section>
    );
};

export default VoiceControls;
