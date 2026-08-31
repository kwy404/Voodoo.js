# Validação

A validação acontece no HTML, com mensagens em português, apresentação automática dos erros e
suporte a regras assíncronas.

```html
<form v-submit="/api/usuarios" v-validate>
  <label>E-mail <input name="email" v-required v-email></label>
  <label>CPF <input name="cpf" v-cpf v-error-message="Informe um CPF real."></label>
  <button>Salvar</button>
</form>
```

## Como funciona

`v-validate` no formulário liga a validação automática de todos os campos que declaram alguma
regra. A validação nativa do navegador é desligada, para que as mensagens sejam as suas.

Cada campo é validado quando perde o foco. Depois do primeiro erro, ele passa a revalidar a cada
tecla, o que dá retorno imediato sem incomodar quem ainda está digitando.

No envio, o formulário inteiro é validado. Se algo reprovar, o envio para, o foco vai para o
primeiro campo com problema e o evento `voodoo:invalid` é disparado.

Um campo isolado, fora de um formulário validado, também funciona: basta declarar a regra ou usar
`v-validate` no próprio campo.

## O que aparece na tela

Quando um campo reprova:

- ele ganha a classe `v-invalid` e `aria-invalid="true"`;
- uma mensagem com `role="alert"` é inserida logo depois dele, com a classe `v-field-error`;
- `aria-describedby` aponta para a mensagem.

Quando aprova, ganha `v-valid` e a mensagem é removida. Para mandar a mensagem para outro lugar:

```html
<input name="email" v-required v-email v-error-target="#erro-do-email">
<span id="erro-do-email"></span>
```

## Regras

Todas existem como directive (`v-nome`) e como `v-validate-nome`.

### Presença e formato

| Regra | Aceita | O que valida |
| --- | --- | --- |
| `v-required` | | Campo preenchido. Em checkbox e radio, marcado. Em arquivo, algum escolhido |
| `v-email` | | Formato de e-mail |
| `v-url` | | URL válida. Aceita sem protocolo |
| `v-number` | | Número, entendendo vírgula decimal e separador de milhar |
| `v-integer` | | Número inteiro |
| `v-validate-decimal` | casas | Decimal, com no máximo N casas |
| `v-validate-alpha` | | Apenas letras, com acento |
| `v-validate-alphanumeric` | | Apenas letras e números |
| `v-regex` | expressão | Casa com a expressão regular |

```html
<input v-validate-decimal="2">
<input v-regex="^[A-Z]{3}-\d{4}$" v-regex-flags="i" v-error-message="Placa inválida.">
```

### Tamanho e faixa

| Regra | Aceita | O que valida |
| --- | --- | --- |
| `v-minlength` | número | Mínimo de caracteres |
| `v-maxlength` | número | Máximo de caracteres |
| `v-min` | número ou data | Valor mínimo |
| `v-max` | número ou data | Valor máximo |
| `v-validate-between` | `min,max` | Valor dentro da faixa |

```html
<input v-minlength="3" v-maxlength="60">
<input type="number" v-min="1" v-max="99">
<input v-validate-between="10,100">
```

### Comparação

| Regra | Aceita | O que valida |
| --- | --- | --- |
| `v-match` | nome, id ou seletor | Igual a outro campo |
| `v-validate-same` | nome, id ou seletor | Igual a outro campo |
| `v-validate-different` | nome, id ou seletor | Diferente de outro campo |
| `v-validate-in` | lista | O valor está entre as opções |
| `v-validate-notin` | lista | O valor não está entre as opções |

```html
<input type="password" name="senha" v-required>
<input type="password" name="confirmacao" v-match="senha" v-error-message="As senhas não conferem.">
<input v-validate-in="pequeno, medio, grande">
```

### Datas

| Regra | Aceita | O que valida |
| --- | --- | --- |
| `v-date` | | Data válida em `dd/mm/aaaa`, `aaaa-mm-dd` ou o que o navegador entender |
| `v-validate-after` | data, `hoje` ou outro campo | Posterior à referência |
| `v-validate-before` | data, `hoje` ou outro campo | Anterior à referência |

```html
<input v-mask="date" v-date v-validate-before="hoje" v-label="Data de nascimento">
<input name="inicio" v-date>
<input name="fim" v-date v-validate-after="inicio">
```

`hoje`, `today`, `now` e `agora` são aceitos como referência.

### Brasil

| Regra | O que valida |
| --- | --- |
| `v-cpf` | CPF com cálculo real dos dígitos verificadores |
| `v-cnpj` | CNPJ com cálculo real dos dígitos verificadores |
| `v-cep` | CEP com oito dígitos |
| `v-phone` | Telefone fixo ou celular, com DDD válido |

```html
<input v-mask="cpf" v-cpf>
<input v-mask="cnpj" v-cnpj>
<input v-mask="cep" v-cep>
<input v-mask="phone" v-phone>
```

### Outras

| Regra | Aceita | O que valida |
| --- | --- | --- |
| `v-accepted` | | Caixa marcada, ou valor `1`, `true`, `on`, `yes`, `sim` |
| `v-validate-creditcard` | | Número de cartão pelo algoritmo de Luhn |
| `v-strong-password` | mínimo de caracteres | Maiúscula, minúscula, número e símbolo. Padrão 8 |
| `v-validate-unique` | URL | Consulta o servidor para saber se o valor já existe |

```html
<input type="checkbox" name="termos" v-accepted v-error-message="Você precisa aceitar os termos.">
<input v-mask="card" v-validate-creditcard>
<input type="password" v-strong-password="10">
```

### Apelidos aceitos

