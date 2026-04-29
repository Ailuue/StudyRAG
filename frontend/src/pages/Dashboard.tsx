import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../lib/api";
import type { Document } from "../types";

export default function Dashboard() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ documents: Document[] }>("/documents").then((r) => {
      setDocuments(r.data.documents);
      setLoading(false);
    });
  }, []);

  async function handleDelete(id: string) {
    await api.delete(`/documents/${id}`);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }

  const statusColor = {
    ready: "text-green-600 bg-green-50",
    processing: "text-yellow-600 bg-yellow-50",
    error: "text-red-600 bg-red-50",
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Knowledge Base</h1>
        <Link
          to="/upload"
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          + Add Document
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : documents.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No documents yet</p>
          <Link to="/upload" className="text-brand-600 hover:underline text-sm">
            Upload your first document →
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-gray-900">{doc.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {doc.chunk_count} chunks ·{" "}
                  {new Date(doc.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    statusColor[doc.status]
                  }`}
                >
                  {doc.status}
                </span>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {documents.length > 0 && (
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { to: "/chat", label: "Ask a Question", desc: "Chat with your notes" },
            { to: "/flashcards", label: "Flashcards", desc: "Generate & review" },
            { to: "/quiz", label: "Take a Quiz", desc: "Test your knowledge" },
          ].map((card) => (
            <Link
              key={card.to}
              to={card.to}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-brand-500 hover:shadow-sm transition-all"
            >
              <p className="font-semibold text-gray-900">{card.label}</p>
              <p className="text-sm text-gray-400 mt-1">{card.desc}</p>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
