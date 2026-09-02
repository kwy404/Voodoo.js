# Masks

Input masks that preserve cursor position, even when the user edits the middle
of the text or deletes a separator.

```html
<input v-mask="cpf">
<input v-mask="(99) 99999-9999">
<input v-mask.unmask="cpf" v-model="form.cpf">
<input v-mask-currency v-mask-decimals="2">
```

## Built-in masks

| Name | Format | Example |
| --- | --- | --- |
| `cpf` | `999.999.999-99` | `123.456.789-01` |
| `cnpj` | `99.999.999/9999-99` | `12.345.678/0001-90` |
| `cpfcnpj` | Switches automatically based on size | `123.456.789-01` or `12.345.678/0001-90` |
| `cep` | `99999-999` | `01001-000` |
| `phone` | `(99) 9999-9999` or `(99) 99999-9999` | `(11) 98765-4321` |
| `date` | `99/99/9999` | `28/08/2026` |
| `time` | `99:99` | `14:30` |
| `datetime` | `99/99/9999 99:99` | `28/08/2026 14:30` |
| `currency` | Currency, typing from right to left | `R$ 1.234,56` |
| `percent` | Percentage, same style | `12,50%` |
| `card` | Card, with correct format for American Express | `4111 1111 1111 1111` |
| `cvv` | Up to four digits | `123` |
| `plate` | Old or Mercosul plate, chosen by content | `ABC-1234` or `ABC1D23` |
| `hex` | Hexadecimal color | `#6D3BF5` |
| `ip` | IPv4 address, each group limited to 255 | `192.168.0.1` |

```html
<input v-mask="cpf" v-cpf>
<input v-mask="cpfcnpj" placeholder="CPF ou CNPJ">
<input v-mask="phone" v-phone>
<input v-mask="plate">
<input v-mask="hex" v-model="cor">
```

## Mask by character pattern

When the value is not the name of a known mask, it is read as a pattern:

```html
<input v-mask="(99) 99999-9999">
<input v-mask="AAA-9999">
<input v-mask="SSSS SSSS">
<input v-mask="\R\S 9999">
```

Tokens:

| Token | Accepts |
| --- | --- |
| `9` | Digit |
| `A` | Letter, with accent |
| `S` | Letter or digit |
| `*` | Any character |
| `\` | Escapes the next character, making it literal |

Any other character in the pattern enters as a fixed separator and only appears when there is still
content after it.

## v-model and clean value

By default, the state receives the formatted text. With `.unmask` (or `.raw`), it receives the clean value,
while the screen continues to show the mask:

```html
<div v-data="{ form: { cpf: '' } }">
  <input v-mask.unmask="cpf" v-model="form.cpf">
  <p>Sent to server: { form.cpf }</p>   <!-- 12345678901 -->
</div>
```

For numeric masks, the clean value is the number as text, ready to become `Number`:

```html
<input v-mask-currency.unmask v-model="product.price">
<!-- on screen: R$ 1.234,56, in state: 1234.56 -->
```

`v-mask` runs before `v-model`, so the state never sees the value halfway.

## Currency and percentage

`v-mask-currency` types from right to left, like a calculator:

```html
<input v-mask-currency>                      <!-- R$ 1.234,56 -->
<input v-mask-currency="US$ ">               <!-- US$ 1.234,56 -->
<input v-mask-currency v-mask-decimals="0">  <!-- R$ 1.234 -->
<input v-mask-currency v-mask-suffix=" /month">
<input v-mask-currency.plain>                <!-- 1.234,56, no prefix -->
<input v-mask-currency.dot>                  <!-- 1,234.56, in US format -->
```

| Setting | Where |
| --- | --- |
| Prefix | The directive's value itself, or `v-mask-prefix` |
| Suffix | `v-mask-suffix` |
| Decimal places | `v-mask-decimals`. Default 2 |
| Inverted separators | `.dot` modifier |
| No prefix | `.plain` modifier |
| Clean value in state | `.unmask` or `.raw` modifier |

For percentage there is a named mask:

```html
<input v-mask="percent">
```

## Precautions

`v-mask` needs `<input>` or `<textarea>` with text type. Types like `number`, `range`,
`date`, and `color` don't accept masks because the browser already controls the value. Use `type="text"`
with `inputmode`:

```html
<input type="text" inputmode="numeric" v-mask="cpf">
<input type="text" inputmode="decimal" v-mask-currency>
```

A value that already comes from the server in `value` is formatted as soon as the directive mounts.

## Via JavaScript

```js
V.mask('12345678901', 'cpf');        // '123.456.789-01'
V.applyMask('1234', '99-99');        // '12-34'
V.unmask('123.456.789-01');          // '12345678901'
V.unmask('R$ 1.234,56', 'currency'); // '1234.56'

V.mask.currency('123456');           // 'R$ 1.234,56'
V.mask.currency('123456', { prefix: '', decimals: 0, thousands: ',' });
V.mask.percent('1250');              // '12,50%'
```

The `V.mask` object is callable and also carries the utilities:

| Member | What it is |
| --- | --- |
| `V.mask(value, pattern)` | Applies the mask |
| `V.mask.apply` | Same as `V.applyMask` |
| `V.mask.unmask` | Removes formatting |
| `V.mask.register` | Registers a named mask |
| `V.mask.currency` | Formats as currency |
| `V.mask.percent` | Formats as percentage |
| `V.mask.presets` | The `Map` with all registered masks |

## Creating masks

By character pattern:

```js
V.registerMask('process', '9999999-99.9999.9.99.9999');
V.registerMask('renavam', '99999999999');
```

By function, for cases that change based on content:

```js
V.registerMask('registration', (value) => {
  const digits = value.replace(/\D/g, '');
  return digits.length <= 9
    ? V.applyMask(digits, '999.999.999')
    : V.applyMask(digits, '999.999.999.999');
});
```

```html
<input v-mask="process">
<input v-mask="registration">
```

## How cursor position is handled

The implementation counts significant characters before the cursor, reformats the text, and replaces the
cursor after the same number of significant characters. Because of this:

- editing the middle of the text doesn't move the cursor to the end;
- deleting on top of a separator removes the useful character before it, not just the dot;
- numeric masks keep the cursor at the end, before the suffix.

The input's `value` property is replaced so that reading `input.value` returns the clean value
when `.unmask` is active, and writing to it always goes through the mask. On unmount, the
original property is restored.

---

Previous: [Validation](validacao.md) · Next: [Interface](interface.md)
