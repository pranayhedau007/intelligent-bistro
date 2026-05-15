import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { fetchMenu } from '../../lib/api';
import { useCartStore } from '../../store/useCartStore';

export default function MenuScreen() {
  const { data, isLoading, error } = useQuery({ queryKey: ['menu'], queryFn: fetchMenu });
  const addItem = useCartStore((s) => s.addItem);

  if (isLoading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#f59e0b" />
      <Text style={styles.loadingText}>Loading menu...</Text>
    </View>
  );

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>⚠️ Could not load menu</Text>
      <Text style={styles.errorSub}>Make sure the backend is running on :3001</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🍽️ The Intelligent Bistro</Text>
      <FlatList
        data={data?.items}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }: any) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemCategory}>{item.category}</Text>
              </View>
              <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
            </View>
            <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
            <View style={styles.cardBottom}>
              <View style={styles.tags}>
                {item.tags.slice(0, 3).map((tag: string) => (
                  <Text key={tag} style={styles.tag}>{tag}</Text>
                ))}
                {item.spiceLevel > 0 && (
                  <Text style={styles.spiceTag}>{'🌶️'.repeat(item.spiceLevel)}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => addItem({ itemId: item.id, name: item.name, quantity: 1, unitPrice: item.price })}
              >
                <Text style={styles.addBtnText}>+ Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', gap: 8 },
  header: { color: '#f59e0b', fontSize: 22, fontWeight: '700', padding: 16, paddingBottom: 4 },
  loadingText: { color: '#888', marginTop: 8 },
  errorText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },
  errorSub: { color: '#555', fontSize: 13 },
  card: { backgroundColor: '#141414', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#222' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  itemName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  itemCategory: { color: '#f59e0b', fontSize: 12, marginTop: 2 },
  itemPrice: { color: '#f59e0b', fontSize: 18, fontWeight: '700' },
  itemDesc: { color: '#888', fontSize: 13, lineHeight: 18, marginBottom: 10 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 },
  tag: { backgroundColor: '#1f1f1f', color: '#aaa', fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  spiceTag: { fontSize: 11 },
  addBtn: { backgroundColor: '#f59e0b', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
});
