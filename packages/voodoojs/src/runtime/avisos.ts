/**
 * @module runtime/avisos
 *
 * Avisos de modo desenvolvimento. Tudo aqui so acontece quando
 * `V.config.devtools` esta ligado; em producao o custo e uma comparacao
 * booleana e nada mais.
 *
 * Cada mensagem segue a mesma forma: o que foi encontrado, onde foi encontrado
 * e o que fazer a respeito. Um aviso que nao diz o que corrigir e ruido.
 */

import { config } from './registry';

/** `true` quando os avisos detalhados estao ligados. */
export function emDesenvolvimento(): boolean {
  return config.devtools === true;
}

/** Descreve um elemento de forma curta, no estilo de um seletor CSS. */
export function descreverElemento(el: Element | null): string {
  if (!el) return '(sem elemento)';
  let out = el.tagName.toLowerCase();
  if (el.id) out += `#${el.id}`;
  const classes = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean);
  if (classes.length) out += `.${classes.slice(0, 2).join('.')}`;
  return `<${out}>`;
}

/** Emite um aviso apenas em desenvolvimento. */
export function avisar(mensagem: string): void {
  if (!emDesenvolvimento()) return;
  // eslint-disable-next-line no-console
  console.warn(`[Voodoo] ${mensagem}`);
}

/**
 * Avisa uma unica vez por chave. Evita encher o console quando o mesmo aviso
 * nasce dentro de um `v-for` com centenas de itens.
 */
const jaAvisado = new Set<string>();

export function avisarUmaVez(chave: string, mensagem: string): void {
  if (!emDesenvolvimento()) return;
  if (jaAvisado.has(chave)) return;
  jaAvisado.add(chave);
  // eslint-disable-next-line no-console
  console.warn(`[Voodoo] ${mensagem}`);
}

/** Limpa a memoria dos avisos ja emitidos. Usado em testes. */
export function limparAvisos(): void {
  jaAvisado.clear();
}

/**
 * Atributos `v-*` que a Voodoo le direto do HTML, sem passar por uma directive
 * registrada. Sem esta lista eles apareceriam como "directive desconhecida".
 */
const ATRIBUTOS_AUXILIARES = new Set([
  'confirm-title',
  'confirm-label',
  'confirm-cancel',
  'hold-duration',
]);

/** Avisa sobre `v-alguma-coisa` que ninguem registrou. */
export function avisarDirectiveDesconhecida(el: Element, raw: string, nome: string): void {
  if (!emDesenvolvimento()) return;
  if (ATRIBUTOS_AUXILIARES.has(nome)) return;
  avisarUmaVez(
    `directive-desconhecida:${nome}`,
    `directive desconhecida "${raw}" em ${descreverElemento(el)}. ` +
      `Nenhuma directive chamada "${nome}" foi registrada. ` +
      `Verifique a grafia ou registre com V.directive("${nome}", ...).`
  );
}

/** Avisa sobre uma tag de componente que ninguem registrou. */
export function avisarComponenteDesconhecido(el: Element, nome: string): void {
  avisarUmaVez(
    `componente-desconhecido:${nome}`,
    `componente "${nome}" nao registrado em ${descreverElemento(el)}. ` +
      `Registre com V.component("${nome}", { ... }) antes de usar a tag, ` +
      'ou remova o atributo para deixar o elemento como HTML comum.'
  );
}

/** Avisa sobre uma expressao que nao pode ser avaliada. */
export function avisarExpressaoInvalida(
  el: Element | null,
  raw: string,
  expressao: string,
  err: unknown
): void {
  if (!emDesenvolvimento()) return;
  const motivo = err instanceof Error ? err.message.split('\n')[0] : String(err);
  avisar(
    `expressao invalida em ${raw}="${expressao}" no elemento ${descreverElemento(el)}.\n` +
      `Motivo: ${motivo}\n` +
      'Sugestao: expressoes de atributo aceitam um valor so. Se a logica for maior ' +
      'que uma linha, mova para um metodo do componente e chame o metodo aqui.'
  );
}

/** Avisa sobre chave repetida em `v-for`. */
export function avisarChaveDuplicada(el: Element, chave: unknown, expressao: string): void {
  if (!emDesenvolvimento()) return;
  avisar(
    `chave duplicada "${String(chave)}" em v-for="${expressao}" no elemento ` +
      `${descreverElemento(el)}. Duas linhas com a mesma chave fazem a lista ` +
      'reaproveitar o bloco errado ao reordenar. Use uma chave unica, como o id do item.'
  );
}

/** Avisa sobre prop obrigatoria que ninguem passou. */
export function avisarPropObrigatoria(el: Element, componente: string, prop: string): void {
  if (!emDesenvolvimento()) return;
  avisar(
    `prop obrigatoria "${prop}" ausente no componente "${componente}" em ` +
      `${descreverElemento(el)}. Passe o valor na tag, com ${prop}="..." para um ` +
      `texto fixo ou :${prop}="expressao" para um valor do estado.`
  );
}

/** Avisa que um nome antigo continua funcionando, mas nao e mais o oficial. */
export function avisarAlias(alias: string, canonico: string): void {
  avisarUmaVez(
    `alias:${alias}`,
    `"${alias}" e um apelido de "${canonico}" e continua funcionando, ` +
      `mas o nome oficial e "${canonico}". Prefira "${canonico}" em codigo novo.`
  );
}
