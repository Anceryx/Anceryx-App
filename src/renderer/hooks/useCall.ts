import { useEffect } from 'react'
import { dmCallClient } from '@/services/webrtc/dmCallClient'
import { getLocalStream, getRemoteStream, getScreenStream, useCallStore } from '@/store/callStore'
import type { CallHistoryEntry } from '@/types/calls'
import type { CallMode } from '@/services/webrtc/peerConnection'

export interface StartCallParams { remoteUserId: string; remoteUserName: string; remoteAvatar?: string | null; callType?: 'voice' | 'video'; mode?: CallMode }
export interface CallState { status: 'idle' | 'connecting' | 'active' | 'error'; mode: CallMode | null; remoteUserId: string | null; remoteUserName: string | null; localStream: MediaStream | null; screenStream: MediaStream | null; micEnabled: boolean; camEnabled: boolean; screenEnabled: boolean; error: string | null; duration: number }
export interface UseCallReturn {
  callStatus: ReturnType<typeof useCallStore.getState>['callStatus']; state: CallState; active: boolean
  localStream: MediaStream | null; remoteStream: MediaStream | null; screenStream: MediaStream | null
  micEnabled: boolean; camEnabled: boolean; screenEnabled: boolean; duration: number; isExpanded: boolean
  remoteUserId: string | null; remoteUserName: string | null; remoteAvatar: string | null; callType: 'voice' | 'video' | null; callHistory: CallHistoryEntry[]
  start: (params: StartCallParams) => Promise<void>; startOutgoing: (params: StartCallParams) => Promise<void>; startIncoming: (params: StartCallParams) => void
  accept: () => Promise<void>; reject: () => void; hangUp: () => void; toggleMic: () => void; toggleCam: () => void; toggleScreen: () => Promise<void>
}

export function useCall(): UseCallReturn {
  const store = useCallStore()
  useEffect(() => { dmCallClient.initialize() }, [])
  useEffect(() => {
    if (store.callStatus !== 'connected') return
    const timer = window.setInterval(() => useCallStore.getState().setDuration(useCallStore.getState().duration + 1), 1000)
    return () => window.clearInterval(timer)
  }, [store.callStatus])
  const startOutgoing = async (params: StartCallParams) => dmCallClient.start({ remoteUserId: params.remoteUserId, remoteUserName: params.remoteUserName, remoteAvatar: params.remoteAvatar ?? null, callType: params.callType ?? params.mode ?? 'voice' })
  const legacyStatus: CallState['status'] = store.callStatus === 'connected' ? 'active' : ['outgoing', 'incoming', 'connecting'].includes(store.callStatus) ? 'connecting' : store.callStatus === 'failed' ? 'error' : 'idle'
  const state: CallState = { status: legacyStatus, mode: store.callType, remoteUserId: store.remoteUserId, remoteUserName: store.remoteUserName, localStream: getLocalStream(), screenStream: getScreenStream(), micEnabled: store.micEnabled, camEnabled: store.camEnabled, screenEnabled: store.screenEnabled, error: store.callStatus === 'failed' ? 'Nao foi possivel conectar' : null, duration: store.duration }
  return {
    callStatus: store.callStatus, state, active: ['outgoing', 'incoming', 'connecting', 'connected'].includes(store.callStatus),
    localStream: getLocalStream(), remoteStream: getRemoteStream(), screenStream: getScreenStream(), micEnabled: store.micEnabled, camEnabled: store.camEnabled, screenEnabled: store.screenEnabled,
    duration: store.duration, isExpanded: store.isExpanded, remoteUserId: store.remoteUserId, remoteUserName: store.remoteUserName, remoteAvatar: store.remoteAvatar, callType: store.callType, callHistory: store.callHistory,
    start: startOutgoing, startOutgoing,
    startIncoming: (params) => store.receiveIncoming({ remoteUserId: params.remoteUserId, remoteUserName: params.remoteUserName, remoteAvatar: params.remoteAvatar ?? null, callType: params.callType ?? params.mode ?? 'voice' }),
    accept: dmCallClient.accept, reject: dmCallClient.reject, hangUp: dmCallClient.end, toggleMic: dmCallClient.toggleMic, toggleCam: dmCallClient.toggleCam, toggleScreen: dmCallClient.toggleScreen,
  }
}
