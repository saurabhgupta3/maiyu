import { Request, Response, NextFunction } from "express";
import { createLiveAvatarSession } from "../services/liveavatar.service.js";

export const createLiveAvatarSessionController = async (
    _req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const session = await createLiveAvatarSession();

        res.status(200).json({
            success: true,
            sessionToken: session.sessionToken,
            sessionId: session.sessionId,
        });
    } catch (error) {
        next(error);
    }
};