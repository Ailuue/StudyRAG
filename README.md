# StudyRAG

An AI study companion that turns your own notes and textbooks into an interactive knowledge base. Upload PDFs or paste content, then ask questions, generate flashcards, and take quizzes — all grounded in your material, not generic AI.

![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue) ![React](https://img.shields.io/badge/React-18-61dafb) ![Node.js](https://img.shields.io/badge/Node.js-20-green) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue) ![Pinecone](https://img.shields.io/badge/Pinecone-Vector_DB-purple) ![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o_mini-black)

## Features

- **Upload & process** — PDF files or pasted text are chunked and embedded into a personal vector store
- **Ask questions** — RAG-powered chat retrieves relevant chunks from your notes and answers with source citations
- **Flashcards** — AI generates question/answer cards from any document; flip to review
- **Quizzes** — Multiple-choice questions generated from your material, with explanations and a scored results screen
- **Per-user isolation** — Each user's knowledge base is fully isolated; vector queries are filtered by user ID

## Architecture

```
┌─────────────────┐     ┌──────────────────────────────────────┐
│   React + TS    │────▶│  Express API (Node.js + TypeScript)  │
│   (Vite)        │     │                                      │
│                 │     │  /api/auth        JWT auth           │
│  Dashboard      │     │  /api/documents   upload + process   │
│  Chat           │     │  /api/query       RAG query          │
│  Upload         │     │  /api/flashcards  generate + list    │
│  Flashcards     │     │  /api/quiz        generate quiz      │
│  Quiz           │     └──────────┬───────────────┬───────────┘
└─────────────────┘                │               │
                                   ▼               ▼
                            ┌────────────┐  ┌───────────────┐
                            │ PostgreSQL │  │   Pinecone    │
                            │           │  │               │
                            │ users     │  │ per-user vec  │
                            │ documents │  │ tor chunks    │
                            │ flashcards│  │ (metadata     │
                            └────────────┘  │  filter)      │
                                           └───────────────┘
```

**RAG pipeline:**

1. User uploads a PDF or pastes text
2. Backend extracts text, splits into 500-word chunks (50-word overlap)
3. Each chunk is embedded via `text-embedding-3-small` and upserted to Pinecone with `user_id` metadata
4. On query, the question is embedded, top-5 chunks are retrieved (filtered to that user), and passed as numbered context to `gpt-4o-mini`
5. The model answers with inline source citations

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router |
| Backend | Node.js 20, Express, TypeScript, Zod |
| Database | PostgreSQL 16 (users, documents, flashcards) |
| Vector store | Pinecone (free tier, metadata-filtered per user) |
| Embeddings | OpenAI `text-embedding-3-small` |
| LLM | OpenAI `gpt-4o-mini` |
| Auth | JWT + bcrypt |
| File parsing | pdf-parse, multer |
| Deploy | Vercel (frontend), Railway (backend + Postgres) |
| CI/CD | GitHub Actions |

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (for local Postgres) or a Postgres 16 connection string
- [OpenAI API key](https://platform.openai.com/api-keys)
- [Pinecone account](https://www.pinecone.io/) — create a free index named `studyrag` with **1536 dimensions** and cosine metric

### Local setup

**1. Clone and install dependencies**

```bash
git clone https://github.com/your-username/studyrag.git
cd studyrag

cd backend && npm install
cd ../frontend && npm install
```

**2. Configure environment variables**

```bash
cp backend/.env.example backend/.env
```

Fill in `backend/.env`:

```env
DATABASE_URL=postgresql://studyrag:studyrag@localhost:5432/studyrag
JWT_SECRET=your-long-random-secret
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=studyrag
```

**3. Start Postgres and run the schema**

```bash
docker compose up -d
cd backend && npm run db:migrate
```

**4. Start both servers**

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Frontend: [http://localhost:5173](http://localhost:5173)  
Backend: [http://localhost:3001](http://localhost:3001)

## Project Structure

```
studyrag/
├── backend/
│   └── src/
│       ├── index.ts            # Express app entry point
│       ├── db/
│       │   ├── client.ts       # pg connection pool
│       │   └── schema.sql      # table definitions
│       ├── middleware/
│       │   ├── auth.ts         # JWT guard
│       │   └── upload.ts       # multer config (PDF + text, 20 MB limit)
│       ├── routes/
│       │   ├── auth.ts         # register / login / me
│       │   ├── documents.ts    # upload, text paste, list, delete
│       │   ├── query.ts        # RAG question answering
│       │   ├── flashcards.ts   # generate + CRUD
│       │   └── quiz.ts         # generate multiple-choice quiz
│       ├── services/
│       │   ├── chunker.ts      # word-based chunking with overlap
│       │   ├── pdfParser.ts    # pdf-parse wrapper
│       │   ├── embeddings.ts   # OpenAI embeddings
│       │   ├── pinecone.ts     # upsert / query / delete
│       │   └── rag.ts          # answer, flashcard, and quiz generation
│       └── types/index.ts
└── frontend/
    └── src/
        ├── App.tsx             # routing
        ├── lib/
        │   ├── api.ts          # axios instance with JWT interceptor
        │   └── auth.ts         # localStorage token helpers
        ├── pages/
        │   ├── Login.tsx
        │   ├── Register.tsx
        │   ├── Dashboard.tsx   # document list + quick-action cards
        │   ├── Upload.tsx      # PDF drop zone + text paste modes
        │   ├── Chat.tsx        # chat UI with source citations
        │   ├── Flashcards.tsx  # generate + flip-card review
        │   └── Quiz.tsx        # multi-step quiz with results
        └── components/
            ├── Layout.tsx      # nav header + page wrapper
            └── ProtectedRoute.tsx
```

## Deployment

### Frontend → Vercel

1. Import the repo in Vercel, set **root directory** to `frontend`
2. Build command: `npm run build` — output: `dist`
3. Add env var: `VITE_API_URL` if you move away from the Vite proxy (update `api.ts` accordingly)

### Backend → Railway

1. Create a new Railway project, connect the repo, set **root directory** to `backend`
2. Add a PostgreSQL plugin — Railway injects `DATABASE_URL` automatically
3. Add remaining env vars from `.env.example` in the Railway dashboard
4. Deploy command: `npm run build && npm start`
5. Run the schema migration once: `npm run db:migrate`

### Pinecone index setup

Create an index with:
- **Dimensions:** 1536 (matches `text-embedding-3-small`)
- **Metric:** Cosine
- **Name:** matches `PINECONE_INDEX_NAME` in your env

## API Reference

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Get JWT |
| GET | `/api/documents` | JWT | List user's documents |
| POST | `/api/documents/upload` | JWT | Upload PDF (multipart) |
| POST | `/api/documents/text` | JWT | Paste text content |
| DELETE | `/api/documents/:id` | JWT | Delete document + vectors |
| POST | `/api/query` | JWT | RAG question answering |
| GET | `/api/flashcards` | JWT | List saved flashcards |
| POST | `/api/flashcards/generate` | JWT | Generate flashcards from document |
| DELETE | `/api/flashcards/:id` | JWT | Delete flashcard |
| POST | `/api/quiz/generate` | JWT | Generate a multiple-choice quiz |

## License

MIT
