import { Request, Response, NextFunction } from "express";
import {
    generateAvatarVideo,
    getAvatarVideoStatus,
} from "../services/avatar.service.js";

// Generate a talking avatar video.
export const generateAvatarController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const { text } = req.body;

        // Validate the input text.
        if (typeof text !== "string" || !text.trim()) {
            res.status(400).json({
                success: false,
                message: "Please provide valid text.",
            });
            return;
        }

        if (text.length > 2000) {
            res.status(400).json({
                success: false,
                message: "Text must not exceed 2000 characters.",
            });
            return;
        }

        // Generate the video through Sync Labs.
        const generation = await generateAvatarVideo(text.trim());

        res.status(202).json({
            success: true,
            generationId: generation.id,
            status: generation.status,
        });
    } catch (error) {
        next(error);
    }
};

// Check the generated video's status.
export const getAvatarStatusController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const videoId = req.params.videoId;

        if (typeof videoId !== "string" || !videoId.trim()) {
            res.status(400).json({
                success: false,
                message: "Video ID is required.",
            });
            return;
        }

        const generation = await getAvatarVideoStatus(videoId);

        res.status(200).json({
            success: true,
            generationId: generation.id,
            status: generation.status,
            videoUrl: generation.outputUrl ?? null,
            error: generation.error ?? null,
        });
    } catch (error) {
        next(error);
    }
};