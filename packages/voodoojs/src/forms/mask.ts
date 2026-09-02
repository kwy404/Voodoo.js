/**
 * @module forms/mask
 *
 * Input masks that preserve cursor position, even when the user edits the middle
 * of text or deletes a separator.
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
// Types and registration
// ---------------------------------------------------------------------------

/** Function that formats a raw value. Used by dynamic masks. */
export type MaskResolver = (value: string) => string;

/** A mask is either a character pattern or a formatting function. */
export type MaskPattern = string | MaskResolver;

/** Named masks available for `v-mask` and `applyMask`. */
export const masks = new Map<string, MaskPattern>();

/**
 * Registers a named mask.
 *
 * ```js
 * V.registerMask('processo', '9999999-99.9999.9.99.9999')
 * V.registerMask('reverso', (v) => v.split('').reverse().join(''))
 * ```
 */
export function registerMask(name: string, patternOrFn: MaskPattern): void {
  masks.set(name.trim().toLowerCase(), patternOrFn);
}

/** Tokens accepted in mask patterns. */
const TOKENS: Record<string, RegExp> = {
  '9': /\d/,
  A: /[A-Za-zÀ-ÖØ-öø-ÿ]/,
  S: /[0-9A-Za-zÀ-ÖØ-öø-ÿ]/,
  '*': /[\s\S]/,
};

const RELEVANT = /[0-9A-Za-zÀ-ÖØ-öø-ÿ]/;

/** Masks that represent numbers and type right-to-left. */
const RIGHT_TO_LEFT = new Set(['currency', 'percent']);

// ---------------------------------------------------------------------------
// Formatting by character pattern
// ---------------------------------------------------------------------------

function formatWithPattern(value: string, pattern: string): string {
  let out = '';
  let index = 0;

  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];

    if (char === '\\') {
      // Escape: next character enters as literal.
      const literal = pattern[++i];
      if (literal === undefined) break;
      if (index >= value.length) break;
      out += literal;
      continue;
    }

    const token = TOKENS[char];
    if (token) {
      // Skip anything unsuitable for this position, like a letter in a digit field.
      while (index < value.length && !token.test(value[index])) index++;
      if (index >= value.length) break;
      out += value[index++];
      continue;
    }

    // Pattern literal: only enters if content still follows it.
    if (index >= value.length) break;
    if (value[index] === char) index++;
    out += char;
  }

  return out;
}

// ---------------------------------------------------------------------------
// Numeric masks
// ---------------------------------------------------------------------------

export interface CurrencyMaskOptions {
  /** Text before the number. Default `R$ `. */
  prefix?: string;
  /** Text after the number. */
  suffix?: string;
  /** Decimal places. Default `2`. */
  decimals?: number;
  /** Decimal separator. Default `,`. */
  decimal?: string;
  /** Thousands separator. Default `.`. */
  thousands?: string;
}

/**
 * Formats a value as currency, typing right-to-left.
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

/** Formats percentage with two decimal places in the same style as currency. */
export function maskPercent(value: string, decimals = 2): string {
  return maskCurrency(value, { prefix: '', suffix: '%', decimals });
}

// ---------------------------------------------------------------------------
// Named masks
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
  // American Express uses four, six, and five digits.
  if (/^3[47]/.test(digits)) return formatWithPattern(digits, '9999 999999 99999');
  if (digits.length > 16) return formatWithPattern(digits, '9999 9999 9999 9999 999');
  return formatWithPattern(digits, '9999 9999 9999 9999');
});

registerMask('plate', (value) => {
  const clean = value.replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, 7);
  // Old plates have a digit in the fifth position; Mercosul plates have a letter.
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
// Public formatting API
// ---------------------------------------------------------------------------

/**
 * Applies a mask to a value. The pattern can be a registered mask name or
 * a character pattern.
 *
 * Tokens: `9` digit, `A` letter, `S` alphanumeric, `*` any character, `\` escape.
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
 * Removes formatting. For numeric masks, returns the number as text,
 * ready to become a `Number`.
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
 * Public shortcut to masks. Can be called as a function and also loads the
 * module utilities.
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
// Installing on input with cursor control
// ---------------------------------------------------------------------------

function isRelevant(char: string | undefined): boolean {
  return char !== undefined && RELEVANT.test(char);
}

/** Count of significant characters before a position. */
function countRelevant(text: string, upTo: number): number {
  let total = 0;
  const limit = Math.min(upTo, text.length);
  for (let i = 0; i < limit; i++) if (isRelevant(text[i])) total++;
  return total;
}

/** Position right after the nth significant character. */
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
  /** Formats the raw typed value. */
  format: MaskResolver;
  /** Returns clean value when `v-model` reads `input.value`. */
  clean?: (value: string) => string;
  /** Numeric masks keep cursor at end, before suffix. */
  rightToLeft?: boolean;
  /** Length of fixed suffix, like `%` in percentage. */
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
      // Some input types don't accept selection. Nothing to do.
    }
  };

  // Replace the `value` property so `v-model` reads the clean value and
  // always writes by passing through the mask.
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

  // Deleting over a separator needs to remove the previous useful character.
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

  // Value already from the server also enters formatted.
  const initial = readRaw();
  if (initial) writeRaw(options.format(initial));
}

function maskableInput(el: HTMLElement, directive: string): HTMLInputElement | null {
  if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') {
    warn(`${config.prefix}${directive} only works on input or textarea.`);
    return null;
  }
  const input = el as HTMLInputElement;
  const type = (input.getAttribute('type') || 'text').toLowerCase();
  if (type === 'number' || type === 'range' || type === 'date' || type === 'color') {
    warn(`${config.prefix}${directive} doesn't work with input type="${type}". Use type="text".`);
    return null;
  }
  return input;
}

// ---------------------------------------------------------------------------
// Directives
// ---------------------------------------------------------------------------

/**
 * `v-mask` runs before `v-model` so the state receives already-formatted text,
 * or clean value when the `.unmask` modifier is present.
 */
defineDirective(
  'mask',
  ({ el, expression, modifiers, cleanup }) => {
    const input = maskableInput(el, 'mask');
    if (!input) return;

    const pattern = expression.trim();
    if (!pattern) {
      warn(`${config.prefix}mask needs a pattern or mask name.`);
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
 * `v-mask-currency` accepts the prefix in its own value and fine-tuning in
 * `v-mask-decimals`, `v-mask-suffix` and the `.decimals=0` and `.plain` modifiers.
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

    // The space at the end of the prefix is part of it: `v-mask-currency="R$ "` needs to
    // show `R$ 1.234,56`, not `R$1.234,56`. That's why `trim` only decides if
    // the expression is empty; the value used is the text as declared,
    // the same way it already worked in `v-mask-prefix`.
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
