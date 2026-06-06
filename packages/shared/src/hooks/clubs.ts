import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  fetchClubs, fetchMyClubs, fetchClub, fetchClubMembers, fetchClubPosts, fetchClubMeetups,
  createClub, joinClub, requestJoinClub, joinByInviteCode,
  approveMember, rejectMember, updateMemberRole, removeMember,
  createPost, deletePost, createMeetup, updateAttendance,
} from '../queries/clubs'
import type { CreateClubInput, CreatePostInput, CreateMeetupInput } from '../schemas/clubs'
import type { ClubMemberRole, MeetupAttendanceStatus } from '../types/clubs'

export const clubKeys = {
  all: ['clubs'] as const,
  lists: () => [...clubKeys.all, 'list'] as const,
  list: (filter?: { keyword?: string; tags?: string[] }) => [...clubKeys.lists(), filter] as const,
  myList: (userId: string) => [...clubKeys.all, 'my', userId] as const,
  detail: (clubId: string) => [...clubKeys.all, 'detail', clubId] as const,
  members: (clubId: string) => [...clubKeys.all, 'members', clubId] as const,
  posts: (clubId: string) => [...clubKeys.all, 'posts', clubId] as const,
  meetups: (clubId: string) => [...clubKeys.all, 'meetups', clubId] as const,
}

export function useClubs(supabase: SupabaseClient, filter?: { keyword?: string; tags?: string[] }) {
  return useQuery({ queryKey: clubKeys.list(filter), queryFn: () => fetchClubs(supabase, filter) })
}

export function useMyClubs(supabase: SupabaseClient, userId: string) {
  return useQuery({ queryKey: clubKeys.myList(userId), queryFn: () => fetchMyClubs(supabase, userId), enabled: !!userId })
}

export function useClub(supabase: SupabaseClient, clubId: string, userId: string) {
  return useQuery({ queryKey: clubKeys.detail(clubId), queryFn: () => fetchClub(supabase, clubId, userId), enabled: !!clubId && !!userId })
}

export function useClubMembers(supabase: SupabaseClient, clubId: string) {
  return useQuery({ queryKey: clubKeys.members(clubId), queryFn: () => fetchClubMembers(supabase, clubId), enabled: !!clubId })
}

export function useClubPosts(supabase: SupabaseClient, clubId: string) {
  return useQuery({ queryKey: clubKeys.posts(clubId), queryFn: () => fetchClubPosts(supabase, clubId), enabled: !!clubId })
}

export function useClubMeetups(supabase: SupabaseClient, clubId: string) {
  return useQuery({ queryKey: clubKeys.meetups(clubId), queryFn: () => fetchClubMeetups(supabase, clubId), enabled: !!clubId })
}

export function useCreateClub(supabase: SupabaseClient, userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateClubInput) => createClub(supabase, userId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.lists() })
      qc.invalidateQueries({ queryKey: clubKeys.myList(userId) })
    },
  })
}

export function useJoinClub(supabase: SupabaseClient, userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (clubId: string) => joinClub(supabase, userId, clubId),
    onSuccess: (_, clubId) => {
      qc.invalidateQueries({ queryKey: clubKeys.detail(clubId) })
      qc.invalidateQueries({ queryKey: clubKeys.myList(userId) })
    },
  })
}

export function useRequestJoinClub(supabase: SupabaseClient, userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (clubId: string) => requestJoinClub(supabase, userId, clubId),
    onSuccess: (_, clubId) => qc.invalidateQueries({ queryKey: clubKeys.detail(clubId) }),
  })
}

export function useJoinByInviteCode(supabase: SupabaseClient, userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inviteCode: string) => joinByInviteCode(supabase, userId, inviteCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.lists() })
      qc.invalidateQueries({ queryKey: clubKeys.myList(userId) })
    },
  })
}

export function useApproveMember(supabase: SupabaseClient, clubId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) => approveMember(supabase, memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: clubKeys.members(clubId) }),
  })
}

export function useRejectMember(supabase: SupabaseClient, clubId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) => rejectMember(supabase, memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: clubKeys.members(clubId) }),
  })
}

export function useUpdateMemberRole(supabase: SupabaseClient, clubId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: ClubMemberRole }) => updateMemberRole(supabase, memberId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: clubKeys.members(clubId) }),
  })
}

export function useRemoveMember(supabase: SupabaseClient, clubId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) => removeMember(supabase, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clubKeys.members(clubId) })
      qc.invalidateQueries({ queryKey: clubKeys.detail(clubId) })
    },
  })
}

export function useCreatePost(supabase: SupabaseClient, clubId: string, authorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePostInput) => createPost(supabase, clubId, authorId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: clubKeys.posts(clubId) }),
  })
}

export function useDeletePost(supabase: SupabaseClient, clubId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (postId: string) => deletePost(supabase, postId),
    onSuccess: () => qc.invalidateQueries({ queryKey: clubKeys.posts(clubId) }),
  })
}

export function useCreateMeetup(supabase: SupabaseClient, clubId: string, userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMeetupInput) => createMeetup(supabase, clubId, userId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: clubKeys.meetups(clubId) }),
  })
}

export function useUpdateAttendance(supabase: SupabaseClient, clubId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ meetupId, userId, status }: { meetupId: string; userId: string; status: MeetupAttendanceStatus }) =>
      updateAttendance(supabase, meetupId, userId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: clubKeys.meetups(clubId) }),
  })
}
