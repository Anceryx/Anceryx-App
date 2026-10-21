import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Theme, NotificationItem } from '@/types/index'
import type { SettingsSection } from '@/components/settings/SettingsNav'

export type ExperienceSection = 'appearance' | 'language-date-time' | 'shortcuts' | 'preferences'

interface UIState {
  locale: 'pt-BR' | 'en-US' | 'es-ES'
  timeFormat: 'auto' | '12h' | '24h'
  dateFormat: 'auto' | 'dmy' | 'mdy' | 'ymd'
  theme: Theme
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  sidebarWidth: number
  sidebarMode: 'automatic' | 'manual'
  reduceMotion: boolean
  notifications: NotificationItem[]
  /** Non-persisted: which settings section to open via deep-link (e.g. 'voz') */
  settingsSection: SettingsSection | null
  experienceSection: ExperienceSection
  pendingDmUser: { id: string; username: string } | null
  pendingPostId: string | null
  pendingForumId: string | null
  pendingProfileUsername: string | null
  pendingInviteToken: string | null
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  setLocale: (locale: UIState['locale']) => void
  setTimeFormat: (format: UIState['timeFormat']) => void
  setDateFormat: (format: UIState['dateFormat']) => void
  setSidebarOpen: (v: boolean) => void
  setSidebarCollapsed: (v: boolean) => void
  setSidebarWidth: (v: number) => void
  setSidebarMode: (v: 'automatic' | 'manual') => void
  setReduceMotion: (v: boolean) => void
  addNotification: (message: string, type: NotificationItem['type']) => void
  dismissNotification: (id: string) => void
  /** Open the SettingsModal and optionally jump to a specific section */
  openSettings: (section?: SettingsSection) => void
  setExperienceSection: (section: ExperienceSection) => void
  closeSettings: () => void
  openDm: (user: { id: string; username: string }) => void
  consumePendingDm: () => { id: string; username: string } | null
  openPost: (postId: string) => void
  consumePendingPost: () => string | null
  openForumById: (forumId: string) => void
  consumePendingForumId: () => string | null
  openProfileByUsername: (username: string) => void
  consumePendingProfileUsername: () => string | null
  openInvite: (token: string) => void
  consumePendingInviteToken: () => string | null
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      locale: 'pt-BR',
      timeFormat: 'auto',
      dateFormat: 'auto',
      theme: 'dark',
      sidebarOpen: true,
      sidebarCollapsed: false,
      sidebarWidth: 236,
      sidebarMode: 'automatic',
      reduceMotion: false,
      notifications: [],
      settingsSection: null,
      experienceSection: 'appearance',
      pendingDmUser: null,
      pendingPostId: null,
      pendingForumId: null,
      pendingProfileUsername: null,
      pendingInviteToken: null,

      toggleTheme: () =>
        // Cycles between dark and light only.
        // Premium themes (autumn/rose-moon) are set explicitly via setTheme.
        // If the user is on a premium theme, toggling falls back to 'dark'
        // so the user is never silently dropped onto 'light' from a premium theme.
        set((state) => {
          if (state.theme === 'light') return { theme: 'dark' as const }
          // 'dark' theme, or any premium theme — go to light or back to dark
          if (state.theme === 'dark')  return { theme: 'light' as const }
          // Premium theme active — toggle goes to dark (base default)
          return { theme: 'dark' as const }
        }),

      setTheme: (theme: Theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
      setTimeFormat: (timeFormat) => set({ timeFormat }),
      setDateFormat: (dateFormat) => set({ dateFormat }),

      setSidebarOpen: (v: boolean) => set({ sidebarOpen: v }),
      setSidebarCollapsed: (v: boolean) => set({ sidebarCollapsed: v }),
      setSidebarWidth: (v: number) => set({ sidebarWidth: Math.max(208, Math.min(280, Math.round(v))) }),
      setSidebarMode: (v: 'automatic' | 'manual') => set({ sidebarMode: v }),
      setReduceMotion: (v: boolean) => set({ reduceMotion: v }),

      addNotification: (message: string, type: NotificationItem['type']) => {
        const item: NotificationItem = {
          id: Date.now().toString(),
          message,
          type,
          createdAt: new Date()
        }
        set((state) => ({ notifications: [...state.notifications, item] }))
      },

      dismissNotification: (id: string) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id)
        })),

      openSettings: (section?: SettingsSection) =>
        set({ settingsSection: section ?? null }),

      setExperienceSection: (experienceSection) => set({ experienceSection }),

      closeSettings: () =>
        set({ settingsSection: null }),

      openDm: (user: { id: string; username: string }) => set({ pendingDmUser: user }),
      consumePendingDm: () => {
        let user: { id: string; username: string } | null = null
        set((state) => { user = state.pendingDmUser; return { pendingDmUser: null } })
        return user
      },
      openPost: (postId: string) => set({ pendingPostId: postId }),
      consumePendingPost: () => {
        let postId: string | null = null
        set((state) => { postId = state.pendingPostId; return { pendingPostId: null } })
        return postId
      },
      openForumById: (forumId) => set({ pendingForumId: forumId }),
      consumePendingForumId: () => {
        let forumId: string | null = null
        set((state) => { forumId = state.pendingForumId; return { pendingForumId: null } })
        return forumId
      },
      openProfileByUsername: (username) => set({ pendingProfileUsername: username }),
      consumePendingProfileUsername: () => {
        let username: string | null = null
        set((state) => { username = state.pendingProfileUsername; return { pendingProfileUsername: null } })
        return username
      },
      openInvite: (token) => set({ pendingInviteToken: token }),
      consumePendingInviteToken: () => {
        let token: string | null = null
        set((state) => { token = state.pendingInviteToken; return { pendingInviteToken: null } })
        return token
      },
    }),
    {
      name: 'anceryx-ui',
      // Persist layout preferences; transient dialogs and notifications stay local.
      partialize: (state) => ({ locale: state.locale, timeFormat: state.timeFormat, dateFormat: state.dateFormat, theme: state.theme, sidebarCollapsed: state.sidebarCollapsed, sidebarWidth: state.sidebarWidth, sidebarMode: state.sidebarMode, reduceMotion: state.reduceMotion })
    }
  )
)
