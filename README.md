# 🍽️ Intelligent Bistro

An AI-powered restaurant ordering mobile app built with React Native (Expo) and Node.js. Customers browse a menu and manage their cart through a conversational AI interface — powered by Claude in tool-use mode with a hybrid RAG retrieval pipeline.

Built as a take-home challenge for the Viridien AI Full-Stack Engineering Internship.

📹 **[Watch the Demo on Loom](https://www.loom.com/share/f9eb9b12167b4dc79e3d38818904c0f4)**  
🐙 **[GitHub Repository](https://github.com/pranayhedau007/intelligent-bistro)**

---

## Demo

> "Add two spicy chicken sandwiches and a mango lassi" → cart updates instantly  
> "What's vegetarian and spicy?" → AI retrieves relevant dishes, upsell banner appears  
> "Make the chicken 3 instead of 2" → quantity updates in real time  
> "I'm done, place my order" → personalized order summary modal slides up  

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              React Native (Expo SDK 54)                  │
│  Menu Screen │ Cart Screen │ AI Chat Screen              │
│  Zustand Store │ React Query │ Expo Router               │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP (Axios)
┌──────────────────────▼──────────────────────────────────┐
│                  Node.js + Express                       │
│  GET /api/menu │ POST /api/chat │ POST /api/cart/sync    │
│  Rate limiting │ Morgan logging │ Prometheus metrics     │
└────────┬─────────────────────────────┬───────────────────┘
         │                             │
┌────────▼──────────┐    ┌────────────▼──────────────────┐
│   RAG Pipeline    │    │     Claude claude-sonnet-4-6   │
│  BM25 (okapibm25) │    │     Tool-use mode              │
│  Qdrant vectors   │    │     5 structured tools         │
│  RRF merge (k=60) │    │     Strict hallucination guard │
└───────────────────┘    └───────────────────────────────┘
         │
┌────────▼──────────────────────────────────────────────┐
│              Observability (Docker)                    │
│  Qdrant :6333 │ Prometheus :9090 │ Grafana :3002      │
└───────────────────────────────────────────────────────┘
```

---

## Features

### Core
- **Conversational AI ordering** — Claude parses natural language into structured cart actions via tool-use mode. No regex, no freetext parsing — guaranteed structured responses every time.
- **Hybrid RAG retrieval** — BM25 keyword search + Qdrant vector semantic search merged with Reciprocal Rank Fusion (k=60). Grounds Claude's context to only the most relevant dishes per query. Graceful BM25-only fallback if vector store is unavailable.
- **Reactive cart state** — Zustand store shared across all three screens. AI cart actions and manual UI interactions both dispatch to the same store with instant cross-screen updates.
- **Multi-turn conversation** — Full conversation history sent with each request so Claude can reference context like "the sandwich I added earlier."
- **Hallucination prevention** — System prompt enforces a strict allowlist of exact menu item names and IDs. Claude is instructed never to mention, suggest, or compare any dish not on the list — not in the reply text, not in suggestions. Validated by querying for off-menu items.

### Extra Features Built
- **Upsell banner** — After every AI reply, contextually relevant dishes appear in a horizontal scroll strip above the input. Resolved against live menu data — if Claude mentions a dish that doesn't exist, nothing renders, preventing any hallucinated item from appearing in the UI.
- **Order summary modal** — When the user says "I'm done" or "place my order", Claude calls a `complete_order` tool generating a warm personalized confirmation message with estimated prep time calculated from cart items. A bottom sheet slides up with the full itemized order, total, and a confirm button that clears the cart on placement.
- **Dual-audience observability dashboard** — Prometheus scrapes the Express `/metrics` endpoint every 5 seconds. Grafana auto-provisions two dashboard rows: owner panel (best selling items via AI, cart activity, total chat volume) and dev panel (API request rate, Claude p95 latency, RAG retrieval latency, HTTP status breakdown for debugging).
- **Voice ordering (architecture-ready)** — `expo-speech-recognition` integrated with full mic permission handling in `app.json`. Permissions are declared, the module is installed, and the architecture is wired. In a production EAS Build with a custom development client, this uses Apple's on-device `SFSpeechRecognizer` — zero latency, no API cost, fully private. Currently limited by Expo Go's sandboxed native module environment.
- **Worker threads** — Menu fuzzy matching offloaded to a `worker_threads` worker using Levenshtein distance, substring, and tag matching. Keeps the main event loop free during CPU-bound string similarity operations.
- **sessionId-based cart** — Client generates a UUID session ID on first load, sent as a header with every request. Server maintains per-session cart state for consistency across requests.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile frontend | React Native, Expo SDK 54, Expo Router (file-based navigation) |
| State management | Zustand |
| Data fetching | React Query (TanStack Query v5) with optimistic updates |
| HTTP client | Axios |
| Backend | Node.js 22, Express, TypeScript |
| AI | Anthropic SDK, Claude claude-sonnet-4-6, tool-use mode |
| Embeddings | OpenAI text-embedding-3-small (optional — BM25-only mode available) |
| Vector store | Qdrant |
| Keyword search | okapibm25 (Okapi BM25) |
| Validation | Zod |
| Observability | Prometheus (hand-rolled exposition), Grafana (auto-provisioned) |
| Containerization | Docker Compose (Qdrant + Prometheus + Grafana) |

---

## Project Structure

```
intelligent-bistro/
├── frontend/
│   ├── app/
│   │   ├── _layout.tsx              # Root layout, QueryClientProvider, StatusBar
│   │   ├── index.tsx                # Redirects to /(tabs)/menu
│   │   └── (tabs)/
│   │       ├── _layout.tsx          # Tab bar with live cart badge
│   │       ├── menu.tsx             # Menu browsing — cards, tags, spice indicators
│   │       ├── cart.tsx             # Cart — quantity stepper, totals, place order
│   │       └── chat.tsx             # AI chat — bubbles, upsell banner, order modal
│   ├── components/
│   │   ├── UpsellBanner.tsx         # Horizontal suggestion strip, tap-to-add
│   │   └── OrderSummaryModal.tsx    # Bottom sheet order confirmation modal
│   ├── store/
│   │   └── useCartStore.ts          # Zustand cart store (add, remove, setQty, clear)
│   └── lib/
│       └── api.ts                   # Axios client, typed API functions, CartAction types
│
└── backend/
    ├── src/
    │   ├── index.ts                 # Express bootstrap, middleware wiring, startup checks
    │   ├── data/
    │   │   └── menu.json            # 12-item menu corpus with tags, allergens, pairings
    │   ├── rag/
    │   │   ├── embedder.ts          # OpenAI text-embedding-3-small, menuItemToText()
    │   │   ├── bm25Index.ts         # In-memory BM25 singleton, tokenizer
    │   │   ├── vectorStore.ts       # Qdrant client wrapper, upsert + search
    │   │   ├── retriever.ts         # Hybrid search + RRF merge, graceful fallback
    │   │   └── ingest.ts            # One-time menu embedding + Qdrant ingestion script
    │   ├── services/
    │   │   ├── claude.ts            # Tool definitions, system prompt builder, processChat()
    │   │   └── menuService.ts       # Menu loading, BM25 init at startup
    │   ├── routes/
    │   │   ├── menu.ts              # GET /api/menu, /categories, /category/:name
    │   │   ├── chat.ts              # POST /api/chat — RAG → Claude → metrics
    │   │   └── cart.ts              # POST /api/cart/sync, GET /api/cart/:sessionId
    │   ├── middleware/
    │   │   ├── rateLimiter.ts       # express-rate-limit (30/min chat, 100/min API)
    │   │   └── metrics.ts           # Prometheus exposition, business + perf counters
    │   └── workers/
    │       └── menuFuzzyWorker.ts   # worker_threads fuzzy name resolver
    ├── grafana/
    │   └── provisioning/            # Auto-provisioned datasource + bistro dashboard
    ├── docker-compose.yml           # Qdrant + Prometheus + Grafana
    └── prometheus.yml               # Scrape config (5s interval, host.docker.internal)
```

---

## Getting Started

### Prerequisites

- Node.js 22+
- Docker Desktop
- Expo Go app on your iPhone or Android device
- Anthropic API key — required ([console.anthropic.com](https://console.anthropic.com))
- OpenAI API key — optional, enables full hybrid RAG ([platform.openai.com](https://platform.openai.com))

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

# Start Docker services (Qdrant + Prometheus + Grafana)
docker-compose up -d

# Optional: ingest menu into Qdrant for full hybrid RAG
# Requires OPENAI_API_KEY in .env
npm run ingest

# Start backend
npm run dev
# → Running on http://localhost:3001
# → Metrics at http://localhost:3001/metrics
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Configure environment
cp .env.example .env

# Find your Mac's local IP
ipconfig getifaddr en0

# Set it in .env
echo "EXPO_PUBLIC_API_URL=http://YOUR_IP:3001" > .env

# Start Expo
npx expo start --clear
```

Scan the QR code with your iPhone camera → tap the Expo Go notification → app opens on device.

> Note: Use your Mac's local IP address (not localhost) — the phone and Mac must be on the same WiFi network.

### Observability Stack

| Service | URL | Credentials |
|---|---|---|
| Grafana | http://localhost:3002 | admin / bistro123 |
| Prometheus | http://localhost:9090 | — |
| Qdrant Dashboard | http://localhost:6333/dashboard | — |

The Grafana dashboard auto-provisions on first startup. Send a few chat messages to generate data, then open the Intelligent Bistro dashboard under Dashboards → Browse.

---

## API Reference

### POST /api/chat

Request:
```json
{
  "message": "Add two spicy chicken sandwiches and a mango lassi",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "cart": [],
  "history": []
}
```

Response:
```json
{
  "reply": "Done! Added 2 Spicy Chicken Sandwiches and 1 Mango Lassi. Great combo!",
  "actions": [
    { "type": "ADD_ITEM", "itemId": "spicy-chicken-sandwich", "quantity": 2, "resolvedName": "Spicy Chicken Sandwich" },
    { "type": "ADD_ITEM", "itemId": "mango-lassi", "quantity": 1, "resolvedName": "Mango Lassi" }
  ],
  "clarificationNeeded": false,
  "suggestions": ["truffle-fries"],
  "retrievedItems": ["spicy-chicken-sandwich", "house-lemonade", "mango-lassi"]
}
```

### Claude Tools

| Tool | Trigger | Description |
|---|---|---|
| `add_item` | "Add...", "I want...", "Get me..." | Add a menu item with resolved name and quantity |
| `remove_item` | "Remove...", "Cancel...", "Don't want..." | Remove an item from cart entirely |
| `set_quantity` | "Make it 3", "Change to...", "Actually 2" | Update quantity of existing cart item |
| `clear_cart` | "Clear cart", "Start over", "Remove everything" | Empty the cart |
| `complete_order` | "I'm done", "Place my order", "That's all" | Generate confirmation + estimated prep time |

---

## RAG Pipeline

```
User message
     │
     ├──► BM25 search       (always runs — in-memory, no external deps)
     │
     ├──► embed query ──► Qdrant vector search   (runs if OpenAI key present)
     │
     └──► RRF merge (k=60) ──► top-3 item IDs
                    │
                    ▼
       Inject as MENU CONTEXT into Claude system prompt
       (cart items always included regardless of retrieval)
                    │
                    ▼
       Claude reasons over retrieved context only
       Full item name list sent separately as hallucination guardrail
```

---

## Challenges & Solutions

| Challenge | Solution |
|---|---|
| `okapibm25` unexpected export structure — `BM25 is not a function` | Inspected actual exports with `node -e "console.log(Object.keys(require(...)))"`, found `default` key, updated require statement |
| Claude model `claude-sonnet-4-20250514` returning 404 | Queried `/v1/models` endpoint directly to list available models, switched to `claude-sonnet-4-6` |
| `expo-speech-recognition` crashing with "Cannot find native module" | Identified Expo Go sandbox limitation — native modules require a custom dev build via EAS. Documented production path, used iOS keyboard dictation for demo |
| React 19 / react-dom peer dependency conflicts across Expo SDK versions | Pinned compatible versions (Expo 54, React 19.1, RN 0.81.5), used `--legacy-peer-deps` throughout |
| Prometheus scrape error — metric name malformed during exposition | Fixed `_sum` and `_count` suffix injection logic in hand-rolled exposition renderer |
| `Promise.all` discarding BM25 results when OpenAI embedding fails | Moved BM25 search outside `Promise.all` so it always completes independently — vector search failure no longer discards keyword results |
| Claude hallucinating off-menu dishes in reply text and upsell suggestions | Added strict system prompt allowlist — Claude may only mention dishes by exact name from the full item list. Validated by querying for non-existent dishes |
| `node_modules` accidentally committed to git — push failing with HTTP 400 | Used `git checkout --orphan` to create a clean branch with no history, staged only source files, force pushed |

---

## What I Would Add in Production

- **JWT authentication** — replace UUID session IDs with signed tokens for proper user identity
- **EAS Build** — custom development client to enable native `expo-speech-recognition` voice ordering fully on-device
- **Redis** — replace in-memory cart and session store for horizontal scaling
- **Streaming responses** — pipe Claude's SSE stream directly to the client for token-by-token reply rendering
- **Order persistence** — PostgreSQL for order history, itemized receipts via email
- **Dish images** — photo assets per menu item via Cloudinary CDN
- **Push notifications** — "your order is ready" alerts via Expo Notifications

---

## Author

**Pranay Hedau**  
MS Computer Science, UC Irvine · GPA 3.8 · Graduating December 2026  
4 years production backend engineering at Barclays (Java, Spring Boot, Kafka, AWS)  

[GitHub](https://github.com/pranayhedau007/intelligent-bistro) · [LinkedIn](https://www.linkedin.com/in/pranay-hedau/) · [Loom Demo](https://www.loom.com/share/f9eb9b12167b4dc79e3d38818904c0f4)
