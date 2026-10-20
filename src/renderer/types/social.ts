export interface Comment {
  id: string
  authorId: string
  content: string
  createdAt: Date
  author: { id: string; username: string; displayName: string; avatarUrl: string | null; isOfficial?: boolean }
}

export interface Post {
  id: string
  authorId: string
  content: string
  createdAt: Date
  likes: string[]
  comments: Comment[]
  likeCount: number
  commentCount: number
  viewerHasLiked: boolean
  viewerHasSaved?: boolean
  isPinnedToProfile?: boolean
  shares: number
  isPublic: boolean
  mediaUrl?: string
  mediaType?: 'image' | 'gif' | 'video'
  mediaWidth?: number
  mediaHeight?: number
  author: { id: string; username: string; displayName: string; avatarUrl: string | null; isOfficial?: boolean }
}

export interface Forum {
  id: string
  name: string
  description: string
  visibility: 'public' | 'private'
  /** dataURL ou null — substitui o antigo campo emoji 'icon' */
  iconImage: string | null
  /** dataURL ou null */
  bannerImage: string | null
  ownerId: string
  memberCount: number
  postCount: number
  tags: string[]
  isJoined: boolean
  createdAt: Date
  members: ForumMember[]
  topics: ForumTopic[]
  reports: ForumReport[]
}

export type ForumMemberRole = 'member' | 'moderator' | 'owner'

export interface ForumMember {
  userId: string
  role: ForumMemberRole
  joinedAt: Date
}

export interface ForumTopic {
  id: string
  forumId: string
  authorId: string
  title: string
  content: string
  createdAt: Date
  isPinned: boolean
  isLocked: boolean
  isResolved: boolean
}

export interface ForumReport {
  id: string
  forumId: string
  targetType: 'forum_topic' | 'forum_reply'
  targetLabel: string
  reason: string
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed'
  createdAt: Date
}

export interface FriendRequest {
  id: string
  fromUserId: string
  toUserId: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: Date
}

// Badge individual com id, nome para tooltip e cor customizável
export type BadgeId =
  | 'anceryx-plus'
  | 'black-nugget'
  | 'bug-hunter'
  | 'comet-zero'
  | 'developer'
  | 'early-supporter'
  | 'initial-supporter'
  | 'moderator'
  | 'verified'

export interface Badge {
  id: BadgeId
  label: string   // texto exibido no tooltip
  color: string   // cor CSS (hex, rgba, gradient — aplicada como stroke/fill)
}

export interface UserProfile {
  displayName: string
  handle: string
  pronouns: string
  bio: string
  bannerColor: string
  bannerImage: string | null   // data URL de imagem 960×540 (sobrepõe bannerColor)
  badges: Badge[]
  followersCount: number
  followingCount: number
  customStatus: CustomStatus | null
}

export interface CustomStatus {
  text: string
  expiresAt: string | null   // ISO-8601 string or null
}

export type SidebarSection =
  | 'feed'
  | 'salvos'
  | 'perfil'
  | 'amigos'
  | 'mensagens'
  | 'foruns'
  | 'explore'
  | 'notificacoes'
  | 'configuracoes'
  | 'cobranca'
