# Tema e paleta

A Voodoo.js tem dois sistemas complementares: o **tema**, que alterna entre claro e escuro, e a
**paleta**, que gera todas as cores da interface a partir de poucas cores base.

---

# Tema claro e escuro

O tema é aplicado no elemento raiz, com o atributo `data-theme`:

```html
<html data-theme="dark">
```

Quando o usuário nunca escolheu, o atributo não existe e vale a preferência do sistema, lida por
`prefers-color-scheme`.

## No HTML

```html
<button v-theme-toggle>Alternar tema</button>
```

O botão recebe `aria-pressed`, um `aria-label` descritivo e `data-v-theme` com o tema em uso.

## Por JavaScript

```js
V.theme.current;    // 'light', 'dark' ou 'system'
V.theme.resolved;   // 'light' ou 'dark', já resolvendo 'system'
V.theme.set('dark');
V.theme.set('system');
V.theme.toggle();   // devolve o tema aplicado
V.theme.apply();    // reaplica o tema atual
V.theme.init();     // aplica o salvo e passa a acompanhar o sistema
```

A escolha fica no `localStorage`, na chave `voodoo:theme`, e é aplicada automaticamente pelos
builds de navegador antes do primeiro render, o que evita o piscar branco.

## Reagindo à troca

```js
document.addEventListener('voodoo:theme', (e) => {
  console.log(e.detail.theme, e.detail.resolved);
});
```

```html
<div v-show="$theme.resolved === 'dark'">Você está no tema escuro</div>
```

## Escrevendo CSS que segue o tema

```css
.minha-caixa {
  background: var(--v-surface);
  color: var(--v-text);
  border: 1px solid var(--v-border);
  border-radius: var(--v-radius);
  box-shadow: var(--v-shadow);
}
```

Como as variáveis já mudam com o tema, você não precisa escrever duas versões da regra.

---

# Paleta

`V.palette()` gera, a partir de poucas cores base, a escala completa de tons de 50 a 900, a versão
de tema escuro e a cor de texto com melhor contraste sobre cada cor, tudo escrito como variáveis
CSS no `:root`.

O cálculo acontece em OKLCH, um espaço perceptualmente uniforme: degraus com a mesma diferença de
luminância parecem igualmente distantes para o olho, o que não acontece em HSL. A cor de texto usa
o cálculo real de luminância relativa da WCAG, então o resultado é sempre legível.

## Aplicando

```js
V.palette({ primary: '#6D3BF5', accent: '#FF3D8B', radius: '12px', font: 'Inter' });
V.palette({ preset: 'oceano' });
```

| Opção | O que faz |
| --- | --- |
| `preset` | Ponto de partida. As cores informadas sobrescrevem |
| `primary`, `accent`, `success`, `warning`, `danger`, `info` | Cores base |
| `neutral` | Cor que tinge fundos, textos e bordas. Padrão: a matiz da primária |
| `radius` | Raio das bordas, como `12px` ou `0.75rem` |
| `font` | Família principal. A página continua responsável por carregar a fonte |
| `monoFont` | Família monoespaçada, usada por `VCodeBlock` |
| `persist` | Salva a escolha no `localStorage`. Padrão `true` |

## Presets

| Nome | Primária | Realce |
| --- | --- | --- |
| `violeta` | `#6D3BF5` | `#FF3D8B` |
| `oceano` | `#0E7BC4` | `#0FB5C9` |
| `floresta` | `#1F8A4C` | `#7FA80E` |
| `poente` | `#E4632A` | `#D62F63` |
| `grafite` | `#4C5A70` | `#2E7FD1` |

Todos têm contraste verificado nos dois temas.

```js
V.palette.use('floresta');   // troca só o preset, mantendo raio e fonte
V.palette.names;             // ['violeta', 'oceano', 'floresta', 'poente', 'grafite']
V.palette.reset();           // volta ao padrão e apaga a escolha salva
V.palette.current;           // paleta em uso, com todas as escalas
V.palette.options;           // opções da última aplicação
```

## Um seletor de paleta

