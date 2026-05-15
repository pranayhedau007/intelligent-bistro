import { Router, Request, Response } from "express";
import { z } from "zod";

const router = Router();

// In-memory cart store keyed by sessionId
// In production: replace with Redis
const cartStore = new Map<string, CartItem[]>();

type CartItem = {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

const CartSyncSchema = z.object({
  sessionId: z.string().uuid(),
  cart: z.array(
    z.object({
      itemId: z.string(),
      name: z.string(),
      quantity: z.number().int().min(0),
      unitPrice: z.number().positive(),
    })
  ),
});

// POST /api/cart/sync — sync client cart to server
router.post("/sync", (req: Request, res: Response) => {
  const parsed = CartSyncSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid cart data" });
    return;
  }

  const { sessionId, cart } = parsed.data;
  // Filter out zero-quantity items server-side
  const cleaned = cart.filter((item) => item.quantity > 0);
  cartStore.set(sessionId, cleaned as CartItem[]);

  const total = cleaned.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  res.json({
    synced: true,
    itemCount: cleaned.length,
    total: parseFloat(total.toFixed(2)),
  });
});

// GET /api/cart/:sessionId — retrieve server cart state
router.get("/:sessionId", (req: Request, res: Response) => {
  const cart = cartStore.get(req.params.sessionId) ?? [];
  const total = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  res.json({
    cart,
    itemCount: cart.length,
    total: parseFloat(total.toFixed(2)),
  });
});

export default router;