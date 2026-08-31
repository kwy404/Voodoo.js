/**
 * @module devtools/launcher
 *
 * Widget flutuante das devtools.
 *
 * O inspetor `xray` sempre existiu, mas so abria por chamada no console. Este
 * modulo coloca um botao na propria pagina: ele aparece quando as devtools
 * estao ligadas, mostra atividade em tempo real e abre o painel completo com um
 * clique.
 *
 * Ligar pelo HTML, sem escrever JavaScript nenhum:
 *
 * ```html
 * <script src="voodoo.full.min.js" devtools defer></script>
 * ```
 *
 * As formas equivalentes tambem valem: `data-devtools`, `devtools="true"` e
 * `window.VOODOO_DEVTOOLS = true` antes do carregamento.
 *
 * Ligar por JavaScript:
 *
 * ```js
 * V.devtoolsWidget()       // alterna
 * V.devtoolsWidget(true)   // mostra
 * V.devtoolsWidget(false)  // esconde
 * ```
 *
 * O modulo nao faz nada ao ser importado: nenhum listener, nenhum estilo e
 * nenhum timer existe antes da primeira chamada de `mountDevtoolsWidget()`.
 */

import { injectStyle } from '../dom/style';
import { instances } from '../runtime/component';
import { devtoolsBus } from './bus';
import { isXrayEnabled, xray } from './xray';

// ---------------------------------------------------------------------------
// Estado do modulo
// ---------------------------------------------------------------------------

/** Onde a posicao arrastada fica guardada entre recarregamentos. */
const POSICAO_KEY = 'voodoo:devtools:widget-position';

/** Marca que o desenvolvedor escondeu o widget nesta aba. */
const ESCONDIDO_KEY = 'voodoo:devtools:widget-hidden';

/** Distancia minima em pixels para o gesto contar como arrasto, nao clique. */
const LIMIAR_ARRASTO = 4;

interface Refs {
  raiz: HTMLElement;
  botao: HTMLButtonElement;
  pulso: HTMLElement;
  contador: HTMLElement;
  fechar: HTMLButtonElement;
}

let refs: Refs | null = null;
let montado = false;
let timerContador = 0;
let timerPulso = 0;
let desligar: Array<() => void> = [];

// ---------------------------------------------------------------------------
// Estilo
// ---------------------------------------------------------------------------

