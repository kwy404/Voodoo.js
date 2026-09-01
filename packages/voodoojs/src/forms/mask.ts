/**
 * @module forms/mask
 *
 * Mascaras de digitacao que preservam a posicao do cursor, inclusive quando o
 * usuario edita o meio do texto ou apaga um separador.
 *
 * ```html
 * <input v-mask="cpf">
 * <input v-mask="(99) 99999-9999">
 * <input v-mask.unmask="cpf" v-model="form.cpf">
 * <input v-mask-currency="R$ " v-mask-decimals="2">
 * ```
 */

import { warn } from '../reactivity';
import { config, defineDirective, PRIORITY } from '../runtime/registry';

// ---------------------------------------------------------------------------
// Tipos e registro
// ---------------------------------------------------------------------------

/** Funcao que formata um valor cru. Usada por mascaras dinamicas. */
export type MaskResolver = (value: string) => string;

/** Uma mascara e um padrao de caracteres ou uma funcao de formatacao. */
export type MaskPattern = string | MaskResolver;

/** Mascaras nomeadas disponiveis para `v-mask` e `applyMask`. */
export const masks = new Map<string, MaskPattern>();

/**
 * Registra uma mascara nomeada.
 *
 * ```js
 * V.registerMask('processo', '9999999-99.9999.9.99.9999')
 * V.registerMask('reverso', (v) => v.split('').reverse().join(''))
 * ```
 */
export function registerMask(name: string, patternOrFn: MaskPattern): void {
  masks.set(name.trim().toLowerCase(), patternOrFn);
}

/** Tokens aceitos nos padroes de mascara. */
const TOKENS: Record<string, RegExp> = {
  '9': /\d/,
  A: /[A-Za-zÀ-ÖØ-öø-ÿ]/,
  S: /[0-9A-Za-zÀ-ÖØ-öø-ÿ]/,
  '*': /[\s\S]/,
};

const RELEVANT = /[0-9A-Za-zÀ-ÖØ-öø-ÿ]/;

/** Mascaras que representam numero e por isso digitam da direita para a esquerda. */
const RIGHT_TO_LEFT = new Set(['currency', 'percent']);

// ---------------------------------------------------------------------------
// Formatacao por padrao de caracteres
// ---------------------------------------------------------------------------

function formatWithPattern(value: string, pattern: string): string {
  let out = '';
  let index = 0;

  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];

    if (char === '\\') {
      // Escape: o proximo caractere entra como literal.
      const literal = pattern[++i];
      if (literal === undefined) break;
      if (index >= value.length) break;
      out += literal;
      continue;
    }

    const token = TOKENS[char];
    if (token) {
      // Pula tudo que nao serve para esta posicao, como letra em campo de digito.
      while (index < value.length && !token.test(value[index])) index++;
      if (index >= value.length) break;
      out += value[index++];
      continue;
    }

    // Literal do padrao: so entra quando ainda existe conteudo depois dele.
    if (index >= value.length) break;
    if (value[index] === char) index++;
    out += char;
  }

  return out;
}

// ---------------------------------------------------------------------------
// Mascaras numericas
// ---------------------------------------------------------------------------

export interface CurrencyMaskOptions {
  /** Texto antes do numero. Padrao `R$ `. */
  prefix?: string;
  /** Texto depois do numero. */
  suffix?: string;
  /** Casas decimais. Padrao `2`. */
  decimals?: number;
  /** Separador decimal. Padrao `,`. */
  decimal?: string;
  /** Separador de milhar. Padrao `.`. */
  thousands?: string;
}

/**
 * Formata um valor como moeda, digitando da direita para a esquerda.
 *
 * ```js
 * V.maskCurrency('123456')  // 'R$ 1.234,56'
 * ```
 */
export function maskCurrency(value: string, options: CurrencyMaskOptions = {}): string {
  const decimals = Math.max(0, Math.trunc(options.decimals ?? 2));
  const decimal = options.decimal ?? ',';
  const thousands = options.thousands ?? '.';
  const prefix = options.prefix ?? 'R$ ';
  const suffix = options.suffix ?? '';

  const text = String(value ?? '');
  const negative = text.trim().startsWith('-');
  const digits = text.replace(/\D/g, '').slice(0, 15);
  if (!digits) return '';

  const padded = digits.padStart(decimals + 1, '0');
  const whole = decimals ? padded.slice(0, padded.length - decimals) : padded;
  const fraction = decimals ? padded.slice(padded.length - decimals) : '';
  const clean = whole.replace(/^0+(?=\d)/, '');
  const grouped = clean.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);

  return `${negative ? '-' : ''}${prefix}${grouped}${decimals ? decimal + fraction : ''}${suffix}`;
}

