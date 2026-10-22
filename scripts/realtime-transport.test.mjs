import assert from 'node:assert/strict'
import test from 'node:test'
import { RealtimeTransport } from '../src/renderer/services/realtimeTransport.ts'

class FakeScheduler {
  nowValue = 0
  nextId = 1
  timers = new Map()
  randomValue = 0.5

  setTimeout(callback, delayMs) { return this.add(callback, delayMs, 0) }
  clearTimeout(id) { this.timers.delete(id) }
  setInterval(callback, delayMs) { return this.add(callback, delayMs, delayMs) }
  clearInterval(id) { this.timers.delete(id) }
  now() { return this.nowValue }
  random() { return this.randomValue }

  add(callback, delayMs, intervalMs) {
    const id = this.nextId++
    this.timers.set(id, { callback, dueAt: this.nowValue + delayMs, intervalMs })
    return id
  }

  advance(durationMs) {
    const target = this.nowValue + durationMs
    while (true) {
      const next = [...this.timers.entries()].filter(([, timer]) => timer.dueAt <= target).sort((a, b) => a[1].dueAt - b[1].dueAt)[0]
      if (!next) break
      const [id, timer] = next
      this.nowValue = timer.dueAt
      if (timer.intervalMs === 0) this.timers.delete(id)
      timer.callback()
      if (timer.intervalMs > 0 && this.timers.has(id)) this.timers.get(id).dueAt += timer.intervalMs
    }
    this.nowValue = target
  }
}

class FakeSocket {
  readyState = 0
  listeners = new Map()
  sent = []
  closeCount = 0

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  }

  emit(type, event = {}) { for (const listener of this.listeners.get(type) ?? []) listener(event) }
  open() { this.readyState = 1; this.emit('open') }
  receive(data) { this.emit('message', { data }) }
  send(data) { this.sent.push(data) }
  close() { this.closeCount += 1; this.readyState = 3; this.emit('close') }
}

function setup() {
  const scheduler = new FakeScheduler()
  const sockets = []
  const messages = []
  const statuses = []
  const transport = new RealtimeTransport('wss://api.example.test', (url, protocols) => {
    const socket = new FakeSocket()
    socket.url = url
    socket.protocols = protocols
    sockets.push(socket)
    return socket
  }, (data) => messages.push(data), (status) => statuses.push(status), scheduler)
  return { transport, scheduler, sockets, messages, statuses }
}

test('connects once per token and delivers server events', () => {
  const { transport, sockets, messages, statuses } = setup()
  transport.connect('token-a')
  transport.connect('token-a')
  assert.equal(sockets.length, 1)
  assert.equal(sockets[0].url, 'wss://api.example.test/realtime')
  assert.deepEqual(sockets[0].protocols, ['anceryx.v1', 'anceryx.auth.token-a'])
  sockets[0].open()
  sockets[0].receive('{"type":"connection.ready"}')
  assert.deepEqual(messages, ['{"type":"connection.ready"}'])
  assert.equal(statuses.at(-1), 'connected')
})

test('ignores late close and message events from a replaced socket', () => {
  const { transport, sockets, messages, statuses, scheduler } = setup()
  transport.connect('token-old')
  const oldSocket = sockets[0]
  oldSocket.open()
  transport.connect('token-new')
  const currentSocket = sockets[1]
  oldSocket.receive('{"type":"stale"}')
  oldSocket.emit('close')
  scheduler.advance(60_000)
  assert.equal(sockets.length, 2)
  assert.deepEqual(messages, [])
  assert.equal(statuses.at(-1), 'connecting')
  currentSocket.open()
  assert.equal(statuses.at(-1), 'connected')
})

test('reconnects with bounded jitter after an unexpected close', () => {
  const { transport, scheduler, sockets, statuses } = setup()
  scheduler.randomValue = 1
  transport.connect('token-a')
  sockets[0].open()
  sockets[0].close()
  assert.equal(statuses.at(-1), 'reconnecting')
  scheduler.advance(1_199)
  assert.equal(sockets.length, 1)
  scheduler.advance(1)
  assert.equal(sockets.length, 2)
  sockets[1].open()
  assert.equal(statuses.at(-1), 'connected')
  sockets[1].close()
  scheduler.advance(2_399)
  assert.equal(sockets.length, 2)
  scheduler.advance(1)
  assert.equal(sockets.length, 3)
  sockets[2].open()
  scheduler.advance(25_000)
  sockets[2].receive('{"type":"connection.ready"}')
  scheduler.advance(25_000)
  sockets[2].receive('{"type":"connection.ready"}')
  scheduler.advance(10_000)
  sockets[2].close()
  scheduler.advance(1_199)
  assert.equal(sockets.length, 3)
  scheduler.advance(1)
  assert.equal(sockets.length, 4)
})

test('sends app heartbeats and reconnects when acknowledgements stop', () => {
  const { transport, scheduler, sockets, statuses } = setup()
  transport.connect('token-a')
  sockets[0].open()
  scheduler.advance(25_000)
  assert.deepEqual(JSON.parse(sockets[0].sent[0]), { type: 'ping', payload: {} })
  sockets[0].receive('{"type":"connection.ready"}')
  scheduler.advance(25_000)
  assert.equal(sockets[0].closeCount, 0)
  scheduler.advance(55_000)
  assert.equal(statuses.at(-1), 'reconnecting')
  assert.equal(sockets[0].readyState, 3)
})

test('manual disconnect cancels reconnect and heartbeat timers', () => {
  const { transport, scheduler, sockets, statuses } = setup()
  transport.connect('token-a')
  sockets[0].open()
  sockets[0].close()
  transport.disconnect()
  scheduler.advance(60_000)
  assert.equal(sockets.length, 1)
  assert.equal(statuses.at(-1), 'disconnected')
})
