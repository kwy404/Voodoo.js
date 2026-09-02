/**
 * @module forms/validate
 *
 * Validation engine with extensible rule registration, messages in Portuguese,
 * and automatic error presentation in HTML.
 *
 * ```html
 * <form v-submit="/api/users" v-validate>
 *   <input name="email" v-required v-email>
 *   <input name="cpf" v-cpf v-error-message="Informe um CPF real.">
 * </form>
 * ```
 */

import { warn } from '../reactivity';
import { config, defineDirective } from '../runtime/registry';
import { originalAttributes, readAttr } from '../runtime/walker';
import { ensureTokens, injectStyle } from '../dom/style';
import { http, HttpError } from '../http';
import { uid } from '../utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Elements that validation understands as form fields. */
export type FormField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** Rule result: `true` approves, `false` rejects, text rejects with message. */
export type ValidatorResult = boolean | string;

/** Rule function. Receives the value as text, parameter, and the field itself. */
export type ValidatorFn = (
  value: string,
  param: string | undefined,
  el: FormField
) => ValidatorResult | Promise<ValidatorResult>;

export interface RuleDefinition {
  name: string;
  fn: ValidatorFn;
  /** Message used when the rule returns `false` without its own text. */
  message?: string;
}

export interface FieldValidationResult {
  valid: boolean;
  message?: string;
  rule?: string;
}

export interface FormValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export interface SerializeOptions {
  /** Force output as `FormData`, even without files. */
  formData?: boolean;
  /** Include disabled fields. Default `false`. */
  includeDisabled?: boolean;
  /** Remove spaces at text ends. Default `true`. */
  trim?: boolean;
  /** Convert numeric fields to `number`. Default `true`. */
  numbers?: boolean;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/**
 * Default messages. Can be changed at runtime, one at a time or in bulk,
 * for example `Object.assign(V.messages, { required: 'Campo obrigatorio' })`.
 */
export const messages: Record<string, string> = {
  required: 'Preencha este campo.',
  email: 'Informe um e-mail valido.',
  url: 'Informe uma URL valida.',
  number: 'Informe um numero valido.',
  integer: 'Informe um numero inteiro.',
  decimal: 'Informe um numero decimal valido.',
  alpha: 'Use apenas letras.',
  alphanumeric: 'Use apenas letras e numeros.',
  minlength: 'Use no minimo {param} caracteres.',
  maxlength: 'Use no maximo {param} caracteres.',
  min: 'O valor minimo e {param}.',
  max: 'O valor maximo e {param}.',
  between: 'Informe um valor entre {min} e {max}.',
  match: 'Os campos nao conferem.',
  regex: 'O formato informado nao e valido.',
  date: 'Informe uma data valida.',
  after: 'A data precisa ser posterior a {param}.',
  before: 'A data precisa ser anterior a {param}.',
  accepted: 'E preciso marcar esta opcao para continuar.',
  same: 'Os valores precisam ser iguais.',
  different: 'Os valores precisam ser diferentes.',
  in: 'Escolha uma das opcoes permitidas.',
  notin: 'Este valor nao e permitido.',
  phone: 'Informe um telefone valido com DDD.',
  cpf: 'CPF invalido.',
  cnpj: 'CNPJ invalido.',
  cep: 'CEP invalido.',
  creditcard: 'Numero de cartao invalido.',
  strongpassword: 'Use {param} caracteres ou mais, com maiuscula, minuscula, numero e simbolo.',
  unique: 'Este valor ja esta em uso.',
  invalid: 'Valor invalido.',
};

/** Replaces `{param}`, `{field}`, `{value}`, `{min}` and `{max}` in the message. */
export function formatMessage(
  template: string,
  data: { field?: string; param?: string; value?: string }
): string {
  const param = data.param ?? '';
  const parts = param.split(',');
  const replacements: Record<string, string> = {
    param,
    field: data.field ?? 'field',
    value: data.value ?? '',
    min: (parts[0] ?? '').trim(),
    max: (parts[1] ?? parts[0] ?? '').trim(),
  };
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in replacements ? replacements[key] : whole
  );
}

// ---------------------------------------------------------------------------
// Rule registration
// ---------------------------------------------------------------------------

/** Rules known by the engine, indexed by name. */
export const rules = new Map<string, RuleDefinition>();

/**
 * Registers a validation rule and creates the `v-validate-<name>` directive.
 *
 * ```js
 * V.validator('par', (value) => Number(value) % 2 === 0, 'Informe um numero par.')
 * ```
 */
export function validator(name: string, fn: ValidatorFn, defaultMessage?: string): void {
  const key = name.toLowerCase();
  rules.set(key, { name: key, fn, message: defaultMessage });
  if (defaultMessage && !messages[key]) messages[key] = defaultMessage;
  defineDirective(`validate-${key}`, ({ el, cleanup }) => {
    bindFieldValidation(el as FormField, cleanup);
  });
}

// ---------------------------------------------------------------------------
// Reading attributes and fields
// ---------------------------------------------------------------------------

