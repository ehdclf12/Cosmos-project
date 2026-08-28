import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import { useClubs, useMyClubs } from '@cosmos/shared'
import type { Club } from '@cosmos/shared'
import { supabase } from '../../../lib/supabase'

const ACCESS_LABELS = { public: '공개', private: '비공개', invite_only: '초대 전용' } as const

export default function ClubsScreen() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [view, setView] = useState<'explore' | 'my'>('explore')
  const [keyword, setKeyword] = useState('')
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user?.id ?? null))
  }, [])

  const { data: allClubs = [], isLoading: loadingAll, refetch: refetchAll } = useClubs(supabase, keyword ? { keyword } : undefined)
  const { data: myClubs = [], isLoading: loadingMy, refetch: refetchMy } = useMyClubs(supabase, userId ?? '')

  const clubs = view === 'my' ? myClubs : allClubs
  const isLoading = view === 'my' ? loadingMy : loadingAll

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.heading}>독서 클럽</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => router.push('/(tabs)/clubs/new')}>
          <Text style={s.addBtnText}>+ 만들기</Text>
        </TouchableOpacity>
      </View>

      <View style={s.tabs}>
        {(['explore', 'my'] as const).map((v) => (
          <TouchableOpacity key={v} style={[s.tab, view === v && s.tabActive]} onPress={() => setView(v)}>
            <Text style={[s.tabText, view === v && s.tabTextActive]}>{v === 'explore' ? '탐색' : '내 클럽'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {view === 'explore' && (
        <View style={s.searchRow}>
          <TextInput value={searchText} onChangeText={setSearchText}
            style={s.searchInput} placeholder="클럽 이름 검색" placeholderTextColor="#A8A49C" />
          <TouchableOpacity style={s.searchBtn} onPress={() => setKeyword(searchText)}>
            <Text style={s.searchBtnText}>검색</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={clubs as Club[]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12, paddingBottom: 80 }}
        refreshing={isLoading}
        onRefresh={view === 'my' ? refetchMy : refetchAll}
        ListEmptyComponent={
          !isLoading ? <Text style={[s.muted, { textAlign: 'center', marginTop: 60 }]}>클럽이 없어요.</Text> : null
        }
        renderItem={({ item: club }) => (
          <TouchableOpacity style={s.card} onPress={() => router.push(`/(tabs)/clubs/${club.id}` as any)}>
            <View style={s.cardIcon}><Text style={{ fontSize: 20, color: 'white' }}>◈</Text></View>
            <Text style={s.cardName} numberOfLines={1}>{club.name}</Text>
            {club.description ? <Text style={s.cardDesc} numberOfLines={2}>{club.description}</Text> : null}
            <View style={s.tagRow}>
              {club.tags.slice(0, 3).map((t) => (
                <View key={t} style={s.tag}><Text style={s.tagText}>{t}</Text></View>
              ))}
            </View>
            <Text style={s.accessLabel}>{ACCESS_LABELS[club.access_type]}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F1EE', paddingHorizontal: 20, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  heading: { fontSize: 24, fontWeight: '300', color: '#1C1C1C' },
  addBtn: { backgroundColor: '#1C1C1C', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  addBtnText: { color: 'white', fontSize: 13 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#E8E5E0' },
  tabActive: { backgroundColor: '#1C1C1C' },
  tabText: { fontSize: 12, color: '#6B6862' },
  tabTextActive: { color: 'white' },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: '#1C1C1C', borderWidth: 1, borderColor: '#E8E5E0' },
  searchBtn: { backgroundColor: '#1C1C1C', paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center' },
  searchBtnText: { color: 'white', fontSize: 13 },
  muted: { fontSize: 13, color: '#A8A49C' },
  card: { backgroundColor: '#C8C5BC', borderRadius: 16, padding: 16 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#2A2A28', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  cardName: { fontSize: 15, fontWeight: '500', color: '#1C1C1C', marginBottom: 4 },
  cardDesc: { fontSize: 12, color: '#6B6862', marginBottom: 8, lineHeight: 18 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  tag: { backgroundColor: '#E8E5E0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  tagText: { fontSize: 11, color: '#6B6862' },
  accessLabel: { fontSize: 11, color: '#A8A49C' },
})
