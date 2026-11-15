"use client";

import type { ConversationMode } from "../../types/maiyu";

interface ModeSelectorProps {
    selectedMode: ConversationMode;
    onModeChange: (mode: ConversationMode) => void;
    disabled?: boolean;
}

const modes: {
    id: ConversationMode;
    title: string;
    description: string;
    speed: string;
}[] = [
    {
        id: "instant",
        title: "Instant",
        description: "Quick voice responses with a static avatar.",
        speed: "Fastest",
    },
    {
        id: "live",
        title: "Live",
        description: "Real-time conversation with an animated avatar.",
        speed: "Real-time",
    },
    {
        id: "studio",
        title: "Studio",
        description: "High-quality generated talking videos.",
        speed: "Highest visual quality",
    },
];

const ModeSelector = ({
    selectedMode,
    onModeChange,
    disabled = false,
}: ModeSelectorProps) => {
    return (
        <div className="w-full max-w-2xl space-y-3">
            <h2 className="text-center text-lg font-semibold">
                Choose your experience
            </h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {modes.map((mode) => {
                    const isSelected = selectedMode === mode.id;

                    return (
                        <button
                            key={mode.id}
                            type="button"
                            onClick={() => onModeChange(mode.id)}
                            disabled={disabled}
                            aria-pressed={isSelected}
                            className={`rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                isSelected
                                    ? "border-green-600 bg-green-50 ring-2 ring-green-600"
                                    : "border-gray-200 bg-white hover:border-gray-400"
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-gray-900">
                                    {mode.title}
                                </span>

                                {isSelected && (
                                    <span className="text-xs font-semibold text-green-700">
                                        Selected
                                    </span>
                                )}
                            </div>

                            <p className="mt-2 text-xs font-medium text-gray-500">
                                {mode.speed}
                            </p>

                            <p className="mt-2 text-sm text-gray-700">
                                {mode.description}
                            </p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default ModeSelector;