/** Formata porcentagem com duas casas, no mesmo estilo da moeda. */
export function maskPercent(value: string, decimals = 2): string {
  return maskCurrency(value, { prefix: '', suffix: '%', decimals });
}

// ---------------------------------------------------------------------------
// Mascaras nomeadas
// ---------------------------------------------------------------------------

registerMask('cpf', '999.999.999-99');
registerMask('cnpj', '99.999.999/9999-99');
registerMask('cep', '99999-999');
registerMask('date', '99/99/9999');
registerMask('time', '99:99');
registerMask('datetime', '99/99/9999 99:99');
registerMask('cvv', '9999');

registerMask('cpfcnpj', (value) => {
  const digits = value.replace(/\D/g, '');
  return formatWithPattern(digits, digits.length <= 11 ? '999.999.999-99' : '99.999.999/9999-99');
});

registerMask('phone', (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return formatWithPattern(digits, digits.length <= 10 ? '(99) 9999-9999' : '(99) 99999-9999');
});

registerMask('currency', (value) => maskCurrency(value));
registerMask('percent', (value) => maskPercent(value));

registerMask('card', (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 19);
  // American Express usa quatro, seis e cinco digitos.
  if (/^3[47]/.test(digits)) return formatWithPattern(digits, '9999 999999 99999');
  if (digits.length > 16) return formatWithPattern(digits, '9999 9999 9999 9999 999');
  return formatWithPattern(digits, '9999 9999 9999 9999');
});

registerMask('plate', (value) => {
  const clean = value.replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, 7);
  // Placa antiga tem digito na quinta posicao, a Mercosul tem letra.
  const oldFormat = clean.length >= 5 && /\d/.test(clean[4]);
  return formatWithPattern(clean, oldFormat ? 'AAA-9999' : 'AAA9A99');
});

registerMask('hex', (value) => {
  const clean = value.replace(/[^0-9a-fA-F]/g, '').toUpperCase().slice(0, 6);
  return clean ? `#${clean}` : '';
});

registerMask('ip', (value) => {
  const parts = value.replace(/[^\d.]/g, '').split('.').slice(0, 4);
  const groups: string[] = [];
  for (const part of parts) {
    if (part === '') {
      groups.push('');
      continue;
    }
    const clamped = Math.min(255, Number(part.slice(0, 3)));
    groups.push(String(clamped));
  }
  return groups.join('.');
});

// ---------------------------------------------------------------------------
// API publica de formatacao
// ---------------------------------------------------------------------------

/**
 * Aplica uma mascara a um valor. O padrao pode ser o nome de uma mascara
 * registrada ou um padrao de caracteres.
 *
 * Tokens: `9` digito, `A` letra, `S` alfanumerico, `*` qualquer, `\` escape.
 *
 * ```js
 * V.applyMask('12345678901', 'cpf')      // '123.456.789-01'
 * V.applyMask('1234', '99-99')           // '12-34'
 * ```
 */
export function applyMask(value: string, pattern: string): string {
  const text = value == null ? '' : String(value);
  if (!pattern) return text;

  const named = masks.get(pattern.trim().toLowerCase());
  if (typeof named === 'function') return named(text);
  return formatWithPattern(text, typeof named === 'string' ? named : pattern);
}

/**
 * Remove a formatacao. Para mascaras numericas devolve o numero em texto,
 * pronto para virar `Number`.
 *
 * ```js
 * V.unmask('123.456.789-01')             // '12345678901'
 * V.unmask('R$ 1.234,56', 'currency')    // '1234.56'
 * ```
 */
export function unmask(value: string, pattern?: string): string {
  const text = value == null ? '' : String(value);
  const key = pattern ? pattern.trim().toLowerCase() : '';

  if (key && RIGHT_TO_LEFT.has(key)) {
    const negative = text.trim().startsWith('-');
    const digits = text.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    if (!digits) return '';
    const padded = digits.padStart(3, '0');
    const numeric = `${padded.slice(0, padded.length - 2)}.${padded.slice(padded.length - 2)}`;
    return negative ? `-${numeric}` : numeric;
  }

  return text.replace(/[^0-9A-Za-zÀ-ÖØ-öø-ÿ]/g, '');
}

