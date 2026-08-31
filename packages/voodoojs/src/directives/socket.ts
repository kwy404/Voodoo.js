/**
 * @module directives/socket
 *
 * Tempo real declarado no HTML, no mesmo espirito de `v-get` e `v-resource`:
 * o caso comum sai por atributo, o resto continua disponivel em `V.socket()`.
 *
 * ```html
 * <div v-socket="wss://exemplo.com/chat" v-room="geral">
 *   <p v-show="!$socket.conectado">Reconectando...</p>
 *   <ul>
 *     <li v-for="m in $room.mensagens">{ m.autor }: { m.texto }</li>
 *   </ul>
 *   <span>{ $room.membros.length } online</span>
 *   <form @submit.prevent="$room.enviar('mensagem', { texto: rascunho })">
 *     <input v-model="rascunho">
 *   </form>
 * </div>
 *
 * <div v-socket="/" v-socket-transport="socket.io"
 *      v-on-socket:nova-mensagem="mensagens.push($event)"></div>
 * ```
 *
 * Sair do DOM fecha a conexao, sai das salas e remove todos os ouvintes. Sem
 * excecao: uma conexao aberta por um elemento que ja morreu e um vazamento que
 * so aparece semanas depois, em forma de conta de servidor.
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
// Leitura dos atributos auxiliares
// ---------------------------------------------------------------------------

function attr(el: Element, nome: string): string | null {
  return readAttr(el, `${config.prefix}${nome}`);
}

/**
 * Conexoes criadas por `v-socket`, indexadas pelo elemento.
 *
 * `v-room` e `v-on-socket` sobem a arvore ate encontrar uma, que e o que faz o
 * exemplo do topo funcionar sem repetir a URL em cada filho.
 */
const conexoes = new WeakMap<Element, VoodooSocket>();

function maisProximo<T>(el: Element, mapa: WeakMap<Element, T>): T | null {
  let atual: Element | null = el;
  while (atual) {
    const encontrado = mapa.get(atual);
    if (encontrado) return encontrado;
    atual = atual.parentElement;
  }
  return null;
}

/**
 * Resolve um valor que tanto pode estar escrito ali quanto vir do estado.
 *
 * `wss://exemplo.com` e `geral` sao literais. `'dm:' + id` e expressao. Um
 * identificador solto, como `salaAtual`, e tentado no estado primeiro e so vira
 * literal quando o estado nao tem nada com aquele nome.
 */
