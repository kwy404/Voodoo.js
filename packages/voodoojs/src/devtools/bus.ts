/**
 * @module devtools/bus
 *
 * Event bus for devtools. Lives in a separate file from the inspector to remain
 * tree-shakeable: code that only reports activity pays minimal bytes, and the
 * visual panel only enters the bundle when `xray()` is actually imported.
 *
 * Emitting with no registered listeners costs a `Map` lookup and nothing more,
 * so any module can report activity safely.
 *
 * ```ts
 * import { devtoolsBus } from '../devtools/bus';
 *
 * // Reporting a network request from a directive:
 * const start = performance.now();
 * const data = await http.get('/api/users');
 * devtoolsBus.emit('network', {
 *   method: 'GET',
 *   url: '/api/users',
 *   status: 200,
 *   ok: true,
 *   duration: performance.now() - start,
 *   source: 'v-get',
 * });
 * ```
 */

/** Network request reported to the devtools Network tab. */
export interface DevtoolsNetworkEvent {
  /** HTTP method in uppercase, like `GET` or `POST`. */
  method: string;
  /** Final URL of the request. */
  url: string;
  /** Status code, when the response arrived. */
  status?: number;
  /** `true` when the response was successful. */
  ok?: boolean;
  /** Duration in milliseconds. */
  duration?: number;
  /** Error message, when the request failed. */
  error?: string;
  /** Who triggered it, like `v-get`, `http` or `router`. */
  source?: string;
}

/** DOM event triggered by a directive, shown in the Events tab. */
export interface DevtoolsDomEvent {
  /** Event name, like `click` or `submit`. */
  type: string;
  /** Element that received the event. */
  el?: Element | null;
  /** Expression or detail associated, for display purposes only. */
  detail?: unknown;
  /** Who reported it, like `v-on` or `component.emit`. */
  source?: string;
}

/** Route change reported by the router. */
export interface DevtoolsNavigationEvent {
  from: string;
  to: string;
  /** `true` when a guard cancelled the navigation. */
  cancelled?: boolean;
  /** Matched route pattern, if any. */
  matched?: string | null;
}

/** Locale change reported by the i18n module. */
export interface DevtoolsLocaleEvent {
  from: string;
  to: string;
}

/** Reactive update reported manually by a module. */
export interface DevtoolsUpdateEvent {
  el?: Element | null;
  /** Name of the key that changed, when known. */
  key?: string;
  source?: string;
}

/** Map of event types accepted by the bus. */
export interface DevtoolsEventMap {
  network: DevtoolsNetworkEvent;
  event: DevtoolsDomEvent;
  navigation: DevtoolsNavigationEvent;
  locale: DevtoolsLocaleEvent;
  update: DevtoolsUpdateEvent;
}

export type DevtoolsEventType = keyof DevtoolsEventMap;

type Listener = (data: never) => void;

const listeners = new Map<string, Set<Listener>>();

/**
 * Simple publish-subscribe bus used by devtools.
 *
 * To report a network request from another module, emit the `network` type
 * with `{ method, url, status, ok, duration, source }`. The devtools Network
 * tab lists everything that arrives through it, even when the request did not
 * go through Voodoo's `http` client.
 */
export const devtoolsBus = {
  /** Publishes an event. With no listeners, the call is practically free. */
  emit<K extends DevtoolsEventType>(type: K, data: DevtoolsEventMap[K]): void {
    const set = listeners.get(type);
    if (!set || set.size === 0) return;
    for (const listener of [...set]) {
      try {
        (listener as (value: DevtoolsEventMap[K]) => void)(data);
      } catch (err) {
        // A broken listener must never crash the emitter.
        // eslint-disable-next-line no-console
        console.error('[Voodoo] error in devtools listener:', err);
      }
    }
  },

  /** Subscribes to an event type. Returns the function that unsubscribes. */
  on<K extends DevtoolsEventType>(
    type: K,
    callback: (data: DevtoolsEventMap[K]) => void
  ): () => void {
    let set = listeners.get(type);
    if (!set) listeners.set(type, (set = new Set()));
    set.add(callback as Listener);
    return () => {
      set?.delete(callback as Listener);
    };
  },

  /** Cancels a specific subscription. */
  off<K extends DevtoolsEventType>(type: K, callback: (data: DevtoolsEventMap[K]) => void): void {
    listeners.get(type)?.delete(callback as Listener);
  },

  /** Removes all listeners of a type or all listeners. */
  clear(type?: DevtoolsEventType): void {
    if (type) listeners.delete(type);
    else listeners.clear();
  },

  /** Number of listeners registered for a type. */
  count(type: DevtoolsEventType): number {
    return listeners.get(type)?.size ?? 0;
  },
};

export type DevtoolsBus = typeof devtoolsBus;
