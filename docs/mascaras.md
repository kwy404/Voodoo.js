# Máscaras

Máscaras de digitação que preservam a posição do cursor, inclusive quando o usuário edita o meio
do texto ou apaga um separador.

```html
<input v-mask="cpf">
<input v-mask="(99) 99999-9999">
<input v-mask.unmask="cpf" v-model="form.cpf">
<input v-mask-currency v-mask-decimals="2">
```

## Máscaras prontas

| Nome | Formato | Exemplo |
| --- | --- | --- |
| `cpf` | `999.999.999-99` | `123.456.789-01` |
| `cnpj` | `99.999.999/9999-99` | `12.345.678/0001-90` |
| `cpfcnpj` | Troca sozinha conforme o tamanho | `123.456.789-01` ou `12.345.678/0001-90` |
| `cep` | `99999-999` | `01001-000` |
| `phone` | `(99) 9999-9999` ou `(99) 99999-9999` | `(11) 98765-4321` |
| `date` | `99/99/9999` | `28/08/2026` |
| `time` | `99:99` | `14:30` |
| `datetime` | `99/99/9999 99:99` | `28/08/2026 14:30` |
| `currency` | Moeda, digitando da direita para a esquerda | `R$ 1.234,56` |
| `percent` | Porcentagem, mesmo estilo | `12,50%` |
| `card` | Cartão, com o formato certo para American Express | `4111 1111 1111 1111` |
| `cvv` | Até quatro dígitos | `123` |
| `plate` | Placa antiga ou Mercosul, escolhida pelo conteúdo | `ABC-1234` ou `ABC1D23` |
| `hex` | Cor em hexadecimal | `#6D3BF5` |
| `ip` | Endereço IPv4, com cada grupo limitado a 255 | `192.168.0.1` |

```html
<input v-mask="cpf" v-cpf>
<input v-mask="cpfcnpj" placeholder="CPF ou CNPJ">
<input v-mask="phone" v-phone>
<input v-mask="plate">
<input v-mask="hex" v-model="cor">
```

## Máscara por padrão de caracteres

Quando o valor não é o nome de uma máscara conhecida, ele é lido como padrão:

```html
<input v-mask="(99) 99999-9999">
<input v-mask="AAA-9999">
<input v-mask="SSSS SSSS">
<input v-mask="\R\S 9999">
```

Tokens:

| Token | Aceita |
| --- | --- |
| `9` | Dígito |
| `A` | Letra, com acento |
| `S` | Letra ou dígito |
| `*` | Qualquer caractere |
| `\` | Escapa o próximo caractere, tornando literal |

Qualquer outro caractere do padrão entra como separador fixo e só aparece quando ainda existe
conteúdo depois dele.

## v-model e o valor limpo

Por padrão o estado recebe o texto formatado. Com `.unmask` (ou `.raw`), ele recebe o valor
limpo, enquanto a tela continua mostrando a máscara:

```html
<div v-data="{ form: { cpf: '' } }">
  <input v-mask.unmask="cpf" v-model="form.cpf">
  <p>Vai para o servidor: { form.cpf }</p>   <!-- 12345678901 -->
</div>
```

Para máscaras numéricas, o valor limpo é o número em texto, pronto para virar `Number`:

```html
<input v-mask-currency.unmask v-model="produto.preco">
<!-- na tela: R$ 1.234,56, no estado: 1234.56 -->
```

`v-mask` roda antes de `v-model`, então o estado nunca vê o valor pela metade.

## Moeda e porcentagem

`v-mask-currency` digita da direita para a esquerda, como uma calculadora:

```html
<input v-mask-currency>                      <!-- R$ 1.234,56 -->
<input v-mask-currency="US$ ">               <!-- US$ 1.234,56 -->
<input v-mask-currency v-mask-decimals="0">  <!-- R$ 1.234 -->
<input v-mask-currency v-mask-suffix=" /mês">
<input v-mask-currency.plain>                <!-- 1.234,56, sem prefixo -->
<input v-mask-currency.dot>                  <!-- 1,234.56, no padrão americano -->
```

| Ajuste | Onde |
| --- | --- |
| Prefixo | O próprio valor da directive, ou `v-mask-prefix` |
| Sufixo | `v-mask-suffix` |
| Casas decimais | `v-mask-decimals`. Padrão 2 |
| Separadores invertidos | Modificador `.dot` |
| Sem prefixo | Modificador `.plain` |
| Valor limpo no estado | Modificador `.unmask` ou `.raw` |

Para porcentagem existe a máscara nomeada:

```html
<input v-mask="percent">
```

## Cuidados

`v-mask` precisa de `<input>` ou `<textarea>` com tipo textual. Tipos como `number`, `range`,
`date` e `color` não aceitam máscara, porque o navegador já controla o valor. Use `type="text"`
com `inputmode`:

```html
<input type="text" inputmode="numeric" v-mask="cpf">
<input type="text" inputmode="decimal" v-mask-currency>
```

Um valor que já vem do servidor no `value` é formatado assim que a directive monta.

## Por JavaScript

```js
V.mask('12345678901', 'cpf');        // '123.456.789-01'
V.applyMask('1234', '99-99');        // '12-34'
V.unmask('123.456.789-01');          // '12345678901'
V.unmask('R$ 1.234,56', 'currency'); // '1234.56'

V.mask.currency('123456');           // 'R$ 1.234,56'
V.mask.currency('123456', { prefix: '', decimals: 0, thousands: ',' });
V.mask.percent('1250');              // '12,50%'
```

O objeto `V.mask` é chamável e também carrega os utilitários:

| Membro | O que é |
| --- | --- |
| `V.mask(valor, padrao)` | Aplica a máscara |
| `V.mask.apply` | O mesmo que `V.applyMask` |
| `V.mask.unmask` | Remove a formatação |
| `V.mask.register` | Registra uma máscara nomeada |
| `V.mask.currency` | Formata como moeda |
| `V.mask.percent` | Formata como porcentagem |
| `V.mask.presets` | O `Map` com todas as máscaras registradas |

## Criando máscaras

Por padrão de caracteres:

```js
V.registerMask('processo', '9999999-99.9999.9.99.9999');
V.registerMask('renavam', '99999999999');
```

Por função, para casos que mudam conforme o conteúdo:

```js
V.registerMask('inscricao', (valor) => {
  const digitos = valor.replace(/\D/g, '');
  return digitos.length <= 9
    ? V.applyMask(digitos, '999.999.999')
    : V.applyMask(digitos, '999.999.999.999');
});
```

```html
<input v-mask="processo">
<input v-mask="inscricao">
```

## Como o cursor é tratado

A implementação conta os caracteres significativos antes do cursor, reformata o texto e recoloca o
cursor depois do mesmo número de caracteres significativos. Por isso:

- editar o meio do texto não joga o cursor para o fim;
- apagar em cima de um separador remove o caractere útil anterior, e não só o ponto;
- máscaras numéricas mantêm o cursor no fim, antes do sufixo.

A propriedade `value` do input é substituída, de forma que ler `input.value` devolva o valor
limpo quando `.unmask` está ativo, e escrever nela sempre passe pela máscara. Ao desmontar, a
propriedade original é restaurada.

---

Anterior: [Validação](validacao.md) · Próximo: [Interface](interface.md)
