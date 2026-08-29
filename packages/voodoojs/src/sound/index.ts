/**
 * @module sound
 *
 * Som nativo, sem arquivo e sem dependencia.
 *
 * Os efeitos sao sintetizados na hora com a Web Audio API, entao nao existe
 * download, nao existe pasta de audio e o custo em bytes e proximo de zero.
 * Tambem da para tocar um arquivo proprio quando voce quiser.
 *
 * ```html
 * <button v-sound="click">Salvar</button>
 * <button v-sound="success" v-post="/api/pedidos">Finalizar</button>
 * <a v-sound:mouseenter="hover" href="/precos">Precos</a>
 * <input v-sound:input="type">
 * ```
 *
 * ```js
 * V.sound.play('success')
 * V.sound.note('do', 300)
 * V.sound.melody(['do', 'mi', 'sol'], 140)
 * V.sound.volume(0.4)
 * V.sound.mute()
 * ```
 *
 * Regras de bom comportamento que o modulo segue sozinho:
 *
 * - navegador nenhum deixa tocar audio antes de a pessoa interagir, entao o
 *   contexto so e criado no primeiro gesto;
 * - quem liga `prefers-reduced-motion` costuma preferir menos estimulo, entao o
 *   volume padrao cai pela metade nesse caso;
 * - a preferencia de silencio fica guardada e vale nas proximas visitas.
 */

import { defineDirective } from '../runtime/registry';
import { magic } from '../runtime/scope';
import { storage } from '../storage';

// ---------------------------------------------------------------------------
// Contexto de audio
// ---------------------------------------------------------------------------

type ContextoDeAudio = AudioContext & { resume(): Promise<void> };

let contexto: ContextoDeAudio | null = null;
let volumeGeral = 0.35;
let silenciado = false;
let carregouPreferencia = false;

const CHAVE_VOLUME = 'voodoo:sound:volume';
const CHAVE_SILENCIO = 'voodoo:sound:muted';

function carregarPreferencia(): void {
  if (carregouPreferencia) return;
  carregouPreferencia = true;

  const salvo = storage.get<number>(CHAVE_VOLUME);
  if (typeof salvo === 'number' && salvo >= 0 && salvo <= 1) volumeGeral = salvo;

  const mudo = storage.get<boolean>(CHAVE_SILENCIO);
  if (typeof mudo === 'boolean') silenciado = mudo;

  // Menos movimento costuma significar menos estimulo. Baixa o volume, mas nao
  // silencia, para quem pediu um som ainda ouvir o retorno da acao.
  if (
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches &&
    storage.get<number>(CHAVE_VOLUME) === undefined
  ) {
    volumeGeral = 0.18;
  }
}

/**
 * Devolve o contexto de audio, criando na primeira vez.
 * Retorna `null` quando o navegador nao tem suporte.
 */
