# Interface

Declarative interface components. Everything here works by writing HTML only: no JavaScript
is needed to have dropdowns, tabs, sidebars, tooltips, command palettes, and the rest.

Accessibility is not optional in this module: each component handles ARIA roles, keyboard
navigation, visible focus, Escape close, and `prefers-reduced-motion`.

CSS is injected on demand, only when the feature is used. All colors come from
`--v-*` variables, so everything works in light and dark themes. See [Theme and palette](tema-e-paleta.md).

---

## v-toggle

Shows and hides a target.

```html
<button v-toggle="#detalhes">Ver detalhes</button>
<div id="detalhes" style="display:none">...</div>

<button v-toggle.instant="#painel">Sem animação</button>
```

Without a selector, the target is the next sibling:

```html
<button v-toggle>Alternar</button>
<div style="display:none">Conteúdo</div>
```

The button receives `aria-controls` and `aria-expanded`, updated on each click, and fires
`voodoo:toggle` with `{ target, open }`.

## v-collapse and v-collapse-toggle

Panel that opens and closes with height animation.

```html
<button v-collapse-toggle="#faq-1">O que é a Voodoo?</button>
<div id="faq-1" v-collapse>
  <p>O framework JavaScript HTML-first.</p>
</div>

<div v-collapse="open">Começa aberto</div>
<div v-collapse v-collapse-duration="400">Animação mais lenta</div>
```

Multiple triggers can control the same panel. Each receives `aria-expanded` and `aria-controls`.
The panel fires `voodoo:collapse` with `{ open }`.

## v-dropdown and v-dropdown-menu

Dropdown menu with smart positioning and arrow key navigation.

```html
<button v-dropdown="#acoes">Ações</button>

<div id="acoes" v-dropdown-menu>
  <button v-click="editar()">Editar</button>
  <button v-click="duplicar()">Duplicar</button>
  <a href="/exportar">Exportar</a>
</div>
```

What happens automatically:

- the menu becomes `role="menu"` and each clickable child becomes `role="menuitem"`;
- up and down arrows navigate, `Home` and `End` go to the ends;
- `Escape` closes and returns focus to the trigger;
- clicking outside closes;
- the menu is moved to `body` while open, so no `overflow: hidden` cuts it off;
- it flips to the opposite side when it doesn't fit, and never goes off-screen.

`v-dropdown-position` chooses the preferred side: `top`, `bottom`, `left`, `right`.

```html
<button v-dropdown="#menu" v-dropdown-position="top">Abrir para cima</button>
```

## v-popover

Like dropdown, but with `role="dialog"` and focus trapped inside the panel. Use when the content
has form fields or more than one interactive element.

```html
<button v-popover="#filtros">Filtros</button>

<div id="filtros">
  <label>De <input type="date"></label>
  <label>Até <input type="date"></label>
  <button>Aplicar</button>
</div>
```

`v-popover-position` works like dropdown.

## v-tooltip

```html
<button v-tooltip="Exclui o registro para sempre" v-tooltip-position="right">
  Excluir
</button>

<span v-tooltip="Calculado sobre o valor bruto" v-tooltip-delay="600">?</span>
```

Appears on mouse hover and keyboard focus, disappears on Escape. Uses `role="tooltip"` and `aria-describedby`.
Default delay is 200 ms.

## v-tabs, v-tab and v-tab-panel

```html
<div v-tabs>
  <div role="tablist">
    <button v-tab="perfil">Perfil</button>
    <button v-tab="seguranca">Segurança</button>
    <button v-tab="cobranca">Cobrança</button>
  </div>

  <section v-tab-panel="perfil">...</section>
  <section v-tab-panel="seguranca">...</section>
  <section v-tab-panel="cobranca">...</section>
</div>
```

`tab`, `tablist`, and `tabpanel` roles are applied, arrow key navigation works on both axes,
`Home` and `End` go to the ends, and the active tab receives the `v-active` class.

To save the tab in the URL:

```html
<div v-tabs v-tabs-url="secao">...</div>
```

The chosen tab becomes `?secao=perfil`, without reloading the page.

