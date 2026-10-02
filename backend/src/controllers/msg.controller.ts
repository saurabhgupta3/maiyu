import { Request, Response } from "express";
import { getMessageService } from "../services/msg.service.js";

export const getMessage = (req: Request, res: Response) => {
  const message = getMessageService();

  res.json({
    message,
  });
};