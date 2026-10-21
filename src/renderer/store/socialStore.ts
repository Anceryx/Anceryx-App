import { create } from 'zustand'
import type {
  Comment,
  CustomStatus,
  Forum,
  ForumMemberRole,
  Post,
  SidebarSection,
  UserProfile,
} from '@/types/social'
import type { RealtimeCommentDto, RealtimeForumTopicDto, RealtimePostDto } from '@/services/realtimeClient'
import { postsApi } from '@/services/postsApi'
import { socialApi, type PublicProfileDto } from '@/services/socialApi'
import { useAuthStore } from '@/store/authStore'
import { forumApi, type ApiForum } from '@/services/forumApi'
import { mediaApi } from '@/services/mediaApi'
import { mergeComments, upsertComment } from '@/utils/commentState'

function resolveOptionalMediaUrl(value: string | null | undefined): string | null {
  return value ? mediaApi.resolvePublicUrl(value) || null : null
}

export interface CreateForumParams {
  name: string
  description: string
  iconImage: string | null
  bannerImage: string | null
  tags: string[]
  ownerId: string
  visibility: 'public' | 'private'
  structure: { categories: Array<{ name: string; channels: Array<{ name: string; type: 'text' | 'voice' }> }> }
}

interface SocialState {
  posts: Post[]
  followers: string[]
  following: string[]
  forums: Forum[]
  activeSection: SidebarSection
  activeForum: string | null
  userProfile: UserProfile
  profiles: Record<string, PublicProfileDto>
  loading: boolean
  feedCursor: string | null
  error: string | null
  hydrateSocial: () => Promise<void>
  reset: () => void

  setActiveSection: (s: SidebarSection) => void
  setActiveForum: (forumId: string | null) => void
  createPost: (content: string, mediaAssetId?: string) => Promise<void>
  setPinnedProfilePost: (userId: string, postId: string | null) => void
  addComment: (postId: string, content: string) => Promise<void>
  loadComments: (postId: string) => Promise<void>
  toggleLike: (postId: string, userId: string) => Promise<void>
  upsertRealtimePost: (post: RealtimePostDto) => void
  deleteRealtimePost: (postId: string) => void
  setRealtimePostLike: (postId: string, userId: string, liked: boolean, likeCount: number) => void
  upsertRealtimeComment: (comment: RealtimeCommentDto) => void
  deleteRealtimeComment: (postId: string, commentId: string) => void
  createForum: (params: CreateForumParams) => Promise<Forum>
  toggleForumJoin: (forumId: string) => Promise<void>
  updateForum: (forumId: string, patch: Pick<Partial<Forum>, 'name' | 'description' | 'visibility' | 'iconImage' | 'bannerImage'>) => void
  updateForumTags: (forumId: string, tags: string[]) => void
  setForumMemberRole: (forumId: string, actorUserId: string, targetUserId: string, role: Exclude<ForumMemberRole, 'owner'>) => void
  removeForumMember: (forumId: string, actorUserId: string, targetUserId: string) => void
  setForumTopicFlag: (forumId: string, topicId: string, flag: 'isPinned' | 'isLocked' | 'isResolved', value: boolean) => void
  upsertRealtimeForumTopic: (topic: RealtimeForumTopicDto) => void
  deleteRealtimeForumTopic: (forumId: string, topicId: string) => void
  updateUserProfile: (patch: Partial<UserProfile>) => void
  setBannerImage: (dataUrl: string | null) => void
  setCustomStatus: (status: CustomStatus | null) => void
  syncOwnMedia: (media: { avatarUrl?: string | null; bannerUrl?: string | null }) => void
}

function getForumRole(forum: Forum, userId: string): ForumMemberRole | null {
  return forum.members.find((member) => member.userId === userId)?.role ?? null
}

function canOwnerAdmin(forum: Forum, actorUserId: string, targetUserId: string): boolean {
  const actorRole = getForumRole(forum, actorUserId)
  const targetRole = getForumRole(forum, targetUserId)
  return actorRole === 'owner' && targetRole !== null && targetRole !== 'owner' && actorUserId !== targetUserId
}

