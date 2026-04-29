import OpenAI from "openai";
import { embedQuery } from "./embeddings";
import { queryChunks } from "./pinecone";
import type { ChatMessage, SourceChunk } from "../types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";

export async function answerQuestion(
  question: string,
  userId: string,
  history: ChatMessage[] = []
): Promise<{ answer: string; sources: SourceChunk[] }> {
  const queryEmbedding = await embedQuery(question);
  const matches = await queryChunks(queryEmbedding, userId, 5);

  const sources: SourceChunk[] = matches
    .filter((m) => m.metadata)
    .map((m) => ({
      document_id: m.metadata!.document_id as string,
      document_title: m.metadata!.document_title as string,
      chunk_text: m.metadata!.chunk_text as string,
      score: m.score ?? 0,
    }));

  const context = sources
    .map((s, i) => `[${i + 1}] ${s.document_title}:\n${s.chunk_text}`)
    .join("\n\n");

  const systemPrompt = `You are a study assistant. Answer questions based ONLY on the provided context from the user's notes. If the answer is not in the context, say so clearly. Always cite which source ([1], [2], etc.) supports your answer.

Context:
${context}`;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-6).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: question },
  ];

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages,
    temperature: 0.3,
    max_tokens: 1024,
  });

  const answer = completion.choices[0].message.content ?? "";
  return { answer, sources };
}

export async function generateFlashcards(
  documentChunks: string[],
  count = 10
): Promise<{ question: string; answer: string }[]> {
  const context = documentChunks.slice(0, 20).join("\n\n");

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a study assistant. Generate concise flashcards from the provided text. Return a JSON array of {question, answer} objects. Questions should test understanding, not just recall.",
      },
      {
        role: "user",
        content: `Generate ${count} flashcards from this text:\n\n${context}\n\nReturn only valid JSON array.`,
      },
    ],
    temperature: 0.5,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0].message.content ?? "{}";
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.flashcards) ? parsed.flashcards : [];
}

export async function generateQuiz(
  documentChunks: string[],
  count = 5
): Promise<
  {
    question: string;
    options: string[];
    correct_index: number;
    explanation: string;
  }[]
> {
  const context = documentChunks.slice(0, 20).join("\n\n");

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      {
        role: "system",
        content:
          "Generate multiple-choice quiz questions from the provided text. Return a JSON object with a 'questions' array. Each question has: question (string), options (array of 4 strings), correct_index (0-3), explanation (string).",
      },
      {
        role: "user",
        content: `Generate ${count} quiz questions from:\n\n${context}\n\nReturn only valid JSON.`,
      },
    ],
    temperature: 0.5,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0].message.content ?? "{}";
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.questions) ? parsed.questions : [];
}
