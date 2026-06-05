import { fetchUserBooks, addBook } from '../queries/books'

const makeMockSupabase = (resolvedValue: { data: unknown; error: unknown }) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue(resolvedValue),
    insert: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(resolvedValue),
    maybeSingle: jest.fn().mockResolvedValue(resolvedValue),
  }
  return { from: jest.fn().mockReturnValue(chain), _chain: chain }
}

describe('fetchUserBooks', () => {
  it('fetches books for user and returns data', async () => {
    const mockBooks = [{ id: '1', status: 'reading', book: { title: '코스모스' } }]
    const { _chain, ...supabase } = makeMockSupabase({ data: mockBooks, error: null })
    const result = await fetchUserBooks(supabase as any, 'user-1')
    expect(result).toEqual(mockBooks)
  })

  it('throws when supabase returns error', async () => {
    const { _chain, ...supabase } = makeMockSupabase({ data: null, error: new Error('DB error') })
    await expect(fetchUserBooks(supabase as any, 'user-1')).rejects.toThrow('DB error')
  })
})

describe('addBook', () => {
  it('inserts book with created_by and returns result', async () => {
    const mockBook = { id: 'b1', title: '코스모스', author: '칼 세이건' }
    const { _chain, ...supabase } = makeMockSupabase({ data: mockBook, error: null })
    const result = await addBook(supabase as any, 'user-1', { title: '코스모스', author: '칼 세이건' })
    expect(result).toEqual(mockBook)
  })
})
