import { useEffect } from 'react'
import { ThemeMode } from 'ahooks/lib/useTheme'

export enum EventType {
  ThemeModeChanged = 'theme:mode-changed',
  SidebarCollapsed = 'sidebar:collapsed',
  UserStocksChanged = 'user:stock:changed',
}

export interface EventPayloads {
  [EventType.ThemeModeChanged]: ThemeMode
  [EventType.SidebarCollapsed]: boolean
  [EventType.UserStocksChanged]: void
}

type EventKey = keyof EventPayloads
type EventCallback<K extends EventKey> = (payload: EventPayloads[K]) => void

class EventBus {
  private listeners = new Map<EventKey, Set<(payload: unknown) => void>>()

  on<K extends EventKey>(event: K, callback: EventCallback<K>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback as (payload: unknown) => void)
  }

  off<K extends EventKey>(event: K, callback: EventCallback<K>) {
    this.listeners.get(event)?.delete(callback as (payload: unknown) => void)
  }

  // ✅ Overloads
  emit<K extends EventKey>(event: K, payload: EventPayloads[K]): void
  emit<K extends EventKey>(event: K): void
  emit<K extends EventKey>(event: K, payload?: EventPayloads[K]): void {
    this.listeners.get(event)?.forEach((cb) => {
      ;(cb as EventCallback<K>)(payload as EventPayloads[K])
    })
  }
}

const bus = new EventBus()

export function emitEvent<K extends EventKey>(event: K, payload: EventPayloads[K]): void
export function emitEvent<K extends EventKey>(event: K): void
export function emitEvent<K extends EventKey>(event: K, payload?: EventPayloads[K]): void {
  bus.emit(event, payload as EventPayloads[K])
}

export const onEvent = bus.on.bind(bus) as <K extends EventKey>(event: K, callback: EventCallback<K>) => void

export const offEvent = bus.off.bind(bus) as <K extends EventKey>(event: K, callback: EventCallback<K>) => void

// Overload signatures
export function useEvent<K extends EventKey>(event: K, callback: EventCallback<K>): void

export function useEvent<K extends EventKey>(events: K[], callback: (event: K, payload: EventPayloads[K]) => void): void

// Unified implementation
export function useEvent<K extends EventKey>(
  eventOrEvents: K | K[],
  callback: ((payload: EventPayloads[K]) => void) | ((event: K, payload: EventPayloads[K]) => void)
) {
  useEffect(() => {
    const eventList = Array.isArray(eventOrEvents) ? eventOrEvents : [eventOrEvents]

    const wrappedCallbacks = eventList.map((event) => {
      const wrapped = (payload: EventPayloads[K]) => {
        if (Array.isArray(eventOrEvents)) {
          ;(callback as (event: K, payload: EventPayloads[K]) => void)(event, payload)
        } else {
          ;(callback as (payload: EventPayloads[K]) => void)(payload)
        }
      }
      onEvent(event, wrapped)
      return { event, wrapped }
    })

    return () => {
      wrappedCallbacks.forEach(({ event, wrapped }) => {
        offEvent(event, wrapped)
      })
    }
  }, [eventOrEvents, callback])
}
