'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  useClub, useJoinClub, useRequestJoinClub, useJoinByInviteCode,
  useClubPosts, useCreatePost, useDeletePost,
  useClubMeetups, useUpdateAttendance,
  useClubMembers, useApproveMember, useRejectMember, useUpdateMemberRole, useRemoveMember,
} from '@cosmos/shared'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import type { ClubPost, ClubMeetup, ClubMember, MeetupAttendanceStatus } from '@cosmos/shared'
import Link from 'next/link'

type Tab = 'feed' | 'meetups' | 'members'

export default function ClubDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { userId, supabase } = useSupabaseUser()
  const [tab, setTab] = useState<Tab>('feed')
  const [inviteCode, setInviteCode] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [postContent, setPostContent] = useState('')

  const { data, isLoading } = useClub(supabase, id, userId ?? '')
  const joinClub = useJoinClub(supabase, userId ?? '')
  const requestJoin = useRequestJoinClub(supabase, userId ?? '')
  const joinByCode = useJoinByInviteCode(supabase, userId ?? '')

  const { data: posts = [] } = useClubPosts(supabase, id)
  const createPost = useCreatePost(supabase, id, userId ?? '')
  const deletePostMutation = useDeletePost(supabase, id)

  const { data: meetups = [] } = useClubMeetups(supabase, id)
  const updateAttendance = useUpdateAttendance(supabase, id)

  const { data: members = [] } = useClubMembers(supabase, id)
  const approveMember = useApproveMember(supabase, id)
  const rejectMember = useRejectMember(supabase, id)
  const updateRole = useUpdateMemberRole(supabase, id)
  const removeMember = useRemoveMember(supabase, id)

  if (isLoading) return <p className="text-sm" style={{ color: '#A8A49C' }}>불러오는 중...</p>
  if (!data) return <p className="text-sm text-red-400">클럽을 찾을 수 없습니다.</p>

  const { club, myMembership, memberCount } = data
  const myRole = myMembership?.role
  const isActive = myMembership?.status === 'active'
  const isPending = myMembership?.status === 'pending'
  const canManage = myRole === 'leader' || myRole === 'admin'

  async function handleJoin() {
    try {
      if (club.access_type === 'public') await joinClub.mutateAsync(id)
      else await requestJoin.mutateAsync(id)
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function handleInviteJoin() {
    setInviteError('')
    try {
      await joinByCode.mutateAsync(inviteCode)
    } catch (e: any) {
      setInviteError(e.message)
    }
  }

  async function handleCreatePost() {
    if (!postContent.trim()) return
    await createPost.mutateAsync({ content: postContent })
    setPostContent('')
  }

  if (!isActive) {
    return (
      <div className="max-w-lg">
        <button onClick={() => router.back()} className="text-sm mb-4" style={{ color: '#A8A49C' }}>← 뒤로</button>
        <div className="rounded-2xl p-6 mb-4" style={{ backgroundColor: '#C8C5BC' }}>
          <h1 className="text-xl font-medium mb-2" style={{ color: '#1C1C1C' }}>{club.name}</h1>
          {club.description && <p className="text-sm mb-3" style={{ color: '#6B6862' }}>{club.description}</p>}
          <p className="text-xs" style={{ color: '#A8A49C' }}>멤버 {memberCount}명</p>
        </div>

        {isPending ? (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: '#A8A49C' }}>가입 신청 승인 대기 중입니다.</p>
          </div>
        ) : club.access_type === 'invite_only' ? (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: '#1C1C1C' }}>초대 코드를 입력해주세요</p>
            <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400 bg-white uppercase tracking-widest"
              placeholder="ABCD1234" maxLength={8} />
            {inviteError && <p className="text-xs text-red-400">{inviteError}</p>}
            <button onClick={handleInviteJoin} disabled={joinByCode.isPending}
              className="w-full py-3 rounded-xl text-sm text-white disabled:opacity-50"
              style={{ backgroundColor: '#1C1C1C' }}>
              {joinByCode.isPending ? '확인 중...' : '참여하기'}
            </button>
          </div>
        ) : (
          <button onClick={handleJoin}
            disabled={joinClub.isPending || requestJoin.isPending}
            className="w-full py-3 rounded-xl text-sm text-white disabled:opacity-50"
            style={{ backgroundColor: '#1C1C1C' }}>
            {club.access_type === 'public' ? '참여하기' : '가입 신청'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.back()} className="text-sm" style={{ color: '#A8A49C' }}>← 뒤로</button>
        {canManage && club.access_type === 'invite_only' && club.invite_code && (
          <span className="text-xs px-3 py-1 rounded-full font-mono" style={{ backgroundColor: '#E8E5E0', color: '#1C1C1C' }}>
            초대 코드: {club.invite_code}
          </span>
        )}
      </div>

      <div className="rounded-2xl p-5 mb-6" style={{ backgroundColor: '#C8C5BC' }}>
        <h1 className="text-xl font-medium mb-1" style={{ color: '#1C1C1C' }}>{club.name}</h1>
        {club.description && <p className="text-sm mb-2" style={{ color: '#6B6862' }}>{club.description}</p>}
        <div className="flex flex-wrap gap-1 mb-2">
          {club.tags.map((t) => (
            <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#E8E5E0', color: '#6B6862' }}>{t}</span>
          ))}
        </div>
        <p className="text-xs" style={{ color: '#A8A49C' }}>멤버 {memberCount}명</p>
      </div>

      <div className="flex gap-2 mb-6">
        {(['feed', 'meetups', 'members'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-full text-sm transition-colors"
            style={{ backgroundColor: tab === t ? '#1C1C1C' : '#E8E5E0', color: tab === t ? 'white' : '#6B6862' }}>
            {t === 'feed' ? '피드' : t === 'meetups' ? '모임' : '멤버'}
          </button>
        ))}
      </div>

      {tab === 'feed' && (
        <FeedTab
          posts={posts} userId={userId ?? ''} canManage={canManage}
          postContent={postContent} setPostContent={setPostContent}
          onSubmit={handleCreatePost} isPending={createPost.isPending}
          onDelete={(postId) => deletePostMutation.mutate(postId)}
        />
      )}
      {tab === 'meetups' && (
        <MeetupsTab
          clubId={id} meetups={meetups} userId={userId ?? ''} canManage={canManage}
          onAttend={(meetupId, status) => updateAttendance.mutate({ meetupId, userId: userId ?? '', status })}
        />
      )}
      {tab === 'members' && (
        <MembersTab
          members={members} myRole={myRole} userId={userId ?? ''}
          onApprove={(id) => approveMember.mutate(id)}
          onReject={(id) => rejectMember.mutate(id)}
          onRoleChange={(id, role) => updateRole.mutate({ memberId: id, role })}
          onRemove={(id) => removeMember.mutate(id)}
        />
      )}
    </div>
  )
}

