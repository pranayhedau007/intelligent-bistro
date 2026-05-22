import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator, Animated
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { sendChatMessage, fetchMenu, ChatMessage, CartAction } from '../../lib/api';
import { useCartStore } from '../../store/useCartStore';
import UpsellBanner from '../../components/UpsellBanner';
import OrderSummaryModal from '../../components/OrderSummaryModal';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useSpeechInput } from '../../hooks/useSpeechInput';

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
  const [isMuted, setIsMuted] = useState(false);
  const [orderModal, setOrderModal] = useState<{
    visible: boolean;
    message: string;
    estimatedPrepTime: number;
  }>({ visible: false, message: '', estimatedPrepTime: 0 });

  const listRef = useRef<FlatList>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const { data: menuData } = useQuery({ queryKey: ['menu'], queryFn: fetchMenu });
  const { items, addItem, removeItem, setQuantity, clearCart } = useCartStore();

  const { isRecording, interimText, isSupported, start, stop } = useSpeechInput(
    (transcript) => { setInput(''); sendMessage(transcript); }
  );

  // Pulse animation while recording
  useEffect(() => {
    if (isRecording) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 500, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

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

  const speakReply = (text: string) => {
    if (isMuted) return;
    Speech.stop();
    const clean = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/#{1,6}\s/g, '');
    Speech.speak(clean, { language: 'en-US', rate: 0.95, pitch: 1.0 });
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
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
      speakReply(response.reply);
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: "Sorry, could not connect to the server!" }]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const send = () => sendMessage(input);

  const startVoiceInput = async () => {
    if (loading) return;
    Speech.stop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await start();
  };

  const stopVoiceInput = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    stop();
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
      <View style={styles.headerRow}>
        <Text style={styles.header}>AI Assistant</Text>
        <TouchableOpacity
          style={[styles.muteBtn, isMuted && styles.muteBtnActive]}
          onPress={() => { Speech.stop(); setIsMuted(m => !m); }}
        >
          <Text style={styles.muteBtnText}>{isMuted ? '🔇' : '🔊'}</Text>
        </TouchableOpacity>
      </View>
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
      {isRecording && (
        <View style={styles.recordingRow}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Listening… tap mic to stop</Text>
        </View>
      )}
      <UpsellBanner suggestedIds={suggestions} allItems={menuData?.items ?? []} />
      <View style={styles.inputRow}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[styles.micBtn, isRecording && styles.micBtnActive, !isSupported && styles.micBtnDisabled]}
            onPress={isRecording ? stopVoiceInput : startVoiceInput}
            disabled={loading || !isSupported}
          >
            <Text style={styles.micBtnText}>{isRecording ? '⏹' : '🎤'}</Text>
          </TouchableOpacity>
        </Animated.View>
        <TextInput
          style={[styles.input, isRecording && styles.inputRecording]}
          value={isRecording ? interimText : input}
          onChangeText={isRecording ? undefined : setInput}
          placeholder={isSupported ? 'Type or tap 🎤 to speak your order...' : 'Type your order here...'}
          placeholderTextColor="#444"
          onSubmitEditing={send}
          returnKeyType="send"
          multiline
          editable={!isRecording}
        />
        <TouchableOpacity style={[styles.sendBtn, (loading || isRecording) && styles.sendBtnDisabled]} onPress={send} disabled={loading || isRecording}>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  header: { color: '#f59e0b', fontSize: 22, fontWeight: '700' },
  muteBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#141414', borderWidth: 1, borderColor: '#333', justifyContent: 'center', alignItems: 'center' },
  muteBtnActive: { borderColor: '#555', backgroundColor: '#1a1a1a' },
  muteBtnText: { fontSize: 16 },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: 12 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#f59e0b' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#141414', borderWidth: 1, borderColor: '#222' },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  userText: { color: '#000', fontWeight: '500' },
  aiText: { color: '#fff' },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  typingText: { color: '#555', fontSize: 13 },
  recordingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  recordingText: { color: '#ef4444', fontSize: 13 },
  inputRow: { flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: '#1a1a1a', alignItems: 'flex-end' },
  micBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#141414', borderWidth: 1, borderColor: '#333', justifyContent: 'center', alignItems: 'center' },
  micBtnActive: { backgroundColor: '#2d0a0a', borderColor: '#ef4444' },
  micBtnDisabled: { opacity: 0.3 },
  micBtnText: { fontSize: 18 },
  input: { flex: 1, backgroundColor: '#141414', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#222', maxHeight: 100 },
  inputRecording: { borderColor: '#ef4444', color: '#aaa' },
  sendBtn: { backgroundColor: '#f59e0b', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#000', fontSize: 20, fontWeight: '700' },
});
