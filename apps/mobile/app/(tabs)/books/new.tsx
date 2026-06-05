import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import { useAddBook } from '@cosmos/shared'
import { supabase } from '../../../lib/supabase'

export default function NewBookScreen() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [publisher, setPublisher] = useState('')
  const { mutateAsync, isPending } = useAddBook(supabase, userId ?? '')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user?.id ?? null))
  }, [])

  async function handleSubmit() {
    if (!title.trim()) { Alert.alert('제목을 입력해주세요'); return }
    if (!author.trim()) { Alert.alert('저자를 입력해주세요'); return }
    if (!userId) return
    await mutateAsync({ title: title.trim(), author: author.trim(), publisher: publisher.trim() || undefined })
    router.back()
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← 뒤로</Text>
      </TouchableOpacity>
      <Text style={styles.heading}>새 책 추가</Text>

      {[
        { label: '제목 *', value: title, set: setTitle, placeholder: '책 제목' },
        { label: '저자 *', value: author, set: setAuthor, placeholder: '저자 이름' },
        { label: '출판사', value: publisher, set: setPublisher, placeholder: '출판사 (선택)' },
      ].map(({ label, value, set, placeholder }) => (
        <View key={label} style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={set}
            placeholder={placeholder}
            placeholderTextColor="#B8B4AC"
          />
        </View>
      ))}

      <TouchableOpacity
        style={[styles.submitBtn, (isPending || !userId) && styles.disabled]}
        onPress={handleSubmit}
        disabled={isPending || !userId}
      >
        <Text style={styles.submitText}>{isPending ? '추가 중...' : '추가하기'}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F1EE' },
  back: { marginBottom: 16 },
  backText: { fontSize: 14, color: '#A8A49C' },
  heading: { fontSize: 24, fontWeight: '300', color: '#1C1C1C', marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { fontSize: 11, color: '#A8A49C', marginBottom: 6 },
  input: { backgroundColor: 'white', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: '#1C1C1C' },
  submitBtn: { backgroundColor: '#1C1C1C', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  disabled: { opacity: 0.5 },
  submitText: { color: 'white', fontSize: 14, fontWeight: '500' },
})
