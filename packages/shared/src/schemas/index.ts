import { z } from 'zod'

export const addBookSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요'),
  author: z.string().min(1, '저자를 입력해주세요'),
  cover_url: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  publisher: z.string().optional(),
  published_year: z.number().int().min(1000).max(2100).optional(),
})

export const updateProgressSchema = z.object({
  status: z.enum(['want_to_read', 'reading', 'finished']),
  current_page: z.number().int().min(0).optional(),
  total_pages: z.number().int().min(1).optional(),
  started_at: z.string().optional(),
  finished_at: z.string().optional(),
  memo: z.string().max(1000).optional(),
})

export const writeReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  content: z.string().max(2000).optional(),
  is_public: z.boolean().default(true),
})

export const loginSchema = z.object({
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
})

export const registerSchema = z.object({
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
})

export const onboardingSchema = z.object({
  username: z.string()
    .min(2, '2자 이상 입력해주세요')
    .max(20, '20자 이하로 입력해주세요')
    .regex(/^[a-zA-Z0-9_]+$/, '영문, 숫자, 밑줄(_)만 사용 가능합니다'),
  display_name: z.string().min(1, '이름을 입력해주세요').max(30),
})

export type AddBookInput = z.infer<typeof addBookSchema>
export type UpdateProgressInput = z.infer<typeof updateProgressSchema>
export type WriteReviewInput = z.infer<typeof writeReviewSchema>
export type OnboardingInput = z.infer<typeof onboardingSchema>

export * from './clubs'
