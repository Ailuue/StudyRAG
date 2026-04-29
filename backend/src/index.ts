import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";

import { requireAuth } from "./middleware/auth";
import authRouter from "./routes/auth";
import documentsRouter from "./routes/documents";
import queryRouter from "./routes/query";
import flashcardsRouter from "./routes/flashcards";
import quizRouter from "./routes/quiz";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/documents", requireAuth, documentsRouter);
app.use("/api/query", requireAuth, queryRouter);
app.use("/api/flashcards", requireAuth, flashcardsRouter);
app.use("/api/quiz", requireAuth, quizRouter);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
);

app.listen(PORT, () => console.log(`StudyRAG backend running on :${PORT}`));