const WIDGET_CSS = `
.v-devtools-widget{
  all: initial;
  --vw-accent:#6D3BF5;
  --vw-accent-2:#FF3D8B;
  --vw-bg:#ffffff;
  --vw-text:#14111F;
  --vw-muted:#6B6580;
  --vw-border:#E6E0F0;
  --vw-shadow:0 8px 28px rgba(20,17,31,.24);
  position:fixed;
  z-index:2147482900;
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  font-size:12px;
  line-height:1;
  color:var(--vw-text);
  -webkit-font-smoothing:antialiased;
  touch-action:none;
}
@media (prefers-color-scheme: dark){
  .v-devtools-widget:not([data-theme="light"]){
    --vw-bg:#1C1830;
    --vw-text:#F4F1FB;
    --vw-muted:#A9A2C4;
    --vw-border:#332C50;
    --vw-shadow:0 8px 28px rgba(0,0,0,.55);
  }
}
.v-devtools-widget[data-theme="dark"]{
  --vw-bg:#1C1830;
  --vw-text:#F4F1FB;
  --vw-muted:#A9A2C4;
  --vw-border:#332C50;
  --vw-shadow:0 8px 28px rgba(0,0,0,.55);
}
.v-devtools-widget *,.v-devtools-widget *::before,.v-devtools-widget *::after{
  box-sizing:border-box;
  margin:0;
  padding:0;
  border:0;
  background:transparent;
  font:inherit;
  color:inherit;
  list-style:none;
  text-decoration:none;
}
.v-devtools-btn{
  display:flex;
  align-items:center;
  gap:8px;
  height:38px;
  padding:0 12px 0 10px;
  border:1px solid var(--vw-border);
  border-radius:999px;
  background:var(--vw-bg);
  box-shadow:var(--vw-shadow);
  cursor:grab;
  user-select:none;
  transition:transform .18s cubic-bezier(.22,1,.36,1), box-shadow .18s;
}
.v-devtools-btn:hover{
  transform:translateY(-1px);
  box-shadow:0 12px 34px rgba(109,59,245,.3);
}
.v-devtools-btn:active{cursor:grabbing}
.v-devtools-btn:focus-visible{
  outline:2px solid var(--vw-accent);
  outline-offset:2px;
}
.v-devtools-widget[data-active="true"] .v-devtools-btn{
  border-color:var(--vw-accent);
  box-shadow:0 0 0 3px rgba(109,59,245,.22), var(--vw-shadow);
}
.v-devtools-mark{
  flex:0 0 auto;
  width:20px;
  height:20px;
  display:block;
}
.v-devtools-label{
  font-weight:600;
  letter-spacing:.2px;
  white-space:nowrap;
}
.v-devtools-count{
  padding:2px 6px;
  border-radius:999px;
  background:rgba(109,59,245,.12);
  color:var(--vw-accent);
  font-variant-numeric:tabular-nums;
  font-weight:600;
  white-space:nowrap;
}
.v-devtools-pulse{
  flex:0 0 auto;
  width:7px;
  height:7px;
  border-radius:50%;
  background:var(--vw-border);
  transition:background .2s, box-shadow .2s;
}
.v-devtools-pulse[data-on="true"]{
  background:var(--vw-accent-2);
  box-shadow:0 0 0 4px rgba(255,61,139,.18);
}
.v-devtools-close{
  position:absolute;
  top:-7px;
  right:-7px;
  width:18px;
  height:18px;
  border-radius:50%;
  border:1px solid var(--vw-border);
  background:var(--vw-bg);
  color:var(--vw-muted);
  font-size:11px;
  line-height:1;
  cursor:pointer;
  opacity:0;
  transition:opacity .15s;
}
.v-devtools-widget:hover .v-devtools-close,
.v-devtools-close:focus-visible{opacity:1}
.v-devtools-close:focus-visible{
  outline:2px solid var(--vw-accent);
  outline-offset:1px;
}
@media (prefers-reduced-motion: reduce){
  .v-devtools-btn,.v-devtools-pulse,.v-devtools-close{transition:none}
  .v-devtools-btn:hover{transform:none}
}
`;

/** Marca da Voodoo desenhada em SVG, para o widget nao depender de arquivo. */
const MARCA = `<svg class="v-devtools-mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
<path d="M4 4l8 16 8-16" stroke="#6D3BF5" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="12" cy="7.5" r="2" fill="#FF3D8B"/>
</svg>`;

// ---------------------------------------------------------------------------
// Posicao
// ---------------------------------------------------------------------------

interface Posicao {
  x: number;
  y: number;
}

function lerPosicao(): Posicao | null {
  try {
    const bruto = localStorage.getItem(POSICAO_KEY);
    if (!bruto) return null;
    const valor = JSON.parse(bruto) as Posicao;
    if (typeof valor?.x !== 'number' || typeof valor?.y !== 'number') return null;
    return valor;
  } catch {
    return null;
  }
}

function gravarPosicao(pos: Posicao): void {
  try {
    localStorage.setItem(POSICAO_KEY, JSON.stringify(pos));
  } catch {
    // Armazenamento bloqueado: o widget so nao lembra a posicao.
  }
}

/** Mantem o widget dentro da janela, mesmo depois de redimensionar. */
function aplicarPosicao(raiz: HTMLElement, pos: Posicao): void {
  const largura = raiz.offsetWidth || 120;
  const altura = raiz.offsetHeight || 38;
  const x = Math.min(Math.max(8, pos.x), Math.max(8, window.innerWidth - largura - 8));
  const y = Math.min(Math.max(8, pos.y), Math.max(8, window.innerHeight - altura - 8));
  raiz.style.left = `${x}px`;
  raiz.style.top = `${y}px`;
  raiz.style.right = 'auto';
  raiz.style.bottom = 'auto';
}

// ---------------------------------------------------------------------------
// Construcao
// ---------------------------------------------------------------------------

