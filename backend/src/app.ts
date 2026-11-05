import express from "express";
import cors from "cors";
import msgRouter from "./routes/msg.routes.js";
import healthRouter from "./routes/health.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import transcribeRoutes from "./routes/transcribe.routes.js";
import speechRoutes from "./routes/speech.routes.js";
import avatarRoutes from "./routes/avatar.routes.js";
import liveAvatarRoutes from "./routes/liveavatar.routes.js";

import {
  notFoundHandler,
  errorHandler,
} from "./middlewares/error.middleware.js";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://maiyu.online",
  "https://www.maiyu.online",
  "http://localhost:8081",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
  }),
);

app.use(express.json());

app.use("/api/chat", chatRoutes);
app.use("/api/transcribe", transcribeRoutes);
app.use("/api/speak", speechRoutes);
app.use("/api/avatar", avatarRoutes);
app.use("/api/liveavatar", liveAvatarRoutes);
app.use("/api", msgRouter);
app.use("/", healthRouter);


app.use(notFoundHandler);
app.use(errorHandler);

export default app;