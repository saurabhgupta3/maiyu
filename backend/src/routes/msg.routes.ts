import { Router } from "express";
import { getMessage } from "../controllers/msg.controller.js";

const router = Router();

router.get("/msg", getMessage);

export default router;