function construir(): Refs {
  const raiz = document.createElement('div');
  raiz.className = 'v-devtools-widget';
  raiz.setAttribute('data-voodoo-devtools', 'widget');

  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'v-devtools-btn';
  botao.setAttribute('aria-label', 'Abrir as devtools da Voodoo (Ctrl+Shift+X)');
  botao.setAttribute('aria-pressed', 'false');
  botao.title = 'Devtools da Voodoo — clique para inspecionar, arraste para mover (Ctrl+Shift+X)';
  botao.innerHTML = MARCA;

  const rotulo = document.createElement('span');
  rotulo.className = 'v-devtools-label';
  rotulo.textContent = 'Voodoo';

  const contador = document.createElement('span');
  contador.className = 'v-devtools-count';
  contador.textContent = '0';

  const pulso = document.createElement('span');
  pulso.className = 'v-devtools-pulse';
  pulso.setAttribute('data-on', 'false');

  botao.append(rotulo, contador, pulso);

  const fechar = document.createElement('button');
  fechar.type = 'button';
  fechar.className = 'v-devtools-close';
  fechar.setAttribute('aria-label', 'Esconder o widget das devtools nesta aba');
  fechar.title = 'Esconder nesta aba';
  fechar.textContent = '×';

  raiz.append(botao, fechar);
  document.body.appendChild(raiz);

  const salva = lerPosicao();
  if (salva) {
    aplicarPosicao(raiz, salva);
  } else {
    raiz.style.right = '16px';
    raiz.style.bottom = '16px';
  }

  return { raiz, botao, pulso, contador, fechar };
}

// ---------------------------------------------------------------------------
// Arrasto
// ---------------------------------------------------------------------------

/**
 * Liga o arrasto do widget. Devolve a funcao de limpeza.
 *
 * O gesto so vira arrasto depois de passar do limiar; abaixo disso o ponteiro
 * solta como clique normal, entao o botao continua clicavel.
 */
function ligarArrasto(refs: Refs, aoClicar: () => void): () => void {
  let arrastando = false;
  let moveu = false;
  let deslocX = 0;
  let deslocY = 0;
  let inicioX = 0;
  let inicioY = 0;

  const aoDescer = (evento: PointerEvent): void => {
    if (evento.button !== 0) return;
    const caixa = refs.raiz.getBoundingClientRect();
    arrastando = true;
    moveu = false;
    inicioX = evento.clientX;
    inicioY = evento.clientY;
    deslocX = evento.clientX - caixa.left;
    deslocY = evento.clientY - caixa.top;
    refs.botao.setPointerCapture?.(evento.pointerId);
  };

  const aoMover = (evento: PointerEvent): void => {
    if (!arrastando) return;
    const distancia = Math.hypot(evento.clientX - inicioX, evento.clientY - inicioY);
    if (!moveu && distancia < LIMIAR_ARRASTO) return;
    moveu = true;
    evento.preventDefault();
    aplicarPosicao(refs.raiz, { x: evento.clientX - deslocX, y: evento.clientY - deslocY });
  };

  const aoSubir = (evento: PointerEvent): void => {
    if (!arrastando) return;
    arrastando = false;
    refs.botao.releasePointerCapture?.(evento.pointerId);

    if (!moveu) {
      aoClicar();
      return;
    }
    const caixa = refs.raiz.getBoundingClientRect();
    gravarPosicao({ x: caixa.left, y: caixa.top });
  };

  // O teclado nunca passa pelo arrasto: Enter e Espaco disparam o clique nativo.
  const aoTeclar = (evento: KeyboardEvent): void => {
    if (evento.key !== 'Enter' && evento.key !== ' ') return;
    evento.preventDefault();
    aoClicar();
  };

  const aoRedimensionar = (): void => {
    const caixa = refs.raiz.getBoundingClientRect();
    if (refs.raiz.style.left) aplicarPosicao(refs.raiz, { x: caixa.left, y: caixa.top });
  };

  refs.botao.addEventListener('pointerdown', aoDescer);
  refs.botao.addEventListener('pointermove', aoMover);
  refs.botao.addEventListener('pointerup', aoSubir);
  refs.botao.addEventListener('pointercancel', aoSubir);
  refs.botao.addEventListener('keydown', aoTeclar);
  window.addEventListener('resize', aoRedimensionar);

  return () => {
    refs.botao.removeEventListener('pointerdown', aoDescer);
    refs.botao.removeEventListener('pointermove', aoMover);
    refs.botao.removeEventListener('pointerup', aoSubir);
    refs.botao.removeEventListener('pointercancel', aoSubir);
    refs.botao.removeEventListener('keydown', aoTeclar);
    window.removeEventListener('resize', aoRedimensionar);
  };
}

// ---------------------------------------------------------------------------
// Atividade
// ---------------------------------------------------------------------------

