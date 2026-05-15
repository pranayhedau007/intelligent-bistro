import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIM = 1536;

export { EMBEDDING_DIM };

/**
 * Build a rich text representation of a menu item for embedding.
 * The more descriptive the string, the better semantic retrieval works.
 */
export function menuItemToText(item: {
  name: string;
  category: string;
  description: string;
  tags: string[];
  allergens: string[];
  spiceLevel: number;
  price: number;
  calories: number;
}): string {
  const spiceLabel =
    item.spiceLevel === 0
      ? "not spicy"
      : item.spiceLevel <= 2
      ? "mildly spicy"
      : item.spiceLevel <= 3
      ? "moderately spicy"
      : "very spicy";

  const allergenText =
    item.allergens.length > 0
      ? `Contains: ${item.allergens.join(", ")}.`
      : "No major allergens.";

  return [
    `${item.name} — ${item.category}.`,
    item.description,
    `Tags: ${item.tags.join(", ")}.`,
    `Spice level: ${spiceLabel}.`,
    allergenText,
    `Price: $${item.price}. Calories: ${item.calories}.`,
  ].join(" ");
}

/**
 * Embed a single text string.
 */
export async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Embed multiple texts in parallel (batched to respect rate limits).
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const BATCH_SIZE = 20;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });
    // Preserve order — OpenAI returns embeddings in the same order as input
    const sorted = response.data.sort((a, b) => a.index - b.index);
    results.push(...sorted.map((d) => d.embedding));
  }

  return results;
}