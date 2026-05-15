import { embedText } from "./embedder";
import { bm25Index } from "./bm25Index";
import { vectorSearch } from "./vectorStore";

export interface RetrievedItem {
  id: string;
  rrfScore: number;
}

/**
 * Reciprocal Rank Fusion — merges two ranked lists into one.
 * k=60 is the standard constant that dampens top-rank dominance.
 * Same formula used in TechDocs QA Engine.
 */
function rrfMerge(
  vectorResults: Array<{ id: string; score: number }>,
  bm25Results: Array<{ id: string; score: number }>,
  k = 60
): RetrievedItem[] {
  const scores: Map<string, number> = new Map();

  const addScores = (results: Array<{ id: string }>) => {
    results.forEach((r, rank) => {
      const current = scores.get(r.id) ?? 0;
      scores.set(r.id, current + 1 / (k + rank + 1));
    });
  };

  addScores(vectorResults);
  addScores(bm25Results);

  return Array.from(scores.entries())
    .map(([id, rrfScore]) => ({ id, rrfScore }))
    .sort((a, b) => b.rrfScore - a.rrfScore);
}

/**
 * Main retrieval function.
 *
 * Runs vector search and BM25 search in parallel (Promise.all),
 * then merges with RRF and returns the top-K item IDs.
 *
 * This is the pre-retrieval context injection point —
 * called before every Claude request to ground the system prompt.
 */
export async function retrieveRelevantItems(
  query: string,
  topK = 3
): Promise<string[]> {
  // BM25 always runs first — no external dependency
  const bm25Results = bm25Index.search(query, 8);

  try {
    const queryVector = await embedText(query);
    const vectorResults = await vectorSearch(queryVector, 8);
    const merged = rrfMerge(vectorResults, bm25Results);
    const topIds = merged.slice(0, topK).map((r) => r.id);
    console.log(`[RAG] Hybrid query: "${query}" → [${topIds.join(", ")}]`);
    return topIds;
  } catch {
    // OpenAI or Qdrant unavailable — BM25 results still valid
    console.warn("[RAG] Vector search unavailable, using BM25 only");
    const topIds = bm25Results.slice(0, topK).map((r) => r.id);
    console.log(`[RAG] BM25 only query: "${query}" → [${topIds.join(", ")}]`);
    return topIds;
  }
}