/**
 * Reads a Voodoo attribute accepting both `v-name` and `data-v-name`.
 * Uses `readAttr` because the walker removes attributes from HTML after mounting.
 */
export function readDirectiveAttr(el: Element, name: string): string | null {
  return readAttr(el, `${config.prefix}${name}`) ?? readAttr(el, `data-v-${name}`);
}

function hasDirectiveAttr(el: Element, name: string): boolean {
  return readDirectiveAttr(el, name) !== null;
}

const FIELD_TAGS = new Set(['INPUT', 'SELECT', 'TEXTAREA']);
const IGNORED_TYPES = new Set(['submit', 'button', 'reset', 'image']);

/** `true` when the element is an input, select, or textarea. */
export function isFormField(el: unknown): el is FormField {
  return !!el && typeof el === 'object' && FIELD_TAGS.has((el as Element).tagName ?? '');
}

function fieldType(el: FormField): string {
  if (el.tagName === 'SELECT') return 'select';
  if (el.tagName === 'TEXTAREA') return 'textarea';
  return (el.getAttribute('type') || 'text').toLowerCase();
}

/** Field value as text, already handling checkbox, radio, and file. */
export function fieldValue(el: FormField): string {
  const type = fieldType(el);
  if (type === 'checkbox' || type === 'radio') {
    return (el as HTMLInputElement).checked ? el.value || 'on' : '';
  }
  if (type === 'file') {
    const files = (el as HTMLInputElement).files;
    return files && files.length ? String(files.length) : '';
  }
  return el.value ?? '';
}

/** Name used as key in errors: `name`, then `id`, then a default. */
export function fieldKey(el: FormField): string {
  return el.name || el.id || `field-${el.tagName.toLowerCase()}`;
}

/** Friendly label for the field, used in messages. */
export function fieldLabel(el: FormField): string {
  const custom = readDirectiveAttr(el, 'label');
  if (custom) return custom;
  if (el.id && typeof document !== 'undefined') {
    const label = document.querySelector(`label[for="${cssEscape(el.id)}"]`);
    const text = label?.textContent?.trim();
    if (text) return text.replace(/\s*\*$/, '');
  }
  const wrapper = el.closest('label');
  const wrapperText = wrapper?.textContent?.trim();
  if (wrapperText) return wrapperText.replace(/\s*\*$/, '');
  return el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.name || 'field';
}

