# Introdução

A Voodoo.js é o framework JavaScript HTML-first: você constrói aplicações reativas direto no HTML.
O comportamento da página fica dentro do próprio HTML. Você escreve atributos, a biblioteca liga
cada um deles ao estado reativo e a tela se atualiza sozinha.

```html
<div v-data="{ nome: '' }">
  <input v-model="nome" placeholder="Seu nome">
  <p v-show="nome">Olá, { nome }!</p>
</div>
```

Não existe passo de compilação, nem arquivo de configuração, nem JSX. Você abre o HTML no
navegador e funciona.

## O que vem na caixa

O build essencial (`voodoo.min.js`) traz:

- reatividade com Proxy e efeitos granulares;
- directives para texto, condição, lista, formulário, atributo, classe, estilo e evento;
- componentes com props, slots, computados, watchers e ciclo de vida;
- coleção de DOM encadeável, no espírito do jQuery;
- HTTP declarativo: `v-get`, `v-post`, `v-resource` e um cliente completo em `V.http`;
- formulários com envio por AJAX, validação, máscaras, upload e autosave;
- interface pronta: modal, gaveta, abas, dropdown, tooltip, acordeão, paleta de comandos;
- arrastar e soltar com mouse, toque e teclado;
- notificações, diálogos, armazenamento e paleta de cores configurável.

O build completo (`voodoo.full.min.js`) soma:

- gráficos em SVG puro;
- animações com física de mola;
- roteador de página única;
- internacionalização;
- inspetor de reatividade (`xray`);
- 29 componentes prontos, de `VButton` a `VCodeBlock`.

## Para quem é

A Voodoo.js foi feita para quem constrói páginas que precisam de interatividade sem virar uma
aplicação inteira em JavaScript:

- **painéis administrativos** gerados no servidor com Laravel, Rails, Django, Spring ou PHP puro;
- **landing pages e sites de conteúdo** que precisam de um pouco de vida sem carregar 200 KB de
  framework;
- **protótipos**, onde abrir um arquivo e ver o resultado vale mais do que qualquer arquitetura;
- **times pequenos** que não querem manter um pipeline de build só para mostrar uma tabela;
- **projetos legados**, onde a biblioteca convive com o código que já existe, porque ela nunca
  toma conta da página inteira.

## Para quem não é

Vale mais a pena escolher outra ferramenta quando:

- **o app tem centenas de telas e um time grande.** Componentes de arquivo único, roteamento
  aninhado e ferramentas de tipo em tempo de compilação são vantagens reais do Vue, do React e
  do Svelte nesse tamanho.
- **você precisa de renderização no servidor com hidratação.** A Voodoo.js roda no navegador. Os
  módulos puros (reatividade, HTTP, utilitários) funcionam em Node, mas não existe hidratação.
- **o projeto depende de um ecossistema específico**, como React Native, bibliotecas de
  componentes React ou ferramentas de teste de componentes de um framework em particular.
- **listas com dezenas de milhares de linhas atualizando ao mesmo tempo.** O `v-for` reaproveita
  elementos por chave, mas não faz virtualização.
- **você precisa de tipagem estática nos templates.** As expressões dos atributos são texto e só
  falham em tempo de execução.

## O que torna a Voodoo diferente

**Interpolação com chave simples.** `{ variavel }` é a forma padrão. `{{ variavel }}` também é
aceita, para quem vem do Vue.

**O HTML fica limpo.** Depois que uma directive é processada, o atributo `v-*` sai do documento.
No inspetor você vê `<button>Salvar</button>`, não `<button v-click="salvar()" v-loading="#spin">`.
O comportamento continua funcionando porque os valores ficam guardados no runtime. Isso é
controlado por `V.config.cleanAttributes`, ligado por padrão. Consequência prática: nunca escreva
CSS ou `querySelectorAll` apoiado em seletores como `[v-tab]`.

**Sem `eval`, sem `new Function`.** As expressões passam por um lexer, um parser Pratt e um
interpretador de árvore escritos à mão. A biblioteca roda sob Content Security Policy restritiva,
sem `unsafe-eval`.

**Zero dependências em tempo de execução.** Nenhum pacote de terceiros é embarcado.

**Atualizações granulares.** Não existe Virtual DOM. Quando `count` muda, apenas os efeitos que
leram `count` rodam de novo, e cada efeito escreve somente no nó que ele mesmo criou.

## Números do projeto

| Item | Valor |
| --- | --- |
| Bundle essencial (`voodoo.min.js`) | cerca de 75 KB gzip |
| Bundle completo (`voodoo.full.min.js`) | cerca de 120 KB gzip |
| Dependências em tempo de execução | zero |
| Uso de `eval` ou `new Function` | nenhum |
| Testes automatizados | mais de 190, todos passando |
| Componentes prontos | 29 |

Os tamanhos e a contagem de testes mudam a cada versão. Rode `npm run size` e `npm test` no
repositório para ver os números exatos do que você está usando.

## Roadmap

Estes itens ainda não existem no código. Eles estão listados aqui para que ninguém os procure na
documentação achando que já foram entregues.

- **Renderização no servidor e hidratação.** Hoje a biblioteca só monta no navegador.
- **Virtualização de listas.** O `v-for` renderiza todos os itens da fonte.
- **Extensão de navegador para as devtools.** O inspetor `xray` roda dentro da própria página e
  não conversa com uma extensão dedicada.
- **Transições entre rotas com controle de entrada e saída.** O roteador usa a View Transitions
  API quando o navegador oferece, mas não expõe classes de transição próprias por rota.
- **Rotas aninhadas.** O `v-router-view` renderiza uma única saída, sem hierarquia de views.
- **Máscara de data com validação de calendário embutida.** `v-mask="date"` formata, e a validação
  fica por conta da regra `v-date`.
- **Componentes de data e de upload prontos.** A biblioteca traz `VInput` e `VSelect`, mas ainda
  não um seletor de data nem um gerenciador visual de arquivos.
- **Tipos gerados para os templates.** As expressões de atributo não têm checagem estática.

Quatro detalhes conhecidos que dependem de correção, e que valem lembrar enquanto isso:

- `v-confirm` no mesmo elemento de `v-get`, `v-post`, `v-put`, `v-patch`, `v-delete` ou
  `v-submit` pergunta duas vezes. Use `v-confirm` com `v-click`, ou peça a confirmação com
  `$confirm(...)` dentro da própria expressão.
- `v-t-params` só é lido na primeira renderização. Depois de trocar de idioma, prefira a
  interpolação `{ $t('itens', { n: total }) }`.
- `v-chart-type` e os demais atributos `v-chart-*` valem para gráficos estáticos. Quando os dados
  são reativos, declare tudo no objeto: `v-chart="{ type: 'bar', data: vendas }"`.
- Os textos extras do `v-confirm` (`v-confirm-title` e companhia) só funcionam com
  `V.config.cleanAttributes = false`.

---

Anterior: [Índice](README.md) · Próximo: [Instalação](instalacao.md)