/**
 * Acende o ponto de atividade por um instante.
 *
 * O widget nao instrumenta nada por conta propria: ele apenas escuta o
 * barramento que os modulos ja alimentam. Sem atividade, o custo e zero.
 */
function piscar(): void {
  if (!refs) return;
  refs.pulso.setAttribute('data-on', 'true');
  window.clearTimeout(timerPulso);
  timerPulso = window.setTimeout(() => {
    refs?.pulso.setAttribute('data-on', 'false');
  }, 320);
}

function atualizarContador(): void {
  if (!refs) return;
  const total = instances.size;
  const texto = total === 1 ? '1 componente' : `${total} componentes`;
  if (refs.contador.textContent !== texto) refs.contador.textContent = texto;
}

// ---------------------------------------------------------------------------
// API publica
// ---------------------------------------------------------------------------

/** Mostra o widget flutuante. Chamar duas vezes nao duplica nada. */
export function mountDevtoolsWidget(): void {
  if (montado || typeof document === 'undefined' || !document.body) return;

  // Respeita quem escondeu o widget nesta aba.
  try {
    if (sessionStorage.getItem(ESCONDIDO_KEY) === '1') return;
  } catch {
    // Sem sessionStorage: o widget simplesmente aparece.
  }

  montado = true;
  injectStyle('devtools-widget', WIDGET_CSS);
  refs = construir();

  const alternar = (): void => {
    const ligado = xray();
    refs?.raiz.setAttribute('data-active', String(ligado));
    refs?.botao.setAttribute('aria-pressed', String(ligado));
  };

  desligar.push(ligarArrasto(refs, alternar));

  const aoFechar = (evento: MouseEvent): void => {
    evento.stopPropagation();
    try {
      sessionStorage.setItem(ESCONDIDO_KEY, '1');
    } catch {
      // Sem sessionStorage: some so ate a proxima navegacao.
    }
    unmountDevtoolsWidget();
    // eslint-disable-next-line no-console
    console.info('[Voodoo] widget das devtools escondido. Use V.devtoolsWidget(true) para voltar.');
  };
  refs.fechar.addEventListener('click', aoFechar);
  desligar.push(() => refs?.fechar.removeEventListener('click', aoFechar));

  // Mantem o estado visual em dia quando o painel e aberto pelo atalho.
  const aoTeclarGlobal = (): void => {
    const ligado = isXrayEnabled();
    refs?.raiz.setAttribute('data-active', String(ligado));
    refs?.botao.setAttribute('aria-pressed', String(ligado));
  };
  document.addEventListener('keyup', aoTeclarGlobal);
  desligar.push(() => document.removeEventListener('keyup', aoTeclarGlobal));

  for (const tipo of ['network', 'event', 'navigation', 'update'] as const) {
    desligar.push(devtoolsBus.on(tipo, piscar));
  }

  atualizarContador();
  timerContador = window.setInterval(atualizarContador, 1000);
}

/** Remove o widget e todos os listeners que ele criou. */
export function unmountDevtoolsWidget(): void {
  if (!montado) return;
  montado = false;

  for (const fn of desligar.splice(0)) {
    try {
      fn();
    } catch {
      // Uma limpeza com problema nao pode impedir as outras.
    }
  }

  window.clearInterval(timerContador);
  window.clearTimeout(timerPulso);
  timerContador = 0;
  timerPulso = 0;

  refs?.raiz.remove();
  refs = null;
}

/** `true` quando o widget esta na tela. */
export function isDevtoolsWidgetMounted(): boolean {
  return montado;
}

/**
 * Mostra e esconde o widget flutuante das devtools.
 *
 * ```js
 * V.devtoolsWidget()       // alterna
 * V.devtoolsWidget(true)   // mostra
 * V.devtoolsWidget(false)  // esconde
 * ```
 *
 * @param force mostre ou esconda explicitamente. Sem argumento, alterna.
 * @returns o estado depois da chamada.
 */
export function devtoolsWidget(force?: boolean): boolean {
  const alvo = force ?? !montado;
  if (alvo) {
    // Uma chamada explicita vence o "escondido nesta aba".
    try {
      sessionStorage.removeItem(ESCONDIDO_KEY);
    } catch {
      // Sem sessionStorage: nada a limpar.
    }
    mountDevtoolsWidget();
  } else {
    unmountDevtoolsWidget();
  }
  return montado;
}
