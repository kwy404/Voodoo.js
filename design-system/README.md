# Voodoo.js Design System

> JavaScript feels like magic.

Design system oficial do **Voodoo.js**, escrito em CSS puro. Sem dependências,
sem etapa de build, sem framework. São cinco arquivos de texto que qualquer
navegador entende ao abrir.

Abra `index.html` para ver a vitrine completa com todos os componentes
renderizados e o HTML de cada um.

---

## Sumário

1. [Filosofia](#filosofia)
2. [Instalação](#instalação)
3. [Estrutura dos arquivos](#estrutura-dos-arquivos)
4. [Tokens principais](#tokens-principais)
5. [Convenção de nomes](#convenção-de-nomes)
6. [Como estender](#como-estender)
7. [Tema claro e escuro](#tema-claro-e-escuro)
8. [Checklist de acessibilidade](#checklist-de-acessibilidade)

---

## Filosofia

O Voodoo.js Design System nasce de quatro decisões que valem para tudo que
existe aqui dentro.

**1. Token é a única fonte de verdade.**
Nenhum componente escreve `#6D3BF5`, `16px` ou `200ms`. Todo valor vem de uma
variável CSS declarada em `tokens.css`. Trocar a identidade visual do produto
inteiro é editar um arquivo, não trezentos seletores.

**2. A plataforma antes da biblioteca.**
O accordion é `<details>`. O checkbox é `<input type="checkbox">`. As abas usam
`role="tab"` com `aria-selected`. Isso significa teclado, leitor de tela,
busca do navegador e impressão funcionando de graça, sem JavaScript obrigatório.

**3. Estado que o CSS lê é o mesmo estado que o leitor de tela lê.**
Quando existe um atributo ARIA capaz de descrever a situação, o seletor usa o
atributo, não uma classe paralela. Um modal aberto é
`.v-modal-root[aria-hidden="false"]`. Assim é impossível o visual dizer uma
coisa e a tecnologia assistiva dizer outra.

**4. Zero fricção para adotar.**
Um `<link>` e a interface já está de pé, em tema claro e escuro, responsiva,
com foco visível. Nada de instalar, compilar ou configurar.

---

## Instalação

### Opção A: um arquivo só

```html
<link rel="stylesheet" href="design-system/voodoo-ui.css">
```

O `voodoo-ui.css` faz `@import` dos quatro arquivos na ordem correta. É o
caminho mais curto, ideal para protótipos e páginas internas.

### Opção B: quatro arquivos (recomendado em produção)

Cada `@import` gera uma requisição em série, então em produção prefira linkar
os arquivos diretamente. A ordem é obrigatória.

```html
<link rel="stylesheet" href="design-system/tokens.css">
<link rel="stylesheet" href="design-system/reset.css">
<link rel="stylesheet" href="design-system/components.css">
<link rel="stylesheet" href="design-system/utilities.css">
```

Por que essa ordem:

| Ordem | Arquivo | Motivo |
| :--- | :--- | :--- |
| 1 | `tokens.css` | Define as variáveis que todo o resto consome. |
| 2 | `reset.css` | Normaliza o navegador já usando os tokens. |
| 3 | `components.css` | Desenha os componentes a partir dos tokens. |
| 4 | `utilities.css` | Vem por último para conseguir vencer os componentes. |

### Fontes (opcional)

As fontes da marca são opcionais. Se você não carregar nenhuma, os fallbacks
`system-ui` e `ui-monospace` assumem e a página continua correta.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;500&display=swap">
```

### Script de tema (opcional, 8 linhas)

Coloque no `<head>`, antes do CSS, para evitar a piscada de cor no
carregamento. Todo acesso ao `localStorage` fica em `try/catch` porque o
navegador pode bloquear armazenamento em janela anônima.

```html
<script>
  (function () {
    var escolha = null;
    try { escolha = localStorage.getItem("voodoo-theme"); } catch (e) {}
    if (escolha !== "light" && escolha !== "dark") {
      escolha = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.setAttribute("data-theme", escolha);
  })();
</script>
```

---

## Estrutura dos arquivos

```
design-system/
├── tokens.css       Design tokens: cores, tipografia, espaço, raio, sombra, tempo
├── reset.css        Normalização moderna do navegador
├── components.css   23 famílias de componentes prefixados com "v-"
├── utilities.css    Utilitários de layout, espaçamento, tipografia e visibilidade
├── voodoo-ui.css    Pacote único que importa os quatro acima
├── index.html       Vitrine viva com exemplos e código de cada componente
└── README.md        Este documento
```

---

## Tokens principais

### Cores semânticas

São as únicas cores que mudam com o tema, e as únicas que os componentes devem
consumir. A paleta bruta (`--v-purple-500`, `--v-ink-900` e companhia) existe
para alimentar estas, não para ser usada direto na interface.

| Token | Tema claro | Tema escuro | Uso |
| :--- | :--- | :--- | :--- |
| `--v-color-bg` | `#FBF7F2` creme | `#14111F` tinta escura | Fundo da página |
| `--v-surface` | `#FFFFFF` | `#1C182B` | Cards, modais, campos |
| `--v-surface-2` | `#F6F0E8` | `#2A2440` tinta média | Rodapés, cabeçalhos de tabela |
| `--v-surface-3` | `#EDE4D8` areia | `#352E4F` | Trilhos de progresso e switch |
| `--v-text` | `#14111F` | `#FBF7F2` | Texto principal |
| `--v-text-muted` | `#555066` | `#B9B0C4` | Texto de apoio |
| `--v-border` | `#E3D9CC` | `#372F52` | Bordas e divisórias |
| `--v-primary` | `#6D3BF5` roxo | `#7B52F7` | Ação principal |
| `--v-primary-hover` | `#5B2EDB` | `#8F6BFF` | Hover da ação principal |
| `--v-primary-contrast` | `#FFFFFF` | `#FFFFFF` | Texto sobre a cor primária |
| `--v-accent` | `#FF3D8B` magenta | `#FF3D8B` | Destaques e gradientes |
| `--v-success` | `#0F7A57` | `#2ED9A5` menta | Confirmação |
| `--v-warning` | `#A35A08` | `#FFB35C` âmbar | Atenção |
| `--v-danger` | `#C42A2A` | `#FF4D4D` | Erro e destruição |
| `--v-info` | `#5B2EDB` | `#9B7BFF` | Informação neutra |

Cada cor de estado tem uma companheira `*-soft` para fundo de badge e alerta,
por exemplo `--v-success-soft`.

### Escalas brutas

| Família | Passos | Referência da marca |
| :--- | :--- | :--- |
| `--v-purple-*` | 50 a 900 | 500 é `#6D3BF5`, 400 é `#9B7BFF` |
| `--v-magenta-*` | 50 a 900 | 500 é `#FF3D8B` |
| `--v-ink-*` | 50 a 900 | 50 é creme, 100 é areia, 800 é tinta média, 900 é tinta escura |
| `--v-mint-*` | 100 a 900 | 500 é `#2ED9A5` |
| `--v-amber-*` | 100 a 900 | 500 é `#FFB35C` |
| `--v-red-*` | 100 a 900 | 500 é `#FF4D4D` |

### Tipografia

| Token | Valor |
| :--- | :--- |
| `--v-font-display` | `"Space Grotesk", "Inter", system-ui, sans-serif` |
| `--v-font-sans` | `"Inter", system-ui, sans-serif` |
| `--v-font-mono` | `"JetBrains Mono", ui-monospace, monospace` |
| `--v-text-xs` a `--v-text-4xl` | 12, 14, 16, 18, 22, 28, 36 e 48 pixels |
| `--v-weight-regular` a `--v-weight-bold` | 400, 500, 600, 700 |
| `--v-leading-tight` a `--v-leading-relaxed` | 1.15, 1.3, 1.6, 1.8 |
| `--v-tracking-tight`, `--v-tracking-wide` | `-0.02em`, `0.08em` |

### Espaçamento, raio, sombra e tempo

| Categoria | Tokens | Valores |
| :--- | :--- | :--- |
| Espaço | `--v-space-1` a `--v-space-16` | Escala de 4px: 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64 |
| Raio | `--v-radius-sm/md/lg/xl/full` | 6px, 10px, 16px, 24px, 999px |
| Sombra | `--v-shadow-sm/md/lg/glow` | A `glow` é o brilho roxo da marca |
| Camada | `--v-z-dropdown/sticky/backdrop/modal/toast/tooltip` | 1000, 1100, 1200, 1300, 1400, 1500 |
| Duração | `--v-duration-fast/base/slow/slower` | 120ms, 200ms, 320ms, 600ms |
| Curva | `--v-ease-out/in-out/spring` | A `spring` dá o pequeno salto do switch e do checkbox |
| Container | `--v-container-sm/md/lg/xl/full` | 640, 768, 1024, 1280, 1440 pixels |

---

## Convenção de nomes

### Tokens

```
--v-<categoria>-<variação>

--v-color-bg        cor semântica
--v-purple-500      paleta bruta, passo da escala
--v-space-6         escala de espaçamento
--v-radius-lg       raio
--v-z-modal         camada
```

O prefixo `v` de Voodoo garante que nada aqui colida com outro CSS presente na
página.

### Classes

O padrão é BEM com prefixo, mais uma família separada de estados.

```
.v-bloco                bloco:        .v-card, .v-btn, .v-toast
.v-bloco__elemento      elemento:     .v-card__header, .v-toast__progress
.v-bloco--modificador   modificador:  .v-btn--primary, .v-badge--success
.is-estado              estado:       .is-open, .is-loading, .is-active
```

Regras práticas:

- Modificador **nunca** vem sozinho. Sempre `class="v-btn v-btn--primary"`.
- Estado sempre acompanha o bloco: `class="v-btn v-btn--primary is-loading"`.
- Quando um atributo ARIA já descreve o estado, o CSS usa o atributo em vez de
  uma classe: `[aria-selected="true"]`, `[aria-current="page"]`,
  `[aria-invalid="true"]`, `[aria-hidden="false"]`, `[open]`, `:checked`,
  `:disabled`.
- Utilitário resolve ajuste pontual: `v-mt-4`, `v-text-muted`, `v-truncate`.
  Se você repete os mesmos cinco utilitários toda vez no mesmo arranjo, aquilo
  virou componente e deve ir para `components.css`.

---

## Como estender

### Criar um token novo

Declare no `:root` puro, em um arquivo carregado **depois** de `tokens.css`.
Se o token muda com o tema, ele precisa existir nos três lugares: `:root`, o
bloco de preferência do sistema e o bloco `data-theme="dark"`.

```css
/* meu-produto.css, carregado depois de tokens.css */

:root {
  --v-brand-nebula: #7B2FF7;
  --v-surface-elevated: #FFFFFF;   /* muda com o tema */
  --v-space-20: 5rem;              /* continua na escala de 4px */
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --v-surface-elevated: #241F38;
  }
}

:root[data-theme="dark"] {
  --v-surface-elevated: #241F38;
}
```

### Criar um componente novo

Só consuma tokens, nunca valores fixos.

```css
.v-painel {
  display: flex;
  flex-direction: column;
  gap: var(--v-space-4);
  padding: var(--v-space-6);
  background-color: var(--v-surface-elevated);
  border: var(--v-border-width) solid var(--v-border);
  border-radius: var(--v-radius-lg);
  box-shadow: var(--v-shadow-md);
  transition: box-shadow var(--v-duration-base) var(--v-ease-out);
}

.v-painel--destaque { box-shadow: var(--v-shadow-glow); }
.v-painel.is-collapsed { padding-block: var(--v-space-3); }
```

### Trocar a marca inteira

Sobrescreva apenas as cores semânticas. Todos os componentes acompanham sem
nenhuma outra alteração.

```css
:root {
  --v-primary: #0F62FE;
  --v-primary-hover: #0043CE;
  --v-accent: #FF7EB6;
}
```

### Ajustar um componente pontualmente

Prefira uma variante nova a editar `components.css`, que é o arquivo que você
vai querer atualizar sem conflito no futuro.

```css
.v-btn--marca {
  --v-btn-bg: var(--v-brand-nebula);
  --v-btn-bg-hover: var(--v-primary-hover);
  --v-btn-fg: var(--v-white);
  --v-btn-border: var(--v-brand-nebula);
}
```

Os botões expõem `--v-btn-bg`, `--v-btn-fg`, `--v-btn-border`,
`--v-btn-bg-hover`, `--v-btn-height`, `--v-btn-padding` e `--v-btn-font` como
pontos de extensão. Os alertas expõem `--v-alert-accent` e `--v-alert-bg`,
e os toasts expõem `--v-toast-accent`.

---

## Tema claro e escuro

### Como funciona

O tema claro vive no `:root` puro. **Nenhuma cor existe somente dentro de um
bloco de tema**, então qualquer variável tem sempre um valor válido, mesmo em
navegador antigo que ignore os blocos abaixo.

O tema escuro é aplicado em dois lugares, e apenas as variáveis semânticas são
redefinidas:

```css
/* 1. Automático: o sistema pede escuro e o usuário não forçou claro */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* ... */ }
}

/* 2. Manual: o usuário escolheu escuro, o sistema não importa */
:root[data-theme="dark"] { /* ... */ }
```

Essa dupla faz o alternador funcionar nos dois sentidos:

| `data-theme` no `<html>` | Sistema claro | Sistema escuro |
| :--- | :--- | :--- |
| ausente | claro | escuro |
| `"light"` | claro | claro |
| `"dark"` | escuro | escuro |

### Regras ao escrever CSS novo

1. Nunca use uma cor da paleta bruta direto em componente. Use a semântica.
2. Toda cor nova precisa nascer no `:root` puro antes de aparecer em qualquer
   bloco de tema.
3. Se a cor muda com o tema, declare nos três lugares. Esquecer o bloco
   `data-theme="dark"` quebra o alternador manual em máquinas com sistema claro.
4. Não confie em `color-scheme` para pintar seu componente. Ele só ajusta
   controles nativos e barras de rolagem.
5. Teste o componente nos dois temas antes de dar merge. A vitrine tem um
   alternador no topo justamente para isso.

---

## Checklist de acessibilidade

Rode esta lista antes de publicar qualquer tela construída com o design system.

### Estrutura

- [ ] A página tem um `<h1>` e os títulos descem sem pular nível.
- [ ] Existe um link "pular para o conteúdo" (`.v-skip-link`) como primeiro
      elemento focável do `<body>`.
- [ ] Regiões usam marcação semântica: `<header>`, `<nav>`, `<main>`,
      `<aside>`, `<footer>`.
- [ ] Cada `<nav>` repetido tem `aria-label` próprio.

### Teclado

- [ ] Tudo que é clicável é alcançável por `Tab`, na ordem visual.
- [ ] O foco é sempre visível. O anel de `:focus-visible` nunca foi removido
      sem substituto.
- [ ] Abas respondem às setas, `Home` e `End`.
- [ ] Modal, drawer e dropdown fecham com `Esc`.
- [ ] Ao abrir um diálogo, o foco entra nele. Ao fechar, volta para o botão que
      o abriu.

### Formulários

- [ ] Todo controle tem `<label>` associado por `for` ou envolvendo o campo.
- [ ] Texto de apoio está ligado por `aria-describedby`.
- [ ] Campo com erro tem `aria-invalid="true"` e `aria-describedby` apontando
      para a mensagem `.v-field-error`.
- [ ] O erro é escrito em texto, não apenas em cor de borda.
- [ ] Campos obrigatórios têm `required` além do asterisco visual de
      `.v-label--required`.

### Conteúdo dinâmico

- [ ] A pilha de toasts é `role="region"` com `aria-live="polite"`.
- [ ] Erros que interrompem usam `role="alert"`. Avisos usam `role="status"`.
- [ ] Botão em carregamento tem `aria-busy="true"` e mantém o rótulo no DOM.
- [ ] Esqueleto de carregamento é `aria-hidden="true"` e vem acompanhado de um
      texto em `.v-sr-only`.
- [ ] Barra de progresso tem `role="progressbar"` com `aria-valuenow`,
      `aria-valuemin` e `aria-valuemax`, ou apenas `aria-label` quando é
      indeterminada.

### Cor e contraste

- [ ] Texto normal tem contraste mínimo de 4,5 para 1 contra o fundo, nos dois
      temas. Todas as cores semânticas de texto do sistema atendem a esse piso
      no estado de repouso.
- [ ] Cor nunca é o único portador de informação. Badge de status também traz
      o texto do status.
- [ ] Ícones puramente decorativos levam `aria-hidden="true"`.
- [ ] Botões que só têm ícone levam `aria-label`.

### Movimento e responsividade

- [ ] `prefers-reduced-motion` é respeitado. O reset já reduz animações e
      transições para quase zero.
- [ ] Nenhuma tela produz rolagem horizontal. Tabelas ficam em
      `.v-table-wrap` e blocos de código em `.v-pre`, que rolam dentro de si.
- [ ] O layout continua legível com zoom de 200 por cento.
- [ ] Alvos de toque têm ao menos 40 pixels de altura. O botão médio tem 40 e
      o grande tem 48.

---

## Licença e créditos

Design system interno do Voodoo.js. Escrito em CSS puro, sem dependências de
terceiros. As fontes Space Grotesk, Inter e JetBrains Mono são opcionais e
distribuídas sob licenças próprias pelas suas respectivas famílias.
