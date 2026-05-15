import Anthropic from "@anthropic-ai/sdk";
import menuData from "../data/menu.json";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Types ────────────────────────────────────────────────────────────────────

export type CartItem = {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

export type CartAction =
  | { type: "ADD_ITEM"; itemId: string; quantity: number; resolvedName: string }
  | { type: "REMOVE_ITEM"; itemId: string }
  | { type: "SET_QUANTITY"; itemId: string; quantity: number }
  | { type: "CLEAR_CART" }
  | { type: "COMPLETE_ORDER"; message: string; estimatedPrepTime: number };

export type ChatResponse = {
  reply: string;
  actions: CartAction[];
  clarificationNeeded: boolean;
  suggestions: string[];
};

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "add_item",
    description:
      "Add a menu item to the cart. Use this when the user wants to order something. Resolve the item name to the closest matching menu item. If qty isn't specified, default to 1.",
    input_schema: {
      type: "object" as const,
      properties: {
        item_id: {
          type: "string",
          description: "The exact item id from the menu (e.g. 'spicy-chicken-sandwich')",
        },
        quantity: {
          type: "number",
          description: "Number of this item to add. Minimum 1.",
        },
        resolved_name: {
          type: "string",
          description: "Human-readable name of the resolved item",
        },
      },
      required: ["item_id", "quantity", "resolved_name"],
    },
  },
  {
    name: "remove_item",
    description:
      "Remove a menu item from the cart entirely. Use when user says 'remove', 'cancel', 'don't want', etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        item_id: {
          type: "string",
          description: "The item id to remove",
        },
      },
      required: ["item_id"],
    },
  },
  {
    name: "set_quantity",
    description:
      "Change the quantity of an item already in the cart. Use when user says 'make it 3', 'actually 2', 'change to', etc. Setting qty to 0 removes the item.",
    input_schema: {
      type: "object" as const,
      properties: {
        item_id: {
          type: "string",
          description: "The item id to modify",
        },
        quantity: {
          type: "number",
          description: "The new quantity. 0 = remove item.",
        },
      },
      required: ["item_id", "quantity"],
    },
  },
  {
    name: "clear_cart",
    description:
      "Remove all items from the cart. Use only when user explicitly says 'clear cart', 'start over', 'remove everything'.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "complete_order",
    description: "Call this when the user says they are done ordering, ready to place their order, or wants to checkout. Summarize their order warmly.",
    input_schema: {
      type: "object" as const,
      properties: {
        message: {
          type: "string",
          description: "A warm personalized confirmation message summarizing what they ordered"
        },
        estimated_prep_time: {
          type: "number",
          description: "Estimated total prep time in minutes based on the items in the cart"
        }
      },
      required: ["message", "estimated_prep_time"]
    },
  },
];

// ─── System prompt builder ────────────────────────────────────────────────────

