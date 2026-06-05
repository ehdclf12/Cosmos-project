import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'

export default function RegisterScreen() {
  const router = useRouter()

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>COSMOS</Text>
        <Text style={styles.subtitle}>새로운 독자로 시작하기</Text>
      </View>

      <View style={styles.card}>
        {[
          { label: '이메일', placeholder: 'email@example.com', keyboardType: 'email-address' as const, secure: false },
          { label: '비밀번호 (6자 이상)', placeholder: '••••••••', keyboardType: 'default' as const, secure: true },
          { label: '비밀번호 확인', placeholder: '••••••••', keyboardType: 'default' as const, secure: true },
        ].map(({ label, placeholder, keyboardType, secure }) => (
          <View key={label} style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              style={styles.input}
              placeholder={placeholder}
              placeholderTextColor="#B8B4AC"
              keyboardType={keyboardType}
              secureTextEntry={secure}
              autoCapitalize="none"
            />
          </View>
        ))}

        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.primaryBtnText}>가입하기</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.link}>이미 계정이 있으신가요? <Text style={styles.linkUnderline}>로그인</Text></Text>
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
  link: { marginTop: 20, fontSize: 13, color: '#A8A49C' },
  linkUnderline: { color: '#1C1C1C', textDecorationLine: 'underline' },
})
