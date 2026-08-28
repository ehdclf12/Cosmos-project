import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import { useCreateClub } from '@cosmos/shared'
import type { CreateClubInput } from '@cosmos/shared'
import { supabase } from '../../../lib/supabase'

const ACCESS_OPTIONS = [
  { value: 'public', label: '공개', desc: '누구나 바로 참여' },
  { value: 'private', label: '비공개', desc: '승인 후 가입' },
  { value: 'invite_only', label: '초대 전용', desc: '초대 코드 필요' },
] as const

export default function NewClubScreen() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [accessType, setAccessType] = useState<'public' | 'private' | 'invite_only'>('public')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const { mutateAsync, isPending } = useCreateClub(supabase, userId ?? '')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user?.id ?? null))
  }, [])

  function addTag() {
    const t = tagInput.trim()
    if (t && !tags.includes(t) && tags.length < 5) { setTags([...tags, t]); setTagInput('') }
  }

  async function handleSubmit() {
    if (!userId || !name.trim()) return
    const data: CreateClubInput = { name: name.trim(), description: description.trim() || undefined, tags, access_type: accessType }
    try {
      const club = await mutateAsync(data)
      router.replace(`/(tabs)/clubs/${club.id}` as any)
    } catch (e: any) {
      Alert.alert('오류', e.message)
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={s.heading}>새 클럽 만들기</Text>

      <Text style={s.label}>클럽 이름 *</Text>
      <TextInput value={name} onChangeText={setName} style={s.input} placeholder="우리 독서 모임" placeholderTextColor="#A8A49C" />

      <Text style={s.label}>소개</Text>
      <TextInput value={description} onChangeText={setDescription} style={[s.input, { height: 80 }]}
        placeholder="클럽을 소개해주세요" placeholderTextColor="#A8A49C" multiline />

      <Text style={s.label}>태그 (최대 5개)</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <TextInput value={tagInput} onChangeText={setTagInput} style={[s.input, { flex: 1, marginBottom: 0 }]}
          placeholder="소설, SF..." placeholderTextColor="#A8A49C"
          onSubmitEditing={addTag} returnKeyType="done" />
        <TouchableOpacity style={s.tagAddBtn} onPress={addTag}><Text style={{ color: 'white', fontSize: 13 }}>추가</Text></TouchableOpacity>
      </View>
      <View style={s.tagRow}>
        {tags.map((t) => (
          <TouchableOpacity key={t} style={s.tag} onPress={() => setTags(tags.filter((x) => x !== t))}>
            <Text style={s.tagText}>{t} ✕</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>가입 방식 *</Text>
      <View style={{ gap: 8, marginBottom: 20 }}>
        {ACCESS_OPTIONS.map(({ value, label, desc }) => (
          <TouchableOpacity key={value} style={[s.accessOption, accessType === value && s.accessOptionActive]}
            onPress={() => setAccessType(value)}>
            <Text style={[s.accessLabel, accessType === value && { color: '#1C1C1C' }]}>{label}</Text>
            <Text style={s.accessDesc}>{desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[s.submitBtn, (!userId || !name.trim() || isPending) && { opacity: 0.5 }]}
        onPress={handleSubmit} disabled={!userId || !name.trim() || isPending}>
        <Text style={s.submitText}>{isPending ? '생성 중...' : '클럽 만들기'}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F1EE', paddingHorizontal: 20, paddingTop: 60 },
  heading: { fontSize: 22, fontWeight: '300', color: '#1C1C1C', marginBottom: 24 },
  label: { fontSize: 12, color: '#A8A49C', marginBottom: 6 },
  input: { backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1C1C1C', borderWidth: 1, borderColor: '#E8E5E0', marginBottom: 16 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  tag: { backgroundColor: '#E8E5E0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { fontSize: 12, color: '#6B6862' },
  tagAddBtn: { backgroundColor: '#1C1C1C', paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  accessOption: { backgroundColor: 'white', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E8E5E0' },
  accessOptionActive: { borderColor: '#1C1C1C', backgroundColor: '#F2F1EE' },
  accessLabel: { fontSize: 14, fontWeight: '500', color: '#6B6862', marginBottom: 2 },
  accessDesc: { fontSize: 12, color: '#A8A49C' },
  submitBtn: { backgroundColor: '#1C1C1C', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  submitText: { color: 'white', fontSize: 15, fontWeight: '500' },
})
