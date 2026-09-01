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
 * Cobertura do modulo `forms`. Ele nao tinha nenhum teste dedicado, apesar de
 * somar quase 1.800 linhas entre validacao e mascaras.
 *
 * As regras sao exercitadas direto pelo registro (`rules`) sempre que o alvo e
 * o ramo interno da regra, e por `validateField` quando o que importa e a
 * mensagem, a classe no HTML ou o evento disparado.
 */

// ---------------------------------------------------------------------------
// Ajudantes
// ---------------------------------------------------------------------------

/** Cria um campo solto no documento a partir de HTML. */
function campo(html: string): FormField {
  const caixa = document.createElement('div');
  caixa.innerHTML = html;
  document.body.appendChild(caixa);
  return caixa.firstElementChild as FormField;
}

/** Cria um formulario e devolve o elemento `form`. */
function formulario(html: string): HTMLFormElement {
  const caixa = document.createElement('div');
  caixa.innerHTML = `<form>${html}</form>`;
  document.body.appendChild(caixa);
  return caixa.firstElementChild as HTMLFormElement;
}

/** Roda uma regra do registro sem passar pela apresentacao dos erros. */
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

/** Monta HTML com o walker, para exercitar as directives. */
function montar(html: string, dados: Record<string, unknown> = {}): HTMLElement {
  const raiz = document.createElement('div');
  raiz.innerHTML = html;
  document.body.appendChild(raiz);
  walk(raiz, new Scope(reactive(dados)));
  return raiz;
}

