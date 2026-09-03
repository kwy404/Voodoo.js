import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reactive } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk, destroy } from '../src/runtime/walker';
import {
  clearErrors,
  collectFields,
  fieldKey,
  fieldLabel,
  fieldRules,
  fieldValue,
  focusFirstError,
  formatMessage,
  isFormField,
  isValidCNPJ,
  isValidCPF,
  isValidLuhn,
  isValidPhoneBR,
  messages,
  normalizeErrors,
  parseDateValue,
  rules,
  serializeForm,
  showFormErrors,
  showFormSummary,
  validate,
  validateField,
  validateForm,
  validator,
  type FormField,
} from '../src/forms/validate';
import {
  applyMask,
  mask,
  maskCurrency,
  maskPercent,
  masks,
  registerMask,
  unmask,
} from '../src/forms/mask';

/**
 * Coverage of the `forms` module. It had no dedicated test at all, despite
 * adding up to almost 1,800 lines between validation and masks.
 *
 * The rules are exercised straight through the registry (`rules`) whenever the
 * target is the branch inside the rule, and through `validateField` when what
 * matters is the message, the class in the HTML or the event that is fired.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a loose field in the document from HTML. */
function campo(html: string): FormField {
  const caixa = document.createElement('div');
  caixa.innerHTML = html;
  document.body.appendChild(caixa);
  return caixa.firstElementChild as FormField;
}

/** Creates a form and returns the `form` element. */
function formulario(html: string): HTMLFormElement {
  const caixa = document.createElement('div');
  caixa.innerHTML = `<form>${html}</form>`;
  document.body.appendChild(caixa);
  return caixa.firstElementChild as HTMLFormElement;
}

/** Runs a rule from the registry without going through the error display. */
function regra(
  nome: string,
  valor: string,
  param?: string,
  el: FormField = campo('<input>')
): boolean | string | Promise<boolean | string> {
  const definicao = rules.get(nome);
  if (!definicao) throw new Error(`regra "${nome}" nao registrada`);
  return definicao.fn(valor, param, el);
}

/** Mounts HTML with the walker, to exercise the directives. */
function montar(html: string, dados: Record<string, unknown> = {}): HTMLElement {
  const raiz = document.createElement('div');
  raiz.innerHTML = html;
  document.body.appendChild(raiz);
  walk(raiz, new Scope(reactive(dados)));
  return raiz;
}

