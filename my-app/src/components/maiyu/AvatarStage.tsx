"use client";

import Image from "next/image";
import type { RefObject } from "react";

interface AvatarStageProps {
    imgSrc: string;
    avatarVideoUrl: string;
    avatarVideoRef: RefObject<HTMLVideoElement | null>;
    onCancelVideo: () => void;
    onVideoPlay: () => void;
    onVideoEnded: () => void;
    onVideoError: () => void;
}

const AvatarStage = ({
    imgSrc,
    avatarVideoUrl,
    avatarVideoRef,
    onCancelVideo,
    onVideoPlay,
    onVideoEnded,
    onVideoError,
}: AvatarStageProps) => {
    return (
        <div className="flex flex-col items-center gap-3">

            {/* Avatar image or generated video */}
            <div className="relative h-[400px] w-[400px] max-w-full overflow-hidden">

                {avatarVideoUrl ? (
                    <video
                        ref={avatarVideoRef}
                        src={avatarVideoUrl}
                        controls
                        autoPlay
                        playsInline
                        className="h-full w-full object-contain"
                        onPlay={onVideoPlay}
                        onEnded={onVideoEnded}
                        onError={onVideoError}
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

            {/* Cancel generated video */}
            {avatarVideoUrl && (
                <button
                    onClick={onCancelVideo}
                    className="rounded-md bg-red-600 px-5 py-2 font-semibold text-white transition hover:bg-red-700"
                >
                    Cancel video
                </button>
            )}

        </div>
    );
};

export default AvatarStage;