```html
<div v-data="{ presets: ['violeta', 'oceano', 'floresta', 'poente', 'grafite'] }">
  <button v-for="p in presets" v-click="trocarPaleta(p)">{ p }</button>
</div>
```

```js
V.data({ trocarPaleta: (nome) => V.palette.use(nome) });
```

## Tokens CSS

Sempre presentes, com valor padrão embutido, mesmo sem chamar `V.palette()`:

| Token | Para que serve |
| --- | --- |
| `--v-primary`, `--v-primary-hover`, `--v-primary-contrast` | Cor principal |
| `--v-accent` | Cor de realce |
| `--v-success`, `--v-warning`, `--v-danger`, `--v-info` | Estados |
| `--v-surface`, `--v-surface-2` | Fundos |
| `--v-text`, `--v-text-muted` | Textos |
| `--v-border` | Bordas |
| `--v-radius`, `--v-radius-sm` | Raios |
| `--v-shadow` | Sombra |
| `--v-ease` | Curva das transições |
| `--v-z-modal`, `--v-z-drawer`, `--v-z-dropdown`, `--v-z-toast`, `--v-z-tooltip` | Camadas |

Depois de `V.palette()`, o conjunto cresce:

| Token | Para que serve |
| --- | --- |
| `--v-surface-3`, `--v-surface-inset` | Fundos intermediários |
| `--v-text-soft` | Texto ainda mais suave |
| `--v-border-strong` | Borda de contraste maior |
| `--v-overlay` | Fundo escurecido dos diálogos |
| `--v-shadow-sm`, `--v-shadow-lg` | Sombras menor e maior |
| `--v-radius-lg`, `--v-radius-xl`, `--v-radius-full` | Raios maiores |
| `--v-focus-ring` | Cor do anel de foco |
| `--v-font-sans`, `--v-font-mono` | Famílias tipográficas |
| Escalas de 50 a 900 para cada cor base | Tons derivados |

## Cores derivadas

```js
V.palette.scale('#6D3BF5')['700'];        // tom escuro da escala
V.palette.scale('#6D3BF5', true);         // escala do tema escuro
V.palette.contrastText('#6D3BF5');        // '#fff' ou '#000', o que ler melhor
V.palette.contrastRatio('#6D3BF5', '#fff');  // razão WCAG, de 1 a 21
V.palette.luminance('#6D3BF5');           // luminância relativa

V.palette.convert.parseColor('rgb(109, 59, 245)');
V.palette.convert.rgbToOklch({ r: 109, g: 59, b: 245 });
V.palette.convert.oklchToRgb({ l: 0.5, c: 0.2, h: 280 });
V.palette.convert.toHex({ r: 109, g: 59, b: 245 });
V.palette.convert.toRgba({ r: 109, g: 59, b: 245 }, 0.4);
```

Use `contrastRatio` para conferir contraste durante o desenvolvimento: 4.5 é o mínimo da WCAG AA
para texto normal, e 3 para texto grande.

## Persistência

Por padrão a paleta é salva em `localStorage`, na chave `voodoo:palette`, e reaplicada no
carregamento seguinte, antes do primeiro render. Para não salvar:

```js
V.palette({ preset: 'oceano', persist: false });
```

## Reagindo à troca

```js
document.addEventListener('voodoo:palette', (e) => {
  console.log(e.detail.colors, e.detail.css);
});
```

## Desligando o CSS injetado

Se você prefere escrever todo o CSS por conta própria:

```html
<script src="voodoo.full.min.js" data-no-styles defer></script>
```

Nenhum estilo é injetado. Os componentes continuam funcionando, mas sem aparência, e você fica
responsável por escrever as regras das classes `v-*`.

## Tokens e Tailwind

Se você usa Tailwind, aponte as cores para as variáveis e as duas coisas passam a andar juntas:

```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        primary: 'var(--v-primary)',
        accent: 'var(--v-accent)',
        surface: 'var(--v-surface)',
      },
      borderRadius: { DEFAULT: 'var(--v-radius)' },
    },
  },
};
```

---

Anterior: [Idiomas](idiomas.md) · Próximo: [Devtools](devtools.md)
