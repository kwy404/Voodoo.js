/**
 * @module runtime/boot
 *
 * Agendador de inicializacao proprio da Voodoo.
 *
 * A biblioteca nao usa `DOMContentLoaded` nem `document.readyState` para saber
 * quando comecar. Em vez disso ela mantem o proprio laco: a cada passo pergunta
 * se a condicao daquela tarefa ja vale, e executa as que valem.
 *
 * O motivo e simples. Os eventos de carregamento do navegador respondem a
 * pergunta errada. `DOMContentLoaded` diz que o parser terminou, e nao que a
 * arvore que interessa existe. Uma pagina renderizada por outro script, um
 * fragmento inserido depois, um container que so aparece na segunda tela: em
 * todos esses casos o evento ja passou, ou vai passar cedo demais.
 *
 * O laco daqui responde a pergunta certa: "o que eu preciso ja esta no
 * documento e parou de mudar?". Isso vale tanto para o inicio automatico quanto
 * para `app.mount('#app')` chamado antes de `#app` existir.
 *
 * ```js
 * whenReady(() => V.start())                    // documento estavel
 * whenElement('#app', (el) => montar(el))       // elemento, exista ele ou nao
 * ```
 */

/** Quanto tempo esperar, no maximo, antes de desistir de esperar. */
const LIMITE_ESPERA = 10_000;

/** Passos consecutivos sem mudanca no DOM para considerar a arvore estavel. */
const PASSOS_ESTAVEIS = 2;

interface Tarefa {
  /** Devolve o valor esperado, ou `null` enquanto ele nao existir. */
  pronto(): unknown;
  /** Recebe o valor devolvido por `pronto`. */
  acao(valor: any): void;
  /** Chamado quando o limite de espera estoura sem o valor aparecer. */
  aoDesistir?(): void;
  /** Momento em que a tarefa entrou na fila. */
  desde: number;
}

const fila: Tarefa[] = [];

let observador: MutationObserver | null = null;
let versaoDoDom = 0;
let versaoNoPassoAnterior = -1;
let passosSemMudanca = 0;
let agendado = false;