/** Writes to the input through the native path, as the browser would when typing. */
function digitar(input: HTMLInputElement, texto: string, caret?: number): void {
  const nativo = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  nativo?.call(input, texto);
  try {
    const posicao = caret ?? texto.length;
    input.setSelectionRange(posicao, posicao);
  } catch {
    // input with no selection support: irrelevant to the assertion.
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Reads the raw value of the input, bypassing the getter the mask installed. */
function valorCru(input: HTMLInputElement): string {
  const nativo = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.get;
  return String(nativo?.call(input) ?? '');
}

beforeEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Presence and format rules
// ---------------------------------------------------------------------------

describe('presence rules', () => {
  it('required covers text, checkbox, radio and file', async () => {
    expect(await regra('required', '  ')).toBe(false);
    expect(await regra('required', ' a ')).toBe(true);

    const marcado = campo('<input type="checkbox">') as HTMLInputElement;
    expect(await regra('required', '', undefined, marcado)).toBe(false);
    marcado.checked = true;
    expect(await regra('required', 'on', undefined, marcado)).toBe(true);

    const radio = campo('<input type="radio">') as HTMLInputElement;
    radio.checked = true;
    expect(await regra('required', 'on', undefined, radio)).toBe(true);

    const arquivo = campo('<input type="file">') as HTMLInputElement;
    expect(await regra('required', '', undefined, arquivo)).toBe(false);
    Object.defineProperty(arquivo, 'files', {
      configurable: true,
      value: [new File(['a'], 'a.txt')],
    });
    expect(await regra('required', '1', undefined, arquivo)).toBe(true);
  });

  it('accepted takes a checked box and also the usual words', async () => {
    const caixa = campo('<input type="checkbox">') as HTMLInputElement;
    expect(await regra('accepted', '', undefined, caixa)).toBe(false);
    caixa.checked = true;
    expect(await regra('accepted', 'on', undefined, caixa)).toBe(true);

    for (const ok of ['1', 'true', 'ON', 'yes', ' sim ']) {
      expect(await regra('accepted', ok), ok).toBe(true);
    }
    expect(await regra('accepted', 'nao')).toBe(false);
  });
});

describe('format rules', () => {
  it('email', async () => {
    for (const bom of ['a@b.co', 'ana.silva+tag@exemplo.com.br']) {
      expect(await regra('email', bom), bom).toBe(true);
    }
    for (const ruim of ['a@b', 'a b@c.com', '@b.com', 'a@.com', 'a@b.', 'sem-arroba.com']) {
      expect(await regra('email', ruim), ruim).toBe(false);
    }
  });

  it('url accepts with and without a scheme and rejects a host with no dot', async () => {
    expect(await regra('url', 'https://exemplo.com')).toBe(true);
    expect(await regra('url', 'exemplo.com/x')).toBe(true);
    expect(await regra('url', 'ftp://arquivos.exemplo.com')).toBe(true);
    expect(await regra('url', '')).toBe(false);
    expect(await regra('url', 'localhost')).toBe(false);
    expect(await regra('url', 'exemplo.com.')).toBe(false);
    // An empty host makes the URL constructor throw, and the catch answers false.
    expect(await regra('url', 'https://')).toBe(false);
  });

  it('number understands the Brazilian separator and rejects empty', async () => {
    expect(await regra('number', '1.234,56')).toBe(true);
    expect(await regra('number', '-10')).toBe(true);
    expect(await regra('number', '   ')).toBe(false);
    expect(await regra('number', 'abc')).toBe(false);
  });

  it('integer and decimal, with a limit on the decimal places', async () => {
    expect(await regra('integer', ' -42 ')).toBe(true);
    expect(await regra('integer', '4.2')).toBe(false);

    expect(await regra('decimal', '4,25')).toBe(true);
    expect(await regra('decimal', '4.25', '2')).toBe(true);
    expect(await regra('decimal', '4.257', '2')).toBe(false);
    // With no parameter, or one that is not a number, any decimal will do.
    expect(await regra('decimal', '4.257')).toBe(true);
    expect(await regra('decimal', '4.257', 'x')).toBe(true);
    // A whole number has no fraction, so it passes any limit.
    expect(await regra('decimal', '4', '1')).toBe(true);
    expect(await regra('decimal', 'abc')).toBe(false);
  });

  it('alpha and alphanumeric ignore spaces', async () => {
    expect(await regra('alpha', 'Ana Maria')).toBe(true);
    expect(await regra('alpha', 'Ana 1')).toBe(false);
    expect(await regra('alphanumeric', 'Ana 123')).toBe(true);
    expect(await regra('alphanumeric', 'Ana-123')).toBe(false);
  });

  it('regex uses the attribute flags and does not break on an invalid pattern', async () => {
    const semFlag = campo('<input>');
    expect(await regra('regex', 'ABC', '^abc$', semFlag)).toBe(false);

    const comFlag = campo('<input v-regex-flags="i">');
    expect(await regra('regex', 'ABC', '^abc$', comFlag)).toBe(true);

    // With no parameter the rule has nothing to check.
    expect(await regra('regex', 'x')).toBe(true);

    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(await regra('regex', 'x', '([')).toBe(true);
    expect(aviso).toHaveBeenCalled();
    aviso.mockRestore();
  });
});

describe('length and range rules', () => {
  it('minlength and maxlength, including with no parameter', async () => {
    expect(await regra('minlength', 'abc', '3')).toBe(true);
    expect(await regra('minlength', 'ab', '3')).toBe(false);
    expect(await regra('minlength', '')).toBe(true);
    expect(await regra('maxlength', 'abc', '3')).toBe(true);
    expect(await regra('maxlength', 'abcd', '3')).toBe(false);
    expect(await regra('maxlength', 'qualquer coisa')).toBe(true);
  });

  it('numeric min and max', async () => {
    expect(await regra('min', '10', '5')).toBe(true);
    expect(await regra('min', '4', '5')).toBe(false);
    expect(await regra('min', '4')).toBe(true);
    expect(await regra('max', '4', '5')).toBe(true);
    expect(await regra('max', '9', '5')).toBe(false);
    expect(await regra('max', '9')).toBe(true);
  });

  it('min and max on a date field compare dates', async () => {
    const data = campo('<input type="date">');
    expect(await regra('min', '2024-06-01', '01/01/2024', data)).toBe(true);
    expect(await regra('min', '2023-06-01', '01/01/2024', data)).toBe(false);
    expect(await regra('max', '2023-06-01', '01/01/2024', data)).toBe(true);
    expect(await regra('max', '2024-06-01', '01/01/2024', data)).toBe(false);
    // An unreadable date does not fail: the one that complains is the `date` rule.
    expect(await regra('min', 'nada disso', '01/01/2024', data)).toBe(true);
  });

  it('between requires both bounds', async () => {
    expect(await regra('between', '5', '1,10')).toBe(true);
    expect(await regra('between', '11', '1,10')).toBe(false);
    expect(await regra('between', '0', '1,10')).toBe(false);
    expect(await regra('between', 'abc', '1,10')).toBe(false);
    expect(await regra('between', '5')).toBe(false);
  });
});

describe('rules that compare against another field', () => {
  function par(): { a: HTMLInputElement; b: HTMLInputElement } {
    const form = formulario(
      '<input name="senha" value="segredo"><input name="confirma" value="segredo">'
    );
    return {
      a: form.querySelector('[name="senha"]') as HTMLInputElement,
      b: form.querySelector('[name="confirma"]') as HTMLInputElement,
    };
  }

  it('match, same and different by the field name', async () => {
    const { b } = par();
    expect(await regra('match', 'segredo', 'senha', b)).toBe(true);
    expect(await regra('match', 'outro', 'senha', b)).toBe(false);
    expect(await regra('same', 'segredo', 'senha', b)).toBe(true);
    expect(await regra('different', 'segredo', 'senha', b)).toBe(false);
    expect(await regra('different', 'outro', 'senha', b)).toBe(true);
  });

  it('with no parameter or no target field the rules do not fail', async () => {
    const { b } = par();
    expect(await regra('match', 'x', undefined, b)).toBe(true);
    expect(await regra('same', 'x', undefined, b)).toBe(true);
    expect(await regra('different', 'x', undefined, b)).toBe(true);
    expect(await regra('match', 'x', 'nao-existe', b)).toBe(true);
    expect(await regra('same', 'x', 'nao-existe', b)).toBe(true);
    expect(await regra('different', 'x', 'nao-existe', b)).toBe(true);
  });

  it('the target field can also come by selector or by id', async () => {
    const form = formulario('<input id="origem" value="abc"><input name="copia">');
    const copia = form.querySelector('[name="copia"]') as HTMLInputElement;
    expect(await regra('match', 'abc', '#origem', copia)).toBe(true);
    expect(await regra('match', 'abc', 'origem', copia)).toBe(true);
    // A selector that finds nothing returns null and the rule lets it through.
    expect(await regra('match', 'abc', '#fantasma', copia)).toBe(true);
  });
});

describe('list rules', () => {
  it('in and notin compare against the comma separated list', async () => {
    expect(await regra('in', ' azul ', 'azul,verde')).toBe(true);
    expect(await regra('in', 'roxo', 'azul,verde')).toBe(false);
    expect(await regra('notin', 'roxo', 'azul,verde')).toBe(true);
    expect(await regra('notin', 'azul', 'azul,verde')).toBe(false);
    expect(await regra('in', 'x')).toBe(false);
    expect(await regra('notin', 'x')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

describe('dates', () => {
  it('parseDateValue accepts dd/mm/yyyy, ISO and whatever the engine can read', () => {
    expect(parseDateValue('  ')).toBeNull();
    expect(parseDateValue('15/03/2024')?.getDate()).toBe(15);
    expect(parseDateValue('2024-03-15')?.getMonth()).toBe(2);
    expect(parseDateValue('March 15, 2024')?.getFullYear()).toBe(2024);
    expect(parseDateValue('nao e data')).toBeNull();
    // A day that does not exist in the month has to fail, not roll into the next month.
    expect(parseDateValue('31/02/2024')).toBeNull();
    expect(parseDateValue('2024-02-31')).toBeNull();
    expect(parseDateValue('32/01/2024')).toBeNull();
  });

  it('the date rule uses the same parser', async () => {
    expect(await regra('date', '15/03/2024')).toBe(true);
    expect(await regra('date', '31/02/2024')).toBe(false);
  });

  it('after and before accept a fixed date, today and another field', async () => {
    expect(await regra('after', '15/03/2024', '01/01/2024')).toBe(true);
    expect(await regra('after', '15/03/2023', '01/01/2024')).toBe(false);
    expect(await regra('before', '15/03/2023', '01/01/2024')).toBe(true);
    expect(await regra('before', '15/03/2024', '01/01/2024')).toBe(false);

    // With no bound or no readable value the rule lets it through.
    expect(await regra('after', '15/03/2024')).toBe(true);
    expect(await regra('before', 'nada', '01/01/2024')).toBe(true);

    for (const hoje of ['hoje', 'today', 'now', 'agora']) {
      expect(await regra('before', '01/01/2000', hoje), hoje).toBe(true);
    }

    const form = formulario('<input name="inicio" value="01/01/2024"><input name="fim">');
    const fim = form.querySelector('[name="fim"]') as HTMLInputElement;
    expect(await regra('after', '15/03/2024', 'inicio', fim)).toBe(true);
    expect(await regra('after', '15/03/2023', 'inicio', fim)).toBe(false);
    // An empty target field produces no bound.
    const vazio = formulario('<input name="inicio" value=""><input name="fim">');
    const fim2 = vazio.querySelector('[name="fim"]') as HTMLInputElement;
    expect(await regra('after', '15/03/2023', 'inicio', fim2)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Brazilian documents
// ---------------------------------------------------------------------------

describe('Brazilian documents', () => {
  it('CPF checks the verification digits', () => {
    expect(isValidCPF('529.982.247-25')).toBe(true);
    expect(isValidCPF('52998224725')).toBe(true);
    expect(isValidCPF('529.982.247-24')).toBe(false);
    expect(isValidCPF('529.982.247-15')).toBe(false);
    expect(isValidCPF('111.111.111-11')).toBe(false);
    expect(isValidCPF('123')).toBe(false);
    // Cases where the remainder of the division lands on 10 and the digit has to become zero.
    expect(isValidCPF('11144477735')).toBe(true);
    expect(isValidCPF('40011122233')).toBe(false);
  });

  it('CNPJ checks the verification digits', () => {
    expect(isValidCNPJ('11.222.333/0001-81')).toBe(true);
    expect(isValidCNPJ('11222333000181')).toBe(true);
    expect(isValidCNPJ('11.222.333/0001-82')).toBe(false);
    expect(isValidCNPJ('11.222.333/0001-91')).toBe(false);
    expect(isValidCNPJ('11111111111111')).toBe(false);
    expect(isValidCNPJ('112223330001')).toBe(false);
  });

  it('credit card by the Luhn algorithm', () => {
    expect(isValidLuhn('4539 1488 0343 6467')).toBe(true);
    expect(isValidLuhn('4539148803436468')).toBe(false);
    expect(isValidLuhn('411111111111')).toBe(false);
    expect(isValidLuhn('4111111111111111111111')).toBe(false);
  });

  it('a Brazilian phone number requires a valid area code', () => {
    expect(isValidPhoneBR('(11) 98765-4321')).toBe(true);
    expect(isValidPhoneBR('(11) 3456-7890')).toBe(true);
    expect(isValidPhoneBR('(10) 98765-4321')).toBe(false);
    expect(isValidPhoneBR('(11) 88765-4321')).toBe(false);
    expect(isValidPhoneBR('(11) 1456-7890')).toBe(false);
    expect(isValidPhoneBR('123456')).toBe(false);
  });

  it('the rules use those calculations, and cep counts the digits', async () => {
    expect(await regra('cpf', '529.982.247-25')).toBe(true);
    expect(await regra('cnpj', '11.222.333/0001-81')).toBe(true);
    expect(await regra('creditcard', '4539 1488 0343 6467')).toBe(true);
    expect(await regra('phone', '(11) 98765-4321')).toBe(true);
    expect(await regra('cep', '01310-100')).toBe(true);
    expect(await regra('cep', '0131010')).toBe(false);
  });
});

describe('strong password', () => {
  it('returns the message carrying the minimum when it fails', async () => {
    expect(await regra('strongpassword', 'Abcdef1!')).toBe(true);
    expect(await regra('strongpassword', 'Abcdef1!ghi', '10')).toBe(true);

    // The message carries the minimum it enforced, so the reader is told what
    // to do rather than only that they failed. The default messages moved to
    // English in 0.5.1; the number is what this asserts, not the wording.
    const weak = await regra('strongpassword', 'abc');
    expect(weak).toContain('8 characters');

    const short = await regra('strongpassword', 'Ab1!', '12');
    expect(short).toContain('12 characters');

    // An invalid parameter falls back to the default minimum of eight.
    expect(await regra('strongpassword', 'Abc1!', 'x')).toContain('8 characters');
  });
});

// ---------------------------------------------------------------------------
// Asynchronous rule
// ---------------------------------------------------------------------------

describe('asynchronous unique rule', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => vi.restoreAllMocks());

  function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }

  it('with no URL or no value it queries nothing', async () => {
    expect(await regra('unique', 'ana')).toBe(true);
    expect(await regra('unique', '  ', '/api/checa')).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('the URL can also come from the attribute, with value and field in the query', async () => {
    fetchMock.mockResolvedValue(json({ available: true }));
    const el = campo('<input name="apelido" v-unique-url="/api/apelido">');
    expect(await regra('unique', 'ana', undefined, el)).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/apelido?value=ana&field=apelido');
  });

  it('available decides the result', async () => {
    fetchMock.mockResolvedValueOnce(json({ available: true }));
    expect(await regra('unique', 'ana', '/api/x')).toBe(true);

    fetchMock.mockResolvedValueOnce(json({ available: false }));
    expect(await regra('unique', 'ana', '/api/x')).toBe(messages.unique);
  });

  it('a body with no available is treated as an existing record', async () => {
    fetchMock.mockResolvedValueOnce(json({ id: 7 }));
    expect(await regra('unique', 'ana', '/api/x')).toBe(messages.unique);

    fetchMock.mockResolvedValueOnce(json(null));
    expect(await regra('unique', 'ana', '/api/x')).toBe(true);
  });

  it('404 lets it through, other 4xx fail and 5xx does not block the submission', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 404));
    expect(await regra('unique', 'ana', '/api/x')).toBe(true);

    fetchMock.mockResolvedValueOnce(json({}, 422));
    expect(await regra('unique', 'ana', '/api/x')).toBe(messages.unique);

    fetchMock.mockResolvedValueOnce(json({}, 500));
    expect(await regra('unique', 'ana', '/api/x')).toBe(true);
  });

  it('a network failure never stops the user from submitting', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));
    expect(await regra('unique', 'ana', '/api/x')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Custom rule and message
// ---------------------------------------------------------------------------

describe('custom rule', () => {
  it('validator registers the rule, the message and the directive', async () => {
    validator('par', (value) => Number(value) % 2 === 0, 'Informe um numero par.');
    expect(rules.has('par')).toBe(true);
    expect(messages.par).toBe('Informe um numero par.');

    const el = campo('<input name="n" v-par value="3">');
    const resultado = await validateField(el);
    expect(resultado.valid).toBe(false);
    expect(resultado.rule).toBe('par');
    expect(resultado.message).toBe('Informe um numero par.');

    el.value = '4';
    expect((await validateField(el)).valid).toBe(true);
  });

  it('a rule can return its own message instead of false', async () => {
    validator('faixa', (value) => (Number(value) > 10 ? true : 'Precisa passar de dez.'));
    const el = campo('<input name="n" v-faixa value="3">');
    expect((await validateField(el)).message).toBe('Precisa passar de dez.');
  });

  it('v-error-message beats the message of the rule', async () => {
    const el = campo('<input name="e" v-email v-error-message="Confira o e-mail." value="xxx">');
    expect((await validateField(el)).message).toBe('Confira o e-mail.');
  });

  it('a rule with no message and no entry in messages falls back to invalid', async () => {
    validator('semNome', () => false);
    const el = campo('<input name="s" v-semnome value="x">');
    expect((await validateField(el)).message).toBe(messages.invalid);
  });

  it('a rule that throws does not block the submission, it only warns', async () => {
    validator('explode', () => {
      throw new Error('quebrei');
    });
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const el = campo('<input name="x" v-explode value="a">');

    expect((await validateField(el)).valid).toBe(true);
    expect(String(aviso.mock.calls[0][0])).toContain('Rule "explode" failed to execute');
    aviso.mockRestore();
  });

  it('formatMessage substitutes param, field, value, min and max', () => {
    expect(formatMessage('minimo {param}', { param: '3' })).toBe('minimo 3');
    expect(formatMessage('entre {min} e {max}', { param: '1, 10' })).toBe('entre 1 e 10');
    // With a single value, min and max both point at it.
    expect(formatMessage('entre {min} e {max}', { param: '5' })).toBe('entre 5 e 5');
    expect(formatMessage('{field}: {value}', { field: 'Nome', value: 'x' })).toBe('Nome: x');
    expect(formatMessage('{field}', {})).toBe('field');
    // An unknown key stays as it is.
    expect(formatMessage('{fantasma}', {})).toBe('{fantasma}');
  });
});

// ---------------------------------------------------------------------------
// Collecting the rules of a field
// ---------------------------------------------------------------------------

describe('collecting the rules of a field', () => {
  it('reads native and Voodoo attributes, without repeating', () => {
    const el = campo(
      '<input type="email" required minlength="3" maxlength="10" pattern="[a-z]+" v-email>'
    );
    const nomes = fieldRules(el).map((r) => r.name);
    expect(nomes).toContain('required');
    expect(nomes).toContain('email');
    expect(nomes).toContain('minlength');
    expect(nomes).toContain('maxlength');
    expect(nomes).toContain('regex');
    expect(nomes.filter((n) => n === 'email')).toHaveLength(1);
    // `required` always comes first, so a blank field shows no format error.
    expect(nomes[0]).toBe('required');
  });

  it('accepts aliases, data-v- and modifiers', () => {
    const el = campo('<input data-v-obrigatorio v-strong-password.forte="10" v-min-length="4">');
    const nomes = fieldRules(el).map((r) => r.name);
    expect(nomes).toEqual(expect.arrayContaining(['required', 'strongpassword', 'minlength']));
  });

  it('a false value turns the rule off', () => {
    const el = campo('<input required v-required="false">');
    expect(fieldRules(el).map((r) => r.name)).not.toContain('required');
  });

  it('type number and url pull in the matching rule, and native min/max come along', () => {
    expect(fieldRules(campo('<input type="url">')).map((r) => r.name)).toContain('url');
    const numero = campo('<input type="number" min="1" max="9">');
    const nomes = fieldRules(numero).map((r) => r.name);
    expect(nomes).toEqual(expect.arrayContaining(['number', 'min', 'max']));
    expect(fieldRules(campo('<input type="range">')).map((r) => r.name)).toContain('number');
  });

  it('an attribute that matches no rule at all is ignored', () => {
    expect(fieldRules(campo('<input v-model="x" v-validate>'))).toHaveLength(0);
    expect(fieldRules(campo('<input>'))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Reading the field
// ---------------------------------------------------------------------------

describe('reading the field', () => {
  it('fieldValue handles checkbox, radio, file and text', () => {
    const caixa = campo('<input type="checkbox" value="sim">') as HTMLInputElement;
    expect(fieldValue(caixa)).toBe('');
    caixa.checked = true;
    expect(fieldValue(caixa)).toBe('sim');

    const semValor = campo('<input type="checkbox">') as HTMLInputElement;
    semValor.checked = true;
    expect(fieldValue(semValor)).toBe('on');

    const arquivo = campo('<input type="file">') as HTMLInputElement;
    expect(fieldValue(arquivo)).toBe('');
    Object.defineProperty(arquivo, 'files', {
      configurable: true,
      value: [new File(['a'], 'a.txt'), new File(['b'], 'b.txt')],
    });
    expect(fieldValue(arquivo)).toBe('2');

    expect(fieldValue(campo('<textarea>oi</textarea>'))).toBe('oi');
    expect(fieldValue(campo('<select><option value="a" selected>A</option></select>'))).toBe('a');
  });

  it('fieldKey uses name, then id, then the tag', () => {
    expect(fieldKey(campo('<input name="a" id="b">'))).toBe('a');
    expect(fieldKey(campo('<input id="b">'))).toBe('b');
    expect(fieldKey(campo('<select></select>'))).toBe('field-select');
  });

  it('fieldLabel looks for v-label, label[for], a wrapping label and falls back to name', () => {
    expect(fieldLabel(campo('<input v-label="Apelido">'))).toBe('Apelido');

    const comLabel = campo('<div><label for="cpf">CPF *</label><input id="cpf"></div>');
    expect(fieldLabel(comLabel.querySelector('input') as FormField)).toBe('CPF');

    const envolto = campo('<label>Idade <input name="idade"></label>');
    expect(fieldLabel(envolto.querySelector('input') as FormField)).toBe('Idade');

    expect(fieldLabel(campo('<input aria-label="Busca">'))).toBe('Busca');
    expect(fieldLabel(campo('<input placeholder="Digite">'))).toBe('Digite');
    expect(fieldLabel(campo('<input name="email">'))).toBe('email');
    expect(fieldLabel(campo('<input>'))).toBe('field');
  });

  it('isFormField recognizes only the three form elements', () => {
    expect(isFormField(campo('<input>'))).toBe(true);
    expect(isFormField(campo('<select></select>'))).toBe(true);
    expect(isFormField(campo('<textarea></textarea>'))).toBe(true);
    expect(isFormField(campo('<div></div>'))).toBe(false);
    expect(isFormField(null)).toBe(false);
    expect(isFormField('input')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Validating a whole form
// ---------------------------------------------------------------------------

describe('form validation', () => {
  it('collectFields ignores disabled fields, buttons and fields with no rule', () => {
    const form = formulario(
      '<input name="a" v-required>' +
        '<input name="b">' +
        '<input name="c" v-required disabled>' +
        '<input type="submit" v-required>' +
        '<button type="button"></button>'
    );
    expect(collectFields(form).map((f) => f.name)).toEqual(['a']);
    expect(collectFields(form, false).map((f) => f.name)).toEqual(['a', 'b']);
  });

  it('collectFields also works outside a form', () => {
    const caixa = campo('<div><input name="a" v-required><input name="b"></div>') as unknown as
      HTMLElement;
    expect(collectFields(caixa, false).map((f) => (f as HTMLInputElement).name)).toEqual(['a', 'b']);
  });

  it('validateForm returns the errors keyed by the field name', async () => {
    const form = formulario(
      '<input name="nome" v-required>' +
        '<input name="email" v-email value="xxx">' +
        '<input name="ok" v-required value="preenchido">'
    );
    const resultado = await validateForm(form);
    expect(resultado.valid).toBe(false);
    expect(Object.keys(resultado.errors)).toEqual(['nome', 'email']);
    expect(resultado.errors.email).toBe(messages.email);

    // The HTML gets the state markers.
    expect(form.querySelector('[name="nome"]')?.classList.contains('v-invalid')).toBe(true);
    expect(form.querySelector('[name="ok"]')?.classList.contains('v-valid')).toBe(true);
    expect(form.querySelectorAll('.v-field-error')).toHaveLength(2);
  });

  it('a fully filled form passes', async () => {
    const form = formulario('<input name="nome" v-required value="Ana">');
    expect(await validateForm(form)).toEqual({ valid: true, errors: {} });
  });

  it('validate decides between field and form by the element it receives', async () => {
    const form = formulario('<input name="nome" v-required>');
    expect(await validate(form)).toMatchObject({ valid: false, errors: expect.any(Object) });
    expect(await validate(form.querySelector('input') as FormField)).toMatchObject({
      valid: false,
      rule: 'required',
    });
  });

  it('a field with no rule and a target that is not a field pass straight through', async () => {
    expect(await validateField(campo('<input>'))).toEqual({ valid: true });
    expect(await validateField(campo('<div></div>') as unknown as FormField)).toEqual({
      valid: true,
    });
    expect(await validateField(campo('<input>'), { silent: true })).toEqual({ valid: true });
  });

  it('silent mode does not touch the HTML and fires no event', async () => {
    const el = campo('<input name="e" v-email value="xxx">');
    const eventos: Event[] = [];
    el.addEventListener('voodoo:field-validated', (e) => eventos.push(e));

    const resultado = await validateField(el, { silent: true });
    expect(resultado.valid).toBe(false);
    expect(el.classList.contains('v-invalid')).toBe(false);
    expect(eventos).toHaveLength(0);
  });

  it('the voodoo:field-validated event carries the result', async () => {
    const el = campo('<input name="e" v-email value="xxx">');
    const detalhes: unknown[] = [];
    el.addEventListener('voodoo:field-validated', (e) =>
      detalhes.push((e as CustomEvent).detail)
    );

    await validateField(el);
    el.value = 'a@b.co';
    await validateField(el);

    expect(detalhes).toEqual([
      { field: 'e', valid: false, message: messages.email, rule: 'email' },
      { field: 'e', valid: true },
    ]);
  });

  it('an empty field only runs required and accepted', async () => {
    const el = campo('<input name="e" v-email>');
    // Empty without `required` does not fail on format.
    expect((await validateField(el)).valid).toBe(true);
    expect(el.classList.contains('v-valid')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Displaying the errors
// ---------------------------------------------------------------------------

describe('displaying the errors', () => {
  it('the message goes in after the field and wires up aria-describedby', async () => {
    const el = campo('<input id="e" name="e" v-email value="xxx" aria-describedby="ajuda">');
    await validateField(el);

    const span = el.nextElementSibling as HTMLElement;
    expect(span.className).toBe('v-field-error');
    expect(span.id).toBe('e-error');
    expect(span.getAttribute('role')).toBe('alert');
    expect(el.getAttribute('aria-invalid')).toBe('true');
    expect(el.getAttribute('aria-describedby')).toBe('ajuda e-error');

    // Revalidating must not duplicate the span or the id inside aria.
    await validateField(el);
    expect(el.parentElement?.querySelectorAll('.v-field-error')).toHaveLength(1);
    expect(el.getAttribute('aria-describedby')).toBe('ajuda e-error');

    el.value = 'a@b.co';
    await validateField(el);
    expect(el.parentElement?.querySelector('.v-field-error')).toBeNull();
    expect(el.getAttribute('aria-describedby')).toBe('ajuda');
    expect(el.hasAttribute('aria-invalid')).toBe(false);
  });

  it('with no other aria-describedby the attribute disappears entirely', async () => {
    const el = campo('<input name="e" v-email value="xxx">');
    await validateField(el);
    expect(el.hasAttribute('aria-describedby')).toBe(true);
    el.value = 'a@b.co';
    await validateField(el);
    expect(el.hasAttribute('aria-describedby')).toBe(false);
  });

  it('v-error-target sends the message somewhere else', async () => {
    const form = formulario(
      '<input name="e" v-email v-error-target=".erros" value="xxx"><div class="erros"></div>'
    );
    await validateField(form.querySelector('input') as FormField);
    expect(form.querySelector('.erros .v-field-error')?.textContent).toBe(messages.email);
    expect(form.querySelector('input')?.nextElementSibling?.className).not.toBe('v-field-error');
  });

  it('a v-error-target that does not exist warns and falls back to the default place', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const el = campo('<input name="e" v-email v-error-target=".nao-existe" value="xxx">');
    await validateField(el);
    expect(String(aviso.mock.calls[0][0])).toContain('error-target');
    expect(el.nextElementSibling?.className).toBe('v-field-error');
    aviso.mockRestore();
  });

  it('normalizeErrors accepts a direct map, lists and the errors envelope', () => {
    expect(normalizeErrors({ email: 'ruim' })).toEqual({ email: 'ruim' });
    expect(normalizeErrors({ email: ['ruim', 'outro'] })).toEqual({ email: 'ruim' });
    expect(normalizeErrors({ errors: { email: 'ruim' }, message: 'ops' })).toEqual({
      email: 'ruim',
    });
    expect(normalizeErrors({ message: 'ops', mensagem: 'ops' })).toEqual({});
    expect(normalizeErrors({ n: 1, lista: [1, 2] })).toEqual({});
    expect(normalizeErrors(null)).toEqual({});
    expect(normalizeErrors('texto')).toEqual({});
  });

  it('showFormErrors puts each error on its field and the rest in the summary', () => {
    const form = formulario(
      '<input name="email"><input name="user[nome]"><input id="apelido"><input name="tags[]">'
    );
    const aplicados = showFormErrors(form, {
      email: 'E-mail invalido',
      'user.nome': 'Nome invalido',
      apelido: 'Apelido invalido',
      'tags': 'Tags invalidas',
      geral: 'Falha geral',
      outra: 'Outra falha',
    });

    expect(aplicados.email).toBe('E-mail invalido');
    expect(form.querySelector('[name="email"]')?.classList.contains('v-invalid')).toBe(true);
    expect(form.querySelector('[name="user[nome]"]')?.classList.contains('v-invalid')).toBe(true);
    expect(form.querySelector('#apelido')?.classList.contains('v-invalid')).toBe(true);
    expect(form.querySelector('[name="tags[]"]')?.classList.contains('v-invalid')).toBe(true);

    const resumo = form.querySelector('.v-form-error');
    expect(resumo?.querySelectorAll('li')).toHaveLength(2);
  });

  it('a summary with a single message stays plain text and is reused', () => {
    const form = formulario('<input name="a">');
    showFormSummary(form, ['unica']);
    expect(form.querySelector('.v-form-error')?.textContent).toBe('unica');

    showFormSummary(form, ['a', 'b']);
    expect(form.querySelectorAll('.v-form-error')).toHaveLength(1);
    expect(form.querySelectorAll('.v-form-error li')).toHaveLength(2);
  });

  it('clearErrors clears messages, summary and classes', async () => {
    const form = formulario('<input name="e" v-email value="xxx"><input name="ok" value="a">');
    await validateForm(form);
    showFormSummary(form, ['geral']);
    expect(form.querySelectorAll('.v-field-error').length).toBeGreaterThan(0);

    clearErrors(form);
    expect(form.querySelectorAll('.v-field-error')).toHaveLength(0);
    expect(form.querySelector('.v-form-error')).toBeNull();
    expect(form.querySelectorAll('.v-invalid, .v-valid')).toHaveLength(0);
  });

  it('focusFirstError moves the focus to the first field with an error', async () => {
    const form = formulario('<input name="a" v-required><input name="b" v-required>');
    expect(focusFirstError(form)).toBe(false);

    await validateForm(form);
    expect(focusFirstError(form)).toBe(true);
    expect(document.activeElement).toBe(form.querySelector('[name="a"]'));
  });
});

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

describe('serializeForm', () => {
  it('builds a plain object, with trim and number conversion', () => {
    const form = formulario(
      '<input name="nome" value="  Ana  "><input type="number" name="idade" value="30">'
    );
    expect(serializeForm(form)).toEqual({ nome: 'Ana', idade: 30 });
  });

  it('trim and numbers can be turned off', () => {
    const form = formulario(
      '<input name="nome" value="  Ana  "><input type="number" name="idade" value="30">'
    );
    expect(serializeForm(form, { trim: false, numbers: false })).toEqual({
      nome: '  Ana  ',
      idade: '30',
    });
  });

  it('an empty or unreadable number stays text', () => {
    const form = formulario(
      '<input type="number" name="a" value=""><input type="range" name="b" value="5">'
    );
    expect(serializeForm(form)).toEqual({ a: '', b: 5 });
  });

  it('nested names become an object, and an empty bracket becomes a list', () => {
    const form = formulario(
      '<input name="user[endereco][rua]" value="Rua A">' +
        '<input name="user[endereco][numero]" value="10">' +
        '<input name="tags[]" value="x">' +
        '<input name="tags[]" value="y">' +
        '<input name="matriz[0][a]" value="1">'
    );
    expect(serializeForm(form)).toEqual({
      user: { endereco: { rua: 'Rua A', numero: '10' } },
      tags: ['x', 'y'],
      matriz: [{ a: '1' }],
    });
  });

  it('a lone checkbox becomes a boolean', () => {
    const form = formulario(
      '<input type="checkbox" name="aceito" checked><input type="checkbox" name="news">'
    );
    expect(serializeForm(form)).toEqual({ aceito: true, news: false });
  });

  it('several checkboxes with the same name become a list of the checked ones', () => {
    const form = formulario(
      '<input type="checkbox" name="cores" value="azul" checked>' +
        '<input type="checkbox" name="cores" value="verde">' +
        '<input type="checkbox" name="cores" value="roxo" checked>' +
        '<input type="checkbox" name="extras[]" value="a" checked>'
    );
    expect(serializeForm(form)).toEqual({ cores: ['azul', 'roxo'], extras: ['a'] });
  });

  it('a checked checkbox with no value comes in as on', () => {
    const form = formulario(
      '<input type="checkbox" name="c[]" checked><input type="checkbox" name="c[]" checked>'
    );
    expect(serializeForm(form)).toEqual({ c: ['on', 'on'] });
  });

  it('radio sends only the chosen one', () => {
    const form = formulario(
      '<input type="radio" name="plano" value="basico">' +
        '<input type="radio" name="plano" value="pro" checked>'
    );
    expect(serializeForm(form)).toEqual({ plano: 'pro' });
  });

  it('a multiple select becomes a list', () => {
    const form = formulario(
      '<select name="tags" multiple>' +
        '<option value="a" selected>A</option>' +
        '<option value="b">B</option>' +
        '<option value="c" selected>C</option>' +
        '</select>' +
        '<select name="uf"><option value="SP" selected>SP</option></select>'
    );
    expect(serializeForm(form)).toEqual({ tags: ['a', 'c'], uf: 'SP' });
  });

  it('a field with no name and a disabled field stay out, unless asked for explicitly', () => {
    const form = formulario(
      '<input value="anonimo"><input name="x" value="1" disabled><input name="y" value="2">'
    );
    expect(serializeForm(form)).toEqual({ y: '2' });
    // `collectFields` already strips the disabled ones, so the option cannot bring them back.
    expect(serializeForm(form, { includeDisabled: true })).toEqual({ y: '2' });
  });

  it('a selected file forces FormData', () => {
    const form = formulario('<input type="file" name="foto"><input name="nome" value="Ana">');
    const arquivo = form.querySelector('[name="foto"]') as HTMLInputElement;
    const conteudo = new File(['a'], 'a.txt', { type: 'text/plain' });
    Object.defineProperty(arquivo, 'files', { configurable: true, value: [conteudo] });

    const dados = serializeForm(form);
    expect(dados).toBeInstanceOf(FormData);
    expect((dados as FormData).get('nome')).toBe('Ana');
    expect((dados as FormData).get('foto')).toBe(conteudo);
  });

  it('multiple files become a list inside the FormData', () => {
    const form = formulario('<input type="file" name="fotos" multiple>');
    const arquivo = form.querySelector('input') as HTMLInputElement;
    const a = new File(['a'], 'a.txt');
    const b = new File(['b'], 'b.txt');
    Object.defineProperty(arquivo, 'files', { configurable: true, value: [a, b] });

    const dados = serializeForm(form) as FormData;
    expect(dados.getAll('fotos[]')).toEqual([a, b]);
  });

  it('an empty file field does not enter the output', () => {
    const form = formulario('<input type="file" name="foto"><input name="nome" value="Ana">');
    expect(serializeForm(form)).toEqual({ nome: 'Ana' });
  });

  it('formData: true converts booleans and lists even with no file', () => {
    const form = formulario(
      '<input name="nome" value="Ana">' +
        '<input type="checkbox" name="aceito" checked>' +
        '<input type="checkbox" name="recusa">' +
        '<select name="tags" multiple><option value="a" selected>A</option></select>'
    );
    const dados = serializeForm(form, { formData: true }) as FormData;
    expect(dados.get('nome')).toBe('Ana');
    expect(dados.get('aceito')).toBe('1');
    expect(dados.get('recusa')).toBe('0');
    expect(dados.getAll('tags[]')).toEqual(['a']);
  });
});

// ---------------------------------------------------------------------------
// Masks: formatting
// ---------------------------------------------------------------------------

describe('applyMask', () => {
  it('the named masks for the country', () => {
    expect(applyMask('12345678901', 'cpf')).toBe('123.456.789-01');
    expect(applyMask('11222333000181', 'cnpj')).toBe('11.222.333/0001-81');
    expect(applyMask('01310100', 'cep')).toBe('01310-100');
    expect(applyMask('15032024', 'date')).toBe('15/03/2024');
    expect(applyMask('1530', 'time')).toBe('15:30');
    expect(applyMask('150320241530', 'datetime')).toBe('15/03/2024 15:30');
    expect(applyMask('1234', 'cvv')).toBe('1234');
  });

  it('cpfcnpj switches pattern according to the length', () => {
    expect(applyMask('12345678901', 'cpfcnpj')).toBe('123.456.789-01');
    expect(applyMask('11222333000181', 'cpfcnpj')).toBe('11.222.333/0001-81');
  });

  it('phone switches between landline and mobile', () => {
    expect(applyMask('1134567890', 'phone')).toBe('(11) 3456-7890');
    expect(applyMask('11987654321', 'phone')).toBe('(11) 98765-4321');
    // An extra digit is cut before formatting.
    expect(applyMask('119876543219', 'phone')).toBe('(11) 98765-4321');
  });

  it('card covers Amex, 16 and 19 digits', () => {
    expect(applyMask('4539148803436467', 'card')).toBe('4539 1488 0343 6467');
    expect(applyMask('378282246310005', 'card')).toBe('3782 822463 10005');
    expect(applyMask('4539148803436467123', 'card')).toBe('4539 1488 0343 6467 123');
  });

  it('plate tells the old plate apart from the Mercosur one', () => {
    expect(applyMask('ABC1234', 'plate')).toBe('ABC-1234');
    expect(applyMask('abc1d23', 'plate')).toBe('ABC1D23');
    // A short input does not decide the format yet.
    expect(applyMask('ABC', 'plate')).toBe('ABC');
  });

  it('hex and ip', () => {
    expect(applyMask('ff8800', 'hex')).toBe('#FF8800');
    expect(applyMask('zzz', 'hex')).toBe('');
    expect(applyMask('192.168.0.1', 'ip')).toBe('192.168.0.1');
    // Each group is capped at 255 and at three digits.
    expect(applyMask('999.168.0.1', 'ip')).toBe('255.168.0.1');
    expect(applyMask('1234.5.6.7', 'ip')).toBe('123.5.6.7');
    expect(applyMask('192.', 'ip')).toBe('192.');
    expect(applyMask('1.2.3.4.5', 'ip')).toBe('1.2.3.4');
  });

  it('a literal pattern with the tokens 9, A, S and *', () => {
    expect(applyMask('1234', '99-99')).toBe('12-34');
    expect(applyMask('ab12', 'AA-99')).toBe('ab-12');
    expect(applyMask('a1b2', 'SSSS')).toBe('a1b2');
    expect(applyMask('a-b', '***')).toBe('a-b');
    // A character that does not fit the position is skipped.
    expect(applyMask('ab12cd', '99')).toBe('12');
  });

  it('a backslash escapes the next character of the pattern', () => {
    expect(applyMask('123', '\\#999')).toBe('#123');
    // An escape at the end of the pattern ends the formatting.
    expect(applyMask('123', '999\\')).toBe('123');
  });

  it('a partial input does not invent a leftover separator', () => {
    expect(applyMask('', 'cpf')).toBe('');
    expect(applyMask('123', 'cpf')).toBe('123');
    expect(applyMask('1234', 'cpf')).toBe('123.4');
    expect(applyMask('123456789', 'cpf')).toBe('123.456.789');
    expect(applyMask('1234567890', 'cpf')).toBe('123.456.789-0');
  });

  it('pasting already formatted text does not duplicate the separators', () => {
    expect(applyMask('123.456.789-01', 'cpf')).toBe('123.456.789-01');
    expect(applyMask('(11) 98765-4321', 'phone')).toBe('(11) 98765-4321');
    expect(applyMask('15/03/2024', 'date')).toBe('15/03/2024');
    expect(applyMask('R$ 1.234,56', 'currency')).toBe('R$ 1.234,56');
  });

  it('with no pattern it returns the text, and null becomes an empty string', () => {
    expect(applyMask('abc', '')).toBe('abc');
    expect(applyMask(null as unknown as string, 'cpf')).toBe('');
    expect(applyMask(undefined as unknown as string, '999')).toBe('');
  });

  it('the mask() shortcut is the same as applyMask', () => {
    expect(mask('12345678901', 'cpf')).toBe('123.456.789-01');
    expect(mask.apply('1234', '99-99')).toBe('12-34');
    expect(mask.presets).toBe(masks);
  });
});

describe('numeric masks', () => {
  it('maskCurrency groups the thousands and puts the prefix in', () => {
    expect(maskCurrency('123456')).toBe('R$ 1.234,56');
    expect(maskCurrency('5')).toBe('R$ 0,05');
    expect(maskCurrency('')).toBe('');
    expect(maskCurrency('abc')).toBe('');
    expect(maskCurrency('-123456')).toBe('-R$ 1.234,56');
    expect(maskCurrency('123456789')).toBe('R$ 1.234.567,89');
  });

  it('maskCurrency accepts a custom prefix, suffix, decimal places and separators', () => {
    expect(maskCurrency('123456', { prefix: '$ ', decimal: '.', thousands: ',' })).toBe(
      '$ 1,234.56'
    );
    expect(maskCurrency('1234', { decimals: 0 })).toBe('R$ 1.234');
    expect(maskCurrency('1234', { decimals: 3 })).toBe('R$ 1,234');
    expect(maskCurrency('1234', { prefix: '', suffix: ' EUR' })).toBe('12,34 EUR');
    // Negative or fractional decimal places are normalized.
    expect(maskCurrency('1234', { decimals: -2 })).toBe('R$ 1.234');
  });

  it('maskPercent uses the same engine with a suffix', () => {
    expect(maskPercent('1234')).toBe('12,34%');
    expect(maskPercent('1234', 0)).toBe('1.234%');
    expect(mask.percent('50')).toBe('0,50%');
    expect(mask.currency('100')).toBe('R$ 1,00');
  });
});

describe('unmask', () => {
  it('strips the common formatting', () => {
    expect(unmask('123.456.789-01')).toBe('12345678901');
    expect(unmask('(11) 98765-4321')).toBe('11987654321');
    expect(unmask('ABC-1234')).toBe('ABC1234');
    expect(unmask(null as unknown as string)).toBe('');
  });

  it('numeric masks return a number ready for Number()', () => {
    expect(unmask('R$ 1.234,56', 'currency')).toBe('1234.56');
    expect(unmask('12,34%', 'percent')).toBe('12.34');
    expect(unmask('R$ 0,05', 'currency')).toBe('0.05');
    expect(unmask('-R$ 1.234,56', 'currency')).toBe('-1234.56');
    expect(unmask('R$ ', 'currency')).toBe('');
    expect(Number(unmask('R$ 1.234,56', 'currency'))).toBe(1234.56);
  });

  it('a pattern that is not numeric falls back to the common cleanup', () => {
    expect(unmask('123.456.789-01', 'cpf')).toBe('12345678901');
    expect(unmask('  ')).toBe('');
  });
});

describe('registering a custom mask', () => {
  it('accepts a text pattern and also a function', () => {
    registerMask('  Processo  ', '9999999-99.9999.9.99.9999');
    expect(applyMask('00012345620248260100', 'processo')).toBe('0001234-56.2024.8.26.0100');

    mask.register('reverso', (valor) => valor.split('').reverse().join(''));
    expect(applyMask('abc', 'reverso')).toBe('cba');

    // Registering again under the same name replaces it.
    registerMask('reverso', '99');
    expect(applyMask('123', 'reverso')).toBe('12');
  });
});

// ---------------------------------------------------------------------------
// Mask directives
// ---------------------------------------------------------------------------

describe('directive v-mask', () => {
  it('formats what was typed and keeps the cursor after the last digit', () => {
    const raiz = montar('<input v-mask="cpf">');
    const input = raiz.querySelector('input') as HTMLInputElement;

    digitar(input, '123456');
    expect(valorCru(input)).toBe('123.456');
    expect(input.selectionStart).toBe(7);

    digitar(input, '123.4567');
    expect(valorCru(input)).toBe('123.456.7');
  });

  it('a value that already came from the server goes in formatted on mount', () => {
    const raiz = montar('<input v-mask="cpf" value="12345678901">');
    expect(valorCru(raiz.querySelector('input') as HTMLInputElement)).toBe('123.456.789-01');
  });

  it('with .unmask the read returns the clean value and the write goes through the mask', () => {
    const raiz = montar('<input v-mask.unmask="cpf">');
    const input = raiz.querySelector('input') as HTMLInputElement;

    input.value = '12345678901';
    expect(valorCru(input)).toBe('123.456.789-01');
    expect(input.value).toBe('12345678901');

    input.value = null as unknown as string;
    expect(valorCru(input)).toBe('');
  });

  it('the currency mask keeps the cursor at the end and cleans up to a number', () => {
    const raiz = montar('<input v-mask.raw="currency">');
    const input = raiz.querySelector('input') as HTMLInputElement;

    digitar(input, '123456');
    expect(valorCru(input)).toBe('R$ 1.234,56');
    expect(input.selectionStart).toBe('R$ 1.234,56'.length);
    expect(input.value).toBe('1234.56');
  });

  it('deleting on top of a separator removes the previous digit', () => {
    const raiz = montar('<input v-mask="cpf" value="123456">');
    const input = raiz.querySelector('input') as HTMLInputElement;
    expect(valorCru(input)).toBe('123.456');

    // Cursor right after the dot: Backspace has to eat the "3".
    input.setSelectionRange(4, 4);
    const evento = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true });
    input.dispatchEvent(evento);

    expect(evento.defaultPrevented).toBe(true);
    expect(valorCru(input)).toBe('124.56');
  });

  it('Backspace on a digit, with a selection or at the start follows the default', () => {
    const raiz = montar('<input v-mask="cpf" value="123456">');
    const input = raiz.querySelector('input') as HTMLInputElement;

    for (const [inicio, fim] of [
      [3, 3],
      [0, 0],
      [1, 4],
    ] as const) {
      input.setSelectionRange(inicio, fim);
      const evento = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true });
      input.dispatchEvent(evento);
      expect(evento.defaultPrevented).toBe(false);
    }

    const outraTecla = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
    input.dispatchEvent(outraTecla);
    expect(outraTecla.defaultPrevented).toBe(false);
  });

  it('the cleanup gives the native value back to the element', () => {
    const raiz = montar('<input v-mask="cpf" value="12345678901">');
    const input = raiz.querySelector('input') as HTMLInputElement;
    expect(Object.getOwnPropertyDescriptor(input, 'value')).toBeDefined();

    destroy(raiz);
    expect(Object.getOwnPropertyDescriptor(input, 'value')).toBeUndefined();
    expect(input.value).toBe('123.456.789-01');
  });

  it('warns on the wrong element, on an incompatible type and with no pattern', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    montar('<div v-mask="cpf"></div>');
    montar('<input type="number" v-mask="cpf">');
    montar('<input v-mask="  ">');

    const textos = aviso.mock.calls.map((c) => String(c[0]));
    expect(textos.some((t) => t.includes('only works on input or textarea'))).toBe(true);
    expect(textos.some((t) => t.includes('type="number"'))).toBe(true);
    expect(textos.some((t) => t.includes('needs a pattern'))).toBe(true);
    aviso.mockRestore();
  });

  it('textarea takes a mask too', () => {
    const raiz = montar('<textarea v-mask="99-99">1234</textarea>');
    const area = raiz.querySelector('textarea') as HTMLTextAreaElement;
    const nativo = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value'
    )?.get;
    expect(String(nativo?.call(area))).toBe('12-34');
  });
});

describe('directive v-mask-currency', () => {
  /**
   * Regression: the prefix went through `trim`, so the trailing space in the
   * example from the documentation itself (`v-mask-currency="R$ "`) was thrown
   * away and the field showed `R$1.234,56`. The same prefix written in
   * `v-mask-prefix` never lost the space, which left the two forms with
   * different results.
   */
  it('uses the expression prefix, trailing space and all, and the attribute decimals', () => {
    const raiz = montar('<input v-mask-currency="US$ " v-mask-decimals="3">');
    const input = raiz.querySelector('input') as HTMLInputElement;

    digitar(input, '1234567');
    expect(valorCru(input)).toBe('US$ 1.234,567');
  });

  it('an expression made only of spaces falls back to the default prefix', () => {
    const raiz = montar('<input v-mask-currency="   " v-mask-decimals="">');
    digitar(raiz.querySelector('input') as HTMLInputElement, '1234');
    expect(valorCru(raiz.querySelector('input') as HTMLInputElement)).toBe('R$ 12,34');
  });

  it('the .plain modifier drops the prefix and .dot swaps the separators', () => {
    const semPrefixo = montar('<input v-mask-currency.plain>');
    digitar(semPrefixo.querySelector('input') as HTMLInputElement, '123456');
    expect(valorCru(semPrefixo.querySelector('input') as HTMLInputElement)).toBe('1.234,56');

    const ponto = montar('<input v-mask-currency.dot.plain>');
    digitar(ponto.querySelector('input') as HTMLInputElement, '123456');
    expect(valorCru(ponto.querySelector('input') as HTMLInputElement)).toBe('1,234.56');
  });

  it('the suffix goes at the end and the cursor stops before it', () => {
    const raiz = montar('<input v-mask-currency.plain v-mask-suffix=" %">');
    const input = raiz.querySelector('input') as HTMLInputElement;

    digitar(input, '1234');
    expect(valorCru(input)).toBe('12,34 %');
    expect(input.selectionStart).toBe('12,34'.length);
  });

  it('the prefix can also come from v-mask-prefix', () => {
    const raiz = montar('<input v-mask-currency v-mask-prefix="EUR ">');
    digitar(raiz.querySelector('input') as HTMLInputElement, '1234');
    expect(valorCru(raiz.querySelector('input') as HTMLInputElement)).toBe('EUR 12,34');

    const zero = montar('<input v-mask-currency.plain v-mask-decimals="0">');
    digitar(zero.querySelector('input') as HTMLInputElement, '1234');
    expect(valorCru(zero.querySelector('input') as HTMLInputElement)).toBe('1.234');
  });

  it('with .unmask the read returns the number, with and without decimal places', () => {
    const comCasas = montar('<input v-mask-currency.unmask>');
    const a = comCasas.querySelector('input') as HTMLInputElement;
    digitar(a, '123456');
    expect(a.value).toBe('1234.56');

    const vazio = montar('<input v-mask-currency.unmask>');
    expect((vazio.querySelector('input') as HTMLInputElement).value).toBe('');

    const semCasas = montar('<input v-mask-currency.raw v-mask-decimals="0">');
    const b = semCasas.querySelector('input') as HTMLInputElement;
    digitar(b, '1234');
    expect(b.value).toBe('1234');
  });

  it('invalid decimal places fall back to two', () => {
    const raiz = montar('<input v-mask-currency.plain v-mask-decimals="abc">');
    digitar(raiz.querySelector('input') as HTMLInputElement, '1234');
    expect(valorCru(raiz.querySelector('input') as HTMLInputElement)).toBe('12,34');
  });

  it('warns when the target will not do', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    montar('<div v-mask-currency></div>');
    expect(String(aviso.mock.calls[0][0])).toContain('only works on input or textarea');
    aviso.mockRestore();
  });
});
