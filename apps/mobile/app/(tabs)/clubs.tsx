import { View, Text, StyleSheet } from 'react-native'

export default function ClubsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.icon}><Text style={styles.iconText}>◈</Text></View>
      <Text style={styles.title}>독서 클럽</Text>
      <Text style={styles.sub}>같은 책을 읽는 사람들과 함께하는 공간{'\n'}곧 만나볼 수 있어요</Text>
      <View style={styles.badge}><Text style={styles.badgeText}>Coming Soon</Text></View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F1EE', alignItems: 'center', justifyContent: 'center', padding: 24 },
  icon: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#2A2A28', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  iconText: { fontSize: 32, color: 'white' },
  title: { fontSize: 20, fontWeight: '300', color: '#1C1C1C', marginBottom: 8 },
  sub: { fontSize: 14, color: '#A8A49C', textAlign: 'center', lineHeight: 22 },
  badge: { marginTop: 16, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#E8E5E0' },
  badgeText: { fontSize: 12, color: '#A8A49C' },
})
