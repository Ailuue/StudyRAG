import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client";
import { generateQuiz } from "../services/rag";
import { queryChunks } from "../services/pinecone";
import { embedQuery } from "../services/embeddings";

const router = Router();

const GenerateSchema = z.object({
  document_id: z.string().uuid(),
  count: z.number().int().min(1).max(10).optional().default(5),
});

router.post("/generate", async (req, res) => {
  const parsed = GenerateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { document_id, count } = parsed.data;

  const doc = await db.query(
    "SELECT id, title FROM documents WHERE id = $1 AND user_id = $2 AND status = 'ready'",
    [document_id, req.user!.id]
  );
  if (doc.rows.length === 0) {
    res.status(404).json({ error: "Document not found or not ready" });
    return;
  }

  const queryEmbed = await embedQuery(doc.rows[0].title);
  const matches = await queryChunks(queryEmbed, req.user!.id, 20);
  const chunks = matches
    .filter((m) => m.metadata?.document_id === document_id)
    .map((m) => m.metadata!.chunk_text as string);

  const questions = await generateQuiz(chunks, count);
  res.json({ questions });
});

export default router;
