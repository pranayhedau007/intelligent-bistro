import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useCartStore } from '../store/useCartStore';

type MenuItem = {
  id: string;
  name: string;
  price: number;
  description: string;
  tags: string[];
};

type Props = {
  suggestedIds: string[];
  allItems: MenuItem[];
};

export default function UpsellBanner({ suggestedIds, allItems }: Props) {
  const addItem = useCartStore((s) => s.addItem);

  const suggestions = suggestedIds
    .map((id) => allItems.find((item) => item.id === id))
    .filter(Boolean) as MenuItem[];

  if (suggestions.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>✨ You might also like</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {suggestions.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => addItem({ itemId: item.id, name: item.name, quantity: 1, unitPrice: item.price })}
            >
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    paddingTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 4,
    backgroundColor: '#0d0d0d',
  },
  label: { color: '#f59e0b', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  scroll: { gap: 8, paddingRight: 8 },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 10,
    width: 130,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 4,
  },
  itemName: { color: '#fff', fontSize: 12, fontWeight: '600' },
  itemPrice: { color: '#f59e0b', fontSize: 13, fontWeight: '700' },
  addBtn: { backgroundColor: '#f59e0b', borderRadius: 6, paddingVertical: 4, alignItems: 'center', marginTop: 4 },
  addBtnText: { color: '#000', fontSize: 11, fontWeight: '700' },
});