/** Escreve no input pelo caminho nativo, como o navegador faria ao digitar. */
function digitar(input: HTMLInputElement, texto: string, caret?: number): void {
  const nativo = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  nativo?.call(input, texto);
  try {
    const posicao = caret ?? texto.length;
    input.setSelectionRange(posicao, posicao);
  } catch {
    // input sem suporte a selecao: irrelevante para a asercao.
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Le o valor cru do input, sem passar pelo getter que a mascara instalou. */
function valorCru(input: HTMLInputElement): string {
  const nativo = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.get;
  return String(nativo?.call(input) ?? '');
}

beforeEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Regras de presenca e formato
// ---------------------------------------------------------------------------

describe('regras de presenca', () => {
  it('required cobre texto, checkbox, radio e arquivo', async () => {
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

  it('accepted aceita marcacao e tambem as palavras usuais', async () => {
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

describe('regras de formato', () => {
  it('email', async () => {
    for (const bom of ['a@b.co', 'ana.silva+tag@exemplo.com.br']) {
      expect(await regra('email', bom), bom).toBe(true);
    }
    for (const ruim of ['a@b', 'a b@c.com', '@b.com', 'a@.com', 'a@b.', 'sem-arroba.com']) {
      expect(await regra('email', ruim), ruim).toBe(false);
    }
  });

  it('url aceita com e sem esquema e recusa host sem ponto', async () => {
    expect(await regra('url', 'https://exemplo.com')).toBe(true);
    expect(await regra('url', 'exemplo.com/x')).toBe(true);
    expect(await regra('url', 'ftp://arquivos.exemplo.com')).toBe(true);
    expect(await regra('url', '')).toBe(false);
    expect(await regra('url', 'localhost')).toBe(false);
    expect(await regra('url', 'exemplo.com.')).toBe(false);
    // Host vazio faz o construtor de URL lancar, e o catch responde false.
    expect(await regra('url', 'https://')).toBe(false);
  });

  it('number entende separador brasileiro e recusa vazio', async () => {
    expect(await regra('number', '1.234,56')).toBe(true);
    expect(await regra('number', '-10')).toBe(true);
    expect(await regra('number', '   ')).toBe(false);
    expect(await regra('number', 'abc')).toBe(false);
  });

  it('integer e decimal, com limite de casas', async () => {
    expect(await regra('integer', ' -42 ')).toBe(true);
    expect(await regra('integer', '4.2')).toBe(false);

    expect(await regra('decimal', '4,25')).toBe(true);
    expect(await regra('decimal', '4.25', '2')).toBe(true);
    expect(await regra('decimal', '4.257', '2')).toBe(false);
    // Sem parametro, ou com parametro que nao e numero, qualquer decimal serve.
    expect(await regra('decimal', '4.257')).toBe(true);
    expect(await regra('decimal', '4.257', 'x')).toBe(true);
    // Numero inteiro nao tem fracao, entao passa por qualquer limite.
    expect(await regra('decimal', '4', '1')).toBe(true);
    expect(await regra('decimal', 'abc')).toBe(false);
  });

  it('alpha e alphanumeric ignoram espacos', async () => {
    expect(await regra('alpha', 'Ana Maria')).toBe(true);
    expect(await regra('alpha', 'Ana 1')).toBe(false);
    expect(await regra('alphanumeric', 'Ana 123')).toBe(true);
    expect(await regra('alphanumeric', 'Ana-123')).toBe(false);
  });

  it('regex usa as flags do atributo e nao trava com padrao invalido', async () => {
    const semFlag = campo('<input>');
    expect(await regra('regex', 'ABC', '^abc$', semFlag)).toBe(false);

    const comFlag = campo('<input v-regex-flags="i">');
    expect(await regra('regex', 'ABC', '^abc$', comFlag)).toBe(true);

    // Sem parametro a regra nao tem o que checar.
    expect(await regra('regex', 'x')).toBe(true);

    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(await regra('regex', 'x', '([')).toBe(true);
    expect(aviso).toHaveBeenCalled();
    aviso.mockRestore();
  });
});

describe('regras de tamanho e faixa', () => {
  it('minlength e maxlength, inclusive sem parametro', async () => {
    expect(await regra('minlength', 'abc', '3')).toBe(true);
    expect(await regra('minlength', 'ab', '3')).toBe(false);
    expect(await regra('minlength', '')).toBe(true);
    expect(await regra('maxlength', 'abc', '3')).toBe(true);
    expect(await regra('maxlength', 'abcd', '3')).toBe(false);
    expect(await regra('maxlength', 'qualquer coisa')).toBe(true);
  });

  it('min e max numericos', async () => {
    expect(await regra('min', '10', '5')).toBe(true);
    expect(await regra('min', '4', '5')).toBe(false);
    expect(await regra('min', '4')).toBe(true);
    expect(await regra('max', '4', '5')).toBe(true);
    expect(await regra('max', '9', '5')).toBe(false);
    expect(await regra('max', '9')).toBe(true);
  });

  it('min e max em campo de data comparam datas', async () => {
    const data = campo('<input type="date">');
    expect(await regra('min', '2024-06-01', '01/01/2024', data)).toBe(true);
    expect(await regra('min', '2023-06-01', '01/01/2024', data)).toBe(false);
    expect(await regra('max', '2023-06-01', '01/01/2024', data)).toBe(true);
    expect(await regra('max', '2024-06-01', '01/01/2024', data)).toBe(false);
    // Data ilegivel nao reprova: quem reclama disso e a regra `date`.
    expect(await regra('min', 'nada disso', '01/01/2024', data)).toBe(true);
  });

  it('between exige os dois limites', async () => {
    expect(await regra('between', '5', '1,10')).toBe(true);
    expect(await regra('between', '11', '1,10')).toBe(false);
    expect(await regra('between', '0', '1,10')).toBe(false);
    expect(await regra('between', 'abc', '1,10')).toBe(false);
    expect(await regra('between', '5')).toBe(false);
  });
});

describe('regras que comparam com outro campo', () => {
  function par(): { a: HTMLInputElement; b: HTMLInputElement } {
    const form = formulario(
      '<input name="senha" value="segredo"><input name="confirma" value="segredo">'
    );
    return {
      a: form.querySelector('[name="senha"]') as HTMLInputElement,
      b: form.querySelector('[name="confirma"]') as HTMLInputElement,
    };
  }

  it('match, same e different pelo nome do campo', async () => {
    const { b } = par();
    expect(await regra('match', 'segredo', 'senha', b)).toBe(true);
    expect(await regra('match', 'outro', 'senha', b)).toBe(false);
    expect(await regra('same', 'segredo', 'senha', b)).toBe(true);
    expect(await regra('different', 'segredo', 'senha', b)).toBe(false);
    expect(await regra('different', 'outro', 'senha', b)).toBe(true);
  });

  it('sem parametro ou sem campo alvo as regras nao reprovam', async () => {
    const { b } = par();
    expect(await regra('match', 'x', undefined, b)).toBe(true);
    expect(await regra('same', 'x', undefined, b)).toBe(true);
    expect(await regra('different', 'x', undefined, b)).toBe(true);
    expect(await regra('match', 'x', 'nao-existe', b)).toBe(true);
    expect(await regra('same', 'x', 'nao-existe', b)).toBe(true);
    expect(await regra('different', 'x', 'nao-existe', b)).toBe(true);
  });

  it('o campo alvo tambem pode vir por seletor ou por id', async () => {
    const form = formulario('<input id="origem" value="abc"><input name="copia">');
    const copia = form.querySelector('[name="copia"]') as HTMLInputElement;
    expect(await regra('match', 'abc', '#origem', copia)).toBe(true);
    expect(await regra('match', 'abc', 'origem', copia)).toBe(true);
    // Seletor que nao acha nada devolve null e a regra libera.
    expect(await regra('match', 'abc', '#fantasma', copia)).toBe(true);
  });
});

describe('regras de lista', () => {
  it('in e notin comparam com a lista separada por virgula', async () => {
    expect(await regra('in', ' azul ', 'azul,verde')).toBe(true);
    expect(await regra('in', 'roxo', 'azul,verde')).toBe(false);
    expect(await regra('notin', 'roxo', 'azul,verde')).toBe(true);
    expect(await regra('notin', 'azul', 'azul,verde')).toBe(false);
    expect(await regra('in', 'x')).toBe(false);
    expect(await regra('notin', 'x')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Datas
// ---------------------------------------------------------------------------

describe('datas', () => {
  it('parseDateValue aceita dd/mm/aaaa, ISO e o que o motor souber ler', () => {
    expect(parseDateValue('  ')).toBeNull();
    expect(parseDateValue('15/03/2024')?.getDate()).toBe(15);
    expect(parseDateValue('2024-03-15')?.getMonth()).toBe(2);
    expect(parseDateValue('March 15, 2024')?.getFullYear()).toBe(2024);
    expect(parseDateValue('nao e data')).toBeNull();
    // Dia que nao existe no mes precisa reprovar, e nao virar o mes seguinte.
    expect(parseDateValue('31/02/2024')).toBeNull();
    expect(parseDateValue('2024-02-31')).toBeNull();
    expect(parseDateValue('32/01/2024')).toBeNull();
  });

  it('a regra date usa o mesmo analisador', async () => {
    expect(await regra('date', '15/03/2024')).toBe(true);
    expect(await regra('date', '31/02/2024')).toBe(false);
  });

  it('after e before aceitam data fixa, hoje e outro campo', async () => {
    expect(await regra('after', '15/03/2024', '01/01/2024')).toBe(true);
    expect(await regra('after', '15/03/2023', '01/01/2024')).toBe(false);
    expect(await regra('before', '15/03/2023', '01/01/2024')).toBe(true);
    expect(await regra('before', '15/03/2024', '01/01/2024')).toBe(false);

    // Sem limite ou sem valor legivel a regra libera.
    expect(await regra('after', '15/03/2024')).toBe(true);
    expect(await regra('before', 'nada', '01/01/2024')).toBe(true);

    for (const hoje of ['hoje', 'today', 'now', 'agora']) {
      expect(await regra('before', '01/01/2000', hoje), hoje).toBe(true);
    }

    const form = formulario('<input name="inicio" value="01/01/2024"><input name="fim">');
    const fim = form.querySelector('[name="fim"]') as HTMLInputElement;
    expect(await regra('after', '15/03/2024', 'inicio', fim)).toBe(true);
    expect(await regra('after', '15/03/2023', 'inicio', fim)).toBe(false);
    // Campo alvo vazio nao produz limite.
    const vazio = formulario('<input name="inicio" value=""><input name="fim">');
    const fim2 = vazio.querySelector('[name="fim"]') as HTMLInputElement;
    expect(await regra('after', '15/03/2023', 'inicio', fim2)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Documentos brasileiros
// ---------------------------------------------------------------------------

describe('documentos brasileiros', () => {
  it('CPF confere os digitos verificadores', () => {
    expect(isValidCPF('529.982.247-25')).toBe(true);
    expect(isValidCPF('52998224725')).toBe(true);
    expect(isValidCPF('529.982.247-24')).toBe(false);
    expect(isValidCPF('529.982.247-15')).toBe(false);
    expect(isValidCPF('111.111.111-11')).toBe(false);
    expect(isValidCPF('123')).toBe(false);
    // Casos em que o resto da divisao cai em 10 e o digito precisa virar zero.
    expect(isValidCPF('11144477735')).toBe(true);
    expect(isValidCPF('40011122233')).toBe(false);
  });

  it('CNPJ confere os digitos verificadores', () => {
    expect(isValidCNPJ('11.222.333/0001-81')).toBe(true);
    expect(isValidCNPJ('11222333000181')).toBe(true);
    expect(isValidCNPJ('11.222.333/0001-82')).toBe(false);
    expect(isValidCNPJ('11.222.333/0001-91')).toBe(false);
    expect(isValidCNPJ('11111111111111')).toBe(false);
    expect(isValidCNPJ('112223330001')).toBe(false);
  });

  it('cartao de credito pelo algoritmo de Luhn', () => {
    expect(isValidLuhn('4539 1488 0343 6467')).toBe(true);
    expect(isValidLuhn('4539148803436468')).toBe(false);
    expect(isValidLuhn('411111111111')).toBe(false);
    expect(isValidLuhn('4111111111111111111111')).toBe(false);
  });

  it('telefone brasileiro exige DDD valido', () => {
    expect(isValidPhoneBR('(11) 98765-4321')).toBe(true);
    expect(isValidPhoneBR('(11) 3456-7890')).toBe(true);
    expect(isValidPhoneBR('(10) 98765-4321')).toBe(false);
    expect(isValidPhoneBR('(11) 88765-4321')).toBe(false);
    expect(isValidPhoneBR('(11) 1456-7890')).toBe(false);
    expect(isValidPhoneBR('123456')).toBe(false);
  });

  it('as regras usam esses calculos, e cep conta os digitos', async () => {
    expect(await regra('cpf', '529.982.247-25')).toBe(true);
    expect(await regra('cnpj', '11.222.333/0001-81')).toBe(true);
    expect(await regra('creditcard', '4539 1488 0343 6467')).toBe(true);
    expect(await regra('phone', '(11) 98765-4321')).toBe(true);
    expect(await regra('cep', '01310-100')).toBe(true);
    expect(await regra('cep', '0131010')).toBe(false);
  });
});

describe('senha forte', () => {
  it('devolve a mensagem com o minimo quando reprova', async () => {
    expect(await regra('strongpassword', 'Abcdef1!')).toBe(true);
    expect(await regra('strongpassword', 'Abcdef1!ghi', '10')).toBe(true);

    const fraca = await regra('strongpassword', 'abc');
    expect(fraca).toContain('8 caracteres');

    const curta = await regra('strongpassword', 'Ab1!', '12');
    expect(curta).toContain('12 caracteres');

    // Parametro invalido volta para o minimo padrao de oito.
    expect(await regra('strongpassword', 'Abc1!', 'x')).toContain('8 caracteres');
  });
});

// ---------------------------------------------------------------------------
// Regra assincrona
// ---------------------------------------------------------------------------

describe('regra assincrona unique', () => {
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

  it('sem URL ou sem valor nao consulta nada', async () => {
    expect(await regra('unique', 'ana')).toBe(true);
    expect(await regra('unique', '  ', '/api/checa')).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a URL tambem pode vir do atributo, com o valor e o campo na query', async () => {
    fetchMock.mockResolvedValue(json({ available: true }));
    const el = campo('<input name="apelido" v-unique-url="/api/apelido">');
    expect(await regra('unique', 'ana', undefined, el)).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/apelido?value=ana&field=apelido');
  });

  it('available decide o resultado', async () => {
    fetchMock.mockResolvedValueOnce(json({ available: true }));
    expect(await regra('unique', 'ana', '/api/x')).toBe(true);

    fetchMock.mockResolvedValueOnce(json({ available: false }));
    expect(await regra('unique', 'ana', '/api/x')).toBe(messages.unique);
  });

  it('corpo sem available e tratado como registro existente', async () => {
    fetchMock.mockResolvedValueOnce(json({ id: 7 }));
    expect(await regra('unique', 'ana', '/api/x')).toBe(messages.unique);

    fetchMock.mockResolvedValueOnce(json(null));
    expect(await regra('unique', 'ana', '/api/x')).toBe(true);
  });

  it('404 libera, outros 4xx reprovam e 5xx nao trava o envio', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 404));
    expect(await regra('unique', 'ana', '/api/x')).toBe(true);

    fetchMock.mockResolvedValueOnce(json({}, 422));
    expect(await regra('unique', 'ana', '/api/x')).toBe(messages.unique);

    fetchMock.mockResolvedValueOnce(json({}, 500));
    expect(await regra('unique', 'ana', '/api/x')).toBe(true);
  });

  it('falha de rede nunca impede o usuario de enviar', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));
    expect(await regra('unique', 'ana', '/api/x')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Regra e mensagem proprias
// ---------------------------------------------------------------------------

describe('regra propria', () => {
  it('validator registra a regra, a mensagem e a directive', async () => {
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

  it('a regra pode devolver a propria mensagem em vez de false', async () => {
    validator('faixa', (value) => (Number(value) > 10 ? true : 'Precisa passar de dez.'));
    const el = campo('<input name="n" v-faixa value="3">');
    expect((await validateField(el)).message).toBe('Precisa passar de dez.');
  });

  it('v-error-message vence a mensagem da regra', async () => {
    const el = campo('<input name="e" v-email v-error-message="Confira o e-mail." value="xxx">');
    expect((await validateField(el)).message).toBe('Confira o e-mail.');
  });

  it('regra sem mensagem propria e sem entrada em messages cai em invalid', async () => {
    validator('semNome', () => false);
    const el = campo('<input name="s" v-semnome value="x">');
    expect((await validateField(el)).message).toBe(messages.invalid);
  });

  it('regra que lanca nao impede o envio, so avisa', async () => {
    validator('explode', () => {
      throw new Error('quebrei');
    });
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const el = campo('<input name="x" v-explode value="a">');

    expect((await validateField(el)).valid).toBe(true);
    expect(String(aviso.mock.calls[0][0])).toContain('Regra "explode" falhou');
    aviso.mockRestore();
  });

  it('formatMessage troca param, field, value, min e max', () => {
    expect(formatMessage('minimo {param}', { param: '3' })).toBe('minimo 3');
    expect(formatMessage('entre {min} e {max}', { param: '1, 10' })).toBe('entre 1 e 10');
    // Com um valor so, min e max apontam para ele.
    expect(formatMessage('entre {min} e {max}', { param: '5' })).toBe('entre 5 e 5');
    expect(formatMessage('{field}: {value}', { field: 'Nome', value: 'x' })).toBe('Nome: x');
    expect(formatMessage('{field}', {})).toBe('campo');
    // Chave desconhecida fica como esta.
    expect(formatMessage('{fantasma}', {})).toBe('{fantasma}');
  });
});

// ---------------------------------------------------------------------------
// Coleta de regras do campo
// ---------------------------------------------------------------------------

describe('coleta de regras do campo', () => {
  it('le atributos nativos e da Voodoo, sem repetir', () => {
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
    // `required` sempre e a primeira, para nao mostrar erro de formato em branco.
    expect(nomes[0]).toBe('required');
  });

  it('aceita apelidos, data-v- e modificadores', () => {
    const el = campo('<input data-v-obrigatorio v-strong-password.forte="10" v-min-length="4">');
    const nomes = fieldRules(el).map((r) => r.name);
    expect(nomes).toEqual(expect.arrayContaining(['required', 'strongpassword', 'minlength']));
  });

  it('valor false desliga a regra', () => {
    const el = campo('<input required v-required="false">');
    expect(fieldRules(el).map((r) => r.name)).not.toContain('required');
  });

  it('type number e url puxam a regra correspondente, e min/max nativos entram', () => {
    expect(fieldRules(campo('<input type="url">')).map((r) => r.name)).toContain('url');
    const numero = campo('<input type="number" min="1" max="9">');
    const nomes = fieldRules(numero).map((r) => r.name);
    expect(nomes).toEqual(expect.arrayContaining(['number', 'min', 'max']));
    expect(fieldRules(campo('<input type="range">')).map((r) => r.name)).toContain('number');
  });

  it('atributo que nao corresponde a regra alguma e ignorado', () => {
    expect(fieldRules(campo('<input v-model="x" v-validate>'))).toHaveLength(0);
    expect(fieldRules(campo('<input>'))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Leitura do campo
// ---------------------------------------------------------------------------

describe('leitura do campo', () => {
  it('fieldValue trata checkbox, radio, arquivo e texto', () => {
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

  it('fieldKey usa name, depois id, depois a tag', () => {
    expect(fieldKey(campo('<input name="a" id="b">'))).toBe('a');
    expect(fieldKey(campo('<input id="b">'))).toBe('b');
    expect(fieldKey(campo('<select></select>'))).toBe('campo-select');
  });

  it('fieldLabel procura v-label, label[for], label em volta e cai no name', () => {
    expect(fieldLabel(campo('<input v-label="Apelido">'))).toBe('Apelido');

    const comLabel = campo('<div><label for="cpf">CPF *</label><input id="cpf"></div>');
    expect(fieldLabel(comLabel.querySelector('input') as FormField)).toBe('CPF');

    const envolto = campo('<label>Idade <input name="idade"></label>');
    expect(fieldLabel(envolto.querySelector('input') as FormField)).toBe('Idade');

    expect(fieldLabel(campo('<input aria-label="Busca">'))).toBe('Busca');
    expect(fieldLabel(campo('<input placeholder="Digite">'))).toBe('Digite');
    expect(fieldLabel(campo('<input name="email">'))).toBe('email');
    expect(fieldLabel(campo('<input>'))).toBe('campo');
  });

  it('isFormField reconhece so os tres elementos de formulario', () => {
    expect(isFormField(campo('<input>'))).toBe(true);
    expect(isFormField(campo('<select></select>'))).toBe(true);
    expect(isFormField(campo('<textarea></textarea>'))).toBe(true);
    expect(isFormField(campo('<div></div>'))).toBe(false);
    expect(isFormField(null)).toBe(false);
    expect(isFormField('input')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Validacao de formulario inteiro
// ---------------------------------------------------------------------------

describe('validacao de formulario', () => {
  it('collectFields ignora desabilitado, botao e campo sem regra', () => {
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

  it('collectFields tambem funciona fora de um form', () => {
    const caixa = campo('<div><input name="a" v-required><input name="b"></div>') as unknown as
      HTMLElement;
    expect(collectFields(caixa, false).map((f) => (f as HTMLInputElement).name)).toEqual(['a', 'b']);
  });

  it('validateForm devolve os erros indexados pelo nome do campo', async () => {
    const form = formulario(
      '<input name="nome" v-required>' +
        '<input name="email" v-email value="xxx">' +
        '<input name="ok" v-required value="preenchido">'
    );
    const resultado = await validateForm(form);
    expect(resultado.valid).toBe(false);
    expect(Object.keys(resultado.errors)).toEqual(['nome', 'email']);
    expect(resultado.errors.email).toBe(messages.email);

    // O HTML recebe as marcas de estado.
    expect(form.querySelector('[name="nome"]')?.classList.contains('v-invalid')).toBe(true);
    expect(form.querySelector('[name="ok"]')?.classList.contains('v-valid')).toBe(true);
    expect(form.querySelectorAll('.v-field-error')).toHaveLength(2);
  });

  it('formulario todo preenchido passa', async () => {
    const form = formulario('<input name="nome" v-required value="Ana">');
    expect(await validateForm(form)).toEqual({ valid: true, errors: {} });
  });

  it('validate decide entre campo e formulario pelo elemento recebido', async () => {
    const form = formulario('<input name="nome" v-required>');
    expect(await validate(form)).toMatchObject({ valid: false, errors: expect.any(Object) });
    expect(await validate(form.querySelector('input') as FormField)).toMatchObject({
      valid: false,
      rule: 'required',
    });
  });

  it('campo sem regra e alvo que nem e campo passam direto', async () => {
    expect(await validateField(campo('<input>'))).toEqual({ valid: true });
    expect(await validateField(campo('<div></div>') as unknown as FormField)).toEqual({
      valid: true,
    });
    expect(await validateField(campo('<input>'), { silent: true })).toEqual({ valid: true });
  });

  it('modo silencioso nao mexe no HTML nem dispara evento', async () => {
    const el = campo('<input name="e" v-email value="xxx">');
    const eventos: Event[] = [];
    el.addEventListener('voodoo:field-validated', (e) => eventos.push(e));

    const resultado = await validateField(el, { silent: true });
    expect(resultado.valid).toBe(false);
    expect(el.classList.contains('v-invalid')).toBe(false);
    expect(eventos).toHaveLength(0);
  });

  it('o evento voodoo:field-validated leva o resultado', async () => {
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

  it('campo vazio so roda required e accepted', async () => {
    const el = campo('<input name="e" v-email>');
    // Vazio sem `required` nao reprova por formato.
    expect((await validateField(el)).valid).toBe(true);
    expect(el.classList.contains('v-valid')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Apresentacao dos erros
// ---------------------------------------------------------------------------

describe('apresentacao dos erros', () => {
  it('a mensagem entra depois do campo e liga o aria-describedby', async () => {
    const el = campo('<input id="e" name="e" v-email value="xxx" aria-describedby="ajuda">');
    await validateField(el);

    const span = el.nextElementSibling as HTMLElement;
    expect(span.className).toBe('v-field-error');
    expect(span.id).toBe('e-error');
    expect(span.getAttribute('role')).toBe('alert');
    expect(el.getAttribute('aria-invalid')).toBe('true');
    expect(el.getAttribute('aria-describedby')).toBe('ajuda e-error');

    // Revalidar nao pode duplicar nem o span nem o id no aria.
    await validateField(el);
    expect(el.parentElement?.querySelectorAll('.v-field-error')).toHaveLength(1);
    expect(el.getAttribute('aria-describedby')).toBe('ajuda e-error');

    el.value = 'a@b.co';
    await validateField(el);
    expect(el.parentElement?.querySelector('.v-field-error')).toBeNull();
    expect(el.getAttribute('aria-describedby')).toBe('ajuda');
    expect(el.hasAttribute('aria-invalid')).toBe(false);
  });

  it('sem outro aria-describedby o atributo some por inteiro', async () => {
    const el = campo('<input name="e" v-email value="xxx">');
    await validateField(el);
    expect(el.hasAttribute('aria-describedby')).toBe(true);
    el.value = 'a@b.co';
    await validateField(el);
    expect(el.hasAttribute('aria-describedby')).toBe(false);
  });

  it('v-error-target manda a mensagem para outro lugar', async () => {
    const form = formulario(
      '<input name="e" v-email v-error-target=".erros" value="xxx"><div class="erros"></div>'
    );
    await validateField(form.querySelector('input') as FormField);
    expect(form.querySelector('.erros .v-field-error')?.textContent).toBe(messages.email);
    expect(form.querySelector('input')?.nextElementSibling?.className).not.toBe('v-field-error');
  });

  it('v-error-target inexistente avisa e volta para o lugar padrao', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const el = campo('<input name="e" v-email v-error-target=".nao-existe" value="xxx">');
    await validateField(el);
    expect(String(aviso.mock.calls[0][0])).toContain('error-target');
    expect(el.nextElementSibling?.className).toBe('v-field-error');
    aviso.mockRestore();
  });

  it('normalizeErrors aceita mapa direto, listas e o envelope errors', () => {
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

  it('showFormErrors coloca cada erro no campo e o resto no resumo', () => {
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

  it('resumo com uma mensagem so fica em texto puro e e reaproveitado', () => {
    const form = formulario('<input name="a">');
    showFormSummary(form, ['unica']);
    expect(form.querySelector('.v-form-error')?.textContent).toBe('unica');

    showFormSummary(form, ['a', 'b']);
    expect(form.querySelectorAll('.v-form-error')).toHaveLength(1);
    expect(form.querySelectorAll('.v-form-error li')).toHaveLength(2);
  });

  it('clearErrors limpa mensagens, resumo e classes', async () => {
    const form = formulario('<input name="e" v-email value="xxx"><input name="ok" value="a">');
    await validateForm(form);
    showFormSummary(form, ['geral']);
    expect(form.querySelectorAll('.v-field-error').length).toBeGreaterThan(0);

    clearErrors(form);
    expect(form.querySelectorAll('.v-field-error')).toHaveLength(0);
    expect(form.querySelector('.v-form-error')).toBeNull();
    expect(form.querySelectorAll('.v-invalid, .v-valid')).toHaveLength(0);
  });

  it('focusFirstError leva o foco ao primeiro campo com erro', async () => {
    const form = formulario('<input name="a" v-required><input name="b" v-required>');
    expect(focusFirstError(form)).toBe(false);

    await validateForm(form);
    expect(focusFirstError(form)).toBe(true);
    expect(document.activeElement).toBe(form.querySelector('[name="a"]'));
  });
});

// ---------------------------------------------------------------------------
// Serializacao
// ---------------------------------------------------------------------------

describe('serializeForm', () => {
  it('monta objeto simples, com trim e conversao de numero', () => {
    const form = formulario(
      '<input name="nome" value="  Ana  "><input type="number" name="idade" value="30">'
    );
    expect(serializeForm(form)).toEqual({ nome: 'Ana', idade: 30 });
  });

  it('trim e numbers podem ser desligados', () => {
    const form = formulario(
      '<input name="nome" value="  Ana  "><input type="number" name="idade" value="30">'
    );
    expect(serializeForm(form, { trim: false, numbers: false })).toEqual({
      nome: '  Ana  ',
      idade: '30',
    });
  });

  it('numero vazio ou ilegivel continua texto', () => {
    const form = formulario(
      '<input type="number" name="a" value=""><input type="range" name="b" value="5">'
    );
    expect(serializeForm(form)).toEqual({ a: '', b: 5 });
  });

  it('nomes aninhados viram objeto, e colchete vazio vira lista', () => {
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

  it('checkbox sozinho vira booleano', () => {
    const form = formulario(
      '<input type="checkbox" name="aceito" checked><input type="checkbox" name="news">'
    );
    expect(serializeForm(form)).toEqual({ aceito: true, news: false });
  });

  it('varios checkbox com o mesmo nome viram lista com os marcados', () => {
    const form = formulario(
      '<input type="checkbox" name="cores" value="azul" checked>' +
        '<input type="checkbox" name="cores" value="verde">' +
        '<input type="checkbox" name="cores" value="roxo" checked>' +
        '<input type="checkbox" name="extras[]" value="a" checked>'
    );
    expect(serializeForm(form)).toEqual({ cores: ['azul', 'roxo'], extras: ['a'] });
  });

  it('checkbox marcado sem value entra como on', () => {
    const form = formulario(
      '<input type="checkbox" name="c[]" checked><input type="checkbox" name="c[]" checked>'
    );
    expect(serializeForm(form)).toEqual({ c: ['on', 'on'] });
  });

  it('radio manda so o escolhido', () => {
    const form = formulario(
      '<input type="radio" name="plano" value="basico">' +
        '<input type="radio" name="plano" value="pro" checked>'
    );
    expect(serializeForm(form)).toEqual({ plano: 'pro' });
  });

  it('select multiplo vira lista', () => {
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

  it('campo sem name e campo desabilitado ficam de fora, salvo pedido explicito', () => {
    const form = formulario(
      '<input value="anonimo"><input name="x" value="1" disabled><input name="y" value="2">'
    );
    expect(serializeForm(form)).toEqual({ y: '2' });
    // `collectFields` ja retira os desabilitados, entao a opcao nao os traz de volta.
    expect(serializeForm(form, { includeDisabled: true })).toEqual({ y: '2' });
  });

  it('arquivo selecionado forca FormData', () => {
    const form = formulario('<input type="file" name="foto"><input name="nome" value="Ana">');
    const arquivo = form.querySelector('[name="foto"]') as HTMLInputElement;
    const conteudo = new File(['a'], 'a.txt', { type: 'text/plain' });
    Object.defineProperty(arquivo, 'files', { configurable: true, value: [conteudo] });

    const dados = serializeForm(form);
    expect(dados).toBeInstanceOf(FormData);
    expect((dados as FormData).get('nome')).toBe('Ana');
    expect((dados as FormData).get('foto')).toBe(conteudo);
  });

  it('arquivo multiplo vira lista dentro do FormData', () => {
    const form = formulario('<input type="file" name="fotos" multiple>');
    const arquivo = form.querySelector('input') as HTMLInputElement;
    const a = new File(['a'], 'a.txt');
    const b = new File(['b'], 'b.txt');
    Object.defineProperty(arquivo, 'files', { configurable: true, value: [a, b] });

    const dados = serializeForm(form) as FormData;
    expect(dados.getAll('fotos[]')).toEqual([a, b]);
  });

  it('campo de arquivo vazio nao entra na saida', () => {
    const form = formulario('<input type="file" name="foto"><input name="nome" value="Ana">');
    expect(serializeForm(form)).toEqual({ nome: 'Ana' });
  });

  it('formData: true converte booleano e lista mesmo sem arquivo', () => {
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
// Mascaras: formatacao
// ---------------------------------------------------------------------------

describe('applyMask', () => {
  it('mascaras nomeadas do pais', () => {
    expect(applyMask('12345678901', 'cpf')).toBe('123.456.789-01');
    expect(applyMask('11222333000181', 'cnpj')).toBe('11.222.333/0001-81');
    expect(applyMask('01310100', 'cep')).toBe('01310-100');
    expect(applyMask('15032024', 'date')).toBe('15/03/2024');
    expect(applyMask('1530', 'time')).toBe('15:30');
    expect(applyMask('150320241530', 'datetime')).toBe('15/03/2024 15:30');
    expect(applyMask('1234', 'cvv')).toBe('1234');
  });

  it('cpfcnpj troca de padrao conforme o tamanho', () => {
    expect(applyMask('12345678901', 'cpfcnpj')).toBe('123.456.789-01');
    expect(applyMask('11222333000181', 'cpfcnpj')).toBe('11.222.333/0001-81');
  });

  it('phone troca entre fixo e celular', () => {
    expect(applyMask('1134567890', 'phone')).toBe('(11) 3456-7890');
    expect(applyMask('11987654321', 'phone')).toBe('(11) 98765-4321');
    // Digito a mais e cortado antes de formatar.
    expect(applyMask('119876543219', 'phone')).toBe('(11) 98765-4321');
  });

  it('card cobre Amex, 16 e 19 digitos', () => {
    expect(applyMask('4539148803436467', 'card')).toBe('4539 1488 0343 6467');
    expect(applyMask('378282246310005', 'card')).toBe('3782 822463 10005');
    expect(applyMask('4539148803436467123', 'card')).toBe('4539 1488 0343 6467 123');
  });

  it('plate distingue placa antiga de Mercosul', () => {
    expect(applyMask('ABC1234', 'plate')).toBe('ABC-1234');
    expect(applyMask('abc1d23', 'plate')).toBe('ABC1D23');
    // Entrada curta ainda nao decide o formato.
    expect(applyMask('ABC', 'plate')).toBe('ABC');
  });

  it('hex e ip', () => {
    expect(applyMask('ff8800', 'hex')).toBe('#FF8800');
    expect(applyMask('zzz', 'hex')).toBe('');
    expect(applyMask('192.168.0.1', 'ip')).toBe('192.168.0.1');
    // Cada grupo e limitado a 255 e a tres digitos.
    expect(applyMask('999.168.0.1', 'ip')).toBe('255.168.0.1');
    expect(applyMask('1234.5.6.7', 'ip')).toBe('123.5.6.7');
    expect(applyMask('192.', 'ip')).toBe('192.');
    expect(applyMask('1.2.3.4.5', 'ip')).toBe('1.2.3.4');
  });

  it('padrao literal com tokens 9, A, S e *', () => {
    expect(applyMask('1234', '99-99')).toBe('12-34');
    expect(applyMask('ab12', 'AA-99')).toBe('ab-12');
    expect(applyMask('a1b2', 'SSSS')).toBe('a1b2');
    expect(applyMask('a-b', '***')).toBe('a-b');
    // Caractere que nao serve para a posicao e pulado.
    expect(applyMask('ab12cd', '99')).toBe('12');
  });

  it('barra invertida escapa o proximo caractere do padrao', () => {
    expect(applyMask('123', '\\#999')).toBe('#123');
    // Escape no fim do padrao encerra a formatacao.
    expect(applyMask('123', '999\\')).toBe('123');
  });

  it('entrada parcial nao inventa separador sobrando', () => {
    expect(applyMask('', 'cpf')).toBe('');
    expect(applyMask('123', 'cpf')).toBe('123');
    expect(applyMask('1234', 'cpf')).toBe('123.4');
    expect(applyMask('123456789', 'cpf')).toBe('123.456.789');
    expect(applyMask('1234567890', 'cpf')).toBe('123.456.789-0');
  });

  it('colar texto ja formatado nao duplica os separadores', () => {
    expect(applyMask('123.456.789-01', 'cpf')).toBe('123.456.789-01');
    expect(applyMask('(11) 98765-4321', 'phone')).toBe('(11) 98765-4321');
    expect(applyMask('15/03/2024', 'date')).toBe('15/03/2024');
    expect(applyMask('R$ 1.234,56', 'currency')).toBe('R$ 1.234,56');
  });

  it('sem padrao devolve o texto, e nulo vira texto vazio', () => {
    expect(applyMask('abc', '')).toBe('abc');
    expect(applyMask(null as unknown as string, 'cpf')).toBe('');
    expect(applyMask(undefined as unknown as string, '999')).toBe('');
  });

  it('o atalho mask() e o mesmo que applyMask', () => {
    expect(mask('12345678901', 'cpf')).toBe('123.456.789-01');
    expect(mask.apply('1234', '99-99')).toBe('12-34');
    expect(mask.presets).toBe(masks);
  });
});

describe('mascaras numericas', () => {
  it('maskCurrency agrupa milhar e coloca o prefixo', () => {
    expect(maskCurrency('123456')).toBe('R$ 1.234,56');
    expect(maskCurrency('5')).toBe('R$ 0,05');
    expect(maskCurrency('')).toBe('');
    expect(maskCurrency('abc')).toBe('');
    expect(maskCurrency('-123456')).toBe('-R$ 1.234,56');
    expect(maskCurrency('123456789')).toBe('R$ 1.234.567,89');
  });

  it('maskCurrency aceita prefixo, sufixo, casas e separadores proprios', () => {
    expect(maskCurrency('123456', { prefix: '$ ', decimal: '.', thousands: ',' })).toBe(
      '$ 1,234.56'
    );
    expect(maskCurrency('1234', { decimals: 0 })).toBe('R$ 1.234');
    expect(maskCurrency('1234', { decimals: 3 })).toBe('R$ 1,234');
    expect(maskCurrency('1234', { prefix: '', suffix: ' EUR' })).toBe('12,34 EUR');
    // Casas negativas ou fracionarias sao normalizadas.
    expect(maskCurrency('1234', { decimals: -2 })).toBe('R$ 1.234');
  });

  it('maskPercent usa o mesmo motor com sufixo', () => {
    expect(maskPercent('1234')).toBe('12,34%');
    expect(maskPercent('1234', 0)).toBe('1.234%');
    expect(mask.percent('50')).toBe('0,50%');
    expect(mask.currency('100')).toBe('R$ 1,00');
  });
});

describe('unmask', () => {
  it('tira a formatacao comum', () => {
    expect(unmask('123.456.789-01')).toBe('12345678901');
    expect(unmask('(11) 98765-4321')).toBe('11987654321');
    expect(unmask('ABC-1234')).toBe('ABC1234');
    expect(unmask(null as unknown as string)).toBe('');
  });

  it('mascaras numericas devolvem numero pronto para Number()', () => {
    expect(unmask('R$ 1.234,56', 'currency')).toBe('1234.56');
    expect(unmask('12,34%', 'percent')).toBe('12.34');
    expect(unmask('R$ 0,05', 'currency')).toBe('0.05');
    expect(unmask('-R$ 1.234,56', 'currency')).toBe('-1234.56');
    expect(unmask('R$ ', 'currency')).toBe('');
    expect(Number(unmask('R$ 1.234,56', 'currency'))).toBe(1234.56);
  });

  it('padrao que nao e numerico cai na limpeza comum', () => {
    expect(unmask('123.456.789-01', 'cpf')).toBe('12345678901');
    expect(unmask('  ')).toBe('');
  });
});

describe('registrar mascara propria', () => {
  it('aceita padrao de texto e tambem funcao', () => {
    registerMask('  Processo  ', '9999999-99.9999.9.99.9999');
    expect(applyMask('00012345620248260100', 'processo')).toBe('0001234-56.2024.8.26.0100');

    mask.register('reverso', (valor) => valor.split('').reverse().join(''));
    expect(applyMask('abc', 'reverso')).toBe('cba');

    // Registrar de novo com o mesmo nome substitui.
    registerMask('reverso', '99');
    expect(applyMask('123', 'reverso')).toBe('12');
  });
});

// ---------------------------------------------------------------------------
// Directives de mascara
// ---------------------------------------------------------------------------

describe('directive v-mask', () => {
  it('formata o que foi digitado e mantem o cursor depois do ultimo digito', () => {
    const raiz = montar('<input v-mask="cpf">');
    const input = raiz.querySelector('input') as HTMLInputElement;

    digitar(input, '123456');
    expect(valorCru(input)).toBe('123.456');
    expect(input.selectionStart).toBe(7);

    digitar(input, '123.4567');
    expect(valorCru(input)).toBe('123.456.7');
  });

  it('valor que ja veio do servidor entra formatado na montagem', () => {
    const raiz = montar('<input v-mask="cpf" value="12345678901">');
    expect(valorCru(raiz.querySelector('input') as HTMLInputElement)).toBe('123.456.789-01');
  });

  it('com .unmask a leitura devolve o valor limpo e a escrita passa pela mascara', () => {
    const raiz = montar('<input v-mask.unmask="cpf">');
    const input = raiz.querySelector('input') as HTMLInputElement;

    input.value = '12345678901';
    expect(valorCru(input)).toBe('123.456.789-01');
    expect(input.value).toBe('12345678901');

    input.value = null as unknown as string;
    expect(valorCru(input)).toBe('');
  });

  it('mascara de moeda mantem o cursor no fim e limpa para numero', () => {
    const raiz = montar('<input v-mask.raw="currency">');
    const input = raiz.querySelector('input') as HTMLInputElement;

    digitar(input, '123456');
    expect(valorCru(input)).toBe('R$ 1.234,56');
    expect(input.selectionStart).toBe('R$ 1.234,56'.length);
    expect(input.value).toBe('1234.56');
  });

  it('apagar em cima de um separador remove o digito anterior', () => {
    const raiz = montar('<input v-mask="cpf" value="123456">');
    const input = raiz.querySelector('input') as HTMLInputElement;
    expect(valorCru(input)).toBe('123.456');

    // Cursor logo depois do ponto: o Backspace precisa comer o "3".
    input.setSelectionRange(4, 4);
    const evento = new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true });
    input.dispatchEvent(evento);

    expect(evento.defaultPrevented).toBe(true);
    expect(valorCru(input)).toBe('124.56');
  });

  it('Backspace em cima de digito, com selecao ou no inicio segue o padrao', () => {
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

  it('a limpeza devolve o value nativo ao elemento', () => {
    const raiz = montar('<input v-mask="cpf" value="12345678901">');
    const input = raiz.querySelector('input') as HTMLInputElement;
    expect(Object.getOwnPropertyDescriptor(input, 'value')).toBeDefined();

    destroy(raiz);
    expect(Object.getOwnPropertyDescriptor(input, 'value')).toBeUndefined();
    expect(input.value).toBe('123.456.789-01');
  });

  it('avisa em elemento errado, em type incompativel e sem padrao', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    montar('<div v-mask="cpf"></div>');
    montar('<input type="number" v-mask="cpf">');
    montar('<input v-mask="  ">');

    const textos = aviso.mock.calls.map((c) => String(c[0]));
    expect(textos.some((t) => t.includes('so funciona em input'))).toBe(true);
    expect(textos.some((t) => t.includes('type="number"'))).toBe(true);
    expect(textos.some((t) => t.includes('precisa de um padrao'))).toBe(true);
    aviso.mockRestore();
  });

  it('textarea tambem aceita mascara', () => {
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
   * Regressao: o prefixo passava por `trim`, entao o espaco final do exemplo da
   * propria documentacao (`v-mask-currency="R$ "`) era descartado e o campo
   * mostrava `R$1.234,56`. O mesmo prefixo escrito em `v-mask-prefix` nunca
   * perdeu o espaco, o que deixava as duas formas com resultados diferentes.
   */
  it('usa o prefixo da expressao, com o espaco do fim, e as casas do atributo', () => {
    const raiz = montar('<input v-mask-currency="US$ " v-mask-decimals="3">');
    const input = raiz.querySelector('input') as HTMLInputElement;

    digitar(input, '1234567');
    expect(valorCru(input)).toBe('US$ 1.234,567');
  });

  it('expressao so de espacos volta para o prefixo padrao', () => {
    const raiz = montar('<input v-mask-currency="   " v-mask-decimals="">');
    digitar(raiz.querySelector('input') as HTMLInputElement, '1234');
    expect(valorCru(raiz.querySelector('input') as HTMLInputElement)).toBe('R$ 12,34');
  });

  it('modificador .plain tira o prefixo e .dot inverte os separadores', () => {
    const semPrefixo = montar('<input v-mask-currency.plain>');
    digitar(semPrefixo.querySelector('input') as HTMLInputElement, '123456');
    expect(valorCru(semPrefixo.querySelector('input') as HTMLInputElement)).toBe('1.234,56');

    const ponto = montar('<input v-mask-currency.dot.plain>');
    digitar(ponto.querySelector('input') as HTMLInputElement, '123456');
    expect(valorCru(ponto.querySelector('input') as HTMLInputElement)).toBe('1,234.56');
  });

  it('o sufixo entra no fim e o cursor para antes dele', () => {
    const raiz = montar('<input v-mask-currency.plain v-mask-suffix=" %">');
    const input = raiz.querySelector('input') as HTMLInputElement;

    digitar(input, '1234');
    expect(valorCru(input)).toBe('12,34 %');
    expect(input.selectionStart).toBe('12,34'.length);
  });

  it('prefixo tambem pode vir de v-mask-prefix', () => {
    const raiz = montar('<input v-mask-currency v-mask-prefix="EUR ">');
    digitar(raiz.querySelector('input') as HTMLInputElement, '1234');
    expect(valorCru(raiz.querySelector('input') as HTMLInputElement)).toBe('EUR 12,34');

    const zero = montar('<input v-mask-currency.plain v-mask-decimals="0">');
    digitar(zero.querySelector('input') as HTMLInputElement, '1234');
    expect(valorCru(zero.querySelector('input') as HTMLInputElement)).toBe('1.234');
  });

  it('com .unmask a leitura devolve o numero, com e sem casas decimais', () => {
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

  it('casas invalidas voltam para duas', () => {
    const raiz = montar('<input v-mask-currency.plain v-mask-decimals="abc">');
    digitar(raiz.querySelector('input') as HTMLInputElement, '1234');
    expect(valorCru(raiz.querySelector('input') as HTMLInputElement)).toBe('12,34');
  });

  it('avisa quando o alvo nao serve', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    montar('<div v-mask-currency></div>');
    expect(String(aviso.mock.calls[0][0])).toContain('so funciona em input');
    aviso.mockRestore();
  });
});
