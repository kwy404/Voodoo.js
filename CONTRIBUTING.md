# Contribuindo com a Voodoo.js

Obrigado por querer ajudar. Este arquivo é o guia prático. O guia narrativo, com mais
exemplos, está em [docs/contribuindo.md](docs/contribuindo.md).

## Começando

```bash
git clone https://github.com/kwy404/Voodoo.js.git
cd Voodoo.js
npm install
npm test
```

Requisitos: Node 18 ou mais novo, e npm. O CI roda em Node 20 e 22.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm test` | Roda a suíte inteira com Vitest |
| `npm run test:watch` | Roda em modo observação |
| `npm run coverage` | Roda com relatório de cobertura |
| `npm run typecheck` | Confere os tipos com `tsc --noEmit` |
| `npm run build` | Gera os bundles com tsup |
| `npm run dev` | Build em modo observação |
| `npm run size` | Mede os bundles e falha se algum estourar a meta |
| `npm run quality` | Roda os doze critérios e escreve `QUALITY_REPORT.md`. Os checks ficam em `scripts/quality/` e ainda estão sendo completados; o que não tem check reporta `SKIP` |
| `npm run serve` | Sobe um servidor local para os exemplos |
| `npm run format` | Aplica o Prettier |

Para rodar os benchmarks:

```bash
node benchmarks/run.mjs
```

## Mapa do código

```
packages/voodoojs/src/
├── parser/      lexer, parser Pratt, interpretador de árvore
├── reactivity/  Proxy, efeitos, escopos, agendador
├── runtime/     walker, escopos, componentes, registro, boot, magics
├── directives/  core, http, forms, ui, state, dnd
├── http/ store/ storage/ forms/ ui/ dom/ router/ i18n/ motion/ charts/ sound/ devtools/ utils/
├── core.ts      monta o objeto V
└── index.ts essential.ts minimo.ts browser*.ts   pontos de entrada
```

A visão completa, com o caminho de uma atualização e as fronteiras entre módulos, está em
[ARCHITECTURE.md](ARCHITECTURE.md).

## Regras do repositório

- Português do Brasil em comentários de código e na documentação de `docs/`.
- Inglês nos arquivos de raiz (`ARCHITECTURE.md`, `CONVENTIONS.md`, `SECURITY.md`,
  `BROWSER_SUPPORT.md`, `QUALITY.md`, `ROADMAP.md`, `README.en.md`) e em `docs/en/`.
- **Nunca usar travessão.** Nem `—` nem `–`. Use vírgula, dois pontos ou ponto final.
- TypeScript estrito, sem `any` implícito, com JSDoc nas funções exportadas.
- Zero dependências externas em tempo de execução.
- Nunca usar `eval` nem `new Function`.
- Nada de arquivo vazio, função vazia ou placeholder.
- Todo CSS injetado precisa funcionar nos temas claro e escuro e respeitar
  `prefers-reduced-motion`.
- Todo componente de interface precisa cuidar de papéis ARIA, foco e teclado.
- Nunca escrever número de tamanho de bundle, de benchmark ou de quantidade de teste dentro
  da documentação. Aponte para `npm run size`, `benchmarks/` e `npm test`.

As convenções de nome da API pública, os níveis de estabilidade e a política de depreciação
estão em [CONVENTIONS.md](CONVENTIONS.md).

## Convenção de commits

[Conventional Commits](https://www.conventionalcommits.org/).

```
<tipo>(<escopo>): <assunto>

<corpo>

<rodapé>
```

Tipos: `feat` `fix` `perf` `refactor` `docs` `test` `build` `ci` `chore`.

Escopos seguem as pastas de `src/`: `reactivity`, `parser`, `runtime`, `walker`,
`component`, `directives`, `http`, `forms`, `ui`, `router`, `i18n`, `motion`, `charts`,
`store`, `storage`, `dom`, `utils`, `devtools`, `build`, `docs`.

Assunto em modo imperativo, minúsculo, sem ponto final, até 72 caracteres.

Mudança que quebra compatibilidade leva `!` depois do escopo **e** um rodapé
`BREAKING CHANGE:`:

```
feat(component)!: remove o gancho `destroyed`