/**
 * Atalho publico das mascaras. Pode ser chamado como funcao e tambem carrega os
 * utilitarios do modulo.
 *
 * ```js
 * V.mask('12345678901', 'cpf')      // '123.456.789-01'
 * V.mask.register('placa', 'AAA9A99')
 * V.mask.currency('123456')         // 'R$ 1.234,56'
 * ```
 */
export const mask = Object.assign(
  (value: string, pattern: string): string => applyMask(value, pattern),
  {
    apply: applyMask,
    unmask,
    register: registerMask,
    currency: maskCurrency,
    percent: maskPercent,
    presets: masks,
  }
);

// ---------------------------------------------------------------------------
// Instalacao no input, com controle de cursor
// ---------------------------------------------------------------------------

function isRelevant(char: string | undefined): boolean {
  return char !== undefined && RELEVANT.test(char);
}

/** Quantidade de caracteres significativos antes de uma posicao. */
function countRelevant(text: string, upTo: number): number {
  let total = 0;
  const limit = Math.min(upTo, text.length);
  for (let i = 0; i < limit; i++) if (isRelevant(text[i])) total++;
  return total;
}

/** Posicao logo depois do enesimo caractere significativo. */
function caretForCount(text: string, count: number): number {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (!isRelevant(text[i])) continue;
    seen++;
    if (seen === count) return i + 1;
  }
  return text.length;
}

interface MaskInstallOptions {
  /** Formata o valor cru digitado. */
  format: MaskResolver;
  /** Devolve o valor limpo quando `v-model` ler `input.value`. */
  clean?: (value: string) => string;
  /** Mascaras numericas mantem o cursor no fim, antes do sufixo. */
  rightToLeft?: boolean;
  /** Tamanho do sufixo fixo, como o `%` da porcentagem. */
  suffixLength?: number;
}

const masked = new WeakSet<HTMLElement>();

function installMask(
  input: HTMLInputElement,
  options: MaskInstallOptions,
  cleanup: (fn: () => void) => void
): void {
  if (masked.has(input)) return;
  masked.add(input);

  const prototype = Object.getPrototypeOf(input) as object;
  const descriptor =
    Object.getOwnPropertyDescriptor(prototype, 'value') ??
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  const nativeGet = descriptor?.get;
  const nativeSet = descriptor?.set;

  const readRaw = (): string =>
    nativeGet ? String(nativeGet.call(input)) : String(input.getAttribute('value') ?? '');
  const writeRaw = (value: string): void => {
    if (nativeSet) nativeSet.call(input, value);
    else input.setAttribute('value', value);
  };

  const setCaret = (position: number): void => {
    try {
      input.setSelectionRange(position, position);
    } catch {
      // Alguns tipos de input nao aceitam selecao. Nada a fazer.
    }
  };

  // Substitui a propriedade `value` para que `v-model` leia o valor limpo e
  // escreva sempre passando pela mascara.
  if (nativeGet && nativeSet) {
    Object.defineProperty(input, 'value', {
      configurable: true,
      enumerable: true,
      get(): string {
        const current = String(nativeGet.call(input));
        return options.clean ? options.clean(current) : current;
      },
      set(next: unknown): void {
        nativeSet.call(input, options.format(next == null ? '' : String(next)));
      },
    });
    cleanup(() => {
      const current = readRaw();
      Reflect.deleteProperty(input, 'value');
      writeRaw(current);
    });
  }

  const reformat = (): void => {
    const raw = readRaw();
    const caret = input.selectionStart ?? raw.length;
    const before = countRelevant(raw, caret);
    const formatted = options.format(raw);
    if (formatted !== raw) writeRaw(formatted);
    if (options.rightToLeft) setCaret(Math.max(0, formatted.length - (options.suffixLength ?? 0)));
    else setCaret(caretForCount(formatted, before));
  };

  const onInput = (): void => reformat();

  // Apagar em cima de um separador precisa remover o caractere util anterior.
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Backspace') return;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    if (start !== end || start === 0) return;

    const text = readRaw();
    if (isRelevant(text[start - 1])) return;

    let index = start - 1;
    while (index >= 0 && !isRelevant(text[index])) index--;
    event.preventDefault();
    if (index < 0) return;

    const next = text.slice(0, index) + text.slice(start);
    const keep = countRelevant(next, index);
    writeRaw(options.format(next));
    setCaret(caretForCount(readRaw(), keep));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  input.addEventListener('input', onInput);
  input.addEventListener('keydown', onKeyDown);
  cleanup(() => {
    masked.delete(input);
    input.removeEventListener('input', onInput);
    input.removeEventListener('keydown', onKeyDown);
  });

  // Valor que ja veio do servidor tambem entra formatado.
  const initial = readRaw();
  if (initial) writeRaw(options.format(initial));
}

