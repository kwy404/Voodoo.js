# Tetris

Tetris completo: saco de sete pecas, peca fantasma, guardar peca, wall kick,
folga antes de travar, sequencia de limpezas, nivel que acelera a cada dez
linhas, pausa, recorde persistido e som sintetizado.

Abra em `http://localhost:5173/examples/jogos/tetris/`.

## O que esta demo mostra da Voodoo.js

O Tetris entrou nesta pasta justamente porque tem **muita interface**: placar,
linhas, nivel, recorde, contagem de tetrises, fila das proximas pecas, peca
guardada, ultima jogada, sequencia, menus, pausa e fim de jogo.

**As pecas de previsao nao sao canvas.** Cada uma e uma grade 4x4 de
`<span>` gerada por `v-for` aninhado, com a cor entrando por `:style`. Quando a
fila anda, a Voodoo redesenha as celulas. E o exemplo mais direto de "dado do
jogo virando marcacao" que a demo tem.

**O tabuleiro e canvas**, porque ali sao duzentas celulas por quadro, mais a
peca fantasma, a linha de perigo e as particulas da limpeza.

**O contrato entre os dois:** a grade de jogo (`mundo.grade`), a peca atual e o
saco de pecas ficam em objetos comuns, criados no `mounted` e deixados fora do
estado reativo de proposito. So o que a interface mostra e propriedade do
componente. Assim a fisica roda a 60 quadros por segundo sem disparar uma
atualizacao de DOM sequer, e o HUD continua declarativo.

## Um detalhe que vale reparar

O responsivo tambem sai do estado, nao so do CSS. `redimensionar` grava
`estreito` quando a janela fica abaixo de 720px, e o computed
`proximasVisiveis` corta a fila de quatro para duas pecas. Ou seja: a marcacao
gerada muda de verdade, em vez de esconder elementos com `display: none`.

## Recursos usados

| Recurso | Onde |
| --- | --- |
| `v-component` | o jogo inteiro, registrado com `V.component` |
| `v-for` aninhado | fila de proximas pecas e cada grade 4x4 |
| `v-show` | telas de inicio, pausa e fim de jogo |
| `:style`, `:class` | cor de cada celula, tremor de tela, peca guardada bloqueada |
| `computed` | `gradeGuardada`, `proximasVisiveis`, descricao para leitor de tela |
| `v-ref` / `$refs` | acesso ao `<canvas>` |
| `V.storage` | recorde persistido |
| `V.sound` | cinco efeitos definidos com `V.sound.define` |
| `v-mute`, `v-theme-toggle` | som e tema, sem JavaScript proprio |

## Controles

| Tecla | Acao |
| --- | --- |
| `←` `→` | mover (com repeticao automatica) |
| `↓` | descer mais rapido |
| `↑` ou `X` | girar |
| `Z` | girar ao contrario |
| `Espaco` | queda seca |
| `C` ou `Shift` | guardar peca |
| `P` ou `Esc` | pausar |
| `R` | reiniciar |

No celular ha seis botoes grandes, e o tabuleiro tambem aceita gesto: deslizar
na horizontal move, deslizar para baixo desce, e um toque curto gira.

## Comportamento

- O loop e cancelado no `beforeUnmount` e no `pagehide`; todos os ouvintes saem
  junto. Sair da aba pausa o jogo.
- `prefers-reduced-motion` desliga o tremor e as transicoes da interface.
- O canvas leva um `aria-label` descrevendo o estado da partida, e cada mini
  peca tem `role="img"` com o nome da peca.