export function realtimePostToLocal(post: RealtimePostDto): Post {
  return {
    id: post.id,
    authorId: post.author.id,
    content: post.content,
    createdAt: new Date(post.createdAt),
    likes: [],
    comments: [],
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    viewerHasLiked: post.viewerHasLiked,
    viewerHasSaved: post.viewerHasSaved,
    isPinnedToProfile: post.isPinnedToProfile,
    shares: 0,
    isPublic: true,
    mediaUrl: resolveOptionalMediaUrl(post.mediaUrl) ?? undefined,
    mediaType: post.mediaType ?? undefined,
    mediaWidth: post.mediaWidth ?? undefined,
    mediaHeight: post.mediaHeight ?? undefined,
    author: { ...post.author, avatarUrl: resolveOptionalMediaUrl(post.author.avatarUrl) },
  }
}

function realtimeCommentToLocal(comment: RealtimeCommentDto): Comment {
  return {
    id: comment.id,
    authorId: comment.author.id,
    content: comment.content,
    createdAt: new Date(comment.createdAt),
    author: comment.author,
  }
}

function realtimeTopicToLocal(topic: RealtimeForumTopicDto) {
  return {
    id: topic.id,
    forumId: topic.forumId,
    authorId: topic.authorUserId,
    title: topic.title,
    content: topic.content,
    createdAt: new Date(topic.createdAt),
    isPinned: topic.isPinned,
    isLocked: topic.isLocked,
    isResolved: topic.isResolved,
  }
}

export function apiForumToLocal(forum: ApiForum): Forum {
  return { id: forum.id, name: forum.name, description: forum.description, visibility: forum.visibility, iconImage: resolveOptionalMediaUrl(forum.iconUrl), bannerImage: resolveOptionalMediaUrl(forum.bannerUrl), ownerId: forum.ownerUserId, memberCount: forum.memberCount, postCount: forum.topicCount, tags: forum.tags.map((tag) => tag.name), isJoined: forum.viewerMembership, createdAt: new Date(forum.createdAt), members: forum.viewerForumRole ? [{ userId: useAuthStore.getState().user?.id ?? '', role: forum.viewerForumRole, joinedAt: new Date() }] : [], topics: [], reports: [] }
}