function maskableInput(el: HTMLElement, directive: string): HTMLInputElement | null {
  if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') {
    warn(`${config.prefix}${directive} so funciona em input ou textarea.`);
    return null;
  }
  const input = el as HTMLInputElement;
  const type = (input.getAttribute('type') || 'text').toLowerCase();
  if (type === 'number' || type === 'range' || type === 'date' || type === 'color') {
    warn(`${config.prefix}${directive} nao combina com input type="${type}". Use type="text".`);
    return null;
  }
  return input;
}

// ---------------------------------------------------------------------------
// Directives
// ---------------------------------------------------------------------------

/**
 * `v-mask` roda antes de `v-model` para que o estado receba o texto ja
 * formatado, ou o valor limpo quando o modificador `.unmask` estiver presente.
 */
defineDirective(
  'mask',
  ({ el, expression, modifiers, cleanup }) => {
    const input = maskableInput(el, 'mask');
    if (!input) return;

    const pattern = expression.trim();
    if (!pattern) {
      warn(`${config.prefix}mask precisa de um padrao ou do nome de uma mascara.`);
      return;
    }

    const key = pattern.toLowerCase();
    const wantsClean = !!modifiers.unmask || !!modifiers.raw;

    installMask(
      input,
      {
        format: (value) => applyMask(value, pattern),
        clean: wantsClean ? (value) => unmask(value, key) : undefined,
        rightToLeft: RIGHT_TO_LEFT.has(key),
        suffixLength: key === 'percent' ? 1 : 0,
      },
      cleanup
    );
  },
  { priority: PRIORITY.MODEL + 5 }
);

/**
 * `v-mask-currency` aceita o prefixo no proprio valor e ajustes finos em
 * `v-mask-decimals`, `v-mask-suffix` e nos modificadores `.decimals=0` e `.plain`.
 */
defineDirective(
  'mask-currency',
  ({ el, expression, modifiers, cleanup }) => {
    const input = maskableInput(el, 'mask-currency');
    if (!input) return;

    const attr = (name: string): string | null =>
      el.getAttribute(`${config.prefix}${name}`) ?? el.getAttribute(`data-v-${name}`);

    const rawDecimals =
      (typeof modifiers.decimals === 'string' ? modifiers.decimals : null) ?? attr('mask-decimals');
    const decimals = rawDecimals !== null && rawDecimals !== '' ? Number(rawDecimals) : 2;

    // O espaco no fim do prefixo faz parte dele: `v-mask-currency="R$ "` precisa
    // mostrar `R$ 1.234,56`, e nao `R$1.234,56`. Por isso o `trim` so decide se
    // a expressao esta vazia; o valor usado e o texto como foi declarado, do
    // mesmo jeito que ja acontecia em `v-mask-prefix`.
    const prefixoDeclarado = expression.trim() ? expression : '';

    const options: CurrencyMaskOptions = {
      prefix: modifiers.plain ? '' : prefixoDeclarado || attr('mask-prefix') || 'R$ ',
      suffix: attr('mask-suffix') ?? '',
      decimals: Number.isFinite(decimals) ? decimals : 2,
      decimal: modifiers.dot ? '.' : ',',
      thousands: modifiers.dot ? ',' : '.',
    };

    const wantsClean = !!modifiers.unmask || !!modifiers.raw;
    const places = options.decimals ?? 2;

    installMask(
      input,
      {
        format: (value) => maskCurrency(value, options),
        clean: wantsClean
          ? (value): string => {
              const digits = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
              if (!digits) return '';
              if (places === 0) return digits;
              const padded = digits.padStart(places + 1, '0');
              const numeric = `${padded.slice(0, padded.length - places)}.${padded.slice(
                padded.length - places
              )}`;
              return value.trim().startsWith('-') ? `-${numeric}` : numeric;
            }
          : undefined,
        rightToLeft: true,
        suffixLength: (options.suffix ?? '').length,
      },
      cleanup
    );
  },
  { priority: PRIORITY.MODEL + 5 }
);
