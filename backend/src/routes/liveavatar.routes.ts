import { Router } from "express";

import {
    createLiveAvatarSessionController,
} from "../controllers/liveavatar.controller.js";

const router = Router();

router.post("/token", createLiveAvatarSessionController);

export default router;