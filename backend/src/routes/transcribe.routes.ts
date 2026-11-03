import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { transcribeController } from "../controllers/transcribe.controller.js";

const router = Router();

const uploadAudio = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // Maximum 10 MB
        files: 1,
    },
}).single("audio");

router.post(
    "/",
    (req: Request, res: Response, next: NextFunction) => {
        uploadAudio(req, res, (error) => {
            if (error instanceof multer.MulterError) {
                if (error.code === "LIMIT_FILE_SIZE") {
                    res.status(413).json({
                        success: false,
                        message: "Audio file must not exceed 10 MB.",
                    });
                    return;
                }

                res.status(400).json({
                    success: false,
                    message: "Invalid audio upload.",
                });
                return;
            }

            if (error) {
                next(error);
                return;
            }

            next();
        });
    },
    transcribeController,
);

export default router;