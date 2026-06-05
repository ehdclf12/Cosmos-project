import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import { useBooks } from '@cosmos/shared'
import type { BookStatus, UserBookWithBook } from '@cosmos/shared'
import { supabase } from '../../../lib/supabase'

const STATUS_TABS: { key: BookStatus | 'all'; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'want_to_read', label: '읽고 싶음' },
  { key: 'reading', label: '읽는 중' },
  { key: 'finished', label: '읽음' },
]

export default function BooksScreen() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<BookStatus | 'all'>('all')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user?.id ?? null))
  }, [])

  const { data: books = [], isLoading } = useBooks(
    supabase,
    userId ?? '',
    activeTab === 'all' ? undefined : activeTab
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>내 책장</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(tabs)/books/new')}>
          <Text style={styles.addBtnText}>+ 추가</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {STATUS_TABS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, activeTab === key && styles.tabActive]}
            onPress={() => setActiveTab(key)}
          >
            <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && <Text style={styles.muted}>불러오는 중...</Text>}

      <FlatList
        data={books as UserBookWithBook[]}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 80 }}
        ListEmptyComponent={
          !isLoading ? (
            <TouchableOpacity onPress={() => router.push('/(tabs)/books/new')}>
              <Text style={[styles.muted, { textAlign: 'center' }]}>
                아직 추가한 책이 없어요.{'\n'}첫 번째 책을 추가해보세요.
              </Text>
            </TouchableOpacity>
          ) : null
        }
        renderItem={({ item: ub }) => (
          <TouchableOpacity
            style={styles.bookCard}
            onPress={() => router.push(`/(tabs)/books/${ub.book_id}`)}
          >
            <View style={styles.bookCover}>
              <Text style={styles.bookCoverText}>📖</Text>
            </View>
            <Text style={styles.bookTitle} numberOfLines={2}>{ub.book.title}</Text>
            <Text style={styles.bookAuthor} numberOfLines={1}>{ub.book.author}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F1EE', paddingHorizontal: 20, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  heading: { fontSize: 24, fontWeight: '300', color: '#1C1C1C' },
  addBtn: { backgroundColor: '#1C1C1C', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  addBtnText: { color: 'white', fontSize: 13 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#E8E5E0' },
  tabActive: { backgroundColor: '#1C1C1C' },
  tabText: { fontSize: 12, color: '#6B6862' },
  tabTextActive: { color: 'white' },
  muted: { fontSize: 13, color: '#A8A49C', marginTop: 40 },
  bookCard: { flex: 1, backgroundColor: '#C8C5BC', borderRadius: 16, padding: 12 },
  bookCover: { aspectRatio: 3 / 4, borderRadius: 8, backgroundColor: '#B8B4AC', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  bookCoverText: { fontSize: 32 },
  bookTitle: { fontSize: 13, fontWeight: '500', color: '#1C1C1C', marginBottom: 2 },
  bookAuthor: { fontSize: 11, color: '#6B6862' },
})
