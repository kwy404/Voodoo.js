/**
 * @module directives/forms
 *
 * Formulario AJAX declarativo: envia, valida, mostra estado de carregamento,
 * trata erros de validacao do servidor, troca pedacos da pagina, envia arquivos
 * com barra de progresso, salva rascunho sozinho e avisa antes de sair.
 *
 * ```html
 * <form v-submit="/api/users" v-method="POST" v-validate
 *       v-toast-success="Usuario salvo!" v-reset-success v-redirect="/usuarios">
 *   <input name="nome" v-required>
 *   <button type="submit" :disabled="$form.loading">Salvar</button>
 * </form>
 * ```
 */

import { reactive, warn } from '../reactivity';
import { config, defineDirective, PRIORITY } from '../runtime/registry';
import { magic, type Scope } from '../runtime/scope';
import { destroy, evaluateIn, findScope, markNodeScope, walk } from '../runtime/walker';
import { ensureTokens, injectStyle } from '../dom/style';
import { http, request, HttpError, type HttpMethod, type HttpResponse } from '../http';
import { toast } from '../ui/toast';
import { debounce, parseDuration } from '../utils';
import {
  clearErrors,
  focusFirstError,
  isValidatedForm,
  normalizeErrors,
  readDirectiveAttr,
  serializeForm,
  showFormErrors,
  validateForm,
} from '../forms/validate';

// ---------------------------------------------------------------------------
// Estado reativo do formulario
// ---------------------------------------------------------------------------

export interface FormState {
  /** `true` enquanto uma requisicao do formulario esta em andamento. */
  loading: boolean;
  /** `true` enquanto o autosave esta gravando. */
  saving: boolean;
  /** `true` depois de uma resposta bem sucedida. */
  success: boolean;
  /** Campos com erro, indexados pelo `name`. */
  errors: Record<string, string>;
  /** Mensagem devolvida pelo servidor. */
  message: string;
  /** Corpo da ultima resposta. */
  data: unknown;
  /** Status HTTP da ultima resposta. */
  status: number;
  /** `true` quando existem alteracoes ainda nao enviadas. */
  dirty: boolean;
  /** Progresso do upload, de 0 a 100. */
  progress: number;
}

function createState(): FormState {
  return reactive<FormState>({
    loading: false,
    saving: false,
    success: false,
    errors: {},
    message: '',
    data: null,
    status: 0,
    dirty: false,
    progress: 0,
  });
}

const formStates = new WeakMap<HTMLElement, FormState>();
const scopeStates = new WeakMap<Scope, FormState>();
const neutralState = createState();

/** Devolve o estado reativo do elemento, criando na primeira chamada. */
export function ensureFormState(host: HTMLElement): FormState {
  let state = formStates.get(host);
  if (!state) {
    state = createState();
    formStates.set(host, state);
  }
  return state;
}

/** Estado ja existente do elemento, sem criar um novo. */
export function getFormState(host: HTMLElement): FormState | undefined {
  return formStates.get(host);
}

function resolveFormState(scope: Scope): FormState {
  let current: Scope | null = scope;
  while (current) {
    const direct = scopeStates.get(current);
    if (direct) return direct;

    const el = current.el;
    if (el) {
      const owner = el.closest('form');
      const found = owner ? formStates.get(owner as HTMLElement) : undefined;
      if (found) return found;
      const inner = el.querySelector('form');
      const nested = inner ? formStates.get(inner as HTMLElement) : undefined;
      if (nested) return nested;
    }
    current = current.parent;
  }

  // Ultimo recurso: um unico formulario com estado na pagina.
  if (typeof document !== 'undefined') {
    for (const form of Array.from(document.forms)) {
      const found = formStates.get(form);
      if (found) return found;
    }
  }
  return neutralState;
}

/** `$form.loading`, `$form.errors`, `$form.success` e companhia. */
magic('$form', (scope) => resolveFormState(scope));

// ---------------------------------------------------------------------------
// Opcoes declaradas em atributos
// ---------------------------------------------------------------------------

const declaredOptions = new WeakMap<HTMLElement, Record<string, string>>();

/**
 * Directives que disparam requisicao. Alem das deste modulo, entram as do
 * modulo `directives/http`, que compartilham as mesmas opcoes.
 */
