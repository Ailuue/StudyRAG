export interface User {
  id: string;
  username: string;
  created_at: Date;
}

export interface Document {
  id: string;
  user_id: string;
  title: string;
  source_type: "pdf" | "text";
  status: "processing" | "ready" | "error";
  chunk_count: number;
  created_at: Date;
}

export interface Flashcard {
  id: string;
  user_id: string;
  document_id: string | null;
  question: string;
  answer: string;
  created_at: Date;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: SourceChunk[];
}

export interface SourceChunk {
  document_id: string;
  document_title: string;
  chunk_text: string;
  score: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; username: string };
    }
  }
}
