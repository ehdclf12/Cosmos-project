import { addBookSchema, writeReviewSchema, onboardingSchema, updateProgressSchema } from '../schemas'

describe('addBookSchema', () => {
  it('accepts valid book data', () => {
    expect(addBookSchema.safeParse({ title: '코스모스', author: '칼 세이건' }).success).toBe(true)
  })
  it('rejects empty title', () => {
    expect(addBookSchema.safeParse({ title: '', author: '저자' }).success).toBe(false)
  })
  it('rejects empty author', () => {
    expect(addBookSchema.safeParse({ title: '책 제목', author: '' }).success).toBe(false)
  })
})

describe('writeReviewSchema', () => {
  it('accepts rating 1~5', () => {
    expect(writeReviewSchema.safeParse({ rating: 1, is_public: true }).success).toBe(true)
    expect(writeReviewSchema.safeParse({ rating: 5, is_public: true }).success).toBe(true)
  })
  it('rejects rating 0 or 6', () => {
    expect(writeReviewSchema.safeParse({ rating: 0, is_public: true }).success).toBe(false)
    expect(writeReviewSchema.safeParse({ rating: 6, is_public: true }).success).toBe(false)
  })
})

describe('onboardingSchema', () => {
  it('accepts valid username with letters, numbers, underscore', () => {
    expect(onboardingSchema.safeParse({ username: 'user_123', display_name: '독자' }).success).toBe(true)
  })
  it('rejects username with special characters', () => {
    expect(onboardingSchema.safeParse({ username: 'user@name', display_name: '독자' }).success).toBe(false)
  })
  it('rejects username shorter than 2 chars', () => {
    expect(onboardingSchema.safeParse({ username: 'a', display_name: '독자' }).success).toBe(false)
  })
})

describe('updateProgressSchema', () => {
  it('accepts valid status', () => {
    expect(updateProgressSchema.safeParse({ status: 'reading' }).success).toBe(true)
  })
  it('rejects invalid status', () => {
    expect(updateProgressSchema.safeParse({ status: 'done' }).success).toBe(false)
  })
})
