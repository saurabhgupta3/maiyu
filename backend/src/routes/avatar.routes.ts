import { Router } from "express";
import {
    generateAvatarController,
    getAvatarStatusController,
} from "../controllers/avatar.controller.js";

const router = Router();

// Generate a talking avatar video.
router.post("/generate", generateAvatarController);

// Check video generation status.
router.get("/status/:videoId", getAvatarStatusController);

export default router;