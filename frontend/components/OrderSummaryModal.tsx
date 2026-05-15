import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useCartStore } from '../store/useCartStore';

type Props = {
  visible: boolean;
  message: string;
  estimatedPrepTime: number;
  onClose: () => void;
  onConfirm: () => void;
};

export default function OrderSummaryModal({ visible, message, estimatedPrepTime, onClose, onConfirm }: Props) {
  const { items, total, clearCart } = useCartStore();

  const handleConfirm = () => {
    clearCart();
    onConfirm();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.emoji}>🍽️</Text>
          <Text style={styles.title}>Order Summary</Text>
          <Text style={styles.message}>{message}</Text>

          <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
            {items.map((item) => (
              <View key={item.itemId} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.name} × {item.quantity}</Text>
                <Text style={styles.itemPrice}>${(item.unitPrice * item.quantity).toFixed(2)}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>${total().toFixed(2)}</Text>
          </View>

          <View style={styles.prepRow}>
            <Text style={styles.prepIcon}>⏱️</Text>
            <Text style={styles.prepText}>Estimated prep time: {estimatedPrepTime} mins</Text>
          </View>

          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmBtnText}>✅ Confirm Order</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#141414', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  emoji: { fontSize: 40, textAlign: 'center', marginBottom: 8 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  message: { color: '#aaa', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  itemsList: { maxHeight: 200, marginBottom: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#222' },
  itemName: { color: '#fff', fontSize: 15 },
  itemPrice: { color: '#f59e0b', fontSize: 15, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#222', marginVertical: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalLabel: { color: '#aaa', fontSize: 16 },
  totalAmount: { color: '#f59e0b', fontSize: 24, fontWeight: '700' },
  prepRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  prepIcon: { fontSize: 14 },
  prepText: { color: '#555', fontSize: 13 },
  confirmBtn: { backgroundColor: '#f59e0b', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 },
  confirmBtnText: { color: '#000', fontWeight: '700', fontSize: 16 },
  cancelBtn: { alignItems: 'center', padding: 10 },
  cancelBtnText: { color: '#555', fontSize: 14 },
});
