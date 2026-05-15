import { QdrantClient } from "@qdrant/js-client-rest";
import { EMBEDDING_DIM } from "./embedder";

const COLLECTION = process.env.QDRANT_COLLECTION ?? "bistro_menu";

export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL ?? "http://localhost:6333",
});

export interface VectorSearchResult {
  id: string;
  score: number;
}

/**
 * Create the Qdrant collection if it doesn't already exist.
 */
export async function ensureCollection(): Promise<void> {
  try {
    await qdrant.getCollection(COLLECTION);
    console.log(`[Qdrant] Collection "${COLLECTION}" already exists`);
  } catch {
    await qdrant.createCollection(COLLECTION, {
      vectors: {
        size: EMBEDDING_DIM,
        distance: "Cosine",
      },
    });
    console.log(`[Qdrant] Created collection "${COLLECTION}"`);
  }
}

/**
 * Upsert a batch of menu item vectors into Qdrant.
 * Each point stores the item_id in its payload for easy retrieval.
 */
export async function upsertVectors(
  items: Array<{ id: string; vector: number[]; payload: Record<string, unknown> }>
): Promise<void> {
  await qdrant.upsert(COLLECTION, {
    wait: true,
    points: items.map((item, idx) => ({
      id: idx + 1, // Qdrant requires integer or UUID ids
      vector: item.vector,
      payload: { item_id: item.id, ...item.payload },
    })),
  });
  console.log(`[Qdrant] Upserted ${items.length} vectors`);
}

/**
 * Semantic search — returns top-K item IDs with cosine similarity scores.
 */
export async function vectorSearch(
  queryVector: number[],
  topK = 5
): Promise<VectorSearchResult[]> {
  const results = await qdrant.search(COLLECTION, {
    vector: queryVector,
    limit: topK,
    with_payload: true,
  });

  return results.map((r) => ({
    id: r.payload?.item_id as string,
    score: r.score,
  }));
}

/**
 * Check if the collection has any vectors.
 */
export async function collectionCount(): Promise<number> {
  const info = await qdrant.getCollection(COLLECTION);
  return info.points_count ?? 0;
}