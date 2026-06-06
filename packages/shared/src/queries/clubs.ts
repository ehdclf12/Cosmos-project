import { SupabaseClient } from '@supabase/supabase-js'
import type { Club, ClubMember, ClubPost, ClubMeetup, ClubDetailResult, ClubMemberRole, MeetupAttendanceStatus } from '../types/clubs'
import type { CreateClubInput, CreatePostInput, CreateMeetupInput } from '../schemas/clubs'

const PAGE_SIZE = 20

export async function fetchClubs(
  supabase: SupabaseClient,
  filter?: { keyword?: string; tags?: string[] }
): Promise<Club[]> {
  let query = supabase.from('clubs').select('*')
  if (filter?.keyword) query = query.ilike('name', `%${filter.keyword}%`)
  if (filter?.tags?.length) query = query.overlaps('tags', filter.tags)
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data as Club[]
}

export async function fetchMyClubs(
  supabase: SupabaseClient,
  userId: string
): Promise<Club[]> {
  const { data, error } = await supabase
    .from('club_members')
    .select('club:clubs(*)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('joined_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row: any) => row.club).filter(Boolean) as Club[]
}

export async function fetchClub(
  supabase: SupabaseClient,
  clubId: string,
  userId: string
): Promise<ClubDetailResult> {
  const from = supabase.from.bind(supabase)
  const [clubRes, myMemberRes, countRes] = await Promise.all([
    from('clubs').select('*').eq('id', clubId).single(),
    from('club_members').select('*').eq('club_id', clubId).eq('user_id', userId).maybeSingle(),
    from('club_members').select('*', { count: 'exact', head: true } as any).eq('club_id', clubId).eq('status', 'active'),
  ])
  if (clubRes.error) throw clubRes.error
  if (myMemberRes.error) throw myMemberRes.error
  if ((countRes as any).error) throw (countRes as any).error
  return {
    club: clubRes.data as Club,
    myMembership: (myMemberRes.data ?? null) as ClubMember | null,
    memberCount: (countRes as any).count ?? 0,
  }
}

export async function fetchClubMembers(
  supabase: SupabaseClient,
  clubId: string
): Promise<ClubMember[]> {
  const { data, error } = await supabase
    .from('club_members')
    .select('*, profile:profiles(username, display_name, avatar_url)')
    .eq('club_id', clubId)
    .order('joined_at', { ascending: true })
  if (error) throw error
  return data as ClubMember[]
}

export async function fetchClubPosts(
  supabase: SupabaseClient,
  clubId: string,
  page = 0
): Promise<ClubPost[]> {
  const { data, error } = await supabase
    .from('club_posts')
    .select('*, author:profiles(username, display_name, avatar_url), book:books(title, author, cover_url)')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
  if (error) throw error
  return data as ClubPost[]
}

export async function fetchClubMeetups(
  supabase: SupabaseClient,
  clubId: string
): Promise<ClubMeetup[]> {
  const { data, error } = await supabase
    .from('club_meetups')
    .select('*')
    .eq('club_id', clubId)
    .order('scheduled_at', { ascending: true })
  if (error) throw error
  return data as ClubMeetup[]
}

export async function createClub(
  supabase: SupabaseClient,
  userId: string,
  data: CreateClubInput
): Promise<Club> {
  const { data: club, error } = await supabase
    .from('clubs')
    .insert({ ...data, created_by: userId })
    .select()
    .single()
  if (error) throw error
  const { error: memberError } = await supabase
    .from('club_members')
    .insert({ club_id: (club as Club).id, user_id: userId, role: 'leader', status: 'active' })
  if (memberError) {
    await supabase.from('clubs').delete().eq('id', (club as Club).id)
    throw memberError
  }
  return club as Club
}

export async function joinClub(
  supabase: SupabaseClient,
  userId: string,
  clubId: string
): Promise<ClubMember> {
  const { data, error } = await supabase
    .from('club_members')
    .insert({ club_id: clubId, user_id: userId, role: 'member', status: 'active' })
    .select()
    .single()
  if (error) {
    if (error.code === '23505') throw new Error('이미 가입된 클럽입니다')
    throw error
  }
  return data as ClubMember
}

export async function requestJoinClub(
  supabase: SupabaseClient,
  userId: string,
  clubId: string
): Promise<ClubMember> {
  const { data, error } = await supabase
    .from('club_members')
    .insert({ club_id: clubId, user_id: userId, role: 'member', status: 'pending' })
    .select()
    .single()
  if (error) {
    if (error.code === '23505') throw new Error('이미 가입되어 있거나 승인 대기 중입니다')
    throw error
  }
  return data as ClubMember
}

export async function joinByInviteCode(
  supabase: SupabaseClient,
  userId: string,
  inviteCode: string
): Promise<ClubMember> {
  const { data: club, error: clubErr } = await supabase
    .from('clubs')
    .select('id')
    .eq('invite_code', inviteCode)
    .single()
  if (clubErr) {
    if (clubErr.code === 'PGRST116') throw new Error('유효하지 않은 초대 코드입니다')
    throw clubErr
  }
  return joinClub(supabase, userId, (club as { id: string }).id)
}

export async function approveMember(
  supabase: SupabaseClient,
  memberId: string
): Promise<void> {
  const { error } = await supabase
    .from('club_members')
    .update({ status: 'active' })
    .eq('id', memberId)
  if (error) throw error
}

export async function rejectMember(
  supabase: SupabaseClient,
  memberId: string
): Promise<void> {
  const { error } = await supabase.from('club_members').delete().eq('id', memberId).eq('status', 'pending')
  if (error) throw error
}

export async function updateMemberRole(
  supabase: SupabaseClient,
  memberId: string,
  role: ClubMemberRole
): Promise<void> {
  const { error } = await supabase
    .from('club_members')
    .update({ role })
    .eq('id', memberId)
  if (error) throw error
}

export async function removeMember(
  supabase: SupabaseClient,
  memberId: string
): Promise<void> {
  const { error } = await supabase.from('club_members').delete().eq('id', memberId).eq('status', 'active')
  if (error) throw error
}

export async function createPost(
  supabase: SupabaseClient,
  clubId: string,
  authorId: string,
  data: CreatePostInput
): Promise<ClubPost> {
  const { data: post, error } = await supabase
    .from('club_posts')
    .insert({ club_id: clubId, author_id: authorId, ...data })
    .select('*, author:profiles(username, display_name, avatar_url), book:books(title, author, cover_url)')
    .single()
  if (error) throw error
  return post as ClubPost
}

export async function deletePost(
  supabase: SupabaseClient,
  postId: string
): Promise<void> {
  const { error } = await supabase.from('club_posts').delete().eq('id', postId)
  if (error) throw error
}

export async function createMeetup(
  supabase: SupabaseClient,
  clubId: string,
  createdBy: string,
  data: CreateMeetupInput
): Promise<ClubMeetup> {
  const { data: meetup, error } = await supabase
    .from('club_meetups')
    .insert({ club_id: clubId, created_by: createdBy, ...data })
    .select()
    .single()
  if (error) throw error
  return meetup as ClubMeetup
}

export async function updateAttendance(
  supabase: SupabaseClient,
  meetupId: string,
  userId: string,
  status: MeetupAttendanceStatus
): Promise<void> {
  const { error } = await supabase
    .from('club_meetup_attendees')
    .upsert({ meetup_id: meetupId, user_id: userId, status }, { onConflict: 'meetup_id,user_id' })
  if (error) throw error
}
