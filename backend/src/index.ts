import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";

import menuRouter from "./routes/menu";
import chatRouter from "./routes/chat";
import cartRouter from "./routes/cart";
import { chatLimiter, apiLimiter } from "./middleware/rateLimiter";
import { metricsMiddleware, renderMetrics } from "./middleware/metrics";
import { initMenuService } from "./services/menuService";
import { ensureCollection, collectionCount } from "./rag/vectorStore";

const app = express();
const PORT = process.env.PORT ?? 3001;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(morgan("dev"));
app.use(metricsMiddleware);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/menu", apiLimiter, menuRouter);
app.use("/api/chat", chatLimiter, chatRouter);
app.use("/api/cart", apiLimiter, cartRouter);

// Prometheus scrape endpoint
app.get("/metrics", (_req, res) => {
  res.set("Content-Type", "text/plain");
  res.send(renderMetrics());
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Startup ──────────────────────────────────────────────────────────────────
async function bootstrap() {
  initMenuService();

  try {
    await ensureCollection();
    const count = await collectionCount();
    if (count === 0) {
      console.warn("⚠️  Qdrant empty — run `npm run ingest` to load vectors.");
    } else {
      console.log(`✅ Qdrant ready — ${count} vectors loaded`);
    }
  } catch {
    console.warn("⚠️  Qdrant unavailable — RAG degraded gracefully");
  }

  app.listen(PORT, () => {
    console.log(`\n🍽️  Intelligent Bistro backend on port ${PORT}`);
    console.log(`   Health:  http://localhost:${PORT}/health`);
    console.log(`   Metrics: http://localhost:${PORT}/metrics`);
    console.log(`   Menu:    http://localhost:${PORT}/api/menu\n`);
  });
}

bootstrap();
