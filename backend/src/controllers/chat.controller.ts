import { Request, Response, NextFunction } from "express";
import { generateChatReply } from "../services/chat.service.js";

export const chatController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const { message } = req.body;

        if (typeof message !== "string" || !message.trim()) {
            res.status(400).json({
                success: false,
                message: "Please provide a valid message.",
            });
            return;
        }

        if (message.length > 2000) {
            res.status(400).json({
                success: false,
                message: "Message must not exceed 2000 characters.",
            });
            return;
        }

        const reply = await generateChatReply(message.trim());

        res.status(200).json({
            success: true,
            reply,
        });
    } catch (error) {
        next(error);
    }
};