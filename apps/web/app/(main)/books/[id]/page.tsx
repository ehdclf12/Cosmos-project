'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useBookDetail, useUpdateProgress, useWriteReview } from '@cosmos/shared'
import type { BookStatus } from '@cosmos/shared'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'

const STATUS_LABELS: Record<BookStatus, string> = {
  want_to_read: '읽고 싶음',
  reading: '읽는 중',
  finished: '읽음',
}

const STATUS_OPTIONS: BookStatus[] = ['want_to_read', 'reading', 'finished']

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { userId, supabase } = useSupabaseUser()
  const { data, isLoading } = useBookDetail(supabase, id, userId ?? '')
  const { mutateAsync: updateProgress } = useUpdateProgress(supabase, userId ?? '')
  const { mutateAsync: writeReview } = useWriteReview(supabase, userId ?? '')

  const [showProgressModal, setShowProgressModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<BookStatus>('want_to_read')
  const [currentPage, setCurrentPage] = useState('')
  const [totalPages, setTotalPages] = useState('')
  const [memo, setMemo] = useState('')
  const [rating, setRating] = useState(5)
  const [reviewContent, setReviewContent] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  if (isLoading) return <p className="text-sm" style={{ color: '#A8A49C' }}>불러오는 중...</p>
  if (!data) return <p className="text-sm" style={{ color: '#A8A49C' }}>책을 찾을 수 없습니다.</p>

  const { book, userBook, reviews } = data

  async function handleProgressSave() {
    if (!userId) return
    await updateProgress({
      bookId: id,
      data: {
        status: selectedStatus,
        current_page: currentPage ? parseInt(currentPage) : undefined,
        total_pages: totalPages ? parseInt(totalPages) : undefined,
        memo: memo || undefined,
      },
    })
    setShowProgressModal(false)
  }

  async function handleReviewSave() {
    if (!userId) return
    await writeReview({ bookId: id, data: { rating, content: reviewContent || undefined, is_public: isPublic } })
    setShowReviewModal(false)
  }

  return (
    <div className="max-w-2xl">
      <div className="flex gap-6 mb-8">
        <div
          className="w-28 h-40 rounded-xl flex-shrink-0 flex items-center justify-center text-3xl"
          style={{ backgroundColor: '#C8C5BC' }}
        >
          {book.cover_url ? (
            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover rounded-xl" />
          ) : '📖'}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-medium mb-1" style={{ color: '#1C1C1C' }}>{book.title}</h1>
          <p className="text-sm mb-1" style={{ color: '#6B6862' }}>{book.author}</p>
          {book.publisher && <p className="text-xs" style={{ color: '#A8A49C' }}>{book.publisher}</p>}

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => {
                setSelectedStatus((userBook?.status as BookStatus) ?? 'want_to_read')
                setCurrentPage(userBook?.current_page?.toString() ?? '')
                setTotalPages(userBook?.total_pages?.toString() ?? '')
                setMemo(userBook?.memo ?? '')
                setShowProgressModal(true)
              }}
              className="px-4 py-2 rounded-xl text-sm text-white"
              style={{ backgroundColor: '#1C1C1C' }}
            >
              {userBook ? STATUS_LABELS[userBook.status as BookStatus] : '+ 책장에 추가'}
            </button>
            {userBook?.status === 'finished' && (
              <button
                onClick={() => {
                  setRating(5)
                  setReviewContent('')
                  setShowReviewModal(true)
                }}
                className="px-4 py-2 rounded-xl text-sm border border-gray-200 hover:bg-gray-50"
                style={{ color: '#1C1C1C' }}
              >
                리뷰 쓰기
              </button>
            )}
          </div>
        </div>
      </div>

      {userBook?.status === 'reading' && userBook.current_page && userBook.total_pages && (
        <div className="mb-6 p-4 rounded-2xl" style={{ backgroundColor: '#E8E5E0' }}>
          <div className="flex justify-between text-sm mb-2">
            <span style={{ color: '#6B6862' }}>읽기 진행도</span>
            <span style={{ color: '#1C1C1C' }}>{userBook.current_page} / {userBook.total_pages}p</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ backgroundColor: '#D0CEC6' }}>
            <div
              className="h-full rounded-full"
              style={{
                backgroundColor: '#1C1C1C',
                width: `${Math.min((userBook.current_page / userBook.total_pages) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      <div>
        <h2 className="text-base font-medium mb-4" style={{ color: '#1C1C1C' }}>독자 리뷰</h2>
        {reviews.length === 0 && (
          <p className="text-sm" style={{ color: '#A8A49C' }}>아직 리뷰가 없어요.</p>
        )}
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="p-4 rounded-2xl" style={{ backgroundColor: 'white' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: '#1C1C1C' }}>
                  {r.profile?.display_name ?? '독자'}
                </span>
                <span className="text-sm">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              </div>
              {r.content && <p className="text-sm" style={{ color: '#6B6862' }}>{r.content}</p>}
            </div>
          ))}
        </div>
      </div>

      {showProgressModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-medium mb-4" style={{ color: '#1C1C1C' }}>독서 상태</h3>
            <div className="flex gap-2 mb-4">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedStatus(s)}
                  className="flex-1 py-2 rounded-xl text-xs transition-colors"
                  style={{
                    backgroundColor: selectedStatus === s ? '#1C1C1C' : '#E8E5E0',
                    color: selectedStatus === s ? 'white' : '#6B6862',
                  }}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            {selectedStatus === 'reading' && (
              <div className="flex gap-2 mb-4">
                <div className="flex-1">
                  <label className="block text-xs mb-1" style={{ color: '#A8A49C' }}>현재 페이지</label>
                  <input
                    type="number"
                    value={currentPage}
                    onChange={(e) => setCurrentPage(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs mb-1" style={{ color: '#A8A49C' }}>전체 페이지</label>
                  <input
                    type="number"
                    value={totalPages}
                    onChange={(e) => setTotalPages(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>
            )}
            <div className="mb-4">
              <label className="block text-xs mb-1" style={{ color: '#A8A49C' }}>메모 (선택)</label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none resize-none h-20"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowProgressModal(false)} className="flex-1 py-3 rounded-xl text-sm border border-gray-200" style={{ color: '#6B6862' }}>취소</button>
              <button onClick={handleProgressSave} className="flex-1 py-3 rounded-xl text-sm text-white" style={{ backgroundColor: '#1C1C1C' }}>저장</button>
            </div>
          </div>
        </div>
      )}

      {showReviewModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-medium mb-4" style={{ color: '#1C1C1C' }}>리뷰 작성</h3>
            <div className="flex gap-2 mb-4 justify-center text-2xl">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)}>
                  {n <= rating ? '★' : '☆'}
                </button>
              ))}
            </div>
            <textarea
              value={reviewContent}
              onChange={(e) => setReviewContent(e.target.value)}
              placeholder="리뷰를 작성해주세요 (선택)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none resize-none h-28 mb-4"
            />
            <label className="flex items-center gap-2 mb-4 text-sm cursor-pointer" style={{ color: '#6B6862' }}>
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              공개 리뷰로 등록
            </label>
            <div className="flex gap-2">
              <button onClick={() => setShowReviewModal(false)} className="flex-1 py-3 rounded-xl text-sm border border-gray-200" style={{ color: '#6B6862' }}>취소</button>
              <button onClick={handleReviewSave} className="flex-1 py-3 rounded-xl text-sm text-white" style={{ backgroundColor: '#1C1C1C' }}>등록</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
