export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Document {
  id: string;
  title: string;
  source_type: "pdf" | "text";
  status: "processing" | "ready" | "error";
  chunk_count: number;
  created_at: string;
}

export interface Flashcard {
  id: string;
  document_id: string | null;
  question: string;
  answer: string;
  created_at: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface SourceChunk {
  document_id: string;
  document_title: string;
  chunk_text: string;
  score: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: SourceChunk[];
}