`strong-password`, `credit-card`, `min-length`, `max-length`, `not-in`, `obrigatorio` e
`nao-vazio` funcionam como sinônimos das regras correspondentes.

## Atributos nativos também valem

A biblioteca lê os atributos padrão do HTML e transforma em regras:

```html
<input required minlength="3" maxlength="20" pattern="[a-z]+">
<input type="email" required>
<input type="number" min="1" max="10">
<input type="url">
```

## Desligando uma regra

`v-required="false"` desliga a regra sem que você precise remover o atributo. Isso ajuda quando o
HTML é gerado no servidor e a condição é conhecida ali:

```html
<input name="cnpj" v-cnpj v-required="false">
```

O valor é lido do atributo original, então a chave é decidida na renderização e não muda depois.
Para uma regra que liga e desliga em tempo real, escreva uma regra própria que consulte o estado:

```js
V.validator('cnpjQuandoEmpresa', (valor) => {
  if (V.scope.tipo !== 'empresa') return true;
  return valor.trim() !== '' || 'Informe o CNPJ da empresa.';
});
```

## Mensagens

As mensagens padrão ficam em `V.messages`, e podem ser trocadas uma a uma ou em bloco:

```js
Object.assign(V.messages, {
  required: 'Campo obrigatório.',
  email: 'Confira o e-mail digitado.',
  minlength: 'Escreva pelo menos {param} caracteres.',
});
```

Dentro do texto você pode usar:

| Marcador | Vira |
| --- | --- |
| `{param}` | O parâmetro da regra |
| `{field}` | O rótulo do campo |
| `{value}` | O valor digitado |
| `{min}` e `{max}` | As duas partes de um parâmetro como `10,100` |

O rótulo do campo é descoberto nesta ordem: `v-label`, o `<label for>` correspondente, o texto do
`<label>` em volta, `aria-label`, `placeholder` e por fim o `name`.

Para uma mensagem específica de um campo:

```html
<input v-cpf v-error-message="Este CPF não confere.">
```

Lista completa das mensagens padrão: `required`, `email`, `url`, `number`, `integer`, `decimal`,
`alpha`, `alphanumeric`, `minlength`, `maxlength`, `min`, `max`, `between`, `match`, `regex`,
`date`, `after`, `before`, `accepted`, `same`, `different`, `in`, `notin`, `phone`, `cpf`, `cnpj`,
`cep`, `creditcard`, `strongpassword`, `unique`, `invalid`.

## Validação assíncrona

A regra `unique` consulta o servidor:

```html
<input name="email" type="email" v-required v-email v-validate-unique="/api/checar-email">
```

Ou com o atributo dedicado:

```html
<input name="apelido" v-validate-unique v-unique-url="/api/checar-apelido">
```

A biblioteca chama `GET /api/checar-email?value=...&field=email` e espera:

- `{ "available": true }` para liberar;
- `{ "available": false }` para reprovar;
- resposta vazia ou `null` para liberar;
- qualquer outro corpo para reprovar, entendendo que o registro existe;
- status 404 para liberar.

Falhas de rede nunca travam o envio: a regra libera e deixa o servidor decidir na hora do POST.

## Regras próprias

```js
V.validator('par', (valor) => Number(valor) % 2 === 0, 'Informe um número par.');
```

```html
<input v-validate-par>
```

A função recebe `(valor, parametro, elemento)` e pode devolver:

- `true` para aprovar;
- `false` para reprovar com a mensagem padrão;
- um texto para reprovar com aquela mensagem;
- uma `Promise` de qualquer um dos três.

```js
V.validator('cnpjAtivo', async (valor) => {
  if (!valor) return true;
  const dados = await V.http.get(`/api/cnpj/${V.unmask(valor)}`);
  return dados.ativo ? true : 'Este CNPJ está inativo na Receita.';
});
```

```js
V.validator('depoisDe', (valor, param, el) => {
  const outro = document.querySelector(`[name="${param}"]`);
  return !outro || valor > outro.value || 'Precisa ser depois de ' + outro.value;
});
```

Registrar uma regra cria automaticamente a directive `v-validate-<nome>`.

## API por JavaScript

```js
const resultado = await V.validate(document.forms[0]);
// { valid: true, errors: {} }

const campo = await V.validate(document.querySelector('#email'));
// { valid: false, message: 'Informe um e-mail válido.', rule: 'email' }

V.showFieldError(input, 'Mensagem específica');
V.showFormErrors(form, { email: 'Já cadastrado' });
V.clearErrors(form);
```

`V.validateForm` é um alias de `V.validate` para formulários.

## Combinando com máscaras

Máscara e validação se completam. A máscara guia a digitação, a regra confere o conteúdo:

```html
<input v-mask="cpf" v-cpf v-required>
<input v-mask="phone" v-phone>
<input v-mask="cep" v-cep>
<input v-mask="date" v-date>
```

Com o modificador `.unmask`, o `v-model` recebe o valor limpo enquanto a tela mostra o formatado:

```html
<input v-mask.unmask="cpf" v-model="form.cpf" v-cpf>
```

## Acessibilidade

O que a biblioteca faz sozinha:

- `aria-invalid` no campo reprovado;
- `aria-describedby` ligando o campo à mensagem;
- `role="alert"` e `aria-live="polite"` na mensagem;
- foco no primeiro campo com erro depois de um envio reprovado, com rolagem suave que respeita
  `prefers-reduced-motion`;
- resumo com `role="alert"` no topo quando um erro do servidor não tem campo correspondente.

---

Anterior: [Formulários](formularios.md) · Próximo: [Máscaras](mascaras.md)
