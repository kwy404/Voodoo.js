/**
 * @module directives/socket
 *
 * Real-time declared in HTML, in the same spirit as `v-get` and `v-resource`:
 * the common case goes through attributes, the rest stays available in `V.socket()`.
 *
 * ```html
 * <div v-socket="wss://example.com/chat" v-room="general">
 *   <p v-show="!$socket.connected">Reconnecting...</p>
 *   <ul>
 *     <li v-for="m in $room.messages">{ m.author }: { m.text }</li>
 *   </ul>
 *   <span>{ $room.members.length } online</span>
 *   <form @submit.prevent="$room.send('message', { text: draft })">
 *     <input v-model="draft">
 *   </form>
 * </div>
 *
 * <div v-socket="/" v-socket-transport="socket.io"
 *      v-on-socket:new-message="messages.push($event)"></div>
 * ```
 *
 * Leaving the DOM closes the connection, leaves rooms, and removes all listeners. No
 * exceptions: a connection opened by an element that's already gone is a leak that
 * only shows up weeks later, as a server bill.
 */

import { reactive } from '../reactivity';
import { config, defineDirective, PRIORITY } from '../runtime/registry';
import type { Scope } from '../runtime/scope';
import { evaluateIn, readAttr } from '../runtime/walker';
import { parseDuration } from '../utils';
import {
  createSocket,
  socketSupported,
  type SocketOptions,
  type SocketTransport,
  type VoodooSocket,
} from '../socket';

// ---------------------------------------------------------------------------
// Reading auxiliary attributes
// ---------------------------------------------------------------------------

function attr(el: Element, name: string): string | null {
  return readAttr(el, `${config.prefix}${name}`);
}

/**
 * Connections created by `v-socket`, indexed by element.
 *
 * `v-room` and `v-on-socket` walk up the tree to find one, which is what makes
 * the example at the top work without repeating the URL on each child.
 */
const connections = new WeakMap<Element, VoodooSocket>();

function closest<T>(el: Element, map: WeakMap<Element, T>): T | null {
  let current: Element | null = el;
  while (current) {
    const found = map.get(current);
    if (found) return found;
    current = current.parentElement;
  }
  return null;
}

/**
 * Resolves a value that can be written there or come from state.
 *
 * `wss://example.com` and `general` are literals. `'dm:' + id` is an expression. A
 * bare identifier, like `currentRoom`, is tried in state first and only becomes
 * a literal when state has nothing with that name.
 */
