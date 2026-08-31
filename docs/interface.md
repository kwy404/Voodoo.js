# Interface

Componentes de interface declarativos. Tudo aqui funciona escrevendo apenas HTML: nenhuma linha de
JavaScript é necessária para ter menu suspenso, abas, gaveta lateral, tooltip, paleta de comandos
e o resto.

Acessibilidade não é opcional neste módulo: cada componente cuida de papéis ARIA, navegação por
teclado, foco visível, fechamento por Escape e `prefers-reduced-motion`.

O CSS é injetado sob demanda, apenas quando o recurso é usado. Todas as cores vêm das variáveis
`--v-*`, então tudo funciona nos temas claro e escuro. Veja [Tema e paleta](tema-e-paleta.md).

---

## v-toggle

Mostra e esconde um alvo.

```html
<button v-toggle="#detalhes">Ver detalhes</button>
<div id="detalhes" style="display:none">...</div>

<button v-toggle.instant="#painel">Sem animação</button>
```

Sem seletor, o alvo é o irmão seguinte:

```html
<button v-toggle>Alternar</button>
<div style="display:none">Conteúdo</div>
```

O botão recebe `aria-controls` e `aria-expanded`, atualizados a cada clique, e dispara
`voodoo:toggle` com `{ target, open }`.

## v-collapse e v-collapse-toggle

Painel que abre e fecha com animação de altura.

```html
<button v-collapse-toggle="#faq-1">O que é a Voodoo?</button>
<div id="faq-1" v-collapse>
  <p>O framework JavaScript HTML-first.</p>
</div>

<div v-collapse="open">Começa aberto</div>
<div v-collapse v-collapse-duration="400">Animação mais lenta</div>
```

Vários gatilhos podem controlar o mesmo painel. Cada um recebe `aria-expanded` e `aria-controls`.
O painel dispara `voodoo:collapse` com `{ open }`.

## v-dropdown e v-dropdown-menu

Menu suspenso com posicionamento inteligente e navegação por setas.

```html
<button v-dropdown="#acoes">Ações</button>

<div id="acoes" v-dropdown-menu>
  <button v-click="editar()">Editar</button>
  <button v-click="duplicar()">Duplicar</button>
  <a href="/exportar">Exportar</a>
</div>
```

O que acontece sozinho:

- o menu vira `role="menu"` e cada filho clicável vira `role="menuitem"`;
- setas para cima e para baixo navegam, `Home` e `End` vão para as pontas;
- `Escape` fecha e devolve o foco ao gatilho;
- clicar fora fecha;
- o menu é movido para o `body` enquanto aberto, então nenhum `overflow: hidden` o corta;
- ele vira para o lado oposto quando não cabe, e nunca sai da tela.

`v-dropdown-position` escolhe o lado preferido: `top`, `bottom`, `left`, `right`.

```html
<button v-dropdown="#menu" v-dropdown-position="top">Abrir para cima</button>
```

## v-popover

Igual ao dropdown, porém com `role="dialog"` e foco preso dentro do painel. Use quando o conteúdo
tiver campos ou mais de um elemento interativo.

```html
<button v-popover="#filtros">Filtros</button>

<div id="filtros">
  <label>De <input type="date"></label>
  <label>Até <input type="date"></label>
  <button>Aplicar</button>
</div>
```

`v-popover-position` funciona como no dropdown.

## v-tooltip

```html
<button v-tooltip="Exclui o registro para sempre" v-tooltip-position="right">
  Excluir
</button>

<span v-tooltip="Calculado sobre o valor bruto" v-tooltip-delay="600">?</span>
```

Aparece no mouse e no foco de teclado, some no Escape. Usa `role="tooltip"` e `aria-describedby`.
O atraso padrão é 200 ms.

## v-tabs, v-tab e v-tab-panel

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

Papéis `tab`, `tablist` e `tabpanel` são aplicados, a navegação por setas funciona nos dois eixos,
`Home` e `End` vão para as pontas e a aba ativa recebe a classe `v-active`.

Para guardar a aba na URL:

```html
<div v-tabs v-tabs-url="secao">...</div>
```

A aba escolhida vira `?secao=perfil`, sem recarregar a página.

