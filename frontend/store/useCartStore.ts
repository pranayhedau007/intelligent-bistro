import { create } from 'zustand';

export type CartItem = {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

type CartStore = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  setQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
  itemCount: () => number;
};

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (incoming) => set((state) => {
    const existing = state.items.find((i) => i.itemId === incoming.itemId);
    if (existing) {
      return {
        items: state.items.map((i) =>
          i.itemId === incoming.itemId
            ? { ...i, quantity: i.quantity + incoming.quantity }
            : i
        ),
      };
    }
    return { items: [...state.items, incoming] };
  }),

  removeItem: (itemId) => set((state) => ({
    items: state.items.filter((i) => i.itemId !== itemId),
  })),

  setQuantity: (itemId, quantity) => set((state) => {
    if (quantity <= 0) {
      return { items: state.items.filter((i) => i.itemId !== itemId) };
    }
    return {
      items: state.items.map((i) =>
        i.itemId === itemId ? { ...i, quantity } : i
      ),
    };
  }),

  clearCart: () => set({ items: [] }),

  total: () => get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),

  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
