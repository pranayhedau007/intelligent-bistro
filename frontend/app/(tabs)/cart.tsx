import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useCartStore } from '../../store/useCartStore';

export default function CartScreen() {
  const { items, removeItem, setQuantity, clearCart, total } = useCartStore();

  if (items.length === 0) return (
    <View style={styles.center}>
      <Text style={styles.emptyIcon}>🛒</Text>
      <Text style={styles.emptyText}>Your cart is empty</Text>
      <Text style={styles.emptySub}>Add items from the menu or ask the AI</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Order</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.itemId}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemTotal}>${(item.unitPrice * item.quantity).toFixed(2)}</Text>
            </View>
            <Text style={styles.unitPrice}>${item.unitPrice.toFixed(2)} each</Text>
            <View style={styles.controls}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(item.itemId, item.quantity - 1)}>
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qty}>{item.quantity}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(item.itemId, item.quantity + 1)}>
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(item.itemId)}>
                <Text style={styles.removeBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>${total().toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.clearBtn} onPress={clearCart}>
          <Text style={styles.clearBtnText}>Clear Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.orderBtn}>
          <Text style={styles.orderBtnText}>Place Order →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  emptySub: { color: '#555', fontSize: 14 },
  header: { color: '#f59e0b', fontSize: 22, fontWeight: '700', padding: 16, paddingBottom: 4 },
  card: { backgroundColor: '#141414', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#222' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  itemName: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 },
  itemTotal: { color: '#f59e0b', fontSize: 15, fontWeight: '700' },
  unitPrice: { color: '#555', fontSize: 12, marginBottom: 10 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: { backgroundColor: '#222', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  qty: { color: '#fff', fontSize: 16, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  removeBtn: { marginLeft: 'auto' as any },
  removeBtnText: { color: '#ef4444', fontSize: 13 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#1a1a1a', gap: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalLabel: { color: '#aaa', fontSize: 16 },
  totalAmount: { color: '#f59e0b', fontSize: 22, fontWeight: '700' },
  clearBtn: { borderWidth: 1, borderColor: '#333', borderRadius: 12, padding: 14, alignItems: 'center' },
  clearBtnText: { color: '#aaa', fontWeight: '600' },
  orderBtn: { backgroundColor: '#f59e0b', borderRadius: 12, padding: 16, alignItems: 'center' },
  orderBtnText: { color: '#000', fontWeight: '700', fontSize: 16 },
});
