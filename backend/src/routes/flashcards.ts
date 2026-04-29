import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client";
import { generateFlashcards } from "../services/rag";
import { queryChunks } from "../services/pinecone";
import { embedQuery } from "../services/embeddings";

const router = Router();

router.get("/", async (req, res) => {
  const result = await db.query(
    "SELECT id, document_id, question, answer, created_at FROM flashcards WHERE user_id = $1 ORDER BY created_at DESC",
    [req.user!.id]
  );
  res.json({ flashcards: result.rows });
});

const GenerateSchema = z.object({
  document_id: z.string().uuid(),
  count: z.number().int().min(1).max(20).optional().default(10),
});

router.post("/generate", async (req, res) => {
  const parsed = GenerateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { document_id, count } = parsed.data;

  const doc = await db.query<{ id: string; title: string }>(
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

  const cards = await generateFlashcards(chunks, count);

  const inserted = await Promise.all(
    cards.map((c) =>
      db.query(
        "INSERT INTO flashcards (user_id, document_id, question, answer) VALUES ($1, $2, $3, $4) RETURNING id, question, answer",
        [req.user!.id, document_id, c.question, c.answer]
      )
    )
  );

  res.json({ flashcards: inserted.map((r) => r.rows[0]) });
});

router.delete("/:id", async (req, res) => {
  await db.query(
    "DELETE FROM flashcards WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user!.id]
  );
  res.json({ success: true });
});

export default router;
