import { Tabs } from 'expo-router'
import { Text } from 'react-native'

const TAB_ICON: Record<string, string> = { index: '◎', books: '☰', clubs: '◈', profile: '○' }

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#1C1C1C', borderTopWidth: 0, paddingBottom: 8, height: 64 },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#6B6862',
        tabBarIcon: ({ color }) => (
          <Text style={{ fontSize: 18, color }}>{TAB_ICON[route.name] ?? '○'}</Text>
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: '홈' }} />
      <Tabs.Screen name="books" options={{ title: '책장' }} />
      <Tabs.Screen name="clubs" options={{ title: '클럽' }} />
      <Tabs.Screen name="profile" options={{ title: '프로필' }} />
      <Tabs.Screen name="clubs/[id]" options={{ href: null }} />
      <Tabs.Screen name="clubs/new" options={{ href: null }} />
    </Tabs>
  )
}
