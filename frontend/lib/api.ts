import axios from 'axios';
import { CartItem } from '../store/useCartStore';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type CartAction =
  | { type: 'ADD_ITEM'; itemId: string; quantity: number; resolvedName: string }
  | { type: 'REMOVE_ITEM'; itemId: string }
  | { type: 'SET_QUANTITY'; itemId: string; quantity: number }
  | { type: 'CLEAR_CART' }
  | { type: 'COMPLETE_ORDER'; message: string; estimatedPrepTime: number };

export type ChatResponse = {
  reply: string;
  actions: CartAction[];
  clarificationNeeded: boolean;
  suggestions: string[];
  retrievedItems: string[];
};

export const fetchMenu = async () => {
  const { data } = await api.get('/api/menu');
  return data;
};

export const sendChatMessage = async (
  message: string,
  sessionId: string,
  cart: CartItem[],
  history: ChatMessage[]
): Promise<ChatResponse> => {
  const { data } = await api.post('/api/chat', {
    message,
    sessionId,
    cart,
    history: history.slice(-10),
  });
  return data;
};
