/**
 * One-time ingestion script: embeds all menu items and loads into Qdrant.
 * Run with: npm run ingest
 *
 * Safe to re-run — upsert is idempotent.
 */
import "dotenv/config";
import menuData from "../data/menu.json";
import { menuItemToText, embedBatch } from "./embedder";
import { ensureCollection, upsertVectors } from "./vectorStore";
import { bm25Index } from "./bm25Index";

async function ingest() {
  console.log("🍽️  Starting menu ingestion...\n");

  const items = menuData.items;

  // 1. Build text representations
  const texts = items.map((item) => menuItemToText(item));
  console.log(`[Ingest] Built ${texts.length} text documents`);

  // 2. Embed all items in one batched call
  console.log("[Ingest] Embedding with text-embedding-3-small...");
  const vectors = await embedBatch(texts);
  console.log(`[Ingest] Got ${vectors.length} embeddings`);

  // 3. Ensure Qdrant collection exists
  await ensureCollection();

  // 4. Upsert vectors into Qdrant
  await upsertVectors(
    items.map((item, idx) => ({
      id: item.id,
      vector: vectors[idx],
      payload: {
        name: item.name,
        category: item.category,
        price: item.price,
        tags: item.tags,
      },
    }))
  );

  // 5. Build BM25 index (just to verify it works — at runtime it rebuilds from menu.json)
  bm25Index.build(
    items.map((item, idx) => ({ id: item.id, text: texts[idx] }))
  );
  console.log(`[Ingest] BM25 index built with ${bm25Index.size} docs`);

  console.log("\n✅ Ingestion complete! Qdrant + BM25 ready.");
  process.exit(0);
}

ingest().catch((err) => {
  console.error("❌ Ingestion failed:", err);
  process.exit(1);
});