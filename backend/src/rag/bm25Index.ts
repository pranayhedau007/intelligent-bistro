const { default: BM25 } = require("okapibm25") as { default: (docs: string[], query: string[]) => number[] };

export interface BM25Doc {
  id: string;
  text: string;
}

export interface BM25Result {
  id: string;
  score: number;
}

export class MenuBM25Index {
  private docs: BM25Doc[] = [];

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1);
  }

  build(docs: BM25Doc[]): void {
    this.docs = docs;
  }

  search(query: string, topK = 5): BM25Result[] {
    if (this.docs.length === 0) {
      console.warn("[BM25] Index not built yet");
      return [];
    }
    // okapibm25 takes raw strings + keyword array
    const rawDocs = this.docs.map((d) => d.text);
    const keywords = this.tokenize(query);
    const scores = BM25(rawDocs, keywords);
    return scores
      .map((score, idx) => ({ id: this.docs[idx].id, score }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  get size(): number {
    return this.docs.length;
  }
}

export const bm25Index = new MenuBM25Index();
