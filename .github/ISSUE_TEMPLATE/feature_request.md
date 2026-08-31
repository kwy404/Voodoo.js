---
name: Propor um recurso
about: Sugira uma ideia para a biblioteca
title: ''
labels: enhancement
assignees: ''
---

## O problema

Qual dificuldade você encontrou? Descreva a situação real, antes de qualquer solução.

## A proposta

O que você gostaria que existisse. Se envolve HTML, mostre como ficaria:

```html
<div v-minha-ideia="algo"></div>
```

Se envolve JavaScript, mostre a chamada:

```js
V.minhaIdeia({ opcao: true });
```

## Como você resolve hoje

Qual é a solução que você usa no lugar, e por que ela não é suficiente.

## Alternativas consideradas

Outras formas de resolver o mesmo problema, e por que a proposta acima parece melhor.

## Se a proposta for uma directive

A regra do projeto é "não transforme tudo em atributo". Uma directive só existe quando
resolve um problema declarativo real. Confira os quatro critérios de
[CONVENTIONS.md](https://github.com/kwy404/Voodoo.js/blob/main/CONVENTIONS.md):

- [ ] Liga comportamento a um elemento. Se não precisa de elemento, é uma função `V.*`
- [ ] Substitui código repetitivo, não uma única linha de JavaScript
- [ ] O HTML fica mais legível que o JavaScript equivalente
- [ ] Não é apenas um valor de configuração de outra directive

## Encaixe no projeto

- [ ] Funciona sem passo de build
- [ ] Não precisa de `eval` nem de `new Function`
- [ ] Não traz dependência externa em tempo de execução
- [ ] Cabe no build essencial, ou faz mais sentido no build completo
- [ ] Não está na lista de "fora de escopo" do
      [ROADMAP.md](https://github.com/kwy404/Voodoo.js/blob/main/ROADMAP.md)
- [ ] Já verifiquei que não está listado como planejado no roadmap

## Impacto

- **Build afetado:** mínimo, essencial ou completo
- **Quebra compatibilidade:** sim ou não. Se sim, explique o quê
- **Nome proposto:** e por que ele não colide com nada que já existe

## Contexto extra

Links, imagens, referências de como outras bibliotecas resolvem, o que ajudar.
