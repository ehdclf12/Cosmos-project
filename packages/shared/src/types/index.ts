export type BookStatus = 'want_to_read' | 'reading' | 'finished'

export type Profile = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  created_at: string
}

export type Book = {
  id: string
  title: string
  author: string
  cover_url: string | null
  publisher: string | null
  published_year: number | null
  created_by: string | null
  created_at: string
}

export type UserBook = {
  id: string
  user_id: string
  book_id: string
  status: BookStatus
  current_page: number | null
  total_pages: number | null
  started_at: string | null
  finished_at: string | null
  memo: string | null
  created_at: string
}

export type Review = {
  id: string
  user_id: string
  book_id: string
  rating: number
  content: string | null
  is_public: boolean
  created_at: string
  profile?: Pick<Profile, 'username' | 'display_name' | 'avatar_url'>
}

export type UserBookWithBook = UserBook & { book: Book }
export type BookDetailResult = {
  book: Book
  userBook: UserBook | null
  reviews: Review[]
}