function obterContexto(): ContextoDeAudio | null {
  if (typeof window === 'undefined') return null;
  if (contexto) {
    // O navegador suspende o contexto quando a aba perde o foco.
    if (contexto.state === 'suspended') void contexto.resume();
    return contexto;
  }

  const Construtor =
    (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!Construtor) return null;

  try {
    contexto = new Construtor() as ContextoDeAudio;
    return contexto;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Sintese
// ---------------------------------------------------------------------------

export type FormaDeOnda = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface Camada {
  /** Frequencia inicial em hertz. */
  frequencia: number;
  /** Frequencia final, para o som deslizar. Ausente mantem a inicial. */
  ate?: number;
  /** Duracao em segundos. */
  duracao: number;
  /** Volume relativo da camada, de 0 a 1. */
  volume?: number;
  forma?: FormaDeOnda;
  /** Atraso em segundos desde o inicio do efeito. */
  atraso?: number;
  /** Tempo de subida do volume, em segundos. */
  ataque?: number;
}

/** Toca uma camada isolada. */
function tocarCamada(ctx: ContextoDeAudio, camada: Camada, volumeDoEfeito: number): void {
  const inicio = ctx.currentTime + (camada.atraso ?? 0);
  const fim = inicio + camada.duracao;

  const oscilador = ctx.createOscillator();
  oscilador.type = camada.forma ?? 'sine';
  oscilador.frequency.setValueAtTime(camada.frequencia, inicio);
  if (camada.ate !== undefined && camada.ate !== camada.frequencia) {
    oscilador.frequency.exponentialRampToValueAtTime(Math.max(1, camada.ate), fim);
  }

  const ganho = ctx.createGain();
  const pico = volumeGeral * volumeDoEfeito * (camada.volume ?? 1);
  const ataque = camada.ataque ?? 0.008;

  // Envelope simples: sobe rapido e cai suave, o que evita o estalo que
  // aparece quando o volume corta de uma vez.
  ganho.gain.setValueAtTime(0.0001, inicio);
  ganho.gain.exponentialRampToValueAtTime(Math.max(0.0001, pico), inicio + ataque);
  ganho.gain.exponentialRampToValueAtTime(0.0001, fim);

  oscilador.connect(ganho);
  ganho.connect(ctx.destination);

  oscilador.start(inicio);
  oscilador.stop(fim + 0.02);
}

// ---------------------------------------------------------------------------
// Efeitos prontos
// ---------------------------------------------------------------------------

export interface Efeito {
  camadas: Camada[];
  /** Volume do efeito inteiro, de 0 a 1. */
  volume?: number;
}

/**
 * Biblioteca de efeitos. Cada um foi desenhado para ser curto e discreto:
 * som de interface existe para confirmar uma acao, nao para chamar atencao.
 */
export const efeitos: Record<string, Efeito> = {
  /** Toque seco de confirmacao, para botoes comuns. */
  click: {
    volume: 0.5,
    camadas: [{ frequencia: 660, ate: 440, duracao: 0.06, forma: 'triangle' }],
  },

  /** Estalo curto e agudo, bom para alternar algo. */
  pop: {
    volume: 0.5,
    camadas: [{ frequencia: 880, ate: 1320, duracao: 0.07, forma: 'sine' }],
  },

  /** Roce leve, para passar o mouse por cima. */
  hover: {
    volume: 0.22,
    camadas: [{ frequencia: 1200, duracao: 0.035, forma: 'sine' }],
  },

  /** Duas notas subindo, para dar certo. */
  success: {
    volume: 0.6,
    camadas: [
      { frequencia: 523.25, duracao: 0.1, forma: 'sine' },
      { frequencia: 783.99, duracao: 0.18, forma: 'sine', atraso: 0.09 },
    ],
  },

  /** Tres notas subindo, para conclusao de fluxo. */
  complete: {
    volume: 0.6,
    camadas: [
      { frequencia: 523.25, duracao: 0.1, forma: 'sine' },
      { frequencia: 659.25, duracao: 0.1, forma: 'sine', atraso: 0.09 },
      { frequencia: 1046.5, duracao: 0.22, forma: 'sine', atraso: 0.18 },
    ],
  },

  /** Duas notas descendo, para erro. */
  error: {
    volume: 0.6,
    camadas: [
      { frequencia: 392, duracao: 0.12, forma: 'square', volume: 0.5 },
      { frequencia: 261.63, duracao: 0.24, forma: 'square', volume: 0.5, atraso: 0.1 },
    ],
  },

  /** Aviso curto de atencao. */
  warning: {
    volume: 0.55,
    camadas: [
      { frequencia: 587.33, duracao: 0.1, forma: 'triangle' },
      { frequencia: 587.33, duracao: 0.14, forma: 'triangle', atraso: 0.14 },
    ],
  },

  /** Sino discreto, para notificacao que chega. */
  notify: {
    volume: 0.5,
    camadas: [
      { frequencia: 987.77, duracao: 0.14, forma: 'sine' },
      { frequencia: 1318.51, duracao: 0.3, forma: 'sine', atraso: 0.08, volume: 0.6 },
    ],
  },

  /** Toque bem curto para digitacao. */
  type: {
    volume: 0.18,
    camadas: [{ frequencia: 2200, duracao: 0.018, forma: 'square' }],
  },

  /** Deslizar de abertura, para painel, gaveta e modal. */
  open: {
    volume: 0.4,
    camadas: [{ frequencia: 330, ate: 660, duracao: 0.14, forma: 'sine' }],
  },

  /** Deslizar de fechamento. */
  close: {
    volume: 0.4,
    camadas: [{ frequencia: 660, ate: 330, duracao: 0.14, forma: 'sine' }],
  },

  /** Recusa curta, para acao bloqueada. */
  deny: {
    volume: 0.5,
    camadas: [
      { frequencia: 220, duracao: 0.08, forma: 'square', volume: 0.5 },
      { frequencia: 180, duracao: 0.12, forma: 'square', volume: 0.5, atraso: 0.07 },
    ],
  },

  /** Moeda, para pontuacao e recompensa. */
  coin: {
    volume: 0.45,
    camadas: [
      { frequencia: 987.77, duracao: 0.06, forma: 'square' },
      { frequencia: 1318.51, duracao: 0.16, forma: 'square', atraso: 0.05 },
    ],
  },

  /** Passagem de nivel, mais festiva. */
  levelup: {
    volume: 0.55,
    camadas: [
      { frequencia: 523.25, duracao: 0.08, forma: 'square' },
      { frequencia: 659.25, duracao: 0.08, forma: 'square', atraso: 0.07 },
      { frequencia: 783.99, duracao: 0.08, forma: 'square', atraso: 0.14 },
      { frequencia: 1046.5, duracao: 0.26, forma: 'square', atraso: 0.21 },
    ],
  },

  /** Batida grave, para arrastar e soltar. */
  drop: {
    volume: 0.5,
    camadas: [{ frequencia: 180, ate: 90, duracao: 0.12, forma: 'triangle' }],
  },
};

// ---------------------------------------------------------------------------
// Notas musicais
// ---------------------------------------------------------------------------

/** Frequencia das notas da quarta oitava, em hertz. */
const NOTAS: Record<string, number> = {
  do: 261.63,
  'do#': 277.18,
  re: 293.66,
  're#': 311.13,
  mi: 329.63,
  fa: 349.23,
  'fa#': 369.99,
  sol: 392.0,
  'sol#': 415.3,
  la: 440.0,
  'la#': 466.16,
  si: 493.88,
  // Nomes em ingles, para quem prefere.
  c: 261.63,
  d: 293.66,
  e: 329.63,
  f: 349.23,
  g: 392.0,
  a: 440.0,
  b: 493.88,
};

/**
 * Converte um nome de nota em frequencia.
 * Aceita oitava no fim, como `do5` ou `la3`.
 */
export function frequenciaDaNota(nome: string): number | null {
  const limpo = String(nome).trim().toLowerCase();
  const casamento = /^([a-z]+#?)(\d)?$/.exec(limpo);
  if (!casamento) return null;

  const base = NOTAS[casamento[1]];
  if (base === undefined) return null;

  const oitava = casamento[2] ? Number(casamento[2]) : 4;
  return base * 2 ** (oitava - 4);
}

// ---------------------------------------------------------------------------
// Arquivos de audio
// ---------------------------------------------------------------------------

const arquivos = new Map<string, HTMLAudioElement>();

/** Toca um arquivo de audio, reaproveitando o elemento entre as chamadas. */
function tocarArquivo(url: string, volume: number): void {
  let elemento = arquivos.get(url);
  if (!elemento) {
    elemento = new Audio(url);
    elemento.preload = 'auto';
    arquivos.set(url, elemento);
  }
  elemento.volume = Math.max(0, Math.min(1, volumeGeral * volume));
  elemento.currentTime = 0;
  void elemento.play().catch(() => {
    // O navegador recusa audio antes do primeiro gesto. Sem alarde.
  });
}

function pareceCaminho(valor: string): boolean {
  return /^(https?:)?\/\//.test(valor) || /^[./]/.test(valor) || /\.(mp3|wav|ogg|m4a|aac)$/i.test(valor);
}

// ---------------------------------------------------------------------------
// API publica
// ---------------------------------------------------------------------------

export interface OpcoesDeToque {
  /** Volume relativo, de 0 a 1. Multiplica o volume geral. */
  volume?: number;
  /** Multiplica a frequencia de todas as camadas, deixando o som mais agudo. */
  tom?: number;
}

export const sound = {
  /**
   * Toca um efeito pelo nome, ou um arquivo pelo caminho.
   *
   * ```js
   * V.sound.play('success')
   * V.sound.play('/audio/ding.mp3')
   * V.sound.play('click', { volume: 0.5 })
   * ```
   */
  play(nome: string, opcoes: OpcoesDeToque = {}): void {
    carregarPreferencia();
    if (silenciado || !nome) return;

    const valor = String(nome).trim();
    const volume = opcoes.volume ?? 1;

    if (pareceCaminho(valor)) {
      tocarArquivo(valor, volume);
      return;
    }

    const efeito = efeitos[valor];
    if (!efeito) {
      // Nome desconhecido pode ser uma nota, como `la` ou `do5`.
      const frequencia = frequenciaDaNota(valor);
      if (frequencia !== null) this.tone(frequencia, 200, { volume });
      return;
    }

    const ctx = obterContexto();
    if (!ctx) return;

    const tom = opcoes.tom ?? 1;
    const volumeDoEfeito = (efeito.volume ?? 1) * volume;

    for (const camada of efeito.camadas) {
      tocarCamada(
        ctx,
        tom === 1
          ? camada
          : {
              ...camada,
              frequencia: camada.frequencia * tom,
              ate: camada.ate === undefined ? undefined : camada.ate * tom,
            },
        volumeDoEfeito
      );
    }
  },

  /**
   * Toca uma frequencia pura.
   *
   * ```js
   * V.sound.tone(440, 300)
   * ```
   *
   * @param frequencia hertz
   * @param duracao milissegundos
   */
  tone(frequencia: number, duracao = 200, opcoes: OpcoesDeToque & { forma?: FormaDeOnda } = {}): void {
    carregarPreferencia();
    if (silenciado) return;
    const ctx = obterContexto();
    if (!ctx) return;

    tocarCamada(
      ctx,
      { frequencia, duracao: duracao / 1000, forma: opcoes.forma ?? 'sine' },
      opcoes.volume ?? 0.5
    );
  },

  /**
   * Toca uma nota pelo nome.
   *
   * ```js
   * V.sound.note('la', 300)
   * V.sound.note('do5', 200)
   * ```
   */
  note(nome: string, duracao = 250, opcoes: OpcoesDeToque = {}): void {
    const frequencia = frequenciaDaNota(nome);
    if (frequencia === null) return;
    this.tone(frequencia, duracao, opcoes);
  },

  /**
   * Toca uma sequencia de notas.
   *
   * ```js
   * V.sound.melody(['do', 'mi', 'sol', 'do5'], 140)
   * ```
   *
   * @param notas nomes de nota, ou frequencias em hertz
   * @param intervalo milissegundos entre uma nota e a seguinte
   */
  melody(notas: Array<string | number>, intervalo = 150, opcoes: OpcoesDeToque = {}): void {
    carregarPreferencia();
    if (silenciado) return;

    notas.forEach((nota, indice) => {
      const frequencia = typeof nota === 'number' ? nota : frequenciaDaNota(nota);
      if (frequencia === null) return;
      setTimeout(() => this.tone(frequencia, intervalo * 1.6, opcoes), indice * intervalo);
    });
  },

  /**
   * Le ou ajusta o volume geral, de 0 a 1. A escolha fica guardada.
   *
   * ```js
   * V.sound.volume()      // le
   * V.sound.volume(0.6)   // ajusta
   * ```
   */
  volume(valor?: number): number {
    carregarPreferencia();
    if (valor === undefined) return volumeGeral;
    volumeGeral = Math.max(0, Math.min(1, valor));
    storage.set(CHAVE_VOLUME, volumeGeral);
    return volumeGeral;
  },

  /** Silencia. Passe `false` para voltar a tocar. */
  mute(valor = true): void {
    carregarPreferencia();
    silenciado = valor;
    storage.set(CHAVE_SILENCIO, silenciado);
  },

  /** Volta a tocar. */
  unmute(): void {
    this.mute(false);
  },

  /** Alterna entre silencio e som, e devolve o novo estado. */
  toggle(): boolean {
    carregarPreferencia();
    this.mute(!silenciado);
    return silenciado;
  },

  /** `true` quando esta silenciado. */
  get muted(): boolean {
    carregarPreferencia();
    return silenciado;
  },

  /** Nomes de todos os efeitos disponiveis. */
  get names(): string[] {
    return Object.keys(efeitos);
  },

  /**
   * Registra um efeito proprio.
   *
   * ```js
   * V.sound.define('meuAviso', {
   *   volume: 0.5,
   *   camadas: [
   *     { frequencia: 700, duracao: 0.1 },
   *     { frequencia: 900, duracao: 0.2, atraso: 0.08 }
   *   ]
   * })
   * ```
   */
  define(nome: string, efeito: Efeito): void {
    efeitos[nome] = efeito;
  },

  /** Carrega um arquivo antes da hora, para nao atrasar no primeiro toque. */
  preload(...urls: string[]): void {
    for (const url of urls) {
      if (arquivos.has(url)) continue;
      const elemento = new Audio(url);
      elemento.preload = 'auto';
      arquivos.set(url, elemento);
    }
  },
};

export type Sound = typeof sound;

// ---------------------------------------------------------------------------
// Directives
// ---------------------------------------------------------------------------

/**
 * `v-sound` toca um efeito quando o elemento e acionado.
 *
 * ```html
 * <button v-sound="click">Salvar</button>
 * <button v-sound="success" v-post="/api/pedidos">Finalizar</button>
 * <a v-sound:mouseenter="hover" href="/precos">Precos</a>
 * <input v-sound:input="type">
 * <div v-sound:voodoo:success="complete" v-get="/api/dados"></div>
 * ```
 *
 * O valor pode ser o nome de um efeito, o caminho de um arquivo, o nome de uma
 * nota ou uma expressao que devolva qualquer um desses.
 */
defineDirective('sound', ({ el, arg, expression, modifiers, scope, cleanup, evaluate }) => {
  const evento = arg || 'click';

  const resolver = (): string => {
    const bruto = expression.trim();
    if (!bruto) return 'click';
    // Nome direto de efeito, de nota ou caminho de arquivo dispensa avaliacao.
    if (efeitos[bruto] || pareceCaminho(bruto) || frequenciaDaNota(bruto) !== null) return bruto;
    const valor = evaluate<unknown>();
    return typeof valor === 'string' ? valor : bruto;
  };

  const volume = modifiers.volume !== undefined ? Number(modifiers.volume) : undefined;

  const tocar = (): void => {
    sound.play(resolver(), volume === undefined ? {} : { volume });
  };

  el.addEventListener(evento, tocar);
  cleanup(() => el.removeEventListener(evento, tocar));
  void scope;
});

/**
 * `v-mute` alterna o silencio ao clicar, e mantem o estado no proprio elemento.
 *
 * ```html
 * <button v-mute>Som</button>
 * ```
 *
 * O elemento recebe `aria-pressed` e a classe `v-muted` quando esta silenciado.
 */
defineDirective('mute', ({ el, cleanup }) => {
  const sincronizar = (): void => {
    const mudo = sound.muted;
    el.setAttribute('aria-pressed', String(mudo));
    el.classList.toggle('v-muted', mudo);
  };

  const alternar = (): void => {
    sound.toggle();
    sincronizar();
    // Um toque curto confirma que o som voltou.
    if (!sound.muted) sound.play('pop');
  };

  el.addEventListener('click', alternar);
  sincronizar();
  cleanup(() => el.removeEventListener('click', alternar));
});

// ---------------------------------------------------------------------------
// Variavel magica
// ---------------------------------------------------------------------------

magic('$sound', () => sound);
