import { createClubSchema, createPostSchema, createMeetupSchema, joinByInviteSchema } from '../schemas'

describe('createClubSchema', () => {
  it('accepts valid public club', () => {
    expect(createClubSchema.safeParse({ name: '책 읽는 모임', tags: [], access_type: 'public' }).success).toBe(true)
  })
  it('rejects empty name', () => {
    expect(createClubSchema.safeParse({ name: '', tags: [], access_type: 'public' }).success).toBe(false)
  })
  it('rejects invalid access_type', () => {
    expect(createClubSchema.safeParse({ name: '모임', tags: [], access_type: 'secret' }).success).toBe(false)
  })
  it('rejects max_members below 2', () => {
    expect(createClubSchema.safeParse({ name: '모임', tags: [], access_type: 'public', max_members: 1 }).success).toBe(false)
  })
})

describe('createPostSchema', () => {
  it('accepts text-only post', () => {
    expect(createPostSchema.safeParse({ content: '안녕하세요' }).success).toBe(true)
  })
  it('accepts image-only post', () => {
    expect(createPostSchema.safeParse({ image_urls: ['https://example.com/img.jpg'] }).success).toBe(true)
  })
  it('rejects empty post (no content, image, or book)', () => {
    expect(createPostSchema.safeParse({}).success).toBe(false)
  })
})

describe('createMeetupSchema', () => {
  it('accepts valid meetup', () => {
    expect(createMeetupSchema.safeParse({ title: '5월 모임', scheduled_at: '2026-05-10T14:00:00Z' }).success).toBe(true)
  })
  it('rejects empty title', () => {
    expect(createMeetupSchema.safeParse({ title: '', scheduled_at: '2026-05-10T14:00:00Z' }).success).toBe(false)
  })
})

describe('joinByInviteSchema', () => {
  it('accepts non-empty code', () => {
    expect(joinByInviteSchema.safeParse({ invite_code: 'ABC12345' }).success).toBe(true)
  })
  it('rejects empty code', () => {
    expect(joinByInviteSchema.safeParse({ invite_code: '' }).success).toBe(false)
  })
})
