# Contribuindo

Obrigado por querer ajudar. Este guia cobre como rodar o projeto, o que esperamos de uma mudança e
como enviá-la.

O resumo em quatro comandos:

```bash
npm install
npm test
npm run typecheck
npm run build
```

## Requisitos

- Node 18 ou mais novo. O CI roda em 20 e 22.
- npm. O projeto usa workspaces do npm.

## Rodando

```bash
git clone https://github.com/voodoojs/voodoo.git
cd voodoo
npm install
```

| Comando | O que faz |
| --- | --- |
| `npm test` | Roda a suíte inteira com Vitest |
| `npm run test:watch` | Roda em modo observação |
| `npm run coverage` | Roda com relatório de cobertura |
| `npm run typecheck` | Confere os tipos sem gerar arquivos |
| `npm run build` | Gera todos os bundles em `packages/voodoojs/dist` |
| `npm run dev` | Build em modo observação |
| `npm run size` | Mede os bundles e falha se algum estourar a meta |
| `npm run serve` | Sobe um servidor local para abrir os exemplos |
| `npm run format` | Aplica o Prettier |

Para ver uma mudança funcionando no navegador:

```bash
npm run build
npm run serve
```

## Estrutura

```
packages/voodoojs/src/
  reactivity/index.ts     reactive, ref, computed, effect, watch, nextTick, EffectScope
  parser/lexer.ts         tokenize
  parser/parser.ts        parse, com cache
  parser/interpreter.ts   evaluate, stringify, allowedGlobals
  runtime/scope.ts        Scope, magic, magics
  runtime/registry.ts     config, defineDirective, PRIORITY, components, directives
  runtime/walker.ts       walk, destroy, addCleanup, evaluateIn, findScope, parseAttribute
  runtime/component.ts    defineComponent, mountComponent
  runtime/magics.ts       $screen, $network, $clipboard e o registro das magias
  dom/query.ts            a coleção encadeável
  dom/style.ts            injectStyle, ensureTokens
  dom/transition.ts       enter, leave, slideUp, slideDown, fadeIn, fadeOut, viewTransition
  http/index.ts           o cliente HTTP
  store/index.ts          store, allStores
  storage/index.ts        storage, session, cookie, url, cache, theme
  forms/validate.ts       motor de validação
  forms/mask.ts           máscaras
  directives/core.ts      v-text, v-html, v-show, v-if, v-for, v-model, v-bind, v-on
  directives/http.ts      v-get, v-post, v-resource e companhia
  directives/forms.ts     v-submit, v-upload, v-dropzone, v-autosave, v-guard
  directives/ui.ts        interface declarativa
  directives/dnd.ts       arrastar e soltar
  directives/shared.ts    base comum das directives de interface
  directives/state.ts     v-persist, v-sync, v-history
  ui/toast.ts             notificações
  ui/dialog.ts            modal, alert, confirm, prompt
  ui/palette.ts           geração de paleta em OKLCH
  ui/components.ts        os 29 componentes prontos
  motion/index.ts         animações
  charts/index.ts         gráficos em SVG
  router/index.ts         roteador
  i18n/index.ts           idiomas
  devtools/bus.ts         barramento de eventos
  devtools/xray.ts        inspetor visual
  utils/index.ts          utilitários puros
  core.ts                 monta o objeto V
  essential.ts            build essencial
  index.ts                build completo para bundlers
  browser.ts              entrada do build completo de navegador
  browser-essential.ts    entrada do build essencial de navegador
  bootstrap.ts            leitura da configuração da tag script e início
```

`packages/cli` traz a linha de comando: `voodoo init`, `build`, `add` e `info`.

## Regras de estilo do repositório

Estas regras valem em todo o código e em toda a documentação:

- **português do Brasil** em comentários e documentação;
- **nunca usar travessão.** Nem `—` nem `–`. Use vírgula, dois pontos ou ponto final;
- **TypeScript estrito**, sem `any` implícito, com JSDoc nas funções exportadas;
- **zero dependências externas em tempo de execução**;
- **nunca usar `eval` nem `new Function`**;
- **nada de arquivo vazio, função vazia ou placeholder**;
- todo CSS injetado precisa funcionar nos temas claro e escuro e respeitar
  `prefers-reduced-motion`;