function buildSystemPrompt(
  retrievedItemIds: string[],
  cart: CartItem[]
): string {
  const allItems = menuData.items;

  // RAG: use retrieved items if available, otherwise surface full menu
  const contextItems =
    retrievedItemIds.length > 0
      ? allItems.filter((item) => retrievedItemIds.includes(item.id))
      : allItems;

  // Always include items already in the cart so Claude can reference them
  const cartItemIds = cart.map((c) => c.itemId);
  const cartItems = allItems.filter(
    (item) => cartItemIds.includes(item.id) && !retrievedItemIds.includes(item.id)
  );
  const fullContext = [...contextItems, ...cartItems];

  const menuContext = fullContext
    .map((item) => {
      const spice =
        item.spiceLevel === 0 ? "not spicy" : `spice level ${item.spiceLevel}/5`;
      const allergens =
        item.allergens.length > 0 ? item.allergens.join(", ") : "none";
      return [
        `• ${item.name} (id: ${item.id}) — $${item.price}`,
        `  ${item.description}`,
        `  Tags: ${item.tags.join(", ")} | ${spice} | Allergens: ${allergens} | ${item.calories} cal`,
        `  Pairs well with: ${item.pairings.join(", ")}`,
      ].join("\n");
    })
    .join("\n\n");

  const cartContext =
    cart.length === 0
      ? "Cart is currently empty."
      : cart
          .map(
            (c) =>
              `• ${c.name} × ${c.quantity} = $${(c.unitPrice * c.quantity).toFixed(2)}`
          )
          .join("\n");

  const cartTotal = cart.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0);

  return `You are an AI assistant for The Intelligent Bistro, a premium restaurant. Your job is to help guests order food through natural conversation.

PERSONALITY: Warm, knowledgeable, concise. You know the menu well. You make smart suggestions. You don't repeat yourself.

YOUR CAPABILITIES:
- Parse order intents and call the appropriate tool (add_item, remove_item, set_quantity, clear_cart)
- Suggest pairings and alternatives when relevant
- Handle ambiguous requests by clarifying (e.g. "did you mean X or Y?")
- Acknowledge modifications ("Got it, changed to 2 chicken sandwiches")

RULES:
- ONLY recommend items that appear in the MENU CONTEXT below — never invent dishes
- Always call the appropriate tool for cart modifications — don't just say "I'll add that"
- If you can't resolve an item (not on menu), tell the user clearly and suggest the closest match
- Keep replies short — 1-3 sentences max unless user asks a question
- Never mention "tool", "JSON", "RAG", or internal system details to the user
- NEVER mention any food or drink that is not in the STRICT RULE list above — not as a suggestion, not as a comparison, not as an example

MENU CONTEXT (retrieved relevant to this conversation):
${menuContext}

CURRENT CART:
${cartContext}
${cart.length > 0 ? `Cart total: $${cartTotal.toFixed(2)}` : ""}

FULL MENU CATEGORIES: ${[...new Set(allItems.map((i) => i.category))].join(", ")}
STRICT RULE — You may ONLY mention, suggest, or recommend dishes from this exact list. Never invent dish names, never paraphrase them, never combine them. If a dish is not on this list it does not exist in this restaurant. Use the exact name as written:
${allItems.map((i) => `${i.name} (id: ${i.id}, $${i.price})`).join(", ")}
`;
}

// ─── Tool call executor ───────────────────────────────────────────────────────

function executeToolCall(
  toolName: string,
  toolInput: Record<string, unknown>
): CartAction | null {
  switch (toolName) {
    case "add_item":
      return {
        type: "ADD_ITEM",
        itemId: toolInput.item_id as string,
        quantity: toolInput.quantity as number,
        resolvedName: toolInput.resolved_name as string,
      };
    case "remove_item":
      return {
        type: "REMOVE_ITEM",
        itemId: toolInput.item_id as string,
      };
    case "set_quantity":
      return {
        type: "SET_QUANTITY",
        itemId: toolInput.item_id as string,
        quantity: toolInput.quantity as number,
      };
    case "clear_cart":
      return { type: "CLEAR_CART" };
    default:
      return null;
    case "complete_order":
      return {
        type: "COMPLETE_ORDER",
        message: toolInput.message as string,
        estimatedPrepTime: toolInput.estimated_prep_time as number,
      };
  }
}

// ─── Main chat handler ────────────────────────────────────────────────────────

export async function processChat(
  userMessage: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  cart: CartItem[],
  retrievedItemIds: string[]
): Promise<ChatResponse> {
  const systemPrompt = buildSystemPrompt(retrievedItemIds, cart);

  // Build messages array — include history for multi-turn context
  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map((h) => ({
      role: h.role,
      content: h.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    tools: TOOLS,
    tool_choice: { type: "auto" },
    messages,
  });

  // Extract actions from tool calls
  const actions: CartAction[] = [];
  let replyText = "";

  for (const block of response.content) {
    if (block.type === "tool_use") {
      const action = executeToolCall(
        block.name,
        block.input as Record<string, unknown>
      );
      if (action) actions.push(action);
    } else if (block.type === "text") {
      replyText += block.text;
    }
  }

  // Extract suggestion item names from reply (simple heuristic — items mentioned but not added)
  const addedIds = actions
    .filter((a) => a.type === "ADD_ITEM")
    .map((a) => (a as { itemId: string }).itemId);

  const suggestions = menuData.items
    .filter((item) => {
      const mentioned = replyText.toLowerCase().includes(item.name.toLowerCase());
      return mentioned && !addedIds.includes(item.id);
    })
    .map((item) => item.id)
    .slice(0, 2);

  const clarificationNeeded =
    replyText.toLowerCase().includes("did you mean") ||
    replyText.toLowerCase().includes("which one") ||
    replyText.toLowerCase().includes("could you clarify");

  return {
    reply: replyText,
    actions,
    clarificationNeeded,
    suggestions,
  };
}