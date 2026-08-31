---
name: Relatar um bug
about: Alguma coisa não funciona como deveria
title: ''
labels: bug
assignees: ''
---

## O que acontece

Descreva o problema em uma ou duas frases.

## O que você esperava

Descreva o comportamento correto.

## Como reproduzir

Cole um HTML de uma página só que reproduza o problema. Quanto menor, melhor.

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <script src="https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.min.js" defer></script>
</head>
<body>
  <div v-data="{ n: 0 }">
    <button v-click="n++">{ n }</button>
  </div>
</body>
</html>
```

Se preferir, deixe o link de um exemplo online.

Passos, quando não for óbvio pelo código:

1. Abra a página
2. Clique em ...
3. Veja que ...

## Ambiente

- **Versão da Voodoo.js:** (o valor de `V.version` no console)
- **Bundle:** mínimo (`voodoo.core.min.js`), essencial (`voodoo.min.js`) ou completo (`voodoo.full.min.js`)
- **Forma de instalação:** CDN, npm ou download
- **Se veio por npm:** qual bundler e qual versão
- **Navegador e versão:** (ex.: Chrome 131, Safari 17.4, Firefox 133)
- **Sistema operacional:**
- **Dispositivo:** desktop ou celular

Se o seu navegador for anterior ao mínimo em
[BROWSER_SUPPORT.md](https://github.com/kwy404/Voodoo.js/blob/main/BROWSER_SUPPORT.md),
diga isso aqui.

## Configuração

Cole qualquer coisa que você tenha mudado em `V.config`, ou os atributos da tag `<script>`:

```js
```

## Mensagens no console

Ligue os avisos detalhados antes de reproduzir:

```js
V.config.devtools = true;
```

ou

```html
<script src="voodoo.min.js" data-devtools defer></script>
```

Cole aqui qualquer erro ou aviso que apareça no console do navegador, incluindo os que
começam com `[Voodoo]`.

```
```

## Verificações

- [ ] Testei com a versão mais recente
- [ ] Procurei uma issue parecida antes de abrir esta
- [ ] O exemplo acima reproduz o problema em uma página limpa, sem outros scripts
- [ ] Liguei `V.config.devtools = true` e colei os avisos que apareceram
- [ ] O problema também acontece em uma janela anônima, sem extensões
