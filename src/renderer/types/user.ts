import type { Subscription } from '../lib/premium'

export enum UserStatus {
  Online = 'online',
  Idle = 'idle',
  Dnd = 'dnd',
  Offline = 'offline'
}

export interface User {
  id: string
  publicUserId: string
  name: string
  username?: string
  email: string
  avatar: string | null
  status: UserStatus
  createdAt?: string
  emailVerified?: boolean
  /** @deprecated legacy fixture field; real users are identified by id/username. */
  discriminator?: string
  subscription?: Subscription
}

export interface AuthUser extends User {
  token: string
}
