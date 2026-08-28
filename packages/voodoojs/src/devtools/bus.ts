/**
 * @module devtools/bus
 *
 * Barramento de eventos das devtools. Vive em um arquivo separado do inspetor
 * para continuar sendo tree shakeable: quem apenas reporta atividade paga
 * poucos bytes, e o painel visual so entra no pacote quando `xray()` e
 * realmente importado.
 *
 * Emitir sem nenhum ouvinte registrado custa uma busca em `Map` e nada mais,
 * entao qualquer modulo pode reportar atividade sem medo.
 *
 * ```ts
 * import { devtoolsBus } from '../devtools/bus';
 *
 * // Reportando uma requisicao de rede a partir de uma directive:
 * const inicio = performance.now();
 * const dados = await http.get('/api/usuarios');
 * devtoolsBus.emit('network', {
 *   method: 'GET',
 *   url: '/api/usuarios',
 *   status: 200,
 *   ok: true,
 *   duration: performance.now() - inicio,
 *   source: 'v-get',
 * });
 * ```
 */

/** Requisicao reportada para a aba Rede do inspetor. */
export interface DevtoolsNetworkEvent {
  /** Metodo HTTP em maiusculas, como `GET` ou `POST`. */
  method: string;
  /** URL final da requisicao. */
  url: string;
  /** Codigo de status, quando a resposta chegou. */
  status?: number;
  /** `true` quando a resposta foi bem sucedida. */
  ok?: boolean;
  /** Duracao em milissegundos. */
  duration?: number;
  /** Mensagem de erro, quando a requisicao falhou. */
  error?: string;
  /** Quem disparou, como `v-get`, `http` ou `router`. */
  source?: string;
}

/** Evento de DOM disparado por uma directive, mostrado na aba Eventos. */
export interface DevtoolsDomEvent {
  /** Nome do evento, como `click` ou `submit`. */
  type: string;
  /** Elemento que recebeu o evento. */
  el?: Element | null;
  /** Expressao ou detalhe associado, apenas para exibicao. */
  detail?: unknown;
  /** Quem reportou, como `v-on` ou `component.emit`. */
  source?: string;
}

/** Troca de rota reportada pelo roteador. */
export interface DevtoolsNavigationEvent {
  from: string;
  to: string;
  /** `true` quando um guard cancelou a navegacao. */
  cancelled?: boolean;
  /** Padrao de rota casado, quando houver. */
  matched?: string | null;
}

/** Troca de idioma reportada pelo modulo de i18n. */
export interface DevtoolsLocaleEvent {
  from: string;
  to: string;
}

/** Atualizacao reativa reportada manualmente por um modulo. */
export interface DevtoolsUpdateEvent {
  el?: Element | null;
  /** Nome da chave que mudou, quando conhecido. */
  key?: string;
  source?: string;
}

/** Mapa de tipos de evento aceitos pelo barramento. */
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
 * Barramento simples de publicacao e assinatura usado pelas devtools.
 *
 * Para reportar uma requisicao de rede a partir de outro modulo, emita o tipo
 * `network` com `{ method, url, status, ok, duration, source }`. A aba Rede do
 * inspetor lista tudo que chegar por ai, mesmo quando a requisicao nao passou
 * pelo cliente `http` da Voodoo.
 */
export const devtoolsBus = {
  /** Publica um evento. Sem ouvintes, a chamada e praticamente gratuita. */
  emit<K extends DevtoolsEventType>(type: K, data: DevtoolsEventMap[K]): void {
    const set = listeners.get(type);
    if (!set || set.size === 0) return;
    for (const listener of [...set]) {
      try {
        (listener as (value: DevtoolsEventMap[K]) => void)(data);
      } catch (err) {
        // Um ouvinte quebrado nunca pode derrubar quem emitiu.
        // eslint-disable-next-line no-console
        console.error('[Voodoo] erro em ouvinte de devtools:', err);
      }
    }
  },

  /** Assina um tipo de evento. Devolve a funcao que cancela a assinatura. */
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

  /** Cancela uma assinatura especifica. */
  off<K extends DevtoolsEventType>(type: K, callback: (data: DevtoolsEventMap[K]) => void): void {
    listeners.get(type)?.delete(callback as Listener);
  },

  /** Remove todos os ouvintes, de um tipo ou de todos. */
  clear(type?: DevtoolsEventType): void {
    if (type) listeners.delete(type);
    else listeners.clear();
  },

  /** Quantidade de ouvintes registrados em um tipo. */
  count(type: DevtoolsEventType): number {
    return listeners.get(type)?.size ?? 0;
  },
};

export type DevtoolsBus = typeof devtoolsBus;
