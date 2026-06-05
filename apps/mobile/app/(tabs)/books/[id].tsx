import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import { useBookDetail, useUpdateProgress, useWriteReview } from '@cosmos/shared'
import type { BookStatus } from '@cosmos/shared'
import { supabase } from '../../../lib/supabase'

const STATUS_LABELS: Record<BookStatus, string> = {
  want_to_read: '읽고 싶음', reading: '읽는 중', finished: '읽음',
}

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [showProgress, setShowProgress] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<BookStatus>('want_to_read')
  const [currentPage, setCurrentPage] = useState('')
  const [totalPages, setTotalPages] = useState('')
  const [rating, setRating] = useState(5)
  const [reviewContent, setReviewContent] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user?.id ?? null))
  }, [])

  const { data, isLoading } = useBookDetail(supabase, id, userId ?? '')
  const { mutateAsync: updateProgress } = useUpdateProgress(supabase, userId ?? '')
  const { mutateAsync: writeReview } = useWriteReview(supabase, userId ?? '')

  if (isLoading || !data) return (
    <View style={styles.center}><Text style={styles.muted}>불러오는 중...</Text></View>
  )

  const { book, userBook, reviews } = data

  async function handleProgressSave() {
    if (!userId) return
    await updateProgress({
      bookId: id,
      data: { status: selectedStatus, current_page: currentPage ? parseInt(currentPage) : undefined, total_pages: totalPages ? parseInt(totalPages) : undefined },
    })
    setShowProgress(false)
  }

  async function handleReviewSave() {
    if (!userId) return
    await writeReview({ bookId: id, data: { rating, content: reviewContent || undefined, is_public: isPublic } })
    setShowReview(false)
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← 뒤로</Text>
      </TouchableOpacity>

      <View style={styles.bookHeader}>
        <View style={styles.coverPlaceholder}><Text style={{ fontSize: 36 }}>📖</Text></View>
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle}>{book.title}</Text>
          <Text style={styles.bookAuthor}>{book.author}</Text>
          {book.publisher && <Text style={styles.bookPublisher}>{book.publisher}</Text>}
          <TouchableOpacity
            style={styles.statusBtn}
            onPress={() => {
              setSelectedStatus((userBook?.status as BookStatus) ?? 'want_to_read')
              setCurrentPage(userBook?.current_page?.toString() ?? '')
              setTotalPages(userBook?.total_pages?.toString() ?? '')
              setShowProgress(true)
            }}
          >
            <Text style={styles.statusBtnText}>{userBook ? STATUS_LABELS[userBook.status as BookStatus] : '+ 추가'}</Text>
          </TouchableOpacity>
          {userBook?.status === 'finished' && (
            <TouchableOpacity style={styles.reviewBtn} onPress={() => setShowReview(true)}>
              <Text style={styles.reviewBtnText}>리뷰 쓰기</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {userBook?.status === 'reading' && userBook.current_page && userBook.total_pages && (
        <View style={styles.progressBox}>
          <View style={styles.progressRow}>
            <Text style={styles.muted}>진행도</Text>
            <Text style={styles.progressNum}>{userBook.current_page} / {userBook.total_pages}p</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min((userBook.current_page / userBook.total_pages) * 100, 100)}%` as any }]} />
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>독자 리뷰</Text>
      {reviews.length === 0 && <Text style={styles.muted}>아직 리뷰가 없어요.</Text>}
      {reviews.map((r) => (
        <View key={r.id} style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <Text style={styles.reviewAuthor}>{r.profile?.display_name ?? '독자'}</Text>
            <Text>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
          </View>
          {r.content && <Text style={styles.reviewContent}>{r.content}</Text>}
        </View>
      ))}

      <Modal visible={showProgress} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>독서 상태</Text>
            <View style={styles.statusRow}>
              {(['want_to_read', 'reading', 'finished'] as BookStatus[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusChip, selectedStatus === s && styles.statusChipActive]}
                  onPress={() => setSelectedStatus(s)}
                >
                  <Text style={[styles.statusChipText, selectedStatus === s && { color: 'white' }]}>
                    {STATUS_LABELS[s]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {selectedStatus === 'reading' && (
              <View style={styles.pageRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>현재 페이지</Text>
                  <TextInput style={styles.modalInput} value={currentPage} onChangeText={setCurrentPage} keyboardType="number-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>전체 페이지</Text>
                  <TextInput style={styles.modalInput} value={totalPages} onChangeText={setTotalPages} keyboardType="number-pad" />
                </View>
              </View>
            )}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowProgress(false)}>
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleProgressSave}>
                <Text style={styles.saveText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showReview} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>리뷰 작성</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setRating(n)}>
                  <Text style={styles.star}>{n <= rating ? '★' : '☆'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
              value={reviewContent}
              onChangeText={setReviewContent}
              placeholder="리뷰 (선택)"
              placeholderTextColor="#B8B4AC"
              multiline
            />
            <TouchableOpacity onPress={() => setIsPublic(!isPublic)} style={styles.publicRow}>
              <View style={[styles.checkbox, isPublic && styles.checkboxActive]} />
              <Text style={styles.muted}>공개 리뷰로 등록</Text>
            </TouchableOpacity>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowReview(false)}>
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleReviewSave}>
                <Text style={styles.saveText}>등록</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F1EE' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F1EE' },
  back: { marginBottom: 16 },
  backText: { fontSize: 14, color: '#A8A49C' },
  bookHeader: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  coverPlaceholder: { width: 100, height: 140, borderRadius: 12, backgroundColor: '#C8C5BC', alignItems: 'center', justifyContent: 'center' },
  bookInfo: { flex: 1 },
  bookTitle: { fontSize: 18, fontWeight: '500', color: '#1C1C1C', marginBottom: 4 },
  bookAuthor: { fontSize: 14, color: '#6B6862', marginBottom: 2 },
  bookPublisher: { fontSize: 12, color: '#A8A49C', marginBottom: 12 },
  statusBtn: { backgroundColor: '#1C1C1C', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 8 },
  statusBtnText: { color: 'white', fontSize: 13 },
  reviewBtn: { borderWidth: 1, borderColor: '#D0CEC6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, alignSelf: 'flex-start' },
  reviewBtnText: { color: '#1C1C1C', fontSize: 13 },
  progressBox: { backgroundColor: '#E8E5E0', borderRadius: 16, padding: 16, marginBottom: 24 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressNum: { fontSize: 13, color: '#1C1C1C' },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: '#D0CEC6' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: '#1C1C1C' },
  sectionTitle: { fontSize: 16, fontWeight: '500', color: '#1C1C1C', marginBottom: 12 },
  muted: { fontSize: 13, color: '#A8A49C' },
  reviewCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  reviewAuthor: { fontSize: 14, fontWeight: '500', color: '#1C1C1C' },
  reviewContent: { fontSize: 13, color: '#6B6862' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 16, fontWeight: '500', color: '#1C1C1C', marginBottom: 16 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statusChip: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#E8E5E0', alignItems: 'center' },
  statusChipActive: { backgroundColor: '#1C1C1C' },
  statusChipText: { fontSize: 12, color: '#6B6862' },
  pageRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  fieldLabel: { fontSize: 11, color: '#A8A49C', marginBottom: 6 },
  modalInput: { backgroundColor: '#F5F4F1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1C1C1C' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E8E5E0', alignItems: 'center' },
  cancelText: { fontSize: 14, color: '#6B6862' },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#1C1C1C', alignItems: 'center' },
  saveText: { fontSize: 14, color: 'white', fontWeight: '500' },
  starRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
  star: { fontSize: 28, color: '#1C1C1C' },
  publicRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 12 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#D0CEC6' },
  checkboxActive: { backgroundColor: '#1C1C1C', borderColor: '#1C1C1C' },
})
