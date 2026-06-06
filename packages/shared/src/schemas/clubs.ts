import { z } from 'zod'

export const createClubSchema = z.object({
  name: z.string().min(1, '클럽 이름을 입력해주세요').max(50),
  description: z.string().max(500).optional(),
  tags: z.array(z.string()).max(5),
  access_type: z.enum(['public', 'private', 'invite_only']),
  max_members: z.number().int().min(2).max(100).optional(),
})

export const createPostSchema = z.object({
  content: z.string().max(2000).optional(),
  image_urls: z.array(z.string().url()).max(4).optional(),
  book_id: z.string().uuid().optional(),
}).refine(
  (d) => d.content || (d.image_urls && d.image_urls.length > 0) || d.book_id,
  { message: '텍스트, 이미지, 책 중 하나 이상 입력해주세요' }
)

export const createMeetupSchema = z.object({
  title: z.string().min(1, '모임 제목을 입력해주세요').max(100),
  description: z.string().max(500).optional(),
  scheduled_at: z.string().min(1, '일시를 선택해주세요'),
  location_text: z.string().max(200).optional(),
  location_map_id: z.string().optional(),
  location_url: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  max_attendees: z.number().int().min(2).max(100).optional(),
})

export const joinByInviteSchema = z.object({
  invite_code: z.string().min(1, '초대 코드를 입력해주세요'),
})

export type CreateClubInput = z.infer<typeof createClubSchema>
export type CreatePostInput = z.infer<typeof createPostSchema>
export type CreateMeetupInput = z.infer<typeof createMeetupSchema>
export type JoinByInviteInput = z.infer<typeof joinByInviteSchema>
