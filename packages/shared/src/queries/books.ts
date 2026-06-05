import { SupabaseClient } from '@supabase/supabase-js'
import type { BookStatus, UserBookWithBook, BookDetailResult } from '../types'

export async function fetchUserBooks(
  supabase: SupabaseClient,
  userId: string,
  status?: BookStatus
): Promise<UserBookWithBook[]> {
  let query = supabase
    .from('user_books')
    .select('*, book:books(*)')
    .eq('user_id', userId)

  if (status) query = (query as any).eq('status', status)

  const { data, error } = await (query as any).order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchBookDetail(
  supabase: SupabaseClient,
  bookId: string,
  userId: string
): Promise<BookDetailResult> {
  const [bookRes, userBookRes, reviewsRes] = await Promise.all([
    supabase.from('books').select('*').eq('id', bookId).single(),
    supabase.from('user_books').select('*').eq('book_id', bookId).eq('user_id', userId).maybeSingle(),
    supabase
      .from('reviews')
      .select('*, profile:profiles(username, display_name, avatar_url)')
      .eq('book_id', bookId)
      .eq('is_public', true)
      .order('created_at', { ascending: false }),
  ])
  if (bookRes.error) throw bookRes.error
  return {
    book: bookRes.data,
    userBook: userBookRes.data ?? null,
    reviews: (reviewsRes.data as any) ?? [],
  }
}

export async function addBook(
  supabase: SupabaseClient,
  userId: string,
  data: { title: string; author: string; cover_url?: string; publisher?: string; published_year?: number }
) {
  const { data: book, error } = await supabase
    .from('books')
    .insert({ ...data, created_by: userId })
    .select()
    .single()
  if (error) throw error
  return book
}

export async function upsertUserBook(
  supabase: SupabaseClient,
  userId: string,
  bookId: string,
  data: { status: BookStatus; current_page?: number | null; total_pages?: number | null; started_at?: string | null; finished_at?: string | null; memo?: string | null }
) {
  const { data: result, error } = await supabase
    .from('user_books')
    .upsert({ user_id: userId, book_id: bookId, ...data }, { onConflict: 'user_id,book_id' })
    .select()
    .single()
  if (error) throw error
  return result
}

export async function upsertReview(
  supabase: SupabaseClient,
  userId: string,
  bookId: string,
  data: { rating: number; content?: string | null; is_public: boolean }
) {
  const { data: result, error } = await supabase
    .from('reviews')
    .upsert({ user_id: userId, book_id: bookId, ...data }, { onConflict: 'user_id,book_id' })
    .select()
    .single()
  if (error) throw error
  return result
}
