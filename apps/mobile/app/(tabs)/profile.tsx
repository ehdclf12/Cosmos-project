import { View, Text, StyleSheet } from 'react-native'

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>프로필</Text>
      <View style={styles.card}>
        <View style={styles.avatar}><Text style={styles.avatarText}>○</Text></View>
        <View>
          <Text style={styles.name}>독자</Text>
          <Text style={styles.username}>@username</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F1EE', padding: 24, paddingTop: 60 },
  heading: { fontSize: 24, fontWeight: '300', color: '#1C1C1C', marginBottom: 20 },
  card: { backgroundColor: '#C8C5BC', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1C1C1C', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, color: 'white' },
  name: { fontSize: 16, fontWeight: '500', color: '#1C1C1C' },
  username: { fontSize: 13, color: '#6B6862', marginTop: 2 },
})