BREAKING CHANGE: `destroyed` deixa de rodar. Use `unmounted`, que dispara
junto com ele desde a 0.1.0.
```

## Como acrescentar uma directive

Antes de escrever código, confira a regra "não transforme tudo em atributo" em
[CONVENTIONS.md](CONVENTIONS.md). Uma directive só existe quando resolve um problema
declarativo real.

1. **Escolha o arquivo.** `directives/core.ts` para o que é fundamental,
   `directives/ui.ts` para interface, `directives/forms.ts` para formulário,
   `directives/http.ts` para requisição, `directives/state.ts` para estado,
   `directives/dnd.ts` para arrastar e soltar. Um recurso grande merece módulo próprio.

2. **Registre.**

   ```ts
   import { defineDirective, PRIORITY } from '../runtime/registry';

   defineDirective(
     'minha-coisa',
     ({ el, scope, expression, arg, modifiers, evaluate, effect, cleanup, walk }) => {
       effect(() => {
         el.dataset.valor = String(evaluate());
       });

       const aoClicar = () => { /* ... */ };
       el.addEventListener('click', aoClicar);
       cleanup(() => el.removeEventListener('click', aoClicar));
     },
     { priority: PRIORITY.DEFAULT, terminal: false }
   );
   ```

3. **Use `ctx.effect` e `ctx.cleanup`.** Efeitos criados por `ctx.effect` pertencem ao
   escopo do elemento e morrem com ele. Qualquer listener, timer ou observer que você criar
   por fora precisa de `ctx.cleanup`.

4. **Leia atributos com `readAttr`, nunca com `getAttribute`.** Depois da montagem os
   atributos `v-*` saem do HTML pela limpeza automática. Use `readAttr` e `hasAttr` de
   `runtime/walker.ts`, ou `attrOf` e `readOption` de `directives/shared.ts`.

5. **Não procure elementos com seletor de atributo.** `querySelectorAll('[v-tab]')` deixa de
   funcionar pelo mesmo motivo. Use `queryDirective`, `hasDirective` e `closestDirective`.

6. **Atributo que só configura outra directive** usa `defineOption('minha-coisa-posicao')`,
   e é documentado como opção, não como directive.

7. **Prioridade.** Deixe em `PRIORITY.DEFAULT` a não ser que a ordem importe. Directives
   que criam escopo, que assumem a subárvore ou que precisam rodar por último têm
   constantes próprias em `runtime/registry.ts`.

8. **Se a directive vier de um módulo opcional**, importe o módulo no ponto de entrada
   certo (`core.ts`, `essential.ts` ou `index.ts`), para ela entrar no build certo.

9. **Documente** em `docs/directives.md` e, se for parte do núcleo, em
   `docs/en/directives.md`.

10. **Teste.**

## Como acrescentar um teste

Os testes ficam em `packages/voodoojs/test/`, rodam com Vitest sobre jsdom.

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import V from '../src/index';

describe('v-minha-coisa', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    V.stopObserving();
    V.clearParseCache();
  });

  it('escreve o valor no dataset', async () => {
    document.body.innerHTML = `
      <div v-data="{ n: 1 }">
        <span v-minha-coisa="n"></span>
      </div>
    `;

    V.start(document.body);
    await V.nextTick();

    const span = document.querySelector('span')!;
    expect(span.dataset.valor).toBe('1');
  });

  it('reage a mudanca de estado', async () => {
    document.body.innerHTML = `<div v-data="{ n: 1 }"><span v-minha-coisa="n"></span></div>`;
    V.start(document.body);
    await V.nextTick();

    const escopo = V.getScope(document.querySelector('div')!)!;
    escopo.data.n = 2;
    await V.nextTick();

    expect(document.querySelector('span')!.dataset.valor).toBe('2');
  });
});
```

Pontos que economizam tempo:

- Sempre `await V.nextTick()` depois de mexer no estado. O agendador roda em microtask.
- Limpe entre testes: `V.stopObserving()` e `V.clearParseCache()`.
- Lembre que jsdom não tem `IntersectionObserver`, `ResizeObserver`, `BroadcastChannel`,
  `matchMedia` nem a Web Animations API. Isso é proposital: os caminhos de fallback ficam
  testados a cada rodada. Comportamento que depende de motor real precisa de teste de
  navegador, que ainda está no [ROADMAP.md](ROADMAP.md).
- Correção de bug precisa de um teste que falhe antes da correção.
- Toda mudança de comportamento precisa de teste.

## Antes de abrir uma pull request

1. `npm test` passa;
2. `npm run typecheck` passa;
3. `npm run build` passa;
4. `npm run size` passa;
5. `npm run quality` não piorou;
6. a documentação em `docs/` foi atualizada, e `docs/en/` também quando a mudança atinge o
   núcleo;
7. o `CHANGELOG.md` tem a linha da mudança.

## Processo de release

1. Confirme que `main` está verde no CI.
2. `npm run quality` e leia o `QUALITY_REPORT.md`.
3. Atualize a versão em `package.json`, em `packages/voodoojs/package.json`, na constante
   `version` de `packages/voodoojs/src/core.ts` e no banner de
   `packages/voodoojs/tsup.config.ts`. Os quatro precisam bater.
4. Feche a seção do `CHANGELOG.md`: a versão, a data e a lista de mudanças por tipo. Toda
   remoção precisa aparecer com a substituta.
5. `npm run build` e `npm run size`.
6. Confira o conteúdo do pacote com `npm pack --dry-run --workspace=voodoojs`.
7. Commit `chore(release): vX.Y.Z`, tag `vX.Y.Z`, push com as tags.
8. `npm publish --workspace=voodoojs`.
9. Publique a release no GitHub com as notas do changelog e o hash de integridade do
   `voodoo.min.js`.

Regras de versão: remover ou renomear símbolo `stable`, mudar o significado de um atributo,
mudar um padrão de `V.config` ou mudar prioridade de directive são `major`. Acrescentar
directive, componente, magia ou membro de `V` é `minor`. Correção sem mudança de API é
`patch`. A tabela completa está em [CONVENTIONS.md](CONVENTIONS.md).

Enquanto a versão for `0.x`, releases `minor` podem quebrar compatibilidade.

## Relatando bugs

Abra uma issue com o template de bug. Precisa de um HTML de uma página só que reproduza o
problema, o que você esperava, o que aconteceu, a versão da biblioteca, o navegador e qual
bundle você usa.

## Propondo recursos

Abra uma issue de proposta antes de escrever código. Explique o problema antes da solução.
O que já está previsto está no [ROADMAP.md](ROADMAP.md), inclusive o que está explicitamente
fora de escopo.

## Vulnerabilidades

Não abra issue pública. Use o reporte privado do GitHub:
<https://github.com/kwy404/Voodoo.js/security/advisories/new>. O procedimento completo está
em [SECURITY.md](SECURITY.md).

## Código de conduta

Este projeto segue o [Código de Conduta](CODE_OF_CONDUCT.md). Ao participar, você concorda
em respeitá-lo.

## Licença

Ao contribuir, você concorda que a sua contribuição é licenciada sob a licença MIT do
projeto.
