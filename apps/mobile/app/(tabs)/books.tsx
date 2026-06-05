import { View, Text, StyleSheet } from 'react-native'

export default function BooksScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>책장</Text>
      <Text style={styles.sub}>내가 읽은 책들을 기록해보세요.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F1EE', padding: 24, paddingTop: 60 },
  heading: { fontSize: 24, fontWeight: '300', color: '#1C1C1C' },
  sub: { fontSize: 14, color: '#A8A49C', marginTop: 6 },
})
