## O que muda

Descreva a mudança em uma ou duas frases.

## Por quê

Qual problema isso resolve. Se existe uma issue, mencione: `Resolve #123`.

## Tipo de mudança

- [ ] Correção de bug
- [ ] Recurso novo
- [ ] Mudança que quebra compatibilidade
- [ ] Documentação
- [ ] Refatoração interna, sem mudança de comportamento
- [ ] Desempenho ou tamanho
- [ ] Segurança

## Escopo

- **Módulos tocados:** (ex.: `runtime/walker`, `directives/ui`)
- **Builds afetados:** mínimo, essencial, completo, ESM/CJS
- **Superfície pública alterada:** nenhum símbolo novo, símbolo novo, símbolo renomeado,
  símbolo removido

Se algum símbolo público mudou, confira a política de depreciação em
[CONVENTIONS.md](../CONVENTIONS.md): o nome antigo continua como apelido, avisa em
desenvolvimento com `avisarAlias`, e só some em uma versão major.

## Como testar

Passos ou um HTML mínimo que demonstre a mudança funcionando.

```html
```

## Verificações

- [ ] `npm test` passa
- [ ] `npm run typecheck` passa
- [ ] `npm run build` passa
- [ ] `npm run size` passa
- [ ] `npm run quality` não piorou
- [ ] Acrescentei teste para o comportamento novo, ou um teste que falhava antes da correção
- [ ] Atualizei a documentação em `docs/`
- [ ] Atualizei `docs/en/`, quando a mudança atinge o núcleo
- [ ] Acrescentei a linha correspondente no `CHANGELOG.md`

## Regras do repositório

- [ ] Comentários de código e `docs/` em português do Brasil; arquivos de raiz e `docs/en/`
      em inglês
- [ ] Nenhum travessão no texto, nem `—` nem `–`
- [ ] Nenhum uso de `eval` ou `new Function`
- [ ] Nenhuma dependência externa em tempo de execução
- [ ] Nenhum número de tamanho, benchmark ou contagem de teste escrito na documentação
- [ ] CSS injetado funciona nos temas claro e escuro e respeita `prefers-reduced-motion`
- [ ] Componentes de interface cuidam de ARIA, foco e teclado
- [ ] Commits seguem Conventional Commits

## Se acrescentou uma directive

- [ ] Passa nos quatro critérios de "não transforme tudo em atributo" de
      [CONVENTIONS.md](../CONVENTIONS.md)
- [ ] Usa `ctx.effect` e `ctx.cleanup`, sem listener ou timer solto
- [ ] Lê atributos com `readAttr` ou `attrOf`, nunca com `getAttribute` depois da montagem
- [ ] Não usa seletor de atributo `[v-nome]`; usa `queryDirective` ou `closestDirective`
- [ ] Está registrada no ponto de entrada do build certo
- [ ] O nome não colide com nenhum dos que já existem

## Impacto no tamanho

Cole a saída de `npm run size` quando a mudança mexer no que vai para os bundles.

```
```

## Observações

Qualquer coisa que ajude na revisão: decisões de projeto, alternativas descartadas, pontos
que merecem atenção.
