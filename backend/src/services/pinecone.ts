import { Pinecone } from "@pinecone-database/pinecone";

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

function getIndex() {
  return pinecone.index(process.env.PINECONE_INDEX_NAME!);
}

export interface ChunkRecord {
  id: string;
  values: number[];
  metadata: {
    user_id: string;
    document_id: string;
    document_title: string;
    chunk_text: string;
    chunk_index: number;
  };
}

export async function upsertChunks(chunks: ChunkRecord[]): Promise<void> {
  const index = getIndex();
  await index.upsert(chunks);
}

export async function queryChunks(
  embedding: number[],
  userId: string,
  topK = 5
) {
  const index = getIndex();
  const result = await index.query({
    vector: embedding,
    topK,
    filter: { user_id: userId },
    includeMetadata: true,
  });
  return result.matches ?? [];
}

export async function deleteDocumentChunks(
  documentId: string
): Promise<void> {
  const index = getIndex();
  await index.deleteMany({ document_id: documentId });
}
