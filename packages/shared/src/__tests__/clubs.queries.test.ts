import { fetchClubs, fetchMyClubs, fetchClub, fetchClubMembers, fetchClubPosts, fetchClubMeetups } from '../queries/clubs'

const makeChain = (resolved: { data: unknown; error: unknown; count?: number }) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  overlaps: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  range: jest.fn().mockResolvedValue(resolved),
  single: jest.fn().mockResolvedValue(resolved),
  maybeSingle: jest.fn().mockResolvedValue(resolved),
})

const makeMock = (resolved: { data: unknown; error: unknown; count?: number }) => {
  const chain = makeChain(resolved)
  return { from: jest.fn().mockReturnValue(chain), _chain: chain }
}

describe('fetchClubs', () => {
  it('returns club list', async () => {
    const clubs = [{ id: 'c1', name: '코스모스 클럽' }]
    const { _chain, ...supabase } = makeMock({ data: clubs, error: null })
    const result = await fetchClubs(supabase as any)
    expect(result).toEqual(clubs)
  })
  it('throws on error', async () => {
    const { _chain, ...supabase } = makeMock({ data: null, error: new Error('DB error') })
    await expect(fetchClubs(supabase as any)).rejects.toThrow('DB error')
  })
})

describe('fetchClub', () => {
  it('returns club detail with membership and count', async () => {
    const club = { id: 'c1', name: '테스트 클럽' }
    const supabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: club, error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }
    const result = await fetchClub(supabase as any, 'c1', 'u1')
    expect(result.club).toEqual(club)
    expect(result.myMembership).toBeNull()
  })
})

describe('fetchClubPosts', () => {
  it('returns posts for club', async () => {
    const posts = [{ id: 'p1', content: '안녕' }]
    const { _chain, ...supabase } = makeMock({ data: posts, error: null })
    const result = await fetchClubPosts(supabase as any, 'c1')
    expect(result).toEqual(posts)
  })
})
