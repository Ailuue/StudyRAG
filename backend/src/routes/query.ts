import { Router } from "express";
import { z } from "zod";
import { answerQuestion } from "../services/rag";
import type { ChatMessage } from "../types";

const router = Router();

const QuerySchema = z.object({
  question: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
});

router.post("/", async (req, res) => {
  const parsed = QuerySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { question, history } = parsed.data;
  const { answer, sources } = await answerQuestion(
    question,
    req.user!.id,
    history as ChatMessage[]
  );

  res.json({ answer, sources });
});

export default router;
