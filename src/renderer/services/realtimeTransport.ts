export type TransportStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

export type RealtimeSocketLike = {
  readonly readyState: number
  addEventListener(type: string, listener: (event: { data?: unknown }) => void): void
  send(data: string): void
  close(): void
}

export type RealtimeScheduler = {
  setTimeout(callback: () => void, delayMs: number): number
  clearTimeout(id: number): void
  setInterval(callback: () => void, delayMs: number): number
  clearInterval(id: number): void
  now(): number
  random(): number
}

const browserScheduler: RealtimeScheduler = {
  setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
  clearTimeout: (id) => window.clearTimeout(id),
  setInterval: (callback, delayMs) => window.setInterval(callback, delayMs),
  clearInterval: (id) => window.clearInterval(id),
  now: () => Date.now(),
  random: () => Math.random(),
}

const OPEN = 1
const HEARTBEAT_INTERVAL_MS = 25_000
const HEARTBEAT_TIMEOUT_MS = 55_000
const MAX_RECONNECT_DELAY_MS = 30_000

/** Owns one authenticated WebSocket and guards callbacks from superseded sockets. */
export class RealtimeTransport {
  private readonly baseUrl: string
  private readonly createSocket: (url: string, protocols: string[]) => RealtimeSocketLike
  private readonly onMessage: (data: string) => void
  private readonly onStatus: (status: TransportStatus) => void
  private readonly scheduler: RealtimeScheduler
  private socket: RealtimeSocketLike | null = null
  private token: string | null = null
  private status: TransportStatus = 'idle'
  private reconnectTimer: number | null = null
  private heartbeatTimer: number | null = null
  private stableConnectionTimer: number | null = null
  private reconnectAttempt = 0
  private generation = 0
  private manualClose = true

  constructor(
    baseUrl: string,
    createSocket: (url: string, protocols: string[]) => RealtimeSocketLike,
    onMessage: (data: string) => void,
    onStatus: (status: TransportStatus) => void,
    scheduler: RealtimeScheduler = browserScheduler,
  ) {
    this.baseUrl = baseUrl
    this.createSocket = createSocket
    this.onMessage = onMessage
    this.onStatus = onStatus
    this.scheduler = scheduler
  }

  connect(token: string | null): void {
    if (!token) {
      this.disconnect()
      return
    }
    if (this.token === token && (this.socket !== null || this.reconnectTimer !== null) && !this.manualClose) return

    this.stopCurrentSocket()
    this.token = token
    this.manualClose = false
    this.reconnectAttempt = 0
    this.open()
  }

  disconnect(): void {
    this.manualClose = true
    this.token = null
    this.reconnectAttempt = 0
    this.stopCurrentSocket()
    this.setStatus('disconnected')
  }

  send(data: string): void {
    if (this.socket?.readyState !== OPEN) return
    try {
      this.socket.send(data)
    } catch {
      this.socket.close()
    }
  }

  private stopCurrentSocket(): void {
    this.generation += 1
    if (this.reconnectTimer !== null) this.scheduler.clearTimeout(this.reconnectTimer)
    if (this.heartbeatTimer !== null) this.scheduler.clearInterval(this.heartbeatTimer)
    if (this.stableConnectionTimer !== null) this.scheduler.clearTimeout(this.stableConnectionTimer)
    this.reconnectTimer = null
    this.heartbeatTimer = null
    this.stableConnectionTimer = null
    const previous = this.socket
    this.socket = null
    previous?.close()
  }

  private open(): void {
    if (!this.token || this.manualClose) return
    const generation = ++this.generation
    const socket = this.createSocket(`${this.baseUrl.replace(/\/$/, '')}/realtime`, ['anceryx.v1', `anceryx.auth.${this.token}`])
    this.socket = socket
    this.setStatus(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting')

    socket.addEventListener('open', () => {
      if (!this.isCurrent(socket, generation)) return
      this.lastHeartbeatAckAt = this.scheduler.now()
      this.setStatus('connected')
      if (this.stableConnectionTimer !== null) this.scheduler.clearTimeout(this.stableConnectionTimer)
      this.stableConnectionTimer = this.scheduler.setTimeout(() => {
        if (this.isCurrent(socket, generation)) this.reconnectAttempt = 0
        this.stableConnectionTimer = null
      }, 60_000)
      if (this.heartbeatTimer !== null) this.scheduler.clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = this.scheduler.setInterval(() => this.heartbeat(socket, generation), HEARTBEAT_INTERVAL_MS)
    })
    socket.addEventListener('message', (event) => {
      if (!this.isCurrent(socket, generation)) return
      const data = String(event.data ?? '')
      if (isConnectionReady(data)) this.lastHeartbeatAckAt = this.scheduler.now()
      this.onMessage(data)
    })
    socket.addEventListener('close', () => this.handleClose(socket, generation))
    socket.addEventListener('error', () => {
      if (!this.isCurrent(socket, generation)) return
      socket.close()
      this.handleClose(socket, generation)
    })
  }

  private lastHeartbeatAckAt = 0

  private heartbeat(socket: RealtimeSocketLike, generation: number): void {
    if (!this.isCurrent(socket, generation)) return
    if (this.scheduler.now() - this.lastHeartbeatAckAt >= HEARTBEAT_TIMEOUT_MS) {
      socket.close()
      this.handleClose(socket, generation)
      return
    }
    try {
      socket.send(JSON.stringify({ type: 'ping', payload: {} }))
    } catch {
      socket.close()
      this.handleClose(socket, generation)
    }
  }

  private handleClose(socket: RealtimeSocketLike, generation: number): void {
    if (!this.isCurrent(socket, generation)) return
    this.socket = null
    if (this.heartbeatTimer !== null) this.scheduler.clearInterval(this.heartbeatTimer)
    if (this.stableConnectionTimer !== null) this.scheduler.clearTimeout(this.stableConnectionTimer)
    this.heartbeatTimer = null
    this.stableConnectionTimer = null
    if (this.manualClose || !this.token) {
      this.setStatus('disconnected')
      return
    }
    this.scheduleReconnect()
  }

  private scheduleReconnect(): void {
    if (this.manualClose || !this.token || this.reconnectTimer !== null) return
    this.setStatus('reconnecting')
    const baseDelay = Math.min(MAX_RECONNECT_DELAY_MS, 1000 * 2 ** Math.min(this.reconnectAttempt, 5))
    const jitter = 0.8 + this.scheduler.random() * 0.4
    const delay = Math.min(MAX_RECONNECT_DELAY_MS, Math.round(baseDelay * jitter))
    this.reconnectAttempt += 1
    this.reconnectTimer = this.scheduler.setTimeout(() => {
      this.reconnectTimer = null
      this.open()
    }, delay)
  }

  private isCurrent(socket: RealtimeSocketLike, generation: number): boolean {
    return this.socket === socket && this.generation === generation
  }

  private setStatus(status: TransportStatus): void {
    if (this.status === status) return
    this.status = status
    this.onStatus(status)
  }
}

function isConnectionReady(data: string): boolean {
  try {
    return (JSON.parse(data) as { type?: unknown }).type === 'connection.ready'
  } catch {
    return false
  }
}