const REQUEST_DIRECTIVES = [
  'submit',
  'upload',
  'dropzone',
  'autosave',
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'load',
  'load-visible',
  'search',
  'resource',
];

function isRequestHost(el: Element): boolean {
  return REQUEST_DIRECTIVES.some(
    (name) => el.hasAttribute(`${config.prefix}${name}`) || el.hasAttribute(`data-v-${name}`)
  );
}

/**
 * Le uma opcao do proprio elemento, do formulario que o contem ou do valor
 * guardado quando a directive de opcao foi processada.
 */
export function readOption(el: HTMLElement, name: string): string | null {
  const own = readDirectiveAttr(el, name);
  if (own !== null) return own;

  const owner = el.closest('form');
  if (owner && owner !== el) {
    const inherited = readDirectiveAttr(owner, name);
    if (inherited !== null) return inherited;
  }

  const cached = declaredOptions.get(el)?.[name] ?? (owner ? declaredOptions.get(owner as HTMLElement)?.[name] : undefined);
  return cached ?? null;
}

/** `true` quando a opcao existe, mesmo sem valor. */
export function hasOption(el: HTMLElement, name: string): boolean {
  return readOption(el, name) !== null;
}

/**
 * Registra uma directive de opcao: ela guarda o valor para o motor de envio e
 * avisa quando foi usada longe de um formulario que faz requisicao.
 */
