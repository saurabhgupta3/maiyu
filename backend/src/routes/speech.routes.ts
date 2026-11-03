import { Router } from "express";
import { speechController } from "../controllers/speech.controller.js";

const router = Router();

router.post("/", speechController);

export default router;