export const useSocialStore = create<SocialState>()((set) => ({
  posts: [],
  followers: [],
  following: [],
  forums: [],
  activeSection: 'feed',
  activeForum: null,
  userProfile: { displayName: '', handle: '', pronouns: '', bio: '', bannerColor: '#6d28d9', bannerImage: null, badges: [], followersCount: 0, followingCount: 0, customStatus: null },
  profiles: {},
  loading: false,
  error: null,
  feedCursor: null,

  hydrateSocial: async () => {
    set({ loading: true, error: null })
    try {
      const [feed, me, forumResult] = await Promise.all([
        postsApi.feed(), socialApi.me(), forumApi.listForums(),
      ])
      const [followers, following] = await Promise.all([socialApi.followers(me.user.id), socialApi.following(me.user.id)])
      const profiles: Record<string, PublicProfileDto> = {}
      for (const profile of [...followers.users, ...following.users]) profiles[profile.id] = { ...profile, avatarUrl: resolveOptionalMediaUrl(profile.avatarUrl) }
      profiles[me.user.id] = { ...me.user, avatarUrl: resolveOptionalMediaUrl(me.user.avatarUrl), bannerUrl: resolveOptionalMediaUrl(me.user.bannerUrl) }
      set({
        posts: feed.posts.map(realtimePostToLocal),
        feedCursor: feed.nextCursor,
        followers: followers.users.map((profile) => profile.id),
        following: following.users.map((profile) => profile.id),
        profiles,
        forums: forumResult.forums.map(apiForumToLocal),
        userProfile: { displayName: me.user.displayName, handle: me.user.username, pronouns: '', bio: me.user.bio, bannerColor: me.user.bannerColor, bannerImage: resolveOptionalMediaUrl(me.user.bannerUrl), badges: [], followersCount: me.user.followersCount, followingCount: me.user.followingCount, customStatus: me.user.customStatus },
        loading: false,
      })
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : 'Falha ao carregar dados sociais.' })
    }
  },
  reset: () => set({ posts: [], followers: [], following: [], forums: [], profiles: {}, feedCursor: null, error: null }),

  setActiveSection: (s) => set({ activeSection: s }),

  setActiveForum: (forumId) => set({ activeForum: forumId }),

  createPost: async (content, mediaAssetId) => {
    const { post } = await postsApi.create(content, mediaAssetId)
    set((state) => ({ posts: [realtimePostToLocal(post), ...state.posts.filter((item) => item.id !== post.id)] }))
  },

  setPinnedProfilePost: (userId, postId) => set((state) => ({
    posts: state.posts.map((post) => post.authorId === userId
      ? { ...post, isPinnedToProfile: post.id === postId }
      : post),
  })),

  addComment: async (postId, content) => {
    const { comment } = await postsApi.comment(postId, content.trim())
    const incoming = realtimeCommentToLocal(comment)
    set((state) => ({ posts: state.posts.map((post) => {
      if (post.id !== postId) return post
      const result = upsertComment(post.comments, incoming)
      return { ...post, commentCount: result.inserted ? post.commentCount + 1 : post.commentCount, comments: result.comments }
    }) }))
  },

  loadComments: async (postId) => {
    const { comments } = await postsApi.listComments(postId)
    set((state) => ({ posts: state.posts.map((post) => post.id === postId ? { ...post, comments: mergeComments(post.comments, comments.map(realtimeCommentToLocal)), commentCount: Math.max(post.commentCount, comments.length) } : post) }))
  },

  toggleLike: async (postId, userId) => {
    const post = useSocialStore.getState().posts.find((item) => item.id === postId)
    if (!post) return
    const { post: updated } = post.viewerHasLiked ? await postsApi.unlike(postId) : await postsApi.like(postId)
    set((state) => ({ posts: state.posts.map((item) => item.id === postId ? { ...realtimePostToLocal(updated), comments: item.comments } : item) }))
  },

  upsertRealtimePost: (remotePost) =>
    set((state) => {
      const incoming = realtimePostToLocal(remotePost)
      const existing = state.posts.find((post) => post.id === incoming.id)
      if (!existing) return { posts: [incoming, ...state.posts] }
      return {
        posts: state.posts.map((post) =>
          post.id === incoming.id
            ? { ...post, ...incoming, viewerHasSaved: incoming.viewerHasSaved ?? post.viewerHasSaved, likes: [], comments: post.comments }
            : post
        ),
      }
    }),

  deleteRealtimePost: (postId) =>
    set((state) => ({ posts: state.posts.filter((post) => post.id !== postId) })),

  setRealtimePostLike: (postId, userId, liked, likeCount) =>
    set((state) => ({
      posts: state.posts.map((post) => {
        if (post.id !== postId) return post
        return { ...post, likes: [], viewerHasLiked: liked, likeCount }
      }),
    })),

  upsertRealtimeComment: (remoteComment) =>
    set((state) => ({
      posts: state.posts.map((post) => {
        if (post.id !== remoteComment.postId) return post
        const incoming = realtimeCommentToLocal(remoteComment)
        const result = upsertComment(post.comments, incoming)
        return {
          ...post,
          commentCount: result.inserted ? post.commentCount + 1 : post.commentCount,
          comments: result.comments,
        }
      }),
    })),

  deleteRealtimeComment: (postId, commentId) =>
    set((state) => ({
      posts: state.posts.map((post) => {
        if (post.id !== postId) return post
        const comments = post.comments.filter((comment) => comment.id !== commentId)
        return { ...post, commentCount: comments.length < post.comments.length ? Math.max(0, post.commentCount - 1) : post.commentCount, comments }
      }),
    })),

  createForum: async ({ name, description, iconImage, bannerImage, tags, visibility, structure }) => {
    const { forum } = await forumApi.createForum({ name: name.trim(), description: description.trim(), visibility, iconUrl: iconImage, bannerUrl: bannerImage, tags, structure })
    const created = apiForumToLocal(forum)
    set((state) => ({ forums: [created, ...state.forums] }))
    return created
  },

  toggleForumJoin: async (forumId) => {
    const forum = useSocialStore.getState().forums.find((item) => item.id === forumId)
    if (!forum) return
    if (forum.isJoined) await forumApi.leaveForum(forumId); else await forumApi.joinForum(forumId)
    set((state) => ({
      forums: state.forums.map((forum) => {
        if (forum.id !== forumId) return forum
        const currentUserId = useAuthStore.getState().user?.id
        if (!currentUserId) return forum
        const currentRole = getForumRole(forum, currentUserId)
        if (currentRole === 'owner') return forum
        const joining = !forum.isJoined
        const members = joining
          ? [...forum.members, { userId: currentUserId, role: 'member' as const, joinedAt: new Date() }]
          : forum.members.filter((member) => member.userId !== currentUserId)
        return { ...forum, isJoined: joining, memberCount: Math.max(0, forum.memberCount + (joining ? 1 : -1)), members }
      }),
    }))
  },

  updateForum: (forumId, patch) =>
    set((state) => ({
      forums: state.forums.map((forum) =>
        forum.id === forumId
          ? {
              ...forum,
              name: patch.name?.trim() || forum.name,
              description: patch.description?.trim() || forum.description,
              visibility: patch.visibility ?? forum.visibility,
              iconImage: Object.prototype.hasOwnProperty.call(patch, 'iconImage') ? patch.iconImage ?? null : forum.iconImage,
              bannerImage: Object.prototype.hasOwnProperty.call(patch, 'bannerImage') ? patch.bannerImage ?? null : forum.bannerImage,
            }
          : forum
      ),
    })),

  updateForumTags: (forumId, tags) =>
    set((state) => ({
      forums: state.forums.map((forum) =>
        forum.id === forumId
          ? { ...forum, tags: [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))] }
          : forum
      ),
    })),

  setForumMemberRole: (forumId, actorUserId, targetUserId, role) =>
    set((state) => ({
      forums: state.forums.map((forum) => {
        if (forum.id !== forumId || !canOwnerAdmin(forum, actorUserId, targetUserId)) return forum
        return {
          ...forum,
          members: forum.members.map((member) =>
            member.userId === targetUserId ? { ...member, role } : member
          ),
        }
      }),
    })),

  removeForumMember: (forumId, actorUserId, targetUserId) =>
    set((state) => ({
      forums: state.forums.map((forum) => {
        if (forum.id !== forumId || !canOwnerAdmin(forum, actorUserId, targetUserId)) return forum
        const members = forum.members.filter((member) => member.userId !== targetUserId)
        return { ...forum, members, memberCount: members.length }
      }),
    })),

  setForumTopicFlag: (forumId, topicId, flag, value) =>
    set((state) => ({
      forums: state.forums.map((forum) =>
        forum.id === forumId
          ? {
              ...forum,
              topics: forum.topics.map((topic) =>
                topic.id === topicId ? { ...topic, [flag]: value } : topic
              ),
            }
          : forum
      ),
    })),

  upsertRealtimeForumTopic: (remoteTopic) =>
    set((state) => ({
      forums: state.forums.map((forum) => {
        if (forum.id !== remoteTopic.forumId) return forum
        const topic = realtimeTopicToLocal(remoteTopic)
        const exists = forum.topics.some((item) => item.id === topic.id)
        return {
          ...forum,
          postCount: exists ? forum.postCount : forum.postCount + 1,
          topics: exists ? forum.topics.map((item) => item.id === topic.id ? topic : item) : [topic, ...forum.topics],
        }
      }),
    })),

  deleteRealtimeForumTopic: (forumId, topicId) =>
    set((state) => ({
      forums: state.forums.map((forum) =>
        forum.id === forumId
          ? { ...forum, postCount: Math.max(0, forum.postCount - 1), topics: forum.topics.filter((topic) => topic.id !== topicId) }
          : forum
      ),
    })),

  updateUserProfile: (patch) =>
    set((state) => ({ userProfile: { ...state.userProfile, ...patch } })),

  setBannerImage: (dataUrl) =>
    set((state) => ({
      userProfile: { ...state.userProfile, bannerImage: dataUrl },
    })),

  setCustomStatus: (status) =>
    set((state) => ({
      userProfile: { ...state.userProfile, customStatus: status },
    })),

  syncOwnMedia: (media) => set((state) => {
    const userId = useAuthStore.getState().user?.id
    const avatarUrl = media.avatarUrl === undefined ? undefined : resolveOptionalMediaUrl(media.avatarUrl)
    const bannerUrl = media.bannerUrl === undefined ? undefined : resolveOptionalMediaUrl(media.bannerUrl)
    return {
      userProfile: bannerUrl === undefined ? state.userProfile : { ...state.userProfile, bannerImage: bannerUrl },
      profiles: userId && avatarUrl !== undefined && state.profiles[userId]
        ? { ...state.profiles, [userId]: { ...state.profiles[userId], avatarUrl } }
        : state.profiles,
      posts: userId && avatarUrl !== undefined
        ? state.posts.map((post) => post.authorId === userId ? { ...post, author: { ...post.author, avatarUrl } } : post)
        : state.posts,
    }
  }),
}))
