import { Request, Response, NextFunction } from "express";
import { generateChatReply } from "../services/chat.service.js";

export const chatController = async (req : Request, res : Response, next: NextFunction) => {
    try {
        const {msg} = req.body;
        if (typeof msg !== "string" || !msg.trim()) {
            res.status(400).json({
                success: false,
                msg: "Please provide a valid message.",
            });
            return;
        }
        if(msg.length > 2000) {
            res.status(400).json({
                success: false,
                msg: "message must not exceed 2000 characters"
            });
            return;
        }
        const reply = await generateChatReply(msg.trim());
        res.status(200).json({
            success: true,
            msg: reply,
        });
    } catch(err) {
        next(err);
    }
}