function defineFormOption(name: string, validate?: (value: string) => string | null): void {
  defineDirective(name, ({ el, expression }) => {
    const owner = (el.closest('form') as HTMLElement | null) ?? el;
    const bag = declaredOptions.get(owner) ?? {};
    bag[name] = expression;
    declaredOptions.set(owner, bag);

    if (!isRequestHost(owner) && !isRequestHost(el)) {
      warn(
        `${config.prefix}${name} precisa de um elemento com ${config.prefix}submit, ` +
          `${config.prefix}upload, ${config.prefix}dropzone ou ${config.prefix}autosave.`
      );
      return;
    }
    const problem = validate?.(expression);
    if (problem) warn(problem);
  });
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

defineFormOption('method', (value) =>
  value && !HTTP_METHODS.includes(value.trim().toUpperCase())
    ? `${config.prefix}method recebeu um verbo desconhecido: ${value}`
    : null
);
defineFormOption('redirect');
defineFormOption('reset-success');
defineFormOption('disable-loading');
defineFormOption('loading-class');
defineFormOption('on-success');
defineFormOption('on-error');
defineFormOption('on-complete');
defineFormOption('toast-success');
defineFormOption('toast-error');
defineFormOption('confirm');
defineFormOption('form-data');

/** `v-loading` esconde o elemento apontado ate a proxima requisicao comecar. */
defineDirective('loading', ({ el, expression }) => {
  const owner = (el.closest('form') as HTMLElement | null) ?? el;
  const bag = declaredOptions.get(owner) ?? {};
  bag.loading = expression;
  declaredOptions.set(owner, bag);

  const target = loadingTarget(expression);
  if (!target) {
    warn(`Elemento de ${config.prefix}loading nao encontrado: ${expression}`);
    return;
  }
  toggleLoadingTarget(target, false);
});

// ---------------------------------------------------------------------------
// Estilos
// ---------------------------------------------------------------------------

const CSS = `
form.v-loading{cursor:progress}
form.v-loading [type="submit"],form.v-loading button[disabled]{opacity:.6}
.v-progress{position:relative;overflow:hidden;width:100%;height:8px;margin-top:8px;
  border-radius:999px;background:var(--v-surface-2,#FBF7F2);border:1px solid var(--v-border,#E6E0F0)}
.v-progress-bar{display:block;height:100%;width:0;border-radius:999px;
  background:var(--v-primary,#6D3BF5);transition:width .18s var(--v-ease,ease)}
.v-progress[data-state="error"] .v-progress-bar{background:var(--v-danger,#FF4D4D)}
.v-progress[data-state="done"] .v-progress-bar{background:var(--v-success,#2ED9A5)}

.v-dropzone{display:grid;place-items:center;gap:6px;min-height:132px;padding:20px;cursor:pointer;
  border:2px dashed var(--v-border,#E6E0F0);border-radius:var(--v-radius,12px);
  background:var(--v-surface,#fff);color:var(--v-text-muted,#6B6580);text-align:center;
  font:500 14px/1.5 var(--v-font-sans,system-ui,-apple-system,sans-serif);
  transition:border-color .18s var(--v-ease,ease),background .18s var(--v-ease,ease)}
.v-dropzone:focus-visible{outline:2px solid var(--v-primary,#6D3BF5);outline-offset:2px}
.v-dropzone-over{border-color:var(--v-primary,#6D3BF5);
  background:color-mix(in srgb,var(--v-primary,#6D3BF5) 8%,var(--v-surface,#fff));
  color:var(--v-primary,#6D3BF5)}
.v-dropzone-busy{cursor:progress;opacity:.75}
.v-dropzone-error{border-color:var(--v-danger,#FF4D4D);color:var(--v-danger,#FF4D4D)}

.v-autosave-status{display:inline-flex;align-items:center;gap:6px;margin-top:8px;
  color:var(--v-text-muted,#6B6580);
  font:500 12.5px/1.4 var(--v-font-sans,system-ui,-apple-system,sans-serif)}
.v-autosave-status[data-state="saving"]{color:var(--v-info,#9B7BFF)}
.v-autosave-status[data-state="saved"]{color:var(--v-success,#2ED9A5)}
.v-autosave-status[data-state="error"]{color:var(--v-danger,#FF4D4D)}
@media (prefers-reduced-motion: reduce){.v-progress-bar,.v-dropzone{transition:none}}
`;

function ensureStyles(): void {
  ensureTokens();
  injectStyle('forms-ajax', CSS);
}

// ---------------------------------------------------------------------------
// Auxiliares de requisicao
// ---------------------------------------------------------------------------

interface RequestContext {
  /** Elemento que declarou a directive e carrega as opcoes. */
  host: HTMLElement;
  /** Formulario usado para serializar e mostrar erros. */
  form: HTMLElement;
  scope: Scope;
  state: FormState;
}

function emit(el: Element, name: string, detail: Record<string, unknown>): void {
  el.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
}

/** Resolve `/api/users/{ user.id }` no escopo atual e aplica a `baseURL`. */
function resolveUrl(raw: string, scope: Scope): string {
  let url = raw.trim();
  if (url.includes('{')) {
    url = url.replace(/\{([^{}]+)\}/g, (whole, expression: string) => {
      const value = evaluateIn<unknown>(expression.trim(), scope, `${config.prefix}submit`);
      return value == null ? whole : String(value);
    });
  }
  const base = config.baseURL;
  if (base && !/^[a-z][a-z0-9+.-]*:\/\//i.test(url) && !url.startsWith('//')) {
    url = `${base.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
  }
  return url;
}

function messageFrom(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const source = data as Record<string, unknown>;
  const found = source.message ?? source.mensagem;
  return typeof found === 'string' ? found : '';
}

/** Achata um objeto em parametros de query, mantendo colchetes nas chaves. */
function toParams(
  value: unknown,
  prefix = '',
  out: Record<string, string> = {}
): Record<string, string> {
  if (value == null) return out;
  if (Array.isArray(value)) {
    value.forEach((item, index) => toParams(item, `${prefix}[${index}]`, out));
    return out;
  }
  if (typeof value === 'object' && !(value instanceof File)) {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      toParams(item, prefix ? `${prefix}[${key}]` : key, out);
    }
    return out;
  }
  if (prefix) out[prefix] = String(value);
  return out;
}

function submitButtons(form: HTMLElement): Array<HTMLButtonElement | HTMLInputElement> {
  return Array.from(
    form.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
      'button[type="submit"], button:not([type]), input[type="submit"], input[type="image"]'
    )
  );
}

function loadingTarget(selector: string): HTMLElement | null {
  if (!selector || typeof document === 'undefined') return null;
  return document.querySelector<HTMLElement>(selector);
}

const originalDisplay = new WeakMap<HTMLElement, string>();

function toggleLoadingTarget(target: HTMLElement, visible: boolean): void {
  if (visible) {
    target.hidden = false;
    target.style.display = originalDisplay.get(target) ?? '';
    target.removeAttribute('aria-hidden');
    return;
  }
  if (!originalDisplay.has(target)) {
    originalDisplay.set(target, target.style.display === 'none' ? '' : target.style.display);
  }
  target.style.display = 'none';
  target.setAttribute('aria-hidden', 'true');
}

function setLoading(ctx: RequestContext, on: boolean): void {
  const { host, form, state } = ctx;
  state.loading = on;
  form.classList.toggle('v-loading', on);
  form.setAttribute('aria-busy', on ? 'true' : 'false');

  const extra = readOption(host, 'loading-class');
  if (extra) {
    for (const name of extra.split(/\s+/).filter(Boolean)) form.classList.toggle(name, on);
  }

  if (hasOption(host, 'disable-loading')) {
    for (const button of submitButtons(form)) button.disabled = on;
  }

  const selector = readOption(host, 'loading');
  if (selector) {
    const target = loadingTarget(selector);
    if (target) toggleLoadingTarget(target, on);
  }
}

/** Executa `v-on-success`, `v-on-error` e `v-on-complete`. */
function runCallback(
  ctx: RequestContext,
  option: string,
  payload: unknown,
  response: unknown
): void {
  const expression = readOption(ctx.host, option);
  if (!expression) return;

  const local = ctx.scope.child({
    $data: payload,
    $response: response,
    $form: ctx.state,
    $el: ctx.host,
  });
  const result = evaluateIn<unknown>(expression, local, `${config.prefix}${option}`);
  if (typeof result === 'function') {
    (result as (...args: unknown[]) => unknown).call(ctx.scope.data, payload, response);
  }
}

// ---------------------------------------------------------------------------
// Troca de conteudo com v-target e v-swap
// ---------------------------------------------------------------------------

function swapContent(ctx: RequestContext, data: unknown): void {
  const selector = readOption(ctx.host, 'target');
  if (!selector || typeof data !== 'string') return;

  const target = document.querySelector(selector);
  if (!target) {
    warn(`Destino de ${config.prefix}target nao encontrado: ${selector}`);
    return;
  }

  const mode = (readOption(ctx.host, 'swap') || 'innerHTML').trim().toLowerCase();
  if (mode === 'none') return;
  if (mode === 'text') {
    target.textContent = data;
    return;
  }

  const template = document.createElement('template');
  template.innerHTML = data;
  const nodes = Array.from(template.content.childNodes);
  const scope = findScope(target);

  switch (mode) {
    case 'inner':
    case 'innerhtml':
      for (const child of Array.from(target.children)) destroy(child);
      target.textContent = '';
      target.append(...nodes);
      break;
    case 'afterbegin':
    case 'prepend':
      target.prepend(...nodes);
      break;
    case 'beforeend':
    case 'append':
      target.append(...nodes);
      break;
    case 'beforebegin':
      target.before(...nodes);
      break;
    case 'afterend':
      target.after(...nodes);
      break;
    case 'outer':
    case 'outerhtml':
    case 'replace':
      destroy(target);
      target.replaceWith(...nodes);
      break;
    default:
      warn(`Modo desconhecido em ${config.prefix}swap: ${mode}`);
      return;
  }

  // O HTML recebido tambem ganha directives.
  for (const node of nodes) if (node.nodeType === 1) walk(node, scope);
}

// ---------------------------------------------------------------------------
// Resultado da requisicao
// ---------------------------------------------------------------------------

function handleSuccess(ctx: RequestContext, data: unknown, status: number): void {
  const { state, form, host } = ctx;
  state.success = true;
  state.errors = {};
  state.data = data;
  state.status = status;
  state.dirty = false;
  state.message = messageFrom(data);

  swapContent(ctx, data);

  if (hasOption(host, 'reset-success') && form.tagName === 'FORM') {
    (form as HTMLFormElement).reset();
    clearErrors(form);
  }

  const successToast = readOption(host, 'toast-success');
  if (successToast !== null) {
    toast.success(successToast || state.message || 'Tudo certo!');
  }

  runCallback(ctx, 'on-success', data, { status });
  emit(form, 'voodoo:success', { data, status, form, state });

  const redirect = readOption(host, 'redirect');
  if (redirect !== null && typeof window !== 'undefined') {
    const fromServer =
      data && typeof data === 'object'
        ? ((data as Record<string, unknown>).redirect ?? (data as Record<string, unknown>).url)
        : null;
    const local = ctx.scope.child({ $data: data, $form: state });
    const url = redirect ? resolveUrl(redirect, local) : String(fromServer ?? '');
    if (url) window.location.assign(url);
  }
}

function handleFailure(ctx: RequestContext, error: unknown): void {
  const { state, form, host } = ctx;
  const httpError =
    error instanceof HttpError
      ? error
      : new HttpError(error instanceof Error ? error.message : String(error));
  const data = httpError.response?.data ?? null;

  state.success = false;
  state.data = data;
  state.status = httpError.status;
  state.message = messageFrom(data) || httpError.message;

  const serverErrors = normalizeErrors(data);
  if (httpError.status === 422 || Object.keys(serverErrors).length > 0) {
    state.errors = showFormErrors(form, data);
    focusFirstError(form);
  }

  const errorToast = readOption(host, 'toast-error');
  if (errorToast !== null) {
    toast.error(errorToast || messageFrom(data) || 'Nao foi possivel enviar o formulario.');
  }

  runCallback(ctx, 'on-error', data, httpError);
  emit(form, 'voodoo:error', {
    error: httpError,
    data,
    status: httpError.status,
    form,
    state,
  });
}

function handleComplete(ctx: RequestContext, ok: boolean): void {
  runCallback(ctx, 'on-complete', ctx.state.data, { ok, status: ctx.state.status });
  emit(ctx.form, 'voodoo:complete', {
    ok,
    status: ctx.state.status,
    data: ctx.state.data,
    form: ctx.form,
    state: ctx.state,
  });
}

// ---------------------------------------------------------------------------
// v-submit
// ---------------------------------------------------------------------------

async function sendForm(ctx: RequestContext, rawUrl: string): Promise<void> {
  const { host, form, state, scope } = ctx;
  if (state.loading) return;

  const confirmMessage = readOption(host, 'confirm');
  if (confirmMessage !== null && typeof window !== 'undefined') {
    if (!window.confirm(confirmMessage || 'Confirma esta acao?')) return;
  }

  if (isValidatedForm(form)) {
    clearErrors(form);
    const result = await validateForm(form);
    state.errors = result.errors;
    if (!result.valid) {
      focusFirstError(form);
      emit(form, 'voodoo:invalid', { errors: result.errors, form, state });
      return;
    }
  }

  const method = (readOption(host, 'method') || form.getAttribute('method') || 'POST')
    .trim()
    .toUpperCase() as HttpMethod;
  const url =
    resolveUrl(rawUrl, scope) ||
    (form.tagName === 'FORM' ? (form as HTMLFormElement).action : '') ||
    (typeof location !== 'undefined' ? location.href : '');

  const payload = serializeForm(form, { formData: hasOption(host, 'form-data') });
  const readOnly = method === 'GET' || method === 'HEAD';

  setLoading(ctx, true);
  state.success = false;
  state.progress = 0;
  emit(form, 'voodoo:submit', { url, method, form, state });

  let ok = false;
  try {
    const response: HttpResponse<unknown> = await request({
      url,
      method,
      body: readOnly ? undefined : payload,
      params: readOnly && !(payload instanceof FormData) ? toParams(payload) : undefined,
    });
    ok = true;
    handleSuccess(ctx, response.data, response.status);
  } catch (err) {
    handleFailure(ctx, err);
  } finally {
    setLoading(ctx, false);
    handleComplete(ctx, ok);
  }
}

defineDirective(
  'submit',
  ({ el, scope, expression, cleanup }) => {
    ensureStyles();
    const form = el;
    const state = ensureFormState(form);

    // Torna `$form` visivel para o conteudo do formulario, mesmo quando o
    // escopo de dados foi criado por um elemento ancestral.
    const formScope = scope.child({ $form: state }, form);
    scopeStates.set(formScope, state);
    scopeStates.set(scope, state);
    markNodeScope(form, formScope);
    for (const child of Array.from(form.childNodes)) {
      if (child.nodeType === 1) markNodeScope(child, formScope);
    }

    const ctx: RequestContext = { host: form, form, scope: formScope, state };

    const onSubmit = (event: Event): void => {
      event.preventDefault();
      void sendForm(ctx, expression);
    };

    const onFieldValidated = (event: Event): void => {
      const detail = (event as CustomEvent<{ field: string; valid: boolean; message?: string }>)
        .detail;
      if (!detail || !detail.field) return;
      const next = { ...state.errors };
      if (detail.valid) delete next[detail.field];
      else next[detail.field] = detail.message ?? '';
      state.errors = next;
    };

    form.addEventListener('submit', onSubmit);
    form.addEventListener('voodoo:field-validated', onFieldValidated);

    cleanup(() => {
      formStates.delete(form);
      form.removeEventListener('submit', onSubmit);
      form.removeEventListener('voodoo:field-validated', onFieldValidated);
    });
  },
  { priority: PRIORITY.DATA - 1 }
);

// ---------------------------------------------------------------------------
// Barra de progresso
// ---------------------------------------------------------------------------

function progressElement(host: HTMLElement): HTMLElement | null {
  const selector = readOption(host, 'progress');
  if (selector) {
    const found = document.querySelector<HTMLElement>(selector);
    if (found) return found;
    warn(`Barra de ${config.prefix}progress nao encontrada: ${selector}`);
    return null;
  }

  // Sem seletor, a Voodoo cria uma barra logo depois do elemento.
  const existing = host.nextElementSibling;
  if (existing && existing.classList.contains('v-progress')) return existing as HTMLElement;

  ensureStyles();
  const bar = document.createElement('div');
  bar.className = 'v-progress';
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  bar.innerHTML = '<span class="v-progress-bar"></span>';
  host.insertAdjacentElement('afterend', bar);
  return bar;
}

function paintProgress(target: HTMLElement | null, percent: number, state?: string): void {
  if (!target) return;
  const value = Math.max(0, Math.min(100, Math.round(percent)));

  if (target.tagName === 'PROGRESS') {
    (target as HTMLProgressElement).value = value;
    (target as HTMLProgressElement).max = 100;
  } else {
    const bar = target.classList.contains('v-progress-bar')
      ? target
      : target.querySelector<HTMLElement>('.v-progress-bar, [data-progress-bar]');
    if (bar) bar.style.width = `${value}%`;
    else target.style.width = `${value}%`;
  }

  target.setAttribute('aria-valuenow', String(value));
  if (state) target.setAttribute('data-state', state);
  else target.removeAttribute('data-state');
}

// ---------------------------------------------------------------------------
// v-upload e v-dropzone
// ---------------------------------------------------------------------------

function buildFileData(host: HTMLElement, files: File[], fieldName: string): FormData {
  const data = new FormData();
  const multiple = files.length > 1 || fieldName.endsWith('[]');
  const name = multiple ? (fieldName.endsWith('[]') ? fieldName : `${fieldName}[]`) : fieldName;
  for (const file of files) data.append(name, file);

  // Campos comuns do formulario acompanham o arquivo.
  const owner = host.closest('form');
  if (owner) {
    const extra = serializeForm(owner, { formData: true });
    if (extra instanceof FormData) {
      for (const [key, value] of extra.entries()) {
        if (value instanceof File) continue;
        data.append(key, value);
      }
    }
  }
  return data;
}

async function sendFiles(ctx: RequestContext, rawUrl: string, files: File[], fieldName: string): Promise<void> {
  if (!files.length || ctx.state.loading) return;
  const { state, form, host } = ctx;

  const url = resolveUrl(rawUrl, ctx.scope);
  if (!url) {
    warn(`${config.prefix}upload precisa da URL de destino.`);
    return;
  }

  const bar = progressElement(host);
  const data = buildFileData(host, files, fieldName);

  setLoading(ctx, true);
  state.success = false;
  state.progress = 0;
  paintProgress(bar, 0, 'loading');
  emit(form, 'voodoo:upload', { url, files, form, state });

  let ok = false;
  try {
    const method = (readOption(host, 'method') || 'POST').trim().toUpperCase();
    const response = await http.upload<unknown>(url, data, {
      method: method === 'PUT' || method === 'PATCH' ? method : 'POST',
      onProgress: (percent) => {
        state.progress = percent;
        paintProgress(bar, percent, 'loading');
        emit(form, 'voodoo:progress', { percent, form, state });
      },
    });
    ok = true;
    state.progress = 100;
    paintProgress(bar, 100, 'done');
    handleSuccess(ctx, response, 200);
  } catch (err) {
    paintProgress(bar, state.progress, 'error');
    handleFailure(ctx, err);
  } finally {
    setLoading(ctx, false);
    handleComplete(ctx, ok);
  }
}

defineDirective('upload', ({ el, scope, expression, cleanup }) => {
  const input = el as HTMLInputElement;
  if (input.tagName !== 'INPUT' || (input.getAttribute('type') || '').toLowerCase() !== 'file') {
    warn(`${config.prefix}upload precisa de um <input type="file">.`);
    return;
  }
  ensureStyles();

  const form = (input.closest('form') as HTMLElement | null) ?? input;
  const state = ensureFormState(form);
  const ctx: RequestContext = { host: input, form, scope, state };

  const onChange = (): void => {
    const files = Array.from(input.files ?? []);
    if (!files.length) return;
    void sendFiles(ctx, expression, files, input.name || 'file');
  };

  input.addEventListener('change', onChange);
  cleanup(() => input.removeEventListener('change', onChange));
});

defineDirective('dropzone', ({ el, scope, expression, cleanup }) => {
  ensureStyles();
  el.classList.add('v-dropzone');
  if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
  if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
  if (!el.textContent?.trim()) el.textContent = 'Arraste arquivos aqui ou clique para escolher';

  const form = (el.closest('form') as HTMLElement | null) ?? el;
  const state = ensureFormState(form);
  const ctx: RequestContext = { host: el, form, scope, state };
  const fieldName = readOption(el, 'field') || 'file';

  const picker = document.createElement('input');
  picker.type = 'file';
  picker.hidden = true;
  picker.tabIndex = -1;
  if (el.hasAttribute('accept')) picker.accept = el.getAttribute('accept') ?? '';
  if (el.hasAttribute('multiple')) picker.multiple = true;
  el.appendChild(picker);

  const send = (files: File[]): void => {
    if (!files.length) return;
    el.classList.add('v-dropzone-busy');
    el.classList.remove('v-dropzone-error');
    void sendFiles(ctx, expression, files, fieldName).finally(() => {
      el.classList.remove('v-dropzone-busy');
      if (!state.success) el.classList.add('v-dropzone-error');
    });
  };

  // O contador evita que passar por cima de um filho remova o destaque.
  let depth = 0;

  const onDragEnter = (event: DragEvent): void => {
    event.preventDefault();
    depth++;
    el.classList.add('v-dropzone-over');
  };
  const onDragOver = (event: DragEvent): void => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  };
  const onDragLeave = (): void => {
    depth = Math.max(0, depth - 1);
    if (depth === 0) el.classList.remove('v-dropzone-over');
  };
  const onDrop = (event: DragEvent): void => {
    event.preventDefault();
    depth = 0;
    el.classList.remove('v-dropzone-over');
    const files = Array.from(event.dataTransfer?.files ?? []);
    send(picker.multiple ? files : files.slice(0, 1));
  };
  const onClick = (event: Event): void => {
    if (event.target === picker) return;
    picker.click();
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    picker.click();
  };
  const onPick = (): void => {
    const files = Array.from(picker.files ?? []);
    send(files);
    picker.value = '';
  };

  el.addEventListener('dragenter', onDragEnter);
  el.addEventListener('dragover', onDragOver);
  el.addEventListener('dragleave', onDragLeave);
  el.addEventListener('drop', onDrop);
  el.addEventListener('click', onClick);
  el.addEventListener('keydown', onKeyDown);
  picker.addEventListener('change', onPick);

  cleanup(() => {
    el.removeEventListener('dragenter', onDragEnter);
    el.removeEventListener('dragover', onDragOver);
    el.removeEventListener('dragleave', onDragLeave);
    el.removeEventListener('drop', onDrop);
    el.removeEventListener('click', onClick);
    el.removeEventListener('keydown', onKeyDown);
    picker.removeEventListener('change', onPick);
    picker.remove();
  });
});

// ---------------------------------------------------------------------------
// v-autosave
// ---------------------------------------------------------------------------

const AUTOSAVE_TEXTS: Record<string, string> = {
  idle: '',
  saving: 'Salvando...',
  saved: 'Alteracoes salvas',
  error: 'Nao foi possivel salvar',
};

function autosaveStatusElement(host: HTMLElement): HTMLElement {
  const selector = readOption(host, 'autosave-status');
  if (selector) {
    const found = document.querySelector<HTMLElement>(selector);
    if (found) return found;
    warn(`Elemento de ${config.prefix}autosave-status nao encontrado: ${selector}`);
  }
  const existing = host.querySelector<HTMLElement>('.v-autosave-status');
  if (existing) return existing;

  const status = document.createElement('span');
  status.className = 'v-autosave-status';
  status.setAttribute('aria-live', 'polite');
  host.appendChild(status);
  return status;
}

function paintAutosave(status: HTMLElement, kind: keyof typeof AUTOSAVE_TEXTS): void {
  status.setAttribute('data-state', kind);
  status.textContent = AUTOSAVE_TEXTS[kind];
}

defineDirective('autosave', ({ el, scope, expression, modifiers, cleanup }) => {
  ensureStyles();
  const form = el;
  const state = ensureFormState(form);
  const ctx: RequestContext = { host: form, form, scope, state };
  const status = autosaveStatusElement(form);

  const rawDelay =
    (typeof modifiers.delay === 'string' ? modifiers.delay : null) ??
    Object.keys(modifiers).find((name) => /^[\d.]+(ms|s|m)?$/.test(name)) ??
    readOption(form, 'autosave-delay') ??
    1000;
  const delay = parseDuration(rawDelay, 1000);

  const save = async (): Promise<void> => {
    const url = resolveUrl(expression, scope);
    if (!url) {
      warn(`${config.prefix}autosave precisa da URL de destino.`);
      return;
    }
    if (state.loading) return;

    state.saving = true;
    paintAutosave(status, 'saving');
    const method = (readOption(form, 'method') || 'POST').trim().toUpperCase() as HttpMethod;

    try {
      const response = await request({
        url,
        method,
        body: serializeForm(form, { formData: hasOption(form, 'form-data') }),
      });
      state.data = response.data;
      state.status = response.status;
      state.dirty = false;
      state.success = true;
      paintAutosave(status, 'saved');
      runCallback(ctx, 'on-success', response.data, { status: response.status });
      emit(form, 'voodoo:autosave', { data: response.data, status: response.status, form, state });
    } catch (err) {
      paintAutosave(status, 'error');
      handleFailure(ctx, err);
    } finally {
      state.saving = false;
    }
  };

  const schedule = debounce(() => {
    void save();
  }, delay);

  const onChange = (): void => {
    state.dirty = true;
    schedule();
  };

  form.addEventListener('input', onChange);
  form.addEventListener('change', onChange);

  cleanup(() => {
    schedule.cancel();
    form.removeEventListener('input', onChange);
    form.removeEventListener('change', onChange);
  });
});

// ---------------------------------------------------------------------------
// v-guard
// ---------------------------------------------------------------------------

defineDirective('guard', ({ el, expression, cleanup }) => {
  const form = (el.tagName === 'FORM' ? el : (el.closest('form') as HTMLElement | null)) ?? el;
  const state = ensureFormState(form);
  const message = expression.trim() || 'Existem alteracoes que ainda nao foram salvas.';

  const onChange = (): void => {
    state.dirty = true;
  };
  const onClean = (): void => {
    state.dirty = false;
  };
  const onBeforeUnload = (event: BeforeUnloadEvent): void => {
    if (!state.dirty || state.loading) return;
    event.preventDefault();
    // Os navegadores atuais mostram um texto proprio, mas exigem o valor.
    event.returnValue = message;
  };

  form.addEventListener('input', onChange);
  form.addEventListener('change', onChange);
  form.addEventListener('reset', onClean);
  form.addEventListener('voodoo:success', onClean);
  window.addEventListener('beforeunload', onBeforeUnload);

  cleanup(() => {
    form.removeEventListener('input', onChange);
    form.removeEventListener('change', onChange);
    form.removeEventListener('reset', onClean);
    form.removeEventListener('voodoo:success', onClean);
    window.removeEventListener('beforeunload', onBeforeUnload);
  });
});
