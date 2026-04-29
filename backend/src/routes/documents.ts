import { Router } from "express";
import { db } from "../db/client";
import { upload } from "../middleware/upload";
import { extractTextFromPdf } from "../services/pdfParser";
import { chunkText } from "../services/chunker";
import { embedTexts } from "../services/embeddings";
import { upsertChunks, deleteDocumentChunks } from "../services/pinecone";

const router = Router();

router.get("/", async (req, res) => {
  const result = await db.query(
    "SELECT id, title, source_type, status, chunk_count, created_at FROM documents WHERE user_id = $1 ORDER BY created_at DESC",
    [req.user!.id]
  );
  res.json({ documents: result.rows });
});

router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }

  const isPdf = req.file.mimetype === "application/pdf";
  const title = req.body.title || req.file.originalname;

  const docResult = await db.query(
    "INSERT INTO documents (user_id, title, source_type, status) VALUES ($1, $2, $3, 'processing') RETURNING id",
    [req.user!.id, title, isPdf ? "pdf" : "text"]
  );
  const documentId = docResult.rows[0].id;

  res.status(202).json({ document_id: documentId, status: "processing" });

  // Process asynchronously after responding
  processDocument(req.user!.id, documentId, req.file.buffer, isPdf).catch(
    async (err) => {
      console.error("Document processing failed:", err);
      await db.query("UPDATE documents SET status = 'error' WHERE id = $1", [documentId]);
    }
  );
});

router.post("/text", async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    res.status(400).json({ error: "title and content are required" });
    return;
  }

  const docResult = await db.query(
    "INSERT INTO documents (user_id, title, source_type, status) VALUES ($1, $2, 'text', 'processing') RETURNING id",
    [req.user!.id, title]
  );
  const documentId = docResult.rows[0].id;

  res.status(202).json({ document_id: documentId, status: "processing" });

  processDocument(req.user!.id, documentId, Buffer.from(content), false).catch(
    async (err) => {
      console.error("Document processing failed:", err);
      await db.query("UPDATE documents SET status = 'error' WHERE id = $1", [documentId]);
    }
  );
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const result = await db.query(
    "DELETE FROM documents WHERE id = $1 AND user_id = $2 RETURNING id",
    [id, req.user!.id]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  await deleteDocumentChunks(id);
  res.json({ success: true });
});

async function processDocument(
  userId: string,
  documentId: string,
  buffer: Buffer,
  isPdf: boolean
) {
  const rawText = isPdf
    ? await extractTextFromPdf(buffer)
    : buffer.toString("utf-8");

  const chunks = chunkText(rawText);

  const docResult = await db.query(
    "SELECT title FROM documents WHERE id = $1",
    [documentId]
  );
  const title = docResult.rows[0]?.title ?? "";

  const BATCH = 100;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const embeddings = await embedTexts(batch);

    await upsertChunks(
      batch.map((text, j) => ({
        id: `${documentId}__${i + j}`,
        values: embeddings[j],
        metadata: {
          user_id: userId,
          document_id: documentId,
          document_title: title,
          chunk_text: text,
          chunk_index: i + j,
        },
      }))
    );
  }

  await db.query(
    "UPDATE documents SET status = 'ready', chunk_count = $1 WHERE id = $2",
    [chunks.length, documentId]
  );
}

export default router;