Tabs within tabs work: each `v-tab` belongs to the closest `v-tabs`.

The `voodoo:tab` event is fired with `{ id }` on each change.

## v-accordion and v-accordion-item

Each item needs two children: the first is the header, the last is the panel.

```html
<div v-accordion v-accordion-single>
  <div v-accordion-item="open">
    <h3>Entrega</h3>
    <div>Enviamos em até dois dias úteis.</div>
  </div>

  <div v-accordion-item>
    <h3>Troca</h3>
    <div>Você tem 30 dias para trocar.</div>
  </div>
</div>
```

`v-accordion-single` keeps only one item open at a time. `v-accordion-item="open"` starts
open. Arrows navigate between headers and the indicator arrow rotates automatically via CSS.

## v-drawer, v-drawer-content and v-drawer-close

Sidebar with darkened backdrop, scroll lock, and trapped focus.

```html
<button v-drawer="#menu-lateral">Abrir menu</button>

<aside id="menu-lateral" v-drawer-content v-drawer-side="left">
  <button v-drawer-close>Fechar</button>
  <nav>...</nav>
</aside>
```

`v-drawer-side` accepts `left` (default `right`), `right`, `top`, and `bottom`. `v-offcanvas` is an
alias for `v-drawer`.

Escape closes, Tab cycles within the panel, focus returns to the trigger on close, and the
`voodoo:drawer` event fires with `{ open }`.

## Modal

```html
<button v-modal="#login">Entrar</button>

<div id="login" v-modal-content>
  <h2>Entrar</h2>
  <form v-submit="/api/login">
    <input name="email" type="email" v-required>
    <button>Entrar</button>
  </form>
  <button v-modal-close>Cancelar</button>
</div>
```

`v-modal-content` hides the block until it's adopted by a modal. Modifiers for
`v-modal`: `.close` closes instead of opening, `.toggle` toggles.

Via JavaScript:

```js
V.modal.open('#login', { size: 'sm' });
V.modal.close('#login');
V.modal.toggle('#login');
V.modal.closeAll();
V.modal.isOpen();          // any open
V.modal.isOpen('#login');
V.modal.opened;            // list of open ones
V.modal.count;             // how many are open
```

Options common to any dialog:

| Option | Default | What it does |
| --- | --- | --- |
| `size` | `md` | `sm`, `md`, `lg`, `xl`, `full` |
| `position` | `center` | `center` or `top` |
| `closeOnBackdrop` | `true` | Close when clicking the backdrop |
| `closeOnEscape` | `true` | Close on Escape |
| `lockScroll` | `true` | Lock page scrolling |
| `restoreFocus` | `true` | Restore focus on close |
| `closable` | `true` | Show close button |
| `plain` | `false` | Remove background, border, and shadow |
| `className` | | Extra classes on the panel |
| `initialFocus` | | Selector or element that receives focus |
| `ariaLabel` | | Label when there's no visible title |
| `onOpen`, `onClose` | | Callbacks |

`V.modal.open` returns a control with `close(result)` and `closed`, a promise resolved
when the dialog finishes closing.

## alert, confirm and prompt

```js
await V.alert('Pedido enviado com sucesso.', { icon: 'success' });

if (await V.confirm('Excluir o pedido?', { danger: true })) remover();

const nome = await V.prompt('Como devemos te chamar?', {
  required: true,
  placeholder: 'Seu nome',
  validate: (v) => (v.length >= 2 ? null : 'Nome muito curto.'),
});
```

`prompt` accepts `type` with `text`, `password`, `email`, `number`, and `textarea`. Validation that
returns text keeps the dialog open with the message.

Generic dialog with custom buttons:

```js
const escolha = await V.dialog({
  title: 'Publicar agora?',
  description: 'A alteração fica visível para todo mundo.',
  icon: 'question',
  buttons: [
    { label: 'Cancelar', variant: 'secondary', value: null },
    { label: 'Agendar', variant: 'ghost', value: 'agendar' },
    { label: 'Publicar', variant: 'primary', value: 'publicar', autofocus: true },
  ],
});
```

