export type ClubAccessType = 'public' | 'private' | 'invite_only'
export type ClubMemberRole = 'leader' | 'admin' | 'member'
export type ClubMemberStatus = 'active' | 'pending'
export type MeetupAttendanceStatus = 'going' | 'maybe' | 'not_going'

type ProfileSummary = {
  username: string
  display_name: string
  avatar_url: string | null
}

export type Club = {
  id: string
  name: string
  description: string | null
  tags: string[]
  access_type: ClubAccessType
  max_members: number | null
  invite_code: string | null
  cover_url: string | null
  created_by: string
  created_at: string
}

export type ClubMember = {
  id: string
  club_id: string
  user_id: string
  role: ClubMemberRole
  status: ClubMemberStatus
  joined_at: string
  profile?: ProfileSummary
}

export type ClubPost = {
  id: string
  club_id: string
  author_id: string
  content: string | null
  image_urls: string[] | null
  book_id: string | null
  created_at: string
  author?: ProfileSummary
  book?: {
    title: string
    author: string
    cover_url: string | null
  }
}

export type ClubMeetup = {
  id: string
  club_id: string
  created_by: string
  title: string
  description: string | null
  scheduled_at: string
  location_text: string | null
  location_map_id: string | null
  location_url: string | null
  max_attendees: number | null
  created_at: string
}

export type ClubDetailResult = {
  club: Club
  myMembership: ClubMember | null
  memberCount: number
}