/** Relogio monotonico quando existir, com o do sistema como plano B. */
function agora(): number {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

/**
 * Conta mudancas no documento. E o unico sinal que o laco precisa do navegador,
 * e ele diz respeito a arvore, nao ao carregamento.
 */
function observarMudancas(): void {
  if (observador || typeof MutationObserver === 'undefined' || typeof document === 'undefined') {
    return;
  }
  const raiz = document.documentElement;
  if (!raiz) return;

  observador = new MutationObserver(() => {
    versaoDoDom++;
  });
  observador.observe(raiz, { childList: true, subtree: true });
}

/** Marca um passo do laco. Microtask primeiro, depois quadro, depois timer. */
function agendarPasso(): void {
  if (agendado) return;
  agendado = true;

  const executar = (): void => {
    agendado = false;
    passo();
  };

  // O quadro chega depois dos scripts com `defer`, que e exatamente quando
  // queremos olhar de novo. O timer cobre abas em segundo plano, onde
  // `requestAnimationFrame` nao roda.
  if (typeof requestAnimationFrame === 'function') {
    let disparado = false;
    const uma = (): void => {
      if (disparado) return;
      disparado = true;
      executar();
    };
    requestAnimationFrame(uma);
    setTimeout(uma, 32);
    return;
  }

  setTimeout(executar, 0);
}

/** Um passo do laco: resolve o que der, e reagenda enquanto sobrar tarefa. */
function passo(): void {
  if (versaoDoDom === versaoNoPassoAnterior) passosSemMudanca++;
  else passosSemMudanca = 0;
  versaoNoPassoAnterior = versaoDoDom;

  const instante = agora();

  for (let i = fila.length - 1; i >= 0; i--) {
    const tarefa = fila[i];
    let valor: unknown = null;

    try {
      valor = tarefa.pronto();
    } catch {
      valor = null;
    }

    if (valor) {
      fila.splice(i, 1);
      tarefa.acao(valor);
      continue;
    }

    if (instante - tarefa.desde > LIMITE_ESPERA) {
      fila.splice(i, 1);
      tarefa.aoDesistir?.();
    }
  }

  if (fila.length) agendarPasso();
}

/** Coloca uma tarefa no laco, tentando resolver na hora antes de esperar. */
function enfileirar(tarefa: Omit<Tarefa, 'desde'>): void {
  let valor: unknown = null;
  try {
    valor = tarefa.pronto();
  } catch {
    valor = null;
  }

  if (valor) {
    tarefa.acao(valor);
    return;
  }

  observarMudancas();
  fila.push({ ...tarefa, desde: agora() });
  agendarPasso();
}

/** `true` quando o corpo existe e a arvore parou de crescer. */
function documentoEstavel(): boolean {
  if (typeof document === 'undefined' || !document.body) return false;
  return passosSemMudanca >= PASSOS_ESTAVEIS;
}

/**
 * `true` quando nada mudou no documento desde que o laco comecou a olhar.
 *
 * E o sinal de que a pagina nao esta mais sendo construida: um documento ja
 * montado, um teste, uma aba que terminou de carregar faz tempo. Nesses casos
 * esperar quadros seria so atraso.
 */
function documentoParado(): boolean {
  if (typeof document === 'undefined' || !document.body) return false;
  return versaoDoDom === 0;
}

/**
 * Executa quando o documento tiver corpo e parar de mudar.
 *
 * Substitui `DOMContentLoaded`. A diferenca pratica aparece em dois casos:
 * um script sem `defer` no `<head>`, onde o corpo ainda nao existe, e uma
 * pagina montada por outro script, onde o evento ja passou.
 */
export function whenReady(acao: () => void): void {
  if (typeof document === 'undefined') return;

  enfileirar({
    pronto: () => (documentoEstavel() ? document.body : null),
    acao: () => acao(),
    // Passado o limite, comeca assim mesmo: uma pagina que nunca para de mudar
    // ainda merece ser inicializada.
    aoDesistir: () => {
      if (document.body) acao();
    },
  });
}

/**
 * Executa assim que o documento tiver corpo, sem esperar a arvore estabilizar.
 *
 * E o criterio de `V.ready`: quem chama quer o documento utilizavel, e nao a
 * garantia de que nenhum outro script vai mexer nele depois. Quando nada mudou
 * desde que o laco comecou a olhar, a chamada acontece ja no proximo microtask,
 * sem custo de quadro.
 */
export function whenBodyReady(acao: () => void): void {
  if (typeof document === 'undefined') return;

  if (documentoParado()) {
    void Promise.resolve().then(acao);
    return;
  }

  enfileirar({
    pronto: () => (documentoEstavel() ? document.body : null),
    acao: () => acao(),
    aoDesistir: () => {
      if (document.body) acao();
    },
  });
}

/**
 * Resolve um elemento que pode ainda nao existir.
 *
 * ```js
 * whenElement('#app', (el) => app.mount(el))
 * ```
 */
export function whenElement(
  alvo: string | Element,
  acao: (el: Element) => void,
  aoDesistir?: () => void
): void {
  if (typeof alvo !== 'string') {
    acao(alvo);
    return;
  }
  if (typeof document === 'undefined') return;

  enfileirar({
    pronto: () => document.querySelector(alvo),
    acao: (el: Element) => acao(el),
    aoDesistir,
  });
}

/** Promessa resolvida quando o documento estiver pronto pelo criterio acima. */
export function ready(): Promise<void> {
  return new Promise((resolve) => whenReady(() => resolve()));
}

/** Encerra o observador do laco. Usado nos testes e por `V.destroy()`. */
export function stopBootLoop(): void {
  observador?.disconnect();
  observador = null;
  fila.length = 0;
  agendado = false;
  passosSemMudanca = 0;
  versaoNoPassoAnterior = -1;
}