function resolverTexto(expressao: string, scope: Scope, contexto: string): string {
  const texto = expressao.trim();
  if (!texto) return '';

  if (/^[A-Za-z_$][\w$]*$/.test(texto)) {
    const valor = scope.has(texto) ? scope.get(texto) : undefined;
    return typeof valor === 'string' && valor ? valor : texto;
  }
  // Literal puro: endereco, caminho ou nome de sala como `dm:ana`.
  if (/^(wss?|https?):\/\//i.test(texto) || /^[\w:.\-/]+$/.test(texto)) return texto;

  const valor = evaluateIn<string>(texto, scope, contexto);
  return typeof valor === 'string' && valor ? valor : texto;
}

function disparar(el: Element, tipo: string, detalhe: unknown): void {
  el.dispatchEvent(new CustomEvent(tipo, { detail: detalhe, bubbles: true }));
}

// ---------------------------------------------------------------------------
// v-socket
// ---------------------------------------------------------------------------

defineDirective(
  'socket',
  ({ el, scope, expression, modifiers, cleanup, effect }) => {
    const nome = attr(el, 'socket-as') || '$socket';

    // Sem WebSocket no ambiente nada e lancado. O elemento apenas diz que nao
    // deu, e quem monta a pagina pode reagir por CSS ou pelo evento.
    if (!socketSupported()) {
      el.setAttribute('data-socket', 'unsupported');
      scope.set(
        nome,
        reactive({
          conectado: false,
          estado: 'closed',
          erro: 'WebSocket indisponivel neste ambiente',
          tentativas: 0,
          mensagens: [] as unknown[],
          enviar: () => false,
          abrir: () => undefined,
          fechar: () => undefined,
          socket: null,
        })
      );
      disparar(el, 'voodoo:socket-unsupported', { url: expression });
      return;
    }

    const limite = Number(attr(el, 'socket-buffer') ?? 50);
    const transporte = (attr(el, 'socket-transport') || 'ws') as SocketTransport;

    // Tres formas de desligar a reconexao, e o motivo de serem tres: o HTML nao
    // aceita `=` dentro de nome de atributo, entao `v-socket.reconnect=false`
    // chega ao navegador quebrado. `.no-reconnect` e o atributo auxiliar sao os
    // que funcionam em HTML escrito a mao; a forma com `=` continua valendo
    // para quem gera o atributo por template.
    const reconectar =
      !modifiers['no-reconnect'] &&
      modifiers.reconnect !== 'false' &&
      attr(el, 'socket-reconnect') !== 'false';

    const opcoes: SocketOptions = {
      transport: transporte === 'socket.io' ? 'socket.io' : 'ws',
      manual: !!modifiers.manual,
      reconnect: reconectar,
    };
    if (modifiers.json) opcoes.json = modifiers.json !== 'false';
    const caminho = attr(el, 'socket-path');
    if (caminho) opcoes.path = caminho;
    const batida = attr(el, 'socket-heartbeat');
    if (batida !== null) opcoes.heartbeat = parseDuration(batida, 25_000);

    const s = createSocket(resolverTexto(expression, scope, 'v-socket') || '/', opcoes);
    conexoes.set(el, s);
    el.setAttribute('data-socket', 'ready');

    /** `enviar('evento', dados)` manda um evento; `enviar(dados)` manda cru. */
    function enviar(evento: unknown, ...resto: unknown[]): boolean {
      if (typeof evento !== 'string') return s.send(evento);
      return resto.length ? s.emit(evento, resto[0]) : s.emit(evento);
    }

    const vista = reactive({
      conectado: s.connected,
      estado: s.state as string,
      erro: s.error,
      tentativas: s.attempts,
      mensagens: [] as unknown[],
      enviar,
      abrir: () => s.open(),
      fechar: () => s.close(),
      socket: s,
    });
    scope.set(nome, vista);

    // Um efeito so, espelhando o estado reativo do socket no objeto do HTML.
    // Assim `v-show="$socket.conectado"` funciona sem nenhum listener manual.
    effect(() => {
      vista.conectado = s.connected;
      vista.estado = s.state;
      vista.erro = s.error;
      vista.tentativas = s.attempts;
    });

    const cancelar = [
      s.on('message', (dados) => {
        vista.mensagens.push(dados);
        // Buffer com teto: uma pagina aberta o dia inteiro nao pode crescer sem
        // parar so porque o servidor e falante.
        if (vista.mensagens.length > limite) {
          vista.mensagens.splice(0, vista.mensagens.length - limite);
        }
      }),
      s.on('open', () => disparar(el, 'voodoo:socket-open', { url: s.url })),
      s.on('close', (d) => disparar(el, 'voodoo:socket-close', d)),
      s.on('error', (d) => disparar(el, 'voodoo:socket-error', d)),
    ];

    cleanup(() => {
      for (const parar of cancelar) parar();
      // `off()` sem argumento apaga todo ouvinte, inclusive os que `v-room` e
      // `v-on-socket` registraram. `close()` derruba timers e a reconexao.
      s.off();
      s.close();
      conexoes.delete(el);
    });
  },
  { priority: PRIORITY.DATA }
);

// ---------------------------------------------------------------------------
// v-room
// ---------------------------------------------------------------------------

/**
 * `v-room="geral"` entra numa sala da conexao mais proxima e publica `$room`.
 *
 * O modificador `.privada` marca a sala como privada. Repetindo o que a
 * documentacao diz em destaque: isso e um pedido ao servidor, nunca uma
 * garantia. O cliente nao consegue impedir ninguem de entrar numa sala.
 */
defineDirective(
  'room',
  ({ el, scope, expression, modifiers, cleanup, effect }) => {
    const s = maisProximo(el, conexoes);
    if (!s) return;

    const nomeSala = resolverTexto(expression, scope, 'v-room');
    if (!nomeSala) return;

    const sala = s.join(nomeSala, {
      privada: !!modifiers.privada || !!modifiers.private,
      buffer: Number(attr(el, 'room-buffer') ?? 50),
    });

    const vista = reactive({
      nome: nomeSala,
      privada: sala.privada,
      estado: sala.estado as string,
      membros: sala.membros,
      mensagens: sala.mensagens,
      /** Envia para a sala. Com `para`, so para aquele destinatario. */
      enviar: (evento: string, dados?: unknown, para?: string): boolean =>
        para ? sala.to(para).emit(evento, dados) : sala.emit(evento, dados),
      sair: () => sala.leave(),
      sala,
    });
    scope.set(attr(el, 'room-as') || '$room', vista);

    effect(() => {
      vista.estado = sala.estado;
      vista.membros = sala.membros;
      vista.mensagens = sala.mensagens;
    });

    const cancelar = [
      sala.on('entrou', (m) => disparar(el, 'voodoo:room-join', m)),
      sala.on('saiu', (m) => disparar(el, 'voodoo:room-leave', m)),
    ];

    cleanup(() => {
      for (const parar of cancelar) parar();
      sala.off();
      sala.leave();
    });
  },
  // Depois de `v-socket`, para a conexao ja existir quando a sala pedir entrada.
  { priority: PRIORITY.DATA - 1 }
);

// ---------------------------------------------------------------------------
// v-on-socket:<evento>
// ---------------------------------------------------------------------------

/**
 * `v-on-socket:nova-mensagem="mensagens.push($event)"`.
 *
 * Mesmo espirito de `@evento`: a carga chega em `$event`.
 *
 * A assinatura e sempre na **conexao**, mesmo dentro de um `v-room`. O nome diz
 * `on-socket`, e a conexao ve tudo que chega, inclusive o que e de sala. Quem
 * quer o recorte ja filtrado de uma sala tem `$room.mensagens` no HTML e
 * `sala.on()` no JavaScript; misturar os dois aqui deixaria o mesmo atributo
 * escutando alvos diferentes dependendo de onde ele foi escrito.
 */
defineDirective('on-socket', ({ el, scope, arg, expression, cleanup }) => {
  if (!arg) return;
  const alvo = maisProximo(el, conexoes);
  if (!alvo) return;

  const cancelar = alvo.on(arg, (dados: unknown, ack?: (r: unknown) => void) => {
    const local = scope.child({ $event: dados, $ack: ack, $el: el });
    const valor = evaluateIn(expression, local, `v-on-socket:${arg}`);
    if (typeof valor === 'function') valor.call(scope.data, dados);
  });

  cleanup(cancelar);
});

// ---------------------------------------------------------------------------
// Atributos auxiliares, registrados para nao virarem "directive desconhecida"
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