function FeedTab({ posts, userId, canManage, postContent, setPostContent, onSubmit, isPending, onDelete }: {
  posts: ClubPost[]; userId: string; canManage: boolean
  postContent: string; setPostContent: (v: string) => void
  onSubmit: () => void; isPending: boolean
  onDelete: (id: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4" style={{ backgroundColor: '#E8E5E0' }}>
        <textarea value={postContent} onChange={(e) => setPostContent(e.target.value)}
          className="w-full bg-transparent text-sm outline-none resize-none" rows={3}
          placeholder="클럽 멤버들과 이야기를 나눠보세요..." />
        <div className="flex justify-end mt-2">
          <button onClick={onSubmit} disabled={isPending || !postContent.trim()}
            className="px-4 py-1.5 rounded-lg text-sm text-white disabled:opacity-50"
            style={{ backgroundColor: '#1C1C1C' }}>
            {isPending ? '올리는 중...' : '올리기'}
          </button>
        </div>
      </div>

      {posts.map((post: ClubPost) => (
        <div key={post.id} className="rounded-2xl p-4" style={{ backgroundColor: '#C8C5BC' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: '#1C1C1C' }}>
              {post.author?.display_name ?? post.author?.username ?? '알 수 없음'}
            </span>
            <span className="text-xs" style={{ color: '#A8A49C' }}>
              {new Date(post.created_at).toLocaleDateString('ko-KR')}
            </span>
          </div>
          {post.content && <p className="text-sm mb-2" style={{ color: '#1C1C1C' }}>{post.content}</p>}
          {post.book && (
            <div className="flex items-center gap-2 p-2 rounded-xl mt-1" style={{ backgroundColor: '#B8B4AC' }}>
              <span className="text-lg">📖</span>
              <div>
                <p className="text-xs font-medium" style={{ color: '#1C1C1C' }}>{post.book.title}</p>
                <p className="text-xs" style={{ color: '#6B6862' }}>{post.book.author}</p>
              </div>
            </div>
          )}
          {(post.author_id === userId || canManage) && (
            <button onClick={() => onDelete(post.id)} className="text-xs mt-2" style={{ color: '#A8A49C' }}>
              삭제
            </button>
          )}
        </div>
      ))}

      {posts.length === 0 && (
        <p className="text-center py-12 text-sm" style={{ color: '#A8A49C' }}>아직 게시물이 없어요.</p>
      )}
    </div>
  )
}

function MeetupsTab({ clubId, meetups, userId, canManage, onAttend }: {
  clubId: string; meetups: ClubMeetup[]; userId: string; canManage: boolean
  onAttend: (meetupId: string, status: MeetupAttendanceStatus) => void
}) {
  const ATTEND_LABELS: Record<MeetupAttendanceStatus, string> = { going: '갈게요', maybe: '미정', not_going: '못 가요' }
  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Link href={`/clubs/${clubId}/meetups/new`}
            className="px-4 py-2 rounded-xl text-sm text-white" style={{ backgroundColor: '#1C1C1C' }}>
            + 모임 만들기
          </Link>
        </div>
      )}

      {meetups.map((meetup: ClubMeetup) => (
        <div key={meetup.id} className="rounded-2xl p-5" style={{ backgroundColor: '#C8C5BC' }}>
          <h3 className="font-medium mb-1" style={{ color: '#1C1C1C' }}>{meetup.title}</h3>
          <p className="text-sm mb-2" style={{ color: '#6B6862' }}>
            {new Date(meetup.scheduled_at).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
          {meetup.location_text && <p className="text-xs mb-1" style={{ color: '#6B6862' }}>📍 {meetup.location_text}</p>}
          {meetup.location_url && (
            <a href={meetup.location_url} target="_blank" rel="noopener noreferrer"
              className="text-xs underline mb-2 inline-block" style={{ color: '#6B6862' }}>지도 보기</a>
          )}
          {meetup.description && <p className="text-xs mt-1 mb-3" style={{ color: '#6B6862' }}>{meetup.description}</p>}
          <div className="flex gap-2">
            {(['going', 'maybe', 'not_going'] as MeetupAttendanceStatus[]).map((s) => (
              <button key={s} onClick={() => onAttend(meetup.id, s)}
                className="px-3 py-1 rounded-full text-xs transition-colors"
                style={{ backgroundColor: '#E8E5E0', color: '#1C1C1C' }}>
                {ATTEND_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      ))}

      {meetups.length === 0 && (
        <p className="text-center py-12 text-sm" style={{ color: '#A8A49C' }}>예정된 모임이 없어요.</p>
      )}
    </div>
  )
}

function MembersTab({ members, myRole, userId, onApprove, onReject, onRoleChange, onRemove }: {
  members: ClubMember[]; myRole: string | undefined; userId: string
  onApprove: (id: string) => void; onReject: (id: string) => void
  onRoleChange: (id: string, role: any) => void; onRemove: (id: string) => void
}) {
  const ROLE_LABELS = { leader: '클럽장', admin: '운영진', member: '멤버' }
  const pending = members.filter((m) => m.status === 'pending')
  const active = members.filter((m) => m.status === 'active')

  return (
    <div className="space-y-6">
      {pending.length > 0 && (myRole === 'leader' || myRole === 'admin') && (
        <div>
          <h3 className="text-sm font-medium mb-3" style={{ color: '#1C1C1C' }}>가입 신청 ({pending.length})</h3>
          <div className="space-y-2">
            {pending.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-xl p-3" style={{ backgroundColor: '#E8E5E0' }}>
                <span className="text-sm" style={{ color: '#1C1C1C' }}>{m.profile?.display_name ?? m.user_id}</span>
                <div className="flex gap-2">
                  <button onClick={() => onApprove(m.id)} className="text-xs px-3 py-1 rounded-lg text-white" style={{ backgroundColor: '#1C1C1C' }}>승인</button>
                  <button onClick={() => onReject(m.id)} className="text-xs px-3 py-1 rounded-lg border border-gray-300" style={{ color: '#6B6862' }}>거절</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium mb-3" style={{ color: '#1C1C1C' }}>멤버 ({active.length})</h3>
        <div className="space-y-2">
          {active.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl p-3" style={{ backgroundColor: '#E8E5E0' }}>
              <div>
                <span className="text-sm" style={{ color: '#1C1C1C' }}>{m.profile?.display_name ?? m.user_id}</span>
                <span className="text-xs ml-2" style={{ color: '#A8A49C' }}>{ROLE_LABELS[m.role]}</span>
              </div>
              {myRole === 'leader' && m.user_id !== userId && (
                <div className="flex gap-2">
                  {m.role === 'member' && (
                    <button onClick={() => onRoleChange(m.id, 'admin')} className="text-xs" style={{ color: '#6B6862' }}>운영진 임명</button>
                  )}
                  {m.role === 'admin' && (
                    <button onClick={() => onRoleChange(m.id, 'member')} className="text-xs" style={{ color: '#6B6862' }}>운영진 해제</button>
                  )}
                  <button onClick={() => onRemove(m.id)} className="text-xs" style={{ color: '#A8A49C' }}>강퇴</button>
                </div>
              )}
              {m.user_id === userId && m.role !== 'leader' && (
                <button onClick={() => onRemove(m.id)} className="text-xs" style={{ color: '#A8A49C' }}>탈퇴</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