function resolveText(expression: string, scope: Scope, context: string): string {
  const text = expression.trim();
  if (!text) return '';

  if (/^[A-Za-z_$][\w$]*$/.test(text)) {
    const value = scope.has(text) ? scope.get(text) : undefined;
    return typeof value === 'string' && value ? value : text;
  }
  // Pure literal: address, path, or room name like `dm:ana`.
  if (/^(wss?|https?):\/\//i.test(text) || /^[\w:.\-/]+$/.test(text)) return text;

  const value = evaluateIn<string>(text, scope, context);
  return typeof value === 'string' && value ? value : text;
}

function dispatch(el: Element, type: string, detail: unknown): void {
  el.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
}

// ---------------------------------------------------------------------------
// v-socket
// ---------------------------------------------------------------------------

defineDirective(
  'socket',
  ({ el, scope, expression, modifiers, cleanup, effect }) => {
    const name = attr(el, 'socket-as') || '$socket';

    // Without WebSocket in the environment nothing is thrown. The element just says it didn't work,
    // and whoever builds the page can react via CSS or the event.
    if (!socketSupported()) {
      el.setAttribute('data-socket', 'unsupported');
      scope.set(
        name,
        reactive({
          connected: false,
          state: 'closed',
          error: 'WebSocket unavailable in this environment',
          attempts: 0,
          messages: [] as unknown[],
          send: () => false,
          open: () => undefined,
          close: () => undefined,
          socket: null,
        })
      );
      dispatch(el, 'voodoo:socket-unsupported', { url: expression });
      return;
    }

    const limit = Number(attr(el, 'socket-buffer') ?? 50);
    const transport = (attr(el, 'socket-transport') || 'ws') as SocketTransport;

    // Three ways to turn off reconnection, and the reason there are three: HTML doesn't
    // accept `=` in attribute names, so `v-socket.reconnect=false`
    // reaches the browser broken. `.no-reconnect` and the auxiliary attribute are the
    // ones that work in hand-written HTML; the form with `=` still works
    // for those who generate the attribute by template.
    const reconnect =
      !modifiers['no-reconnect'] &&
      modifiers.reconnect !== 'false' &&
      attr(el, 'socket-reconnect') !== 'false';

    const options: SocketOptions = {
      transport: transport === 'socket.io' ? 'socket.io' : 'ws',
      manual: !!modifiers.manual,
      reconnect,
    };
    if (modifiers.json) options.json = modifiers.json !== 'false';
    const path = attr(el, 'socket-path');
    if (path) options.path = path;
    const heartbeat = attr(el, 'socket-heartbeat');
    if (heartbeat !== null) options.heartbeat = parseDuration(heartbeat, 25_000);

    const s = createSocket(resolveText(expression, scope, 'v-socket') || '/', options);
    connections.set(el, s);
    el.setAttribute('data-socket', 'ready');

    /** `send('event', data)` sends an event; `send(data)` sends raw. */
    function send(event: unknown, ...rest: unknown[]): boolean {
      if (typeof event !== 'string') return s.send(event);
      return rest.length ? s.emit(event, rest[0]) : s.emit(event);
    }

    const view = reactive({
      connected: s.connected,
      state: s.state as string,
      error: s.error,
      attempts: s.attempts,
      messages: [] as unknown[],
      send,
      open: () => s.open(),
      close: () => s.close(),
      socket: s,
    });
    scope.set(name, view);

    // One effect, mirroring the socket's reactive state in the HTML object.
    // So `v-show="$socket.connected"` works without any manual listener.
    effect(() => {
      view.connected = s.connected;
      view.state = s.state;
      view.error = s.error;
      view.attempts = s.attempts;
    });

    const unsubscribe = [
      s.on('message', (data) => {
        view.messages.push(data);
        // Buffer with a ceiling: a page open all day can't grow endlessly
        // just because the server is chatty.
        if (view.messages.length > limit) {
          view.messages.splice(0, view.messages.length - limit);
        }
      }),
      s.on('open', () => dispatch(el, 'voodoo:socket-open', { url: s.url })),
      s.on('close', (d) => dispatch(el, 'voodoo:socket-close', d)),
      s.on('error', (d) => dispatch(el, 'voodoo:socket-error', d)),
    ];

    cleanup(() => {
      for (const stop of unsubscribe) stop();
      // `off()` with no argument clears all listeners, including those that `v-room` and
      // `v-on-socket` registered. `close()` tears down timers and reconnection.
      s.off();
      s.close();
      connections.delete(el);
    });
  },
  { priority: PRIORITY.DATA }
);

// ---------------------------------------------------------------------------
// v-room
// ---------------------------------------------------------------------------

/**
 * `v-room="general"` joins a room in the nearest connection and publishes `$room`.
 *
 * The `.private` modifier marks the room as private. Repeating what the
 * documentation says prominently: this is a request to the server, never a
 * guarantee. The client cannot prevent anyone from entering a room.
 */
defineDirective(
  'room',
  ({ el, scope, expression, modifiers, cleanup, effect }) => {
    const s = closest(el, connections);
    if (!s) return;

    const roomName = resolveText(expression, scope, 'v-room');
    if (!roomName) return;

    const room = s.join(roomName, {
      private: !!modifiers.private || !!modifiers.privada,
      buffer: Number(attr(el, 'room-buffer') ?? 50),
    });

    const view = reactive({
      name: roomName,
      private: room.private,
      state: room.state as string,
      members: room.members,
      messages: room.messages,
      /** Sends to the room. With `to`, only to that recipient. */
      send: (event: string, data?: unknown, to?: string): boolean =>
        to ? room.to(to).emit(event, data) : room.emit(event, data),
      leave: () => room.leave(),
      room,
    });
    scope.set(attr(el, 'room-as') || '$room', view);

    effect(() => {
      view.state = room.state;
      view.members = room.members;
      view.messages = room.messages;
    });

    const unsubscribe = [
      room.on('joined', (m) => dispatch(el, 'voodoo:room-join', m)),
      room.on('left', (m) => dispatch(el, 'voodoo:room-leave', m)),
    ];

    cleanup(() => {
      for (const stop of unsubscribe) stop();
      room.off();
      room.leave();
    });
  },
  // After `v-socket`, so the connection exists when the room asks to join.
  { priority: PRIORITY.DATA - 1 }
);

// ---------------------------------------------------------------------------
// v-on-socket:<event>
// ---------------------------------------------------------------------------

/**
 * `v-on-socket:new-message="messages.push($event)"`.
 *
 * Same spirit as `@event`: the payload arrives in `$event`.
 *
 * The signature is always on the **connection**, even inside a `v-room`. The name says
 * `on-socket`, and the connection sees everything that arrives, including what comes from rooms. Whoever
 * wants the filtered slice of a room has `$room.messages` in HTML and
 * `room.on()` in JavaScript; mixing the two here would leave the same attribute
 * listening to different targets depending on where it was written.
 */
defineDirective('on-socket', ({ el, scope, arg, expression, cleanup }) => {
  if (!arg) return;
  const target = closest(el, connections);
  if (!target) return;

  const unsubscribe = target.on(arg, (data: unknown, ack?: (r: unknown) => void) => {
    const local = scope.child({ $event: data, $ack: ack, $el: el });
    const value = evaluateIn(expression, local, `v-on-socket:${arg}`);
    if (typeof value === 'function') value.call(scope.data, data);
  });

  cleanup(unsubscribe);
});

// ---------------------------------------------------------------------------
// Auxiliary attributes, registered to not become "unknown directive"
// ---------------------------------------------------------------------------

for (const nome of [
  'socket-transport',
  'socket-as',
  'socket-buffer',
  'socket-path',
  'socket-heartbeat',
  'socket-reconnect',
  'room-as',
  'room-buffer',
]) {
  defineDirective(nome, () => undefined, { priority: PRIORITY.TRANSITION });
}
