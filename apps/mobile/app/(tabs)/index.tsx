import { View, Text, StyleSheet } from 'react-native'

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>안녕하세요</Text>
      <Text style={styles.sub}>오늘도 좋은 책과 함께하세요.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F1EE', padding: 24, paddingTop: 60 },
  greeting: { fontSize: 24, fontWeight: '300', color: '#1C1C1C' },
  sub: { fontSize: 14, color: '#A8A49C', marginTop: 6 },
})