- todo componente de interface precisa cuidar de papéis ARIA, foco e teclado.

O Prettier cuida da formatação:

```bash
npm run format
```

## Escrevendo uma directive

```ts
import { defineDirective, PRIORITY } from '../runtime/registry';

defineDirective(
  'minha-directive',
  ({ el, scope, expression, arg, modifiers, evaluate, effect, cleanup, walk }) => {
    effect(() => {
      el.textContent = String(evaluate());
    });
    cleanup(() => {
      // desfaça tudo o que a directive criou
    });
  },
  { priority: PRIORITY.DEFAULT, terminal: false }
);
```

Três pontos que a revisão sempre confere:

1. **limpeza.** Todo ouvinte, observador e temporizador precisa ser removido no `cleanup`.
2. **leitura de atributos depois da montagem.** Os atributos `v-*` saem do HTML, então use as
   funções de leitura do runtime que consultam o cache, e nunca `el.getAttribute` dentro de um
   manipulador de evento ou de um efeito que roda depois.
3. **acessibilidade.** Se a directive cria interface, ela cuida de ARIA, foco e teclado.

O nome registrado não inclui o prefixo, e não pode colidir com os nomes já ocupados. Veja a lista
em [Plugins](plugins.md).

## Testes

Os testes ficam em `packages/voodoojs/test`, rodam com Vitest em ambiente jsdom, e são escritos em
português.

```ts
import { describe, it, expect } from 'vitest';
import { reactive, nextTick } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk } from '../src/runtime/walker';
import '../src/directives/core';

function mount(html: string, data: Record<string, unknown> = {}): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  walk(root, new Scope(reactive(data)));
  return root;
}

describe('minha directive', () => {
  it('escreve o valor no elemento', async () => {
    const root = mount('<b v-minha-directive="valor"></b>', { valor: 'oi' });
    await nextTick();
    expect(root.querySelector('b')!.textContent).toBe('oi');
  });
});
```

Toda mudança de comportamento precisa de teste. Correções de bug precisam de um teste que falhe
antes da correção.

## Tamanho

O projeto tem meta de tamanho por bundle, declarada em `scripts/size.mjs`. O CI roda:

```bash
npm run size
```

e falha quando algum arquivo estoura o limite. Se a sua mudança aumenta o tamanho de forma
significativa, explique o motivo na pull request. Recursos grandes devem entrar apenas no build
completo, e não no essencial.

## Documentação

A documentação vive em `docs/`. Ao mudar uma API pública:

- atualize o guia da área correspondente;
- atualize a tabela em `docs/api.md`;
- acrescente uma linha no `CHANGELOG.md`;
- confira que todo exemplo novo realmente funciona.

Exemplo que não roda é pior do que exemplo nenhum.

## Commits

Mensagem curta, no imperativo, em português:

```
Adiciona v-clipboard-read para ler a area de transferencia
Corrige v-for que perdia foco ao reordenar sem chave
Documenta os modificadores de v-model
```

Não use travessão na mensagem.

## Pull requests

Antes de abrir:

1. `npm test` passa;
2. `npm run typecheck` passa;
3. `npm run build` passa;
4. `npm run size` passa;
5. a documentação foi atualizada;
6. o `CHANGELOG.md` tem a linha da mudança.

Na descrição, conte o que muda e por quê. Se a mudança é visual, inclua uma imagem ou um HTML
mínimo que a demonstre.

Mudanças grandes ficam melhores quando começam por uma issue de proposta. É frustrante escrever
mil linhas e descobrir que a direção não combina com o projeto.

## Relatando bugs

O que ajuda de verdade:

- um HTML de uma página só que reproduza o problema;
- o que você esperava e o que aconteceu;
- versão da biblioteca, navegador e sistema;
- qual bundle você usa, essencial ou completo;
- a mensagem do console, se houver.

## Reportando vulnerabilidades

Não abra issue pública. Use o contato privado indicado no repositório.

## Código de conduta

Este projeto segue o [Código de Conduta](../CODE_OF_CONDUCT.md). Ao participar, você concorda em
respeitá-lo.

## Licença

Ao contribuir, você concorda que a sua contribuição é licenciada sob a licença MIT do projeto.

---

Anterior: [Perguntas frequentes](perguntas-frequentes.md) · [Voltar ao índice](README.md)
