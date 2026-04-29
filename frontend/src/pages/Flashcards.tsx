import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../lib/api";
import type { Document, Flashcard } from "../types";

export default function Flashcards() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [selectedDoc, setSelectedDoc] = useState("");
  const [count, setCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [flipped, setFlipped] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get<{ documents: Document[] }>("/documents").then((r) =>
      setDocuments(r.data.documents.filter((d) => d.status === "ready"))
    );
    api.get<{ flashcards: Flashcard[] }>("/flashcards").then((r) =>
      setFlashcards(r.data.flashcards)
    );
  }, []);

  async function handleGenerate() {
    if (!selectedDoc) return;
    setGenerating(true);
    try {
      const res = await api.post<{ flashcards: Flashcard[] }>(
        "/flashcards/generate",
        { document_id: selectedDoc, count }
      );
      setFlashcards((prev) => [...res.data.flashcards, ...prev]);
    } finally {
      setGenerating(false);
    }
  }

  function toggleFlip(id: string) {
    setFlipped((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleDelete(id: string) {
    await api.delete(`/flashcards/${id}`);
    setFlashcards((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Flashcards</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-gray-800 mb-3">Generate New Cards</h2>
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Document</label>
            <select
              value={selectedDoc}
              onChange={(e) => setSelectedDoc(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select document…</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Count</label>
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={!selectedDoc || generating}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {generating ? "Generating…" : "Generate"}
          </button>
        </div>
      </div>

      {flashcards.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-12">
          No flashcards yet. Generate some above!
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {flashcards.map((card) => (
            <div
              key={card.id}
              onClick={() => toggleFlip(card.id)}
              className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:border-brand-300 hover:shadow-sm transition-all min-h-[120px] flex flex-col justify-between"
            >
              <p className="text-sm text-gray-900">
                {flipped.has(card.id) ? (
                  <span className="text-brand-700">{card.answer}</span>
                ) : (
                  card.question
                )}
              </p>
              <div className="flex justify-between items-center mt-3">
                <span className="text-xs text-gray-400">
                  {flipped.has(card.id) ? "Answer" : "Question — click to flip"}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(card.id);
                  }}
                  className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
