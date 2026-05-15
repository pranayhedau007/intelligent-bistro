import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useCartStore } from '../../store/useCartStore';

export default function TabLayout() {
  const itemCount = useCartStore((s) => s.itemCount());

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#0a0a0a',
          borderTopColor: '#1a1a1a',
        },
        tabBarActiveTintColor: '#f59e0b',
        tabBarInactiveTintColor: '#555',
        headerStyle: { backgroundColor: '#0a0a0a' },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menu',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🍽️</Text>,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>
              🛒{itemCount > 0 ? ` ${itemCount}` : ''}
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'AI Order',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>💬</Text>,
        }}
      />
    </Tabs>
  );
}
