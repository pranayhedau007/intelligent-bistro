import { workerData, parentPort, MessagePort } from "worker_threads";

type MenuItemRef = { id: string; name: string; tags: string[] };

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: b.length + 1 }, (_, i) =>
    Array.from({ length: a.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b[i - 1] === a[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

function fuzzyMatch(
  query: string,
  items: MenuItemRef[]
): { itemId: string; score: number; name: string } | null {
  const q = query.toLowerCase().trim();
  let best: { itemId: string; score: number; name: string } | null = null;
  let bestDist = Infinity;

  for (const item of items) {
    const name = item.name.toLowerCase();
    if (name === q || item.id === q) return { itemId: item.id, score: 1.0, name: item.name };
    if (name.includes(q) || q.includes(name)) {
      const score = Math.min(name.length, q.length) / Math.max(name.length, q.length);
      if (score > (best?.score ?? 0)) best = { itemId: item.id, score, name: item.name };
      continue;
    }
    for (const tag of item.tags) {
      if (q.includes(tag) || tag.includes(q)) {
        best = { itemId: item.id, score: 0.7, name: item.name };
        break;
      }
    }
    const dist = levenshtein(q, name);
    const score = 1 - dist / Math.max(q.length, name.length);
    if (dist < bestDist && score > 0.4) {
      bestDist = dist;
      best = { itemId: item.id, score, name: item.name };
    }
  }
  return best;
}

const port = parentPort as MessagePort | null;

if (port) {
  port.on("message", ({ query, items }: { query: string; items: MenuItemRef[] }) => {
    port.postMessage(fuzzyMatch(query, items));
  });
} else if (workerData) {
  const result = fuzzyMatch(workerData.query, workerData.items);
  (parentPort as MessagePort).postMessage(result);
}