Icons: `info`, `success`, `warning`, `danger`, `question`, `none`. Tones: `default`, `success`,
`warning`, `danger`.

To change default button text:

```js
V.modal.labels({ confirm: 'Sim, pode', cancel: 'Voltar', ok: 'Entendi' });
```

All of this also exists as magic: `$modal`, `$dialog`, `$alert`, `$confirm`, `$prompt`.

## v-confirm

Intercepts the click, asks the question, and only allows the action after confirmation. Works with
`v-click`, `@click`, links, and submit buttons on the same element, because the guard runs in the
capture phase, before any other listener.

```html
<button v-confirm="Excluir mesmo?" v-click="excluir()">Excluir</button>
<button v-confirm.danger="Esta ação não pode ser desfeita." v-click="apagarConta()">Apagar conta</button>
<a v-confirm="Sair da sua conta?" href="/logout">Sair</a>
```

> Don't combine `v-confirm` with `v-get`, `v-post`, `v-put`, `v-patch`, `v-delete`, or `v-submit` on
> the same element: the question appears twice because those directives also read the same
> attribute. Prefer `v-click` with `$http`, like in the example above, or ask for confirmation with
> `$confirm(...)` inside the expression itself.

## Notifications

```js
V.toast('Neutral message');
V.toast.success('User saved!');
V.toast.error('Could not save');
V.toast.warning('Your session expires in 5 minutes');
V.toast.info('New version available');
const carregando = V.toast.loading('Sending...');
carregando.update({ title: 'Sent!', type: 'success', duration: 3000 });
carregando.close();

await V.toast.promise(salvar(), {
  loading: 'Saving...',
  success: (dados) => `Saved with id ${dados.id}`,
  error: 'Could not save',
});

V.toast.clear();
V.toast.configure({ duration: 6000, position: 'bottom-right', max: 3 });
```

Options: `title`, `description`, `type`, `duration` (`0` keeps it open), `position`,
`action: { label, onClick }`, `closable`, `html`, `onClose`.

Positions: `top-right` (default), `top-left`, `top-center`, `bottom-right`, `bottom-left`,
`bottom-center`.

```js
V.toast.success({
  title: 'Pedido criado',
  description: 'Você recebe o código por e-mail.',
  action: { label: 'Ver pedido', onClick: () => V.navigate('/pedidos/7') },
});
```

In HTML, use `$toast`:

```html
<button v-click="$toast.success('Copied!')">Copy</button>
```

## Command palette

```html
<button v-command="mod+k">Search commands</button>

<button v-command-item="Go to dashboard" v-command-hint="Ctrl+D" v-click="ir('/painel')">...</button>
<button v-command-item="Create new order" v-click="novoPedido()">...</button>
<button v-command-item="Toggle theme" v-theme-toggle>...</button>
```

`v-command` activates the global shortcut and click. Items are indexed when the palette opens,
so elements created by `v-for` are included too. Search ignores accents and case. Arrows navigate,
Enter executes (clicking the original element), Escape closes.

Without a value, the default shortcut is `mod+k`. `v-command-key` also sets the combination.

## Focus

```html
<input v-focus>                          <!-- focus on mount -->
<input v-focus.select>                   <!-- focus and select text -->
<input v-focus.quiet>                    <!-- focus without scrolling -->
<input v-focus="painelAberto">           <!-- focus when expression is true -->

<div v-focus-trap="modalAberto">...</div>  <!-- trap Tab inside -->
```

## Reacting to clicks outside and Escape

```html
<div v-click-outside="aberto = false">...</div>
<div v-escape="fechar()">...</div>
```

Unlike `@outside`, these two listen to `pointerdown` and `keydown` on `document`, and work
even when the element doesn't have its own state.

## Scrolling

```html
<a href="#precos" v-scroll-to v-scroll-offset="80">Pricing</a>
<button v-scroll-to="top">Back to top</button>
<button v-scroll-to="#rodape">Go to footer</button>

<nav v-scrollspy v-scrollspy-class="ativo" v-scroll-offset="80">
  <a href="#sobre">About</a>
  <a href="#precos">Pricing</a>
</nav>

<header v-sticky="0">...</header>
```

