import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SupabaseClient } from '@supabase/supabase-js'
import { fetchUserBooks, fetchBookDetail, addBook, upsertUserBook, upsertReview } from '../queries/books'
import type { BookStatus } from '../types'
import type { AddBookInput, UpdateProgressInput, WriteReviewInput } from '../schemas'

export const bookKeys = {
  all: ['books'] as const,
  lists: () => [...bookKeys.all, 'list'] as const,
  list: (status?: BookStatus) => [...bookKeys.lists(), { status }] as const,
  detail: (bookId: string) => [...bookKeys.all, 'detail', bookId] as const,
}

export function useBooks(supabase: SupabaseClient, userId: string, status?: BookStatus) {
  return useQuery({
    queryKey: bookKeys.list(status),
    queryFn: () => fetchUserBooks(supabase, userId, status),
    enabled: !!userId,
  })
}

export function useBookDetail(supabase: SupabaseClient, bookId: string, userId: string) {
  return useQuery({
    queryKey: bookKeys.detail(bookId),
    queryFn: () => fetchBookDetail(supabase, bookId, userId),
    enabled: !!bookId && !!userId,
  })
}

export function useAddBook(supabase: SupabaseClient, userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AddBookInput) => addBook(supabase, userId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: bookKeys.lists() }),
  })
}

export function useUpdateProgress(supabase: SupabaseClient, userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ bookId, data }: { bookId: string; data: UpdateProgressInput }) =>
      upsertUserBook(supabase, userId, bookId, data),
    onSuccess: (_, { bookId }) => {
      qc.invalidateQueries({ queryKey: bookKeys.lists() })
      qc.invalidateQueries({ queryKey: bookKeys.detail(bookId) })
    },
  })
}

export function useWriteReview(supabase: SupabaseClient, userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ bookId, data }: { bookId: string; data: WriteReviewInput }) =>
      upsertReview(supabase, userId, bookId, data),
    onSuccess: (_, { bookId }) => {
      qc.invalidateQueries({ queryKey: bookKeys.detail(bookId) })
    },
  })
}
