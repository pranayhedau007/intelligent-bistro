import { Request, Response, NextFunction } from "express";

type MetricCounter = { [label: string]: number };
type MetricHistogram = { [label: string]: number[] };

const counters: MetricCounter = {};
const histograms: MetricHistogram = {};

function inc(name: string, labels: Record<string, string> = {}) {
  const key = formatKey(name, labels);
  counters[key] = (counters[key] ?? 0) + 1;
}

function observe(name: string, value: number, labels: Record<string, string> = {}) {
  const key = formatKey(name, labels);
  if (!histograms[key]) histograms[key] = [];
  histograms[key].push(value);
}

function formatKey(name: string, labels: Record<string, string>): string {
  const labelStr = Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(",");
  return labelStr ? `${name}{${labelStr}}` : name;
}

function p50(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.5)] ?? 0;
}

function p95(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.95)] ?? 0;
}

export const metrics = {
  httpRequestTotal: (method: string, route: string, status: number) =>
    inc("http_requests_total", { method, route, status: String(status) }),

  httpRequestDuration: (route: string, durationMs: number) =>
    observe("http_request_duration_ms", durationMs, { route }),

  chatRequestTotal: () => inc("chat_requests_total"),
  chatErrorTotal: () => inc("chat_errors_total"),
  chatDuration: (durationMs: number) => observe("chat_duration_ms", durationMs),
  ragRetrievalDuration: (durationMs: number) => observe("rag_retrieval_duration_ms", durationMs),

  itemAdded: (itemId: string, itemName: string) =>
    inc("items_added_total", { item_id: itemId, item_name: itemName }),

  itemRemoved: (itemId: string) =>
    inc("items_removed_total", { item_id: itemId }),

  cartCleared: () => inc("cart_cleared_total"),

  orderCompleted: (totalAmount: number) => {
    inc("orders_completed_total");
    observe("order_value_dollars", totalAmount);
  },
};

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const route = req.route?.path ?? req.path;
    metrics.httpRequestTotal(req.method, route, res.statusCode);
    metrics.httpRequestDuration(route, duration);
  });
  next();
}

export function renderMetrics(): string {
  const lines: string[] = [];

  // Counters
  lines.push("# HELP http_requests_total Total HTTP requests");
  lines.push("# TYPE http_requests_total counter");
  for (const [key, val] of Object.entries(counters)) {
    lines.push(`${key} ${val}`);
  }

  // Histograms — emit as proper summary format
  lines.push("\n# HELP http_request_duration_ms HTTP request duration ms");
  lines.push("# TYPE http_request_duration_ms summary");
  for (const [key, vals] of Object.entries(histograms)) {
    if (vals.length === 0) continue;
    const sum = vals.reduce((a, b) => a + b, 0);
    const count = vals.length;
    // Insert quantile label before closing brace
    const base = key.includes("{")
      ? key.slice(0, -1) + ","   // remove } and add comma
      : key + "{";               // no labels yet
    lines.push(`${base}quantile="0.5"} ${p50(vals)}`);
    lines.push(`${base}quantile="0.95"} ${p95(vals)}`);
    // Sum and count use separate metric names, no extra labels
    const nameOnly = key.split("{")[0];
    const labelPart = key.includes("{") ? "{" + key.split("{")[1] : "";
    lines.push(`${nameOnly}_sum${labelPart} ${sum}`);
    lines.push(`${nameOnly}_count${labelPart} ${count}`);
  }

  return lines.join("\n");
}
