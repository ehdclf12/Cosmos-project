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
