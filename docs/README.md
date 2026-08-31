# Documentação da Voodoo.js

> JavaScript feels like magic.

A Voodoo.js é o framework JavaScript HTML-first: você constrói aplicações reativas direto no HTML.
Reatividade, componentes, requisições, formulários, validação, interface, animação e gráficos vêm
na caixa. Sem passo de build, sem `eval`, sem dependências em tempo de execução.

Esta pasta é a documentação completa. Se você nunca usou a biblioteca, comece por
[Introdução](introducao.md), depois [Instalação](instalacao.md) e
[Início rápido](inicio-rapido.md).

## Primeiros passos

| Guia | O que você aprende |
| --- | --- |
| [Introdução](introducao.md) | O que é, para quem serve, quando não usar, roadmap |
| [Instalação](instalacao.md) | CDN, npm, download, qual bundle escolher, configuração pela tag script |
| [Início rápido](inicio-rapido.md) | Do HTML vazio ao primeiro app, passo a passo |

## Fundamentos

| Guia | O que você aprende |
| --- | --- |
| [Reatividade](reatividade.md) | `reactive`, `ref`, `computed`, `watch`, `effect`, `nextTick` |
| [Expressões](expressoes.md) | O parser seguro, o que é aceito, globais permitidos, CSP |
| [Directives](directives.md) | Referência completa de todas as directives |
| [Componentes](componentes.md) | Registrar, props, slots, `emit`, ciclo de vida, tags PascalCase |
| [Estado e stores](estado-e-stores.md) | `v-data`, escopo, store global, `$store`, `v-persist`, `v-sync`, `v-history` |
| [Eventos](eventos.md) | `v-on`, atalhos, modificadores, teclas, eventos sintéticos, hotkeys |

## Aplicação

| Guia | O que você aprende |
| --- | --- |
| [HTTP](http.md) | Cliente `V.http` e as directives de requisição, `v-resource` |
| [Formulários](formularios.md) | `v-submit`, serialização, upload, dropzone, autosave |
| [Validação](validacao.md) | Todas as regras, validação assíncrona, regras próprias, mensagens |
| [Máscaras](mascaras.md) | Todas as máscaras e como criar novas |
| [Interface](interface.md) | Modal, drawer, abas, dropdown, tooltip, acordeão, paleta de comandos |
| [Arrastar e soltar](arrastar-e-soltar.md) | `v-draggable`, `v-droppable`, `v-sortable`, grupos, acessibilidade |

## Build completo

Os recursos abaixo vêm apenas no `voodoo.full.min.js` ou em um build sob medida.

| Guia | O que você aprende |
| --- | --- |
| [Componentes prontos](componentes-prontos.md) | Os 29 componentes `V*` e as props de cada um |
| [Animações](animacoes.md) | `v-motion`, presets, mola, stagger, scroll, `v-count`, `v-typewriter` |
| [Gráficos](graficos.md) | `v-chart`, todos os tipos, opções, reatividade |
| [Roteador](roteador.md) | Rotas, parâmetros, guards, `v-link`, `v-router-view` |
| [Idiomas](idiomas.md) | i18n, `v-t`, pluralização, troca de idioma |
| [Devtools](devtools.md) | O inspetor `xray` e o barramento de eventos |

## Referência e apoio

| Guia | O que você aprende |
| --- | --- |
| [Tema e paleta](tema-e-paleta.md) | Tema claro e escuro, `V.palette`, tokens CSS |
| [Plugins](plugins.md) | `V.use`, directives personalizadas, magias personalizadas |
| [Utilitários](utilitarios.md) | Todas as funções utilitárias com exemplos |
| [API](api.md) | Referência do objeto `V` inteiro, agrupada por área |
| [Segurança](seguranca.md) | Por que não usa `eval`, CSP, aviso de XSS no `v-html` |
| [Desempenho](desempenho.md) | Atualizações granulares, tamanho, boas práticas |

## Migração

| Guia | O que você aprende |
| --- | --- |
| [Migrando do jQuery](migrando-do-jquery.md) | Tabela de equivalência lado a lado |
| [Migrando do Alpine](migrando-do-alpine.md) | Tabela de equivalência lado a lado |
| [Migrando do Vue](migrando-do-vue.md) | Tabela de equivalência lado a lado |

## Comunidade

| Guia | O que você aprende |
| --- | --- |
| [Perguntas frequentes](perguntas-frequentes.md) | Mais de vinte respostas diretas |
| [Contribuindo](contribuindo.md) | Como rodar, testar, buildar e enviar mudanças |

## Três coisas que valem saber antes de tudo

1. **A interpolação usa chave simples**: escreva `{ nome }` no HTML. A forma dupla `{{ nome }}`
   também funciona, para quem vem do Vue.
2. **Os atributos `v-*` somem do HTML depois de processados.** Isso é proposital e deixa o DOM
   limpo no inspetor. Nunca escreva CSS que dependa de seletores como `[v-tab]`.
3. **Nada de `eval`.** As expressões passam por um parser próprio, então a biblioteca funciona
   com Content Security Policy restritiva, sem `unsafe-eval`.

---

Próximo: [Introdução](introducao.md)
