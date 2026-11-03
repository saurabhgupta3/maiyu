import { Request, Response, NextFunction } from "express";
import { transcribeAudio } from "../services/transcribe.service.js";

export const transcribeController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const file = req.file;

        // Ensure an audio file was uploaded.
        if (!file) {
            res.status(400).json({
                success: false,
                message: "Please upload an audio file.",
            });
            return;
        }

        // Only accept audio uploads.
        if (!file.mimetype.startsWith("audio/")) {
            res.status(415).json({
                success: false,
                message: "Unsupported file type. Please upload audio.",
            });
            return;
        }

        // Convert the uploaded audio into text using Gemini.
        const transcript = await transcribeAudio(
            file.buffer,
            file.mimetype,
        );

        res.status(200).json({
            success: true,
            transcript,
        });
    } catch (error) {
        next(error);
    }
};