`v-scroll-to` respects `prefers-reduced-motion` and moves focus to the section, keeping
keyboard navigation coherent. `v-scrollspy` marks the visible section's link with the chosen class
and `aria-current`. `v-sticky` applies `position: sticky` and adds `v-stuck` when the element sticks.

## Entering screen and infinite scroll

```html
<div v-visible="animar()">Animate on enter</div>
<div v-visible.repeat="contar()">Every time it enters</div>

<ul v-infinite-scroll="carregarMais()" v-infinite-distance="400px">
  <li v-for="item in itens">{ item.nome }</li>
</ul>
```

`v-infinite-scroll` inserts an invisible sentinel at the end of the list, marks `aria-busy` while
loading, and waits for the promise returned by the expression before firing again.

## Lazy images

```html
<img v-lazy-src="/fotos/grande.jpg" alt="Praia">
<div v-lazy-bg="/fotos/capa.jpg"></div>
<img v-lazy-src="/fotos/x.jpg" v-lazy-error="/fotos/placeholder.png" alt="">
```

The image is only fetched when the element is within 200 pixels of the viewport. The `v-lazy`,
`v-lazy-loaded`, and `v-lazy-failed` classes control the transition.

## Loading skeleton

```html
<div v-skeleton="carregando">
  <p>{ usuario.nome }</p>
</div>

<div v-skeleton>Filled later by a request</div>
```

With an expression, the skeleton follows the value. Without an expression, it appears while the element
is empty and disappears when content arrives.

## Copy, print, share, download and fullscreen

```html
<button v-copy="PROMO10">Copy coupon</button>
<button v-copy-from="#chave-da-api">Copy key</button>
<button v-copy="PROMO10" v-copy-label="Copied successfully!">Copy</button>

<button v-print>Print page</button>
<button v-print="#recibo">Print only receipt</button>

<button v-share v-share-title="Check this out" v-share-text="I found this interesting">Share</button>

<button v-download="/arquivos/relatorio.pdf" v-download-name="relatorio-2026.pdf">Download</button>

<button v-fullscreen="#player">Fullscreen</button>
```

`v-copy` uses the modern API with a fallback for older browsers, shows visual confirmation, and
announces via an `aria-live` region. `v-share` uses the native API when available, and falls back to copying the
link when not. `v-print` prints only the requested section, inheriting the page's CSS.

## Resize

```html
<div v-resizable>Drag edge</div>
<div v-resizable="horizontal">Width only</div>
<div v-resizable="vertical">Height only</div>
```

Handles accept keyboard: with focus on them, arrow keys change size in 16-pixel steps, or 4-pixel
with Shift. The `voodoo:resized` event carries `{ width, height }`.

## Theme

```html
<button v-theme-toggle>Toggle theme</button>
```

The button receives `aria-pressed`, `aria-label`, and `data-v-theme` with the current theme. See
[Theme and palette](tema-e-paleta.md).

## Inactivity and connection

```html
<div v-idle="showSessionWarning()" v-idle-after="5m"></div>

<div v-online="$toast.success('Connection restored')"></div>
<div v-offline="$toast.warning('You are offline')"></div>
<div v-offline.no-immediate="warn()"></div>
<div v-online.immediate="sync()"></div>
```

`v-idle` fires after 60 seconds without activity by default. `v-offline` also fires on mount when the browser is already offline, and `.no-immediate` disables that first fire.
`v-online` only fires on mount with `.immediate`.

## Transitions

`v-transition` adds enter and exit classes to `v-if` and `v-show`:

```html
<div v-show="aberto" v-transition="fade" v-duration="300">...</div>
```

Via JavaScript, there are ready-made shortcuts:

```js
V.fadeIn(el);
V.fadeOut(el);
V.slideDown(el, 300);
V.slideUp(el, 300);
V.enter(el, { name: 'v-fade' });
V.leave(el, { name: 'v-fade' });
V.viewTransition(() => changeContent());
```

---

Previous: [Masks](mascaras.md) · Next: [Drag and drop](arrastar-e-soltar.md)
