import { Router, Request, Response } from "express";
import { z } from "zod";
import { processChat, CartItem } from "../services/claude";
import { retrieveRelevantItems } from "../rag/retriever";
import { metrics } from "../middleware/metrics";

const router = Router();

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(500),
  sessionId: z.string().uuid(),
  cart: z
    .array(
      z.object({
        itemId: z.string(),
        name: z.string(),
        quantity: z.number().int().positive(),
        unitPrice: z.number(),
      })
    )
    .default([]),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .max(20)
    .default([]),
});

router.post("/", async (req: Request, res: Response) => {
  const parsed = ChatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }

  const { message, cart, history } = parsed.data;
  const chatStart = Date.now();
  metrics.chatRequestTotal();

  try {
    // RAG retrieval with timing
    const ragStart = Date.now();
    const [retrievedIds] = await Promise.all([
      retrieveRelevantItems(message, 3),
    ]);
    metrics.ragRetrievalDuration(Date.now() - ragStart);

    // Claude call
    const response = await processChat(
      message,
      history,
      cart as CartItem[],
      retrievedIds
    );

    // Emit business metrics for each cart action
    for (const action of response.actions) {
      if (action.type === "ADD_ITEM") {
        metrics.itemAdded(action.itemId, action.resolvedName);
      } else if (action.type === "REMOVE_ITEM") {
        metrics.itemRemoved(action.itemId);
      } else if (action.type === "CLEAR_CART") {
        metrics.cartCleared();
      }
    }

    metrics.chatDuration(Date.now() - chatStart);

    res.json({
      ...response,
      retrievedItems: retrievedIds,
    });
  } catch (err) {
    metrics.chatErrorTotal();
    console.error("[Chat] Error:", err);
    res.status(500).json({
      error: "Something went wrong processing your request.",
      reply: "Sorry, I ran into an issue. Please try again!",
      actions: [],
      clarificationNeeded: false,
      suggestions: [],
    });
  }
});

export default router;
