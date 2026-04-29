import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../lib/api";
import type { Document, QuizQuestion } from "../types";

type Phase = "setup" | "quiz" | "results";

export default function Quiz() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState("");
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>("setup");
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<{ documents: Document[] }>("/documents").then((r) =>
      setDocuments(r.data.documents.filter((d) => d.status === "ready"))
    );
  }, []);

  async function handleStart() {
    if (!selectedDoc) return;
    setLoading(true);
    try {
      const res = await api.post<{ questions: QuizQuestion[] }>(
        "/quiz/generate",
        { document_id: selectedDoc, count }
      );
      setQuestions(res.data.questions);
      setAnswers(new Array(res.data.questions.length).fill(-1));
      setCurrent(0);
      setPhase("quiz");
    } finally {
      setLoading(false);
    }
  }

  function handleAnswer(optionIdx: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[current] = optionIdx;
      return next;
    });
  }

  function handleNext() {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      setPhase("results");
    }
  }

  const score = answers.filter(
    (a, i) => a === questions[i]?.correct_index
  ).length;

  if (phase === "setup") {
    return (
      <Layout>
        <h1 className="text-2xl font-bold mb-6">Quiz</h1>
        <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-md">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document
              </label>
              <select
                value={selectedDoc}
                onChange={(e) => setSelectedDoc(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of questions
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <button
              onClick={handleStart}
              disabled={!selectedDoc || loading}
              className="w-full bg-brand-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Generating quiz…" : "Start Quiz"}
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (phase === "quiz") {
    const q = questions[current];
    const selected = answers[current];

    return (
      <Layout>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Quiz</h1>
          <span className="text-sm text-gray-400">
            {current + 1} / {questions.length}
          </span>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-2xl">
          <p className="font-medium text-gray-900 mb-5">{q.question}</p>
          <div className="space-y-2">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                  selected === i
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-gray-200 hover:border-gray-300 text-gray-700"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <button
            onClick={handleNext}
            disabled={selected === -1}
            className="mt-5 bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {current < questions.length - 1 ? "Next" : "Finish"}
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4">Results</h1>
      <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-2xl">
        <p className="text-lg font-semibold mb-1">
          {score} / {questions.length} correct
        </p>
        <p className="text-gray-400 text-sm mb-6">
          {Math.round((score / questions.length) * 100)}% score
        </p>

        <div className="space-y-4">
          {questions.map((q, i) => {
            const correct = answers[i] === q.correct_index;
            return (
              <div
                key={i}
                className={`rounded-lg p-4 border ${
                  correct
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <p className="text-sm font-medium text-gray-900 mb-2">
                  {q.question}
                </p>
                <p className="text-xs text-gray-600">
                  Your answer:{" "}
                  <span className={correct ? "text-green-700" : "text-red-700"}>
                    {q.options[answers[i]] ?? "—"}
                  </span>
                </p>
                {!correct && (
                  <p className="text-xs text-gray-600">
                    Correct: <span className="text-green-700">{q.options[q.correct_index]}</span>
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1 italic">{q.explanation}</p>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => {
            setPhase("setup");
            setQuestions([]);
            setAnswers([]);
          }}
          className="mt-5 bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          Take Another Quiz
        </button>
      </div>
    </Layout>
  );
}
