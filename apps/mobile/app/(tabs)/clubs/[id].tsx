import { View, Text, FlatList, TouchableOpacity, TextInput, ScrollView, StyleSheet, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import {
  useClub, useJoinClub, useRequestJoinClub, useJoinByInviteCode,
  useClubPosts, useCreatePost, useDeletePost,
  useClubMeetups, useUpdateAttendance,
  useClubMembers, useApproveMember, useRejectMember, useUpdateMemberRole, useRemoveMember,
} from '@cosmos/shared'
import type { ClubPost, ClubMeetup, ClubMember, MeetupAttendanceStatus } from '@cosmos/shared'
import { supabase } from '../../../lib/supabase'

type Tab = 'feed' | 'meetups' | 'members'

export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('feed')
  const [inviteCode, setInviteCode] = useState('')
  const [postContent, setPostContent] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user?.id ?? null))
  }, [])

  const { data, isLoading } = useClub(supabase, id ?? '', userId ?? '')
  const joinClubMut = useJoinClub(supabase, userId ?? '')
  const requestJoinMut = useRequestJoinClub(supabase, userId ?? '')
  const joinByCodeMut = useJoinByInviteCode(supabase, userId ?? '')

  const { data: posts = [], refetch: refetchPosts } = useClubPosts(supabase, id ?? '')
  const createPost = useCreatePost(supabase, id ?? '', userId ?? '')
  const deletePostMut = useDeletePost(supabase, id ?? '')

  const { data: meetups = [], refetch: refetchMeetups } = useClubMeetups(supabase, id ?? '')
  const updateAttendance = useUpdateAttendance(supabase, id ?? '')

  const { data: members = [], refetch: refetchMembers } = useClubMembers(supabase, id ?? '')
  const approveMut = useApproveMember(supabase, id ?? '')
  const rejectMut = useRejectMember(supabase, id ?? '')
  const updateRoleMut = useUpdateMemberRole(supabase, id ?? '')
  const removeMut = useRemoveMember(supabase, id ?? '')

  if (isLoading) return <View style={s.container}><Text style={s.muted}>불러오는 중...</Text></View>
  if (!data) return <View style={s.container}><Text style={s.muted}>클럽을 찾을 수 없습니다.</Text></View>

  const { club, myMembership, memberCount } = data
  const myRole = myMembership?.role
  const isActive = myMembership?.status === 'active'
  const isPendingMember = myMembership?.status === 'pending'
  const canManage = myRole === 'leader' || myRole === 'admin'

  async function handleJoin() {
    try {
      if (club.access_type === 'public') await joinClubMut.mutateAsync(id ?? '')
      else await requestJoinMut.mutateAsync(id ?? '')
    } catch (e: any) { Alert.alert('알림', e.message) }
  }

  async function handleInviteJoin() {
    try {
      await joinByCodeMut.mutateAsync(inviteCode)
    } catch (e: any) { Alert.alert('오류', e.message) }
  }

  async function handleCreatePost() {
    if (!postContent.trim()) return
    await createPost.mutateAsync({ content: postContent })
    setPostContent('')
  }

  if (!isActive) {
    return (
      <ScrollView style={s.container}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={s.muted}>← 뒤로</Text>
        </TouchableOpacity>
        <View style={s.clubCard}>
          <Text style={s.clubName}>{club.name}</Text>
          {club.description ? <Text style={s.clubDesc}>{club.description}</Text> : null}
          <Text style={s.muted}>멤버 {memberCount}명</Text>
        </View>

        {isPendingMember ? (
          <Text style={[s.muted, { textAlign: 'center', marginTop: 40 }]}>가입 신청 승인 대기 중입니다.</Text>
        ) : club.access_type === 'invite_only' ? (
          <View style={{ marginTop: 20, gap: 12 }}>
            <TextInput value={inviteCode} onChangeText={setInviteCode}
              style={s.input} placeholder="초대 코드 입력 (8자리)" placeholderTextColor="#A8A49C"
              autoCapitalize="characters" maxLength={8} />
            <TouchableOpacity style={s.primaryBtn} onPress={handleInviteJoin}>
              <Text style={s.primaryBtnText}>참여하기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[s.primaryBtn, { marginTop: 20 }]} onPress={handleJoin}>
            <Text style={s.primaryBtnText}>{club.access_type === 'public' ? '참여하기' : '가입 신청'}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    )
  }

  return (
    <View style={s.container}>
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 12 }}>
        <Text style={s.muted}>← 뒤로</Text>
      </TouchableOpacity>

      <View style={s.clubCard}>
        <Text style={s.clubName}>{club.name}</Text>
        {club.description ? <Text style={s.clubDesc}>{club.description}</Text> : null}
        <Text style={s.muted}>멤버 {memberCount}명</Text>
      </View>

      <View style={s.tabRow}>
        {(['feed', 'meetups', 'members'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'feed' ? '피드' : t === 'meetups' ? '모임' : '멤버'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'feed' && (
        <FlatList
          data={posts as ClubPost[]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 80 }}
          refreshing={false}
          onRefresh={refetchPosts}
          ListHeaderComponent={
            <View style={s.postInput}>
              <TextInput value={postContent} onChangeText={setPostContent}
                style={{ fontSize: 13, color: '#1C1C1C', minHeight: 60 }}
                placeholder="클럽 멤버들과 이야기를 나눠보세요..." placeholderTextColor="#A8A49C"
                multiline />
              <TouchableOpacity style={[s.postBtn, !postContent.trim() && { opacity: 0.4 }]}
                onPress={handleCreatePost} disabled={!postContent.trim() || createPost.isPending}>
                <Text style={{ color: 'white', fontSize: 12 }}>올리기</Text>
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={<Text style={[s.muted, { textAlign: 'center', marginTop: 40 }]}>아직 게시물이 없어요.</Text>}
          renderItem={({ item: post }) => (
            <View style={s.postCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={s.postAuthor}>{post.author?.display_name ?? '알 수 없음'}</Text>
                <Text style={s.muted}>{new Date(post.created_at).toLocaleDateString('ko-KR')}</Text>
              </View>
              {post.content ? <Text style={s.postContent}>{post.content}</Text> : null}
              {post.book && (
                <View style={s.bookChip}>
                  <Text style={{ fontSize: 16 }}>📖</Text>
                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: '#1C1C1C' }}>{post.book.title}</Text>
                    <Text style={{ fontSize: 11, color: '#6B6862' }}>{post.book.author}</Text>
                  </View>
                </View>
              )}
              {(post.author_id === userId || canManage) && (
                <TouchableOpacity onPress={() => deletePostMut.mutate(post.id)}>
                  <Text style={[s.muted, { marginTop: 6 }]}>삭제</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}

      {tab === 'meetups' && (
        <FlatList
          data={meetups as ClubMeetup[]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 80 }}
          refreshing={false}
          onRefresh={refetchMeetups}
          ListEmptyComponent={<Text style={[s.muted, { textAlign: 'center', marginTop: 40 }]}>예정된 모임이 없어요.</Text>}
          renderItem={({ item: meetup }) => (
            <View style={s.meetupCard}>
              <Text style={s.meetupTitle}>{meetup.title}</Text>
              <Text style={s.muted}>
                {new Date(meetup.scheduled_at).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Text>
              {meetup.location_text ? <Text style={s.muted}>📍 {meetup.location_text}</Text> : null}
              {meetup.description ? <Text style={[s.muted, { marginTop: 4 }]}>{meetup.description}</Text> : null}
              <View style={s.attendRow}>
                {(['going', 'maybe', 'not_going'] as MeetupAttendanceStatus[]).map((st) => (
                  <TouchableOpacity key={st} style={s.attendBtn}
                    onPress={() => updateAttendance.mutate({ meetupId: meetup.id, userId: userId ?? '', status: st })}>
                    <Text style={s.attendBtnText}>{{ going: '갈게요', maybe: '미정', not_going: '못 가요' }[st]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        />
      )}

      {tab === 'members' && (
        <FlatList
          data={members as ClubMember[]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 8, paddingBottom: 80 }}
          refreshing={false}
          onRefresh={refetchMembers}
          renderItem={({ item: m }) => (
            <View style={s.memberRow}>
              <View>
                <Text style={{ fontSize: 14, color: '#1C1C1C' }}>{m.profile?.display_name ?? m.user_id}</Text>
                <Text style={s.muted}>{{ leader: '클럽장', admin: '운영진', member: '멤버' }[m.role]}{m.status === 'pending' ? ' (대기 중)' : ''}</Text>
              </View>
              {m.status === 'pending' && canManage && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={s.primaryBtn} onPress={() => approveMut.mutate(m.id)}>
                    <Text style={s.primaryBtnText}>승인</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => rejectMut.mutate(m.id)}>
                    <Text style={s.muted}>거절</Text>
                  </TouchableOpacity>
                </View>
              )}
              {m.status === 'active' && myRole === 'leader' && m.user_id !== userId && (
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {m.role === 'member' && (
                    <TouchableOpacity onPress={() => updateRoleMut.mutate({ memberId: m.id, role: 'admin' })}>
                      <Text style={s.muted}>운영진 임명</Text>
                    </TouchableOpacity>
                  )}
                  {m.role === 'admin' && (
                    <TouchableOpacity onPress={() => updateRoleMut.mutate({ memberId: m.id, role: 'member' })}>
                      <Text style={s.muted}>해제</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => removeMut.mutate(m.id)}>
                    <Text style={s.muted}>강퇴</Text>
                  </TouchableOpacity>
                </View>
              )}
              {m.status === 'active' && m.user_id === userId && m.role !== 'leader' && (
                <TouchableOpacity onPress={() => removeMut.mutate(m.id)}>
                  <Text style={s.muted}>탈퇴</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F1EE', paddingHorizontal: 20, paddingTop: 60 },
  muted: { fontSize: 12, color: '#A8A49C' },
  clubCard: { backgroundColor: '#C8C5BC', borderRadius: 16, padding: 16, marginBottom: 16 },
  clubName: { fontSize: 20, fontWeight: '500', color: '#1C1C1C', marginBottom: 4 },
  clubDesc: { fontSize: 13, color: '#6B6862', marginBottom: 6, lineHeight: 20 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#E8E5E0' },
  tabActive: { backgroundColor: '#1C1C1C' },
  tabText: { fontSize: 12, color: '#6B6862' },
  tabTextActive: { color: 'white' },
  postInput: { backgroundColor: '#E8E5E0', borderRadius: 14, padding: 14, marginBottom: 12 },
  postBtn: { alignSelf: 'flex-end', backgroundColor: '#1C1C1C', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, marginTop: 6 },
  postCard: { backgroundColor: '#C8C5BC', borderRadius: 14, padding: 14 },
  postAuthor: { fontSize: 13, fontWeight: '500', color: '#1C1C1C' },
  postContent: { fontSize: 13, color: '#1C1C1C', lineHeight: 20 },
  bookChip: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#B8B4AC', borderRadius: 10, padding: 8, marginTop: 6 },
  meetupCard: { backgroundColor: '#C8C5BC', borderRadius: 14, padding: 14 },
  meetupTitle: { fontSize: 15, fontWeight: '500', color: '#1C1C1C', marginBottom: 4 },
  attendRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  attendBtn: { backgroundColor: '#E8E5E0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  attendBtnText: { fontSize: 12, color: '#1C1C1C' },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#E8E5E0', borderRadius: 12, padding: 12 },
  input: { backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1C1C1C', borderWidth: 1, borderColor: '#E8E5E0' },
  primaryBtn: { backgroundColor: '#1C1C1C', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: 'white', fontSize: 13 },
})
