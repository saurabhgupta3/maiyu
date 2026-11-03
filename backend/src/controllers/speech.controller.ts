import { Request, Response, NextFunction } from "express";
import { generateSpeech } from "../services/speech.service.js";

export const speechController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const { text } = req.body;

        // Validate the text.
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

        // Generate speech using Gemini.
        const audioBuffer = await generateSpeech(text.trim());

        // Return the generated audio.
        res.setHeader("Content-Type", "audio/wav");
        res.setHeader(
            "Content-Disposition",
            'inline; filename="maiyu.wav"',
        );

        res.status(200).send(audioBuffer);
    } catch (error) {
        next(error);
    }
};