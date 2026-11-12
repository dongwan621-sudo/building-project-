import type { TrackPayload } from '../types/vip'

export type TrackEventName = keyof TrackPayload

type TrackHandler = <E extends TrackEventName>(
  event: E,
  payload: TrackPayload[E],
) => void

const listeners = new Set<TrackHandler>()

/** 上报埋点；可通过 onTrack 订阅，便于宿主 APP / 测试断言 */
export function track<E extends TrackEventName>(
  event: E,
  payload: TrackPayload[E],
): void {
  for (const listener of listeners) {
    listener(event, payload)
  }
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[track]', event, payload)
  }
}

export function onTrack(handler: TrackHandler): () => void {
  listeners.add(handler)
  return () => {
    listeners.delete(handler)
  }
}

/** 测试用：清空订阅 */
export function clearTrackListeners(): void {
  listeners.clear()
}
