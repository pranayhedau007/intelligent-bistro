import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { sendChatMessage, fetchMenu, ChatMessage, CartAction } from '../../lib/api';
import { useCartStore } from '../../store/useCartStore';
import UpsellBanner from '../../components/UpsellBanner';
import OrderSummaryModal from '../../components/OrderSummaryModal';

const SESSION_ID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = Math.random() * 16 | 0;
  return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
});

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Hi! I am your AI assistant for The Intelligent Bistro. What can I get for you today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [orderModal, setOrderModal] = useState<{
    visible: boolean;
    message: string;
    estimatedPrepTime: number;
  }>({ visible: false, message: '', estimatedPrepTime: 0 });

  const listRef = useRef<FlatList>(null);
  const { data: menuData } = useQuery({ queryKey: ['menu'], queryFn: fetchMenu });
  const { items, addItem, removeItem, setQuantity, clearCart } = useCartStore();

  const applyActions = (actions: CartAction[]) => {
    actions.forEach((action) => {
      if (action.type === 'ADD_ITEM') {
        const menuItem = menuData?.items?.find((i: any) => i.id === action.itemId);
        addItem({ itemId: action.itemId, name: action.resolvedName, quantity: action.quantity, unitPrice: menuItem?.price ?? 0 });
      } else if (action.type === 'REMOVE_ITEM') {
        removeItem(action.itemId);
      } else if (action.type === 'SET_QUANTITY') {
        setQuantity(action.itemId, action.quantity);
      } else if (action.type === 'CLEAR_CART') {
        clearCart();
      } else if (action.type === 'COMPLETE_ORDER') {
        setOrderModal({ visible: true, message: action.message, estimatedPrepTime: action.estimatedPrepTime });
      }
    });
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setSuggestions([]);

    try {
      const response = await sendChatMessage(userMsg.content, SESSION_ID, items, messages);
      applyActions(response.actions);
      setSuggestions(response.suggestions ?? []);
      setMessages([...newMessages, { role: 'assistant', content: response.reply }]);
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: "Sorry, could not connect to the server!" }]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleOrderConfirmed = () => {
    setOrderModal({ visible: false, message: '', estimatedPrepTime: 0 });
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: "Your order has been placed! Thank you for dining with us. Enjoy your meal! 🎉"
    }]);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Text style={styles.header}>AI Assistant</Text>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={[styles.bubbleText, item.role === 'user' ? styles.userText : styles.aiText]}>{item.content}</Text>
          </View>
        )}
      />
      {loading && (
        <View style={styles.typingRow}>
          <ActivityIndicator size="small" color="#f59e0b" />
          <Text style={styles.typingText}>AI is thinking...</Text>
        </View>
      )}
      <UpsellBanner suggestedIds={suggestions} allItems={menuData?.items ?? []} />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="🎤 Tap mic on keyboard or type here..."
          placeholderTextColor="#444"
          onSubmitEditing={send}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity style={[styles.sendBtn, loading && styles.sendBtnDisabled]} onPress={send} disabled={loading}>
          <Text style={styles.sendBtnText}>→</Text>
        </TouchableOpacity>
      </View>

      <OrderSummaryModal
        visible={orderModal.visible}
        message={orderModal.message}
        estimatedPrepTime={orderModal.estimatedPrepTime}
        onClose={() => setOrderModal(prev => ({ ...prev, visible: false }))}
        onConfirm={handleOrderConfirmed}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { color: '#f59e0b', fontSize: 22, fontWeight: '700', padding: 16, paddingBottom: 4 },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: 12 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#f59e0b' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#141414', borderWidth: 1, borderColor: '#222' },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  userText: { color: '#000', fontWeight: '500' },
  aiText: { color: '#fff' },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  typingText: { color: '#555', fontSize: 13 },
  inputRow: { flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: '#1a1a1a' },
  input: { flex: 1, backgroundColor: '#141414', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#222', maxHeight: 100 },
  sendBtn: { backgroundColor: '#f59e0b', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#000', fontSize: 20, fontWeight: '700' },
});
