import menuData from "../data/menu.json";
import { bm25Index } from "../rag/bm25Index";
import { menuItemToText } from "../rag/embedder";

export type MenuItem = (typeof menuData.items)[number];

// ─── In-memory menu store ─────────────────────────────────────────────────────

const itemMap = new Map<string, MenuItem>(
  menuData.items.map((item) => [item.id, item])
);

/**
 * Called once at server startup.
 * Builds the BM25 index from menu.json so it's ready for hybrid search.
 */
export function initMenuService(): void {
  const docs = menuData.items.map((item) => ({
    id: item.id,
    text: menuItemToText(item),
  }));
  bm25Index.build(docs);
  console.log(`[MenuService] Initialized — ${docs.length} items indexed in BM25`);
}

export function getAllItems(): MenuItem[] {
  return menuData.items;
}

export function getItemById(id: string): MenuItem | undefined {
  return itemMap.get(id);
}

export function getItemsByCategory(category: string): MenuItem[] {
  return menuData.items.filter(
    (item) => item.category.toLowerCase() === category.toLowerCase()
  );
}

export function getCategories(): string[] {
  return menuData.categories;
}

export function getRestaurantInfo() {
  return menuData.restaurant;
}

/**
 * Resolve a set of item IDs to full MenuItem objects.
 * Used after RAG retrieval to get the full context for the system prompt.
 */
export function resolveItems(ids: string[]): MenuItem[] {
  return ids.flatMap((id) => {
    const item = itemMap.get(id);
    return item ? [item] : [];
  });
}