Abas dentro de abas funcionam: cada `v-tab` pertence ao `v-tabs` mais próximo.

O evento `voodoo:tab` é disparado com `{ id }` a cada troca.

## v-accordion e v-accordion-item

Cada item precisa ter dois filhos: o primeiro é o cabeçalho, o último é o painel.

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

`v-accordion-single` mantém apenas um item aberto por vez. `v-accordion-item="open"` começa
aberto. As setas navegam entre os cabeçalhos e a seta indicadora gira sozinha, via CSS.

## v-drawer, v-drawer-content e v-drawer-close

Gaveta lateral com fundo escurecido, trava de rolagem e foco preso.

```html
<button v-drawer="#menu-lateral">Abrir menu</button>

<aside id="menu-lateral" v-drawer-content v-drawer-side="left">
  <button v-drawer-close>Fechar</button>
  <nav>...</nav>
</aside>
```

`v-drawer-side` aceita `left` (padrão `right`), `right`, `top` e `bottom`. `v-offcanvas` é um
alias de `v-drawer`.

Escape fecha, Tab circula dentro do painel, o foco volta para o gatilho ao fechar e o evento
`voodoo:drawer` é disparado com `{ open }`.

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

`v-modal-content` esconde o bloco até que ele seja adotado por um modal. Modificadores de
`v-modal`: `.close` fecha em vez de abrir, `.toggle` alterna.

Por JavaScript:

```js
V.modal.open('#login', { size: 'sm' });
V.modal.close('#login');
V.modal.toggle('#login');
V.modal.closeAll();
V.modal.isOpen();          // algum aberto
V.modal.isOpen('#login');
V.modal.opened;            // lista dos abertos
V.modal.count;             // quantos estão abertos
```

Opções comuns a qualquer diálogo:

| Opção | Padrão | O que faz |
| --- | --- | --- |
| `size` | `md` | `sm`, `md`, `lg`, `xl`, `full` |
| `position` | `center` | `center` ou `top` |
| `closeOnBackdrop` | `true` | Fecha ao clicar no fundo |
| `closeOnEscape` | `true` | Fecha no Escape |
| `lockScroll` | `true` | Trava a rolagem da página |
| `restoreFocus` | `true` | Devolve o foco ao fechar |
| `closable` | `true` | Mostra o botão de fechar |
| `plain` | `false` | Remove fundo, borda e sombra do painel |
| `className` | | Classes extras no painel |
| `initialFocus` | | Seletor ou elemento que recebe o foco |
| `ariaLabel` | | Rótulo quando não há título visível |
| `onOpen`, `onClose` | | Callbacks |

`V.modal.open` devolve um controle com `close(resultado)` e `closed`, uma promessa resolvida
quando o diálogo termina de fechar.

## alert, confirm e prompt

```js
await V.alert('Pedido enviado com sucesso.', { icon: 'success' });

if (await V.confirm('Excluir o pedido?', { danger: true })) remover();

const nome = await V.prompt('Como devemos te chamar?', {
  required: true,
  placeholder: 'Seu nome',
  validate: (v) => (v.length >= 2 ? null : 'Nome muito curto.'),
});
```

`prompt` aceita `type` com `text`, `password`, `email`, `number` e `textarea`. Uma validação que
devolve texto mantém o diálogo aberto com a mensagem.

Diálogo genérico, com botões próprios:

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

Ícones: `info`, `success`, `warning`, `danger`, `question`, `none`. Tons: `default`, `success`,
`warning`, `danger`.

Para trocar os textos padrão dos botões:

```js
V.modal.labels({ confirm: 'Sim, pode', cancel: 'Voltar', ok: 'Entendi' });
```

Tudo isso também existe como magia: `$modal`, `$dialog`, `$alert`, `$confirm`, `$prompt`.

## v-confirm

Intercepta o clique, faz a pergunta e só libera a ação depois do sim. Funciona junto de
`v-click`, `@click`, links e botões de envio no mesmo elemento, porque a guarda roda na fase de
captura, antes de qualquer outro ouvinte.

```html
<button v-confirm="Excluir mesmo?" v-click="excluir()">Excluir</button>
<button v-confirm.danger="Esta ação não pode ser desfeita." v-click="apagarConta()">Apagar conta</button>
<a v-confirm="Sair da sua conta?" href="/logout">Sair</a>
```

> Não combine `v-confirm` com `v-get`, `v-post`, `v-put`, `v-patch`, `v-delete` ou `v-submit` no
> mesmo elemento: hoje a pergunta aparece duas vezes, porque essas directives também leem o mesmo
> atributo. Prefira `v-click` com `$http`, como no exemplo acima, ou peça a confirmação com
> `$confirm(...)` dentro da própria expressão.

## Notificações

```js
V.toast('Mensagem neutra');
V.toast.success('Usuário salvo!');
V.toast.error('Não foi possível salvar');
V.toast.warning('Sua sessão expira em 5 minutos');
V.toast.info('Nova versão disponível');
const carregando = V.toast.loading('Enviando...');
carregando.update({ title: 'Enviado!', type: 'success', duration: 3000 });
carregando.close();

await V.toast.promise(salvar(), {
  loading: 'Salvando...',
  success: (dados) => `Salvo com id ${dados.id}`,
  error: 'Não foi possível salvar',
});

V.toast.clear();
V.toast.configure({ duration: 6000, position: 'bottom-right', max: 3 });
```

Opções: `title`, `description`, `type`, `duration` (`0` mantém aberto), `position`,
`action: { label, onClick }`, `closable`, `html`, `onClose`.

Posições: `top-right` (padrão), `top-left`, `top-center`, `bottom-right`, `bottom-left`,
`bottom-center`.

```js
V.toast.success({
  title: 'Pedido criado',
  description: 'Você recebe o código por e-mail.',
  action: { label: 'Ver pedido', onClick: () => V.navigate('/pedidos/7') },
});
```

No HTML, use `$toast`:

```html
<button v-click="$toast.success('Copiado!')">Copiar</button>
```

## Paleta de comandos

```html
<button v-command="mod+k">Buscar comandos</button>

<button v-command-item="Ir para o painel" v-command-hint="Ctrl+D" v-click="ir('/painel')">...</button>
<button v-command-item="Criar novo pedido" v-click="novoPedido()">...</button>
<button v-command-item="Alternar tema" v-theme-toggle>...</button>
```

`v-command` liga o atalho global e o clique. Os itens são indexados na hora em que a paleta abre,
então elementos criados por `v-for` também entram. A busca ignora acentos e caixa. Setas navegam,
Enter executa (clicando no elemento original), Escape fecha.

Sem valor, o atalho padrão é `mod+k`. `v-command-key` também define a combinação.

## Foco

```html
<input v-focus>                          <!-- foca ao montar -->
<input v-focus.select>                   <!-- foca e seleciona o texto -->
<input v-focus.quiet>                    <!-- foca sem rolar a página -->
<input v-focus="painelAberto">           <!-- foca quando a expressão fica verdadeira -->

<div v-focus-trap="modalAberto">...</div>  <!-- prende o Tab dentro -->
```

## Reagindo a clique fora e a Escape

```html
<div v-click-outside="aberto = false">...</div>
<div v-escape="fechar()">...</div>
```

Diferente de `@outside`, essas duas escutam `pointerdown` e `keydown` em `document`, e funcionam
mesmo quando o elemento não tem estado próprio.

## Rolagem

```html
<a href="#precos" v-scroll-to v-scroll-offset="80">Preços</a>
<button v-scroll-to="top">Voltar ao topo</button>
<button v-scroll-to="#rodape">Ir ao rodapé</button>

<nav v-scrollspy v-scrollspy-class="ativo" v-scroll-offset="80">
  <a href="#sobre">Sobre</a>
  <a href="#precos">Preços</a>
</nav>

<header v-sticky="0">...</header>
```

`v-scroll-to` respeita `prefers-reduced-motion` e move o foco para a seção, o que mantém a
navegação por teclado coerente. `v-scrollspy` marca o link da seção visível com a classe escolhida
e com `aria-current`. `v-sticky` aplica `position: sticky` e adiciona `v-stuck` quando o elemento
gruda.

## Entrada na tela e rolagem infinita

```html
<div v-visible="animar()">Anima quando entra</div>
<div v-visible.repeat="contar()">Toda vez que entra</div>

<ul v-infinite-scroll="carregarMais()" v-infinite-distance="400px">
  <li v-for="item in itens">{ item.nome }</li>
</ul>
```

`v-infinite-scroll` insere uma sentinela invisível no fim da lista, marca `aria-busy` enquanto
carrega e espera a promessa devolvida pela expressão antes de disparar de novo.

## Imagens sob demanda

```html
<img v-lazy-src="/fotos/grande.jpg" alt="Praia">
<div v-lazy-bg="/fotos/capa.jpg"></div>
<img v-lazy-src="/fotos/x.jpg" v-lazy-error="/fotos/placeholder.png" alt="">
```

A imagem só é buscada quando o elemento chega a 200 pixels da área visível. As classes `v-lazy`,
`v-lazy-loaded` e `v-lazy-failed` controlam a transição.

## Esqueleto de carregamento

```html
<div v-skeleton="carregando">
  <p>{ usuario.nome }</p>
</div>

<div v-skeleton>Preenchido depois por uma requisição</div>
```

Com expressão, o esqueleto acompanha o valor. Sem expressão, ele aparece enquanto o elemento
estiver vazio e some sozinho quando algum conteúdo chega.

## Copiar, imprimir, compartilhar, baixar e tela cheia

```html
<button v-copy="PROMO10">Copiar cupom</button>
<button v-copy-from="#chave-da-api">Copiar chave</button>
<button v-copy="PROMO10" v-copy-label="Copiado com sucesso!">Copiar</button>

<button v-print>Imprimir a página</button>
<button v-print="#recibo">Imprimir só o recibo</button>

<button v-share v-share-title="Veja isto" v-share-text="Achei interessante">Compartilhar</button>

<button v-download="/arquivos/relatorio.pdf" v-download-name="relatorio-2026.pdf">Baixar</button>

<button v-fullscreen="#player">Tela cheia</button>
```

`v-copy` usa a API moderna com plano B para navegadores antigos, mostra uma confirmação visual e
anuncia em uma região `aria-live`. `v-share` usa a API nativa quando existe, e cai para copiar o
link quando não existe. `v-print` imprime só o trecho pedido, herdando o CSS da página.

## Redimensionar

```html
<div v-resizable>Arraste a borda</div>
<div v-resizable="horizontal">Só na largura</div>
<div v-resizable="vertical">Só na altura</div>
```

As alças aceitam teclado: com foco nelas, as setas mudam o tamanho em passos de 16 pixels, ou 4
com Shift. O evento `voodoo:resized` traz `{ width, height }`.

## Tema

```html
<button v-theme-toggle>Alternar tema</button>
```

O botão recebe `aria-pressed`, `aria-label` e `data-v-theme` com o tema atual. Veja
[Tema e paleta](tema-e-paleta.md).

## Inatividade e conexão

```html
<div v-idle="mostrarAvisoDeSessao()" v-idle-after="5m"></div>

<div v-online="$toast.success('Conexão restaurada')"></div>
<div v-offline="$toast.warning('Você está offline')"></div>
<div v-offline.no-immediate="avisar()"></div>
<div v-online.immediate="sincronizar()"></div>
```

`v-idle` dispara depois de 60 segundos sem atividade, por padrão. `v-offline` dispara também na
montagem quando o navegador já está offline, e `.no-immediate` desliga esse primeiro disparo.
`v-online` só dispara na montagem com `.immediate`.

## Transições

`v-transition` liga classes de entrada e saída em `v-if` e `v-show`:

```html
<div v-show="aberto" v-transition="fade" v-duration="300">...</div>
```

Por JavaScript, existem atalhos prontos:

```js
V.fadeIn(el);
V.fadeOut(el);
V.slideDown(el, 300);
V.slideUp(el, 300);
V.enter(el, { name: 'v-fade' });
V.leave(el, { name: 'v-fade' });
V.viewTransition(() => trocarConteudo());
```

---

Anterior: [Máscaras](mascaras.md) · Próximo: [Arrastar e soltar](arrastar-e-soltar.md)