function cssEscape(value: string): string {
  const api = (globalThis as { CSS?: { escape?: (v: string) => string } }).CSS;
  if (api && typeof api.escape === 'function') return api.escape(value);
  return value.replace(/["'\\\]\[]/g, '\\$&');
}

/** Finds another field by name, id, or CSS selector. */
export function findRelatedField(el: FormField, reference: string): FormField | null {
  const ref = reference.trim();
  if (!ref || typeof document === 'undefined') return null;
  const root: ParentNode = el.form ?? el.closest('form') ?? document;
  if (/^[#.[]/.test(ref)) {
    const found = root.querySelector(ref) ?? document.querySelector(ref);
    return isFormField(found) ? found : null;
  }
  const byName = root.querySelector(`[name="${cssEscape(ref)}"]`);
  if (isFormField(byName)) return byName;
  const byId = document.getElementById(ref);
  return isFormField(byId) ? byId : null;
}

// ---------------------------------------------------------------------------
// Native rules
// ---------------------------------------------------------------------------

const RE_EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
const RE_INTEGER = /^-?\d+$/;
const RE_DECIMAL = /^-?\d+(?:[.,]\d+)?$/;
// Accented ranges skip multiplication and division signs.
const RE_ALPHA = /^[A-Za-zÀ-ÖØ-öø-ɏ]+$/;
const RE_ALPHANUM = /^[A-Za-z0-9À-ÖØ-öø-ɏ]+$/;

function digitsOf(value: string): string {
  return value.replace(/\D/g, '');
}

function toNumber(value: string): number {
  return Number(String(value).replace(/\s/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
}

/** Actual calculation of CPF check digits. */
export function isValidCPF(value: string): boolean {
  const digits = digitsOf(value);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
  let first = (sum * 10) % 11;
  if (first === 10) first = 0;
  if (first !== Number(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i);
  let second = (sum * 10) % 11;
  if (second === 10) second = 0;
  return second === Number(digits[10]);
}

/** Actual calculation of CNPJ check digits. */
export function isValidCNPJ(value: string): boolean {
  const digits = digitsOf(value);
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const check = (length: number): number => {
    let position = length - 7;
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += Number(digits[i]) * position--;
      if (position < 2) position = 9;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  return check(12) === Number(digits[12]) && check(13) === Number(digits[13]);
}

/** Luhn algorithm, used in credit card numbers. */
export function isValidLuhn(value: string): boolean {
  const digits = digitsOf(value);
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let current = Number(digits[i]);
    if (double) {
      current *= 2;
      if (current > 9) current -= 9;
    }
    sum += current;
    double = !double;
  }
  return sum % 10 === 0;
}

/** Brazilian landline or mobile phone with valid area code. */
export function isValidPhoneBR(value: string): boolean {
  const digits = digitsOf(value);
  if (digits.length !== 10 && digits.length !== 11) return false;
  if (Number(digits.slice(0, 2)) < 11) return false;
  if (digits.length === 11 && digits[2] !== '9') return false;
  if (digits.length === 10 && Number(digits[2]) < 2) return false;
  return true;
}

/** Accepts `dd/mm/yyyy`, `yyyy-mm-dd`, and whatever the browser can parse. */
export function parseDateValue(value: string): Date | null {
  const text = value.trim();
  if (!text) return null;

  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (br) {
    const date = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
    const ok = date.getFullYear() === Number(br[3]) && date.getMonth() === Number(br[2]) - 1;
    return ok && date.getDate() === Number(br[1]) ? date : null;
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    const ok = date.getFullYear() === Number(iso[1]) && date.getMonth() === Number(iso[2]) - 1;
    return ok && date.getDate() === Number(iso[3]) ? date : null;
  }

  const time = Date.parse(text);
  return Number.isNaN(time) ? null : new Date(time);
}

/** Resolves the parameter for `after` and `before`: date, `today`, or another field. */
function referenceDate(param: string | undefined, el: FormField): Date | null {
  if (!param) return null;
  const key = param.trim().toLowerCase();
  if (key === 'hoje' || key === 'today' || key === 'now' || key === 'agora') return new Date();
  const direct = parseDateValue(param);
  if (direct) return direct;
  const other = findRelatedField(el, param);
  return other ? parseDateValue(fieldValue(other)) : null;
}

validator('required', (value, _param, el) => {
  const type = fieldType(el);
  if (type === 'checkbox' || type === 'radio') return (el as HTMLInputElement).checked;
  if (type === 'file') {
    const files = (el as HTMLInputElement).files;
    return !!files && files.length > 0;
  }
  return value.trim().length > 0;
});

validator('email', (value) => RE_EMAIL.test(value.trim()));

validator('url', (value) => {
  const text = value.trim();
  if (!text) return false;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
    return url.hostname.includes('.') && !url.hostname.endsWith('.');
  } catch {
    return false;
  }
});

validator('number', (value) => value.trim() !== '' && Number.isFinite(toNumber(value)));
validator('integer', (value) => RE_INTEGER.test(value.trim()));

validator('decimal', (value, param) => {
  const text = value.trim();
  if (!RE_DECIMAL.test(text)) return false;
  if (!param) return true;
  const places = Number(param);
  if (!Number.isFinite(places)) return true;
  const fraction = text.split(/[.,]/)[1] ?? '';
  return fraction.length <= places;
});

validator('alpha', (value) => RE_ALPHA.test(value.trim().replace(/\s+/g, '')));
validator('alphanumeric', (value) => RE_ALPHANUM.test(value.trim().replace(/\s+/g, '')));

validator('minlength', (value, param) => value.trim().length >= Number(param ?? 0));
validator('maxlength', (value, param) => value.trim().length <= Number(param ?? Infinity));

validator('min', (value, param, el) => {
  const limit = referenceDate(param, el);
  if (limit && fieldType(el).startsWith('date')) {
    const current = parseDateValue(value);
    return !current || current.getTime() >= limit.getTime();
  }
  return toNumber(value) >= Number(param ?? 0);
});

validator('max', (value, param, el) => {
  const limit = referenceDate(param, el);
  if (limit && fieldType(el).startsWith('date')) {
    const current = parseDateValue(value);
    return !current || current.getTime() <= limit.getTime();
  }
  return toNumber(value) <= Number(param ?? Infinity);
});

validator('between', (value, param) => {
  const [min, max] = (param ?? '').split(',').map((part) => Number(part.trim()));
  const current = toNumber(value);
  return Number.isFinite(current) && current >= min && current <= max;
});

validator('match', (value, param, el) => {
  if (!param) return true;
  const other = findRelatedField(el, param);
  if (!other) return true;
  return fieldValue(other) === value;
});

validator('same', (value, param, el) => {
  if (!param) return true;
  const other = findRelatedField(el, param);
  return !other || fieldValue(other) === value;
});

validator('different', (value, param, el) => {
  if (!param) return true;
  const other = findRelatedField(el, param);
  return !other || fieldValue(other) !== value;
});

validator('regex', (value, param, el) => {
  if (!param) return true;
  const flags = readDirectiveAttr(el, 'regex-flags') ?? '';
  try {
    return new RegExp(param, flags).test(value);
  } catch {
    warn(`Invalid regular expression in ${config.prefix}regex: ${param}`);
    return true;
  }
});

validator('date', (value) => parseDateValue(value) !== null);

validator('after', (value, param, el) => {
  const limit = referenceDate(param, el);
  const current = parseDateValue(value);
  if (!limit || !current) return true;
  return current.getTime() > limit.getTime();
});

validator('before', (value, param, el) => {
  const limit = referenceDate(param, el);
  const current = parseDateValue(value);
  if (!limit || !current) return true;
  return current.getTime() < limit.getTime();
});

validator('accepted', (value, _param, el) => {
  const type = fieldType(el);
  if (type === 'checkbox' || type === 'radio') return (el as HTMLInputElement).checked;
  return ['1', 'true', 'on', 'yes', 'sim'].includes(value.trim().toLowerCase());
});

validator('in', (value, param) =>
  (param ?? '').split(',').map((part) => part.trim()).includes(value.trim())
);

validator('notin', (value, param) =>
  !(param ?? '').split(',').map((part) => part.trim()).includes(value.trim())
);

validator('phone', (value) => isValidPhoneBR(value));
validator('cpf', (value) => isValidCPF(value));
validator('cnpj', (value) => isValidCNPJ(value));
validator('cep', (value) => digitsOf(value).length === 8);
validator('creditcard', (value) => isValidLuhn(value));

validator('strongpassword', (value, param) => {
  const min = Number(param) > 0 ? Number(param) : 8;
  const strong =
    value.length >= min &&
    /[a-zà-ÿ]/.test(value) &&
    /[A-ZÀ-ß]/.test(value) &&
    /\d/.test(value) &&
    /[^\w\s]/.test(value);
  return strong ? true : formatMessage(messages.strongpassword, { param: String(min) });
});

validator('unique', async (value, param, el) => {
  const url = param || readDirectiveAttr(el, 'unique-url') || '';
  if (!url || !value.trim()) return true;
  try {
    const data = await http.get<Record<string, unknown> | null>(url, {
      params: { value, field: fieldKey(el) },
      timeout: 8000,
    });
    if (data && typeof data === 'object' && 'available' in data) {
      return data.available === true ? true : messages.unique;
    }
    // Without the `available` field, the response is treated as existing record.
    return data ? messages.unique : true;
  } catch (err) {
    if (err instanceof HttpError) {
      // 404 means no one uses this value yet.
      if (err.status === 404) return true;
      if (err.status >= 400 && err.status < 500) return messages.unique;
    }
    // Network failure shouldn't block form submission.
    return true;
  }
});

// ---------------------------------------------------------------------------
// Collecting declared rules from a field
// ---------------------------------------------------------------------------

export interface FieldRule {
  name: string;
  param: string;
}

/** Alternative names accepted in attributes. */
const RULE_ALIASES: Record<string, string> = {
  'strong-password': 'strongpassword',
  'credit-card': 'creditcard',
  'min-length': 'minlength',
  'max-length': 'maxlength',
  'not-in': 'notin',
  'nao-vazio': 'required',
  obrigatorio: 'required',
};

/** Rules that run even with empty field. */
const RUN_WHEN_EMPTY = new Set(['required', 'accepted']);

function ruleNameFromAttribute(attrName: string): string | null {
  let body: string | null = null;
  if (attrName.startsWith(config.prefix)) body = attrName.slice(config.prefix.length);
  else if (attrName.startsWith('data-v-')) body = attrName.slice(7);
  if (!body) return null;

  const dot = body.indexOf('.');
  if (dot > -1) body = body.slice(0, dot);
  if (body === 'validate') return null;
  if (body.startsWith('validate-')) body = body.slice('validate-'.length);

  const name = RULE_ALIASES[body] ?? body;
  return rules.has(name) ? name : null;
}

/** Lists the rules declared in a field, including native attributes. */
export function fieldRules(el: FormField): FieldRule[] {
  const found: FieldRule[] = [];
  const seen = new Set<string>();

  const push = (name: string, param: string): void => {
    if (seen.has(name) || !rules.has(name)) return;
    seen.add(name);
    found.push({ name, param });
  };

  // `originalAttributes` returns the declared attributes, even those the
  // walker has already removed from HTML.
  for (const [attrName, attrValue] of originalAttributes(el)) {
    const name = ruleNameFromAttribute(attrName);
    if (!name) continue;
    // `v-required="false"` disables the rule without needing to remove the attribute.
    if (attrValue.trim() === 'false') {
      seen.add(name);
      continue;
    }
    push(name, attrValue);
  }

  const type = fieldType(el);
  if (el.hasAttribute('required')) push('required', '');
  if (type === 'email') push('email', '');
  if (type === 'url') push('url', '');
  if (type === 'number' || type === 'range') push('number', '');

  const minlength = el.getAttribute('minlength');
  if (minlength) push('minlength', minlength);
  const maxlength = el.getAttribute('maxlength');
  if (maxlength) push('maxlength', maxlength);
  const min = el.getAttribute('min');
  if (min) push('min', min);
  const max = el.getAttribute('max');
  if (max) push('max', max);
  const pattern = el.getAttribute('pattern');
  if (pattern) push('regex', pattern);

  // `required` always runs first to avoid showing format errors on blank.
  found.sort((a, b) => (a.name === 'required' ? -1 : b.name === 'required' ? 1 : 0));
  return found;
}

// ---------------------------------------------------------------------------
// Error styles
// ---------------------------------------------------------------------------

const CSS = `
.v-field-error{display:block;margin-top:6px;color:var(--v-danger,#FF4D4D);
  font:500 12.5px/1.45 var(--v-font-sans,system-ui,-apple-system,sans-serif);
  animation:v-field-error-in .18s var(--v-ease,ease) both}
@keyframes v-field-error-in{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}
.v-invalid{border-color:var(--v-danger,#FF4D4D) !important}
.v-invalid:focus,.v-invalid:focus-visible{outline-color:var(--v-danger,#FF4D4D);
  box-shadow:0 0 0 3px color-mix(in srgb,var(--v-danger,#FF4D4D) 22%,transparent)}
.v-valid{border-color:var(--v-success,#2ED9A5)}
.v-form-error{margin:0 0 14px;padding:10px 14px;border-radius:var(--v-radius-sm,8px);
  background:color-mix(in srgb,var(--v-danger,#FF4D4D) 12%,var(--v-surface,#fff));
  border:1px solid var(--v-danger,#FF4D4D);color:var(--v-text,#14111F);
  font:500 13px/1.5 var(--v-font-sans,system-ui,-apple-system,sans-serif)}
.v-form-error ul{margin:0;padding-left:18px}
@media (prefers-reduced-motion: reduce){.v-field-error{animation:none}}
`;

function ensureStyles(): void {
  ensureTokens();
  injectStyle('forms-validate', CSS);
}

// ---------------------------------------------------------------------------
// Error presentation
// ---------------------------------------------------------------------------

function errorHost(el: FormField): { parent: Element; anchor: Element | null } | null {
  const selector = readDirectiveAttr(el, 'error-target');
  if (selector && typeof document !== 'undefined') {
    const host =
      (el.form ?? el.closest('form'))?.querySelector(selector) ?? document.querySelector(selector);
    if (host) return { parent: host, anchor: null };
    warn(`Target for ${config.prefix}error-target not found: ${selector}`);
  }
  const parent = el.parentElement;
  return parent ? { parent, anchor: el } : null;
}

function findErrorElement(el: FormField): HTMLElement | null {
  const host = errorHost(el);
  if (!host) return null;
  if (host.anchor) {
    const next = host.anchor.nextElementSibling;
    return next && next.classList.contains('v-field-error') ? (next as HTMLElement) : null;
  }
  return host.parent.querySelector<HTMLElement>('.v-field-error');
}

/** Shows error message just below the field and marks the invalid state. */
export function showFieldError(el: FormField, message: string): void {
  ensureStyles();
  el.classList.add('v-invalid');
  el.classList.remove('v-valid');
  el.setAttribute('aria-invalid', 'true');

  let span = findErrorElement(el);
  if (!span) {
    const host = errorHost(el);
    if (!host) return;
    span = document.createElement('span');
    span.className = 'v-field-error';
    span.id = el.id ? `${el.id}-error` : uid('v-error-');
    span.setAttribute('role', 'alert');
    span.setAttribute('aria-live', 'polite');
    if (host.anchor) host.anchor.insertAdjacentElement('afterend', span);
    else host.parent.appendChild(span);
  }
  span.textContent = message;

  const describedBy = (el.getAttribute('aria-describedby') || '')
    .split(/\s+/)
    .filter((id) => id && id !== span.id);
  describedBy.push(span.id);
  el.setAttribute('aria-describedby', describedBy.join(' '));
}

/** Marks the field as valid and removes any message on screen. */
export function clearFieldError(el: FormField, markValid = false): void {
  el.classList.remove('v-invalid');
  el.classList.toggle('v-valid', markValid);
  el.removeAttribute('aria-invalid');

  const span = findErrorElement(el);
  if (span) {
    const remaining = (el.getAttribute('aria-describedby') || '')
      .split(/\s+/)
      .filter((id) => id && id !== span.id);
    if (remaining.length) el.setAttribute('aria-describedby', remaining.join(' '));
    else el.removeAttribute('aria-describedby');
    span.remove();
  }
}

/** Clears all visible errors from a form. */
export function clearErrors(form: HTMLElement): void {
  for (const field of collectFields(form, false)) clearFieldError(field);
  for (const leftover of Array.from(form.querySelectorAll('.v-field-error'))) leftover.remove();
  const summary = form.querySelector('.v-form-error');
  if (summary) summary.remove();
  for (const marked of Array.from(form.querySelectorAll('.v-invalid, .v-valid'))) {
    marked.classList.remove('v-invalid', 'v-valid');
    marked.removeAttribute('aria-invalid');
  }
}

/**
 * Normalizes the error body returned by the server.
 * Accepts `{ field: 'msg' }`, `{ field: ['msg'] }` and `{ errors: { ... } }`.
 */
export function normalizeErrors(payload: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!payload || typeof payload !== 'object') return out;

  const source = payload as Record<string, unknown>;
  const bag =
    source.errors && typeof source.errors === 'object'
      ? (source.errors as Record<string, unknown>)
      : source;

  for (const [key, value] of Object.entries(bag)) {
    if (key === 'message' || key === 'mensagem' || key === 'errors') continue;
    if (typeof value === 'string') out[key] = value;
    else if (Array.isArray(value) && typeof value[0] === 'string') out[key] = value[0];
  }
  return out;
}

function findFieldByName(form: HTMLElement, key: string): FormField | null {
  const bracket = key.replace(/\.(\w+)/g, '[$1]');
  const candidates = [key, bracket, `${key}[]`, `${bracket}[]`];
  for (const candidate of candidates) {
    const found = form.querySelector(`[name="${cssEscape(candidate)}"]`);
    if (isFormField(found)) return found;
  }
  const byId = form.querySelector(`#${cssEscape(key)}`);
  return isFormField(byId) ? byId : null;
}

/**
 * Applies server errors to the HTML. Messages without a corresponding field
 * appear in a summary at the top of the form.
 */
export function showFormErrors(form: HTMLElement, errors: unknown): Record<string, string> {
  const normalized = normalizeErrors(errors);
  const orphans: string[] = [];

  for (const [key, message] of Object.entries(normalized)) {
    const field = findFieldByName(form, key);
    if (field) showFieldError(field, message);
    else orphans.push(message);
  }

  if (orphans.length) showFormSummary(form, orphans);
  return normalized;
}

/** Shows an error summary at the top of the form. */
export function showFormSummary(form: HTMLElement, list: string[]): void {
  ensureStyles();
  let box = form.querySelector<HTMLElement>('.v-form-error');
  if (!box) {
    box = document.createElement('div');
    box.className = 'v-form-error';
    box.setAttribute('role', 'alert');
    form.prepend(box);
  }
  box.textContent = '';
  if (list.length === 1) {
    box.textContent = list[0];
    return;
  }
  const ul = document.createElement('ul');
  for (const message of list) {
    const li = document.createElement('li');
    li.textContent = message;
    ul.appendChild(li);
  }
  box.appendChild(ul);
}

/** Moves focus to the first field with an error. Returns `false` if there is none. */
export function focusFirstError(form: HTMLElement): boolean {
  const field = form.querySelector<HTMLElement>('.v-invalid');
  if (!field) return false;
  try {
    field.focus({ preventScroll: true });
  } catch {
    field.focus();
  }
  const reduced =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Not all environments implement smooth scrolling, so the call is guarded.
  if (typeof field.scrollIntoView === 'function') {
    field.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
  }
  return true;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Form fields. With `onlyWithRules`, ignores fields without rules. */
export function collectFields(form: HTMLElement, onlyWithRules = true): FormField[] {
  const source: Element[] =
    form.tagName === 'FORM'
      ? Array.from((form as HTMLFormElement).elements)
      : Array.from(form.querySelectorAll('input, select, textarea'));

  const out: FormField[] = [];
  for (const element of source) {
    if (!isFormField(element)) continue;
    if (element.disabled) continue;
    if (IGNORED_TYPES.has(fieldType(element))) continue;
    if (onlyWithRules && fieldRules(element).length === 0) continue;
    out.push(element);
  }
  return out;
}

/**
 * Validates a field, applies classes and shows the message.
 * Use `{ silent: true }` to only check the result.
 */
export async function validateField(
  el: FormField,
  options: { silent?: boolean } = {}
): Promise<FieldValidationResult> {
  if (!isFormField(el)) return { valid: true };

  const list = fieldRules(el);
  if (!list.length) {
    if (!options.silent) clearFieldError(el);
    return { valid: true };
  }

  const value = fieldValue(el);
  const custom = readDirectiveAttr(el, 'error-message');
  const empty = value.trim() === '';

  for (const rule of list) {
    if (empty && !RUN_WHEN_EMPTY.has(rule.name)) continue;
    const definition = rules.get(rule.name);
    if (!definition) continue;

    let outcome: ValidatorResult;
    try {
      outcome = await definition.fn(value, rule.param || undefined, el);
    } catch (err) {
      // A broken rule should never prevent the user from submitting the form.
      warn(`Rule "${rule.name}" failed to execute`, err);
      continue;
    }
    if (outcome === true) continue;

    const template =
      custom ??
      (typeof outcome === 'string'
        ? outcome
        : messages[rule.name] ?? definition.message ?? messages.invalid);
    const message = formatMessage(template, {
      field: fieldLabel(el),
      param: rule.param,
      value,
    });

    if (!options.silent) {
      showFieldError(el, message);
      emitFieldResult(el, { valid: false, message, rule: rule.name });
    }
    return { valid: false, message, rule: rule.name };
  }

  if (!options.silent) {
    clearFieldError(el, !empty);
    emitFieldResult(el, { valid: true });
  }
  return { valid: true };
}

/**
 * General shortcut: validates an entire form or a single field, deciding
 * based on the element type received.
 *
 * ```js
 * await V.validate(document.forms[0])          // { valid, errors }
 * await V.validate(document.querySelector('#email'))  // { valid, message }
 * ```
 */
export function validate(
  target: HTMLElement | FormField
): Promise<FormValidationResult | FieldValidationResult> {
  if (isFormField(target)) return validateField(target);
  return validateForm(target);
}

/** Validates all fields with rules and returns errors indexed by name. */
export async function validateForm(form: HTMLElement): Promise<FormValidationResult> {
  const fields = collectFields(form);
  const results = await Promise.all(fields.map((field) => validateField(field)));
  const errors: Record<string, string> = {};

  fields.forEach((field, index) => {
    const result = results[index];
    if (!result.valid) errors[fieldKey(field)] = result.message ?? messages.invalid;
  });

  return { valid: Object.keys(errors).length === 0, errors };
}

function emitFieldResult(el: FormField, result: FieldValidationResult): void {
  el.dispatchEvent(
    new CustomEvent('voodoo:field-validated', {
      bubbles: true,
      detail: { field: fieldKey(el), ...result },
    })
  );
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

interface SerializedEntry {
  name: string;
  value: unknown;
}

/** Breaks `user[address][street]` into `['user','address','street']`. */
function parseFieldName(name: string): string[] {
  const start = name.indexOf('[');
  if (start === -1) return [name];
  const keys = [name.slice(0, start)];
  const re = /\[([^\]]*)\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(name)) !== null) keys.push(match[1]);
  return keys;
}

function assignPath(target: Record<string, unknown>, keys: string[], value: unknown): void {
  let node: Record<string, unknown> | unknown[] = target;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const last = i === keys.length - 1;
    const next = keys[i + 1];

    if (key === '') {
      if (!Array.isArray(node)) return;
      if (last) {
        node.push(value);
        return;
      }
      const container: Record<string, unknown> | unknown[] = next === '' ? [] : {};
      node.push(container);
      node = container;
      continue;
    }

    if (Array.isArray(node)) {
      const index = Number(key);
      if (!Number.isInteger(index)) return;
      if (last) {
        node[index] = value;
        return;
      }
      let child = node[index];
      if (child == null || typeof child !== 'object') {
        child = next === '' || /^\d+$/.test(next ?? '') ? [] : {};
        node[index] = child;
      }
      node = child as Record<string, unknown> | unknown[];
      continue;
    }

    if (last) {
      node[key] = value;
      return;
    }
    let child = node[key];
    if (child == null || typeof child !== 'object') {
      child = next === '' || /^\d+$/.test(next ?? '') ? [] : {};
      node[key] = child;
    }
    node = child as Record<string, unknown> | unknown[];
  }
}

function collectEntries(form: HTMLElement, options: SerializeOptions): SerializedEntry[] {
  const fields = collectFields(form, false);
  const entries: SerializedEntry[] = [];

  // Count checkboxes by name to decide between boolean and list.
  const checkboxCount = new Map<string, number>();
  for (const field of fields) {
    if (fieldType(field) === 'checkbox' && field.name) {
      checkboxCount.set(field.name, (checkboxCount.get(field.name) ?? 0) + 1);
    }
  }

  const trim = options.trim !== false;
  const numbers = options.numbers !== false;

  for (const field of fields) {
    if (!field.name) continue;
    if (field.disabled && !options.includeDisabled) continue;
    const type = fieldType(field);

    if (type === 'file') {
      const files = Array.from((field as HTMLInputElement).files ?? []);
      if (!files.length) continue;
      const multiple = (field as HTMLInputElement).multiple || field.name.endsWith('[]');
      entries.push({ name: field.name, value: multiple ? files : files[0] });
      continue;
    }

    if (type === 'checkbox') {
      const many = (checkboxCount.get(field.name) ?? 1) > 1 || field.name.endsWith('[]');
      if (many) {
        if (!(field as HTMLInputElement).checked) continue;
        const name = field.name.endsWith('[]') ? field.name : `${field.name}[]`;
        entries.push({ name, value: field.value || 'on' });
      } else {
        entries.push({ name: field.name, value: (field as HTMLInputElement).checked });
      }
      continue;
    }

    if (type === 'radio') {
      if (!(field as HTMLInputElement).checked) continue;
      entries.push({ name: field.name, value: field.value });
      continue;
    }

    if (field.tagName === 'SELECT' && (field as HTMLSelectElement).multiple) {
      const selected = Array.from((field as HTMLSelectElement).selectedOptions).map(
        (option) => option.value
      );
      const name = field.name.endsWith('[]') ? field.name : `${field.name}[]`;
      for (const value of selected) entries.push({ name, value });
      continue;
    }

    let value: unknown = field.value ?? '';
    if (trim && typeof value === 'string') value = value.trim();
    if (numbers && (type === 'number' || type === 'range') && value !== '') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) value = parsed;
    }
    entries.push({ name: field.name, value });
  }

  return entries;
}

function hasSelectedFile(form: HTMLElement): boolean {
  for (const field of collectFields(form, false)) {
    if (fieldType(field) !== 'file') continue;
    const files = (field as HTMLInputElement).files;
    if (files && files.length) return true;
  }
  return false;
}

function appendToFormData(data: FormData, name: string, value: unknown): void {
  if (value instanceof File || (typeof Blob !== 'undefined' && value instanceof Blob)) {
    data.append(name, value as Blob);
    return;
  }
  if (Array.isArray(value)) {
    const listName = name.endsWith('[]') ? name : `${name}[]`;
    for (const item of value) appendToFormData(data, listName, item);
    return;
  }
  if (typeof value === 'boolean') {
    data.append(name, value ? '1' : '0');
    return;
  }
  data.append(name, value == null ? '' : String(value));
}

/**
 * Transforms the form into a JavaScript object, respecting names like
 * `user[address][street]` and `tags[]`. Returns `FormData` when a file is
 * selected or when `options.formData` is true.
 */
export function serializeForm(
  form: HTMLElement,
  options: SerializeOptions = {}
): Record<string, unknown> | FormData {
  const entries = collectEntries(form, options);

  if (options.formData || hasSelectedFile(form)) {
    const data = new FormData();
    for (const entry of entries) appendToFormData(data, entry.name, entry.value);
    return data;
  }

  const out: Record<string, unknown> = {};
  for (const entry of entries) assignPath(out, parseFieldName(entry.name), entry.value);
  return out;
}

// ---------------------------------------------------------------------------
// Binding to the DOM
// ---------------------------------------------------------------------------

const boundFields = new WeakSet<Element>();
const erroredFields = new WeakSet<Element>();

async function runFieldValidation(el: FormField): Promise<void> {
  const result = await validateField(el);
  if (result.valid) erroredFields.delete(el);
  else erroredFields.add(el);
}

/**
 * Binds a field to validation events: validates on blur and, after the first
 * error, revalidates on each keystroke.
 */
export function bindFieldValidation(el: FormField, cleanup: (fn: () => void) => void): void {
  if (!isFormField(el)) {
    warn(`${config.prefix}validate only works on input, select, or textarea.`);
    return;
  }
  if (boundFields.has(el)) return;
  boundFields.add(el);
  ensureStyles();

  const onBlur = (): void => {
    void runFieldValidation(el);
  };
  const onInput = (): void => {
    if (!erroredFields.has(el)) return;
    void runFieldValidation(el);
  };

  el.addEventListener('blur', onBlur);
  el.addEventListener('input', onInput);
  el.addEventListener('change', onBlur);

  cleanup(() => {
    boundFields.delete(el);
    erroredFields.delete(el);
    el.removeEventListener('blur', onBlur);
    el.removeEventListener('input', onInput);
    el.removeEventListener('change', onBlur);
  });
}

/** Forms that declared `v-validate`. */
const validatedForms = new WeakSet<HTMLElement>();

/** `true` when the form requested automatic validation. */
export function isValidatedForm(form: HTMLElement): boolean {
  return validatedForms.has(form) || hasDirectiveAttr(form, 'validate');
}

function setupFormValidation(form: HTMLElement, cleanup: (fn: () => void) => void): void {
  validatedForms.add(form);
  ensureStyles();
  // Voodoo validation replaces the browser's native validation box.
  if (form.tagName === 'FORM') (form as HTMLFormElement).noValidate = true;

  const onFocusOut = (event: Event): void => {
    const target = event.target;
    if (!isFormField(target) || boundFields.has(target)) return;
    if (fieldRules(target).length === 0) return;
    void runFieldValidation(target);
  };

  const onInput = (event: Event): void => {
    const target = event.target;
    if (!isFormField(target) || boundFields.has(target)) return;
    if (!erroredFields.has(target)) return;
    void runFieldValidation(target);
  };

  form.addEventListener('focusout', onFocusOut);
  form.addEventListener('input', onInput);
  form.addEventListener('change', onFocusOut);

  cleanup(() => {
    validatedForms.delete(form);
    form.removeEventListener('focusout', onFocusOut);
    form.removeEventListener('input', onInput);
    form.removeEventListener('change', onFocusOut);
  });
}

// ---------------------------------------------------------------------------
// Directives
// ---------------------------------------------------------------------------

defineDirective('validate', ({ el, cleanup }) => {
  if (el.tagName === 'FORM' || el.hasAttribute(`${config.prefix}submit`)) {
    setupFormValidation(el, cleanup);
    return;
  }
  bindFieldValidation(el as FormField, cleanup);
});

/** Field directives cited in public documentation. */
const FIELD_DIRECTIVES = [
  'required',
  'email',
  'url',
  'number',
  'integer',
  'minlength',
  'maxlength',
  'min',
  'max',
  'match',
  'regex',
  'cpf',
  'cnpj',
  'cep',
  'phone',
  'date',
  'accepted',
  'strong-password',
];

for (const name of FIELD_DIRECTIVES) {
  defineDirective(name, ({ el, cleanup }) => {
    bindFieldValidation(el as FormField, cleanup);
  });
}

/** Field configurations that also enable automatic validation. */
for (const name of ['error-message', 'error-target', 'regex-flags', 'unique-url']) {
  defineDirective(name, ({ el, cleanup }) => {
    if (!isFormField(el)) return;
    bindFieldValidation(el, cleanup);
  });
}
