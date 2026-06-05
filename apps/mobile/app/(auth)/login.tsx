import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'

export default function LoginScreen() {
  const router = useRouter()

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>COSMOS</Text>
        <Text style={styles.subtitle}>책을 사랑하는 독자들의 공간</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.label}>이메일</Text>
          <TextInput
            style={styles.input}
            placeholder="email@example.com"
            placeholderTextColor="#B8B4AC"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>비밀번호</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#B8B4AC"
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.primaryBtnText}>로그인</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>또는</Text>
          <View style={styles.line} />
        </View>

        {['구글로 계속하기', '카카오로 계속하기', 'Apple로 계속하기'].map((label) => (
          <TouchableOpacity key={label} style={styles.socialBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.socialBtnText}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
        <Text style={styles.link}>계정이 없으신가요? <Text style={styles.linkUnderline}>가입하기</Text></Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F1EE', alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '300', letterSpacing: 6, color: '#1C1C1C' },
  subtitle: { fontSize: 13, color: '#A8A49C', marginTop: 6 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 24, width: '100%' },
  field: { marginBottom: 16 },
  label: { fontSize: 11, color: '#A8A49C', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E8E5E0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#1C1C1C' },
  primaryBtn: { backgroundColor: '#1C1C1C', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: 'white', fontSize: 14, fontWeight: '500' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 8 },
  line: { flex: 1, height: 1, backgroundColor: '#F0EEE9' },
  dividerText: { fontSize: 12, color: '#B8B4AC' },
  socialBtn: { borderWidth: 1, borderColor: '#E8E5E0', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 8 },
  socialBtnText: { fontSize: 14, color: '#1C1C1C' },
  link: { marginTop: 20, fontSize: 13, color: '#A8A49C' },
  linkUnderline: { color: '#1C1C1C', textDecorationLine: 'underline' },
})
