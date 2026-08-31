# Breakout

Um Breakout completo: cinco niveis desenhados a mao, tijolos de uma, duas e tres
camadas, blocos indestrutiveis, cinco power-ups que caem, combo, vidas, pausa,
recorde persistido e som sintetizado.

Abra em `http://localhost:5173/examples/jogos/breakout/`.

## O que esta demo mostra da Voodoo.js

O ponto da demo e a divisao de trabalho entre HTML declarativo e canvas.

**A interface inteira e Voodoo, escrita no proprio HTML.** Placar, recorde,
nivel, vidas em coracoes, combo, a lista de power-ups ativos com o tempo
restante, a tela inicial, a tela de pausa, o aviso entre niveis e a tela de fim
de jogo. Nenhuma dessas coisas passa por `document.createElement`: sao
`{ interpolacoes }`, `v-show`, `v-for`, `:class`, `:style` e `@click` lendo o
estado do componente.

**O canvas cuida apenas do que precisa de pixel.** O loop de
`requestAnimationFrame` desenha tijolos, bola, raquete, capsulas e particulas.
Ele nunca toca no DOM.

**A ponte entre os dois e uma regra so:** a fisica mora em `this.mundo`, um
objeto comum criado no `mounted` e deixado de proposito fora do estado reativo.
Sessenta vezes por segundo o loop mexe em dezenas de numeros ali dentro sem
custo nenhum de reatividade. Quando algo que a interface exibe realmente muda
(um tijolo quebrou, uma vida acabou, um power-up expirou), o loop escreve em uma
propriedade do estado e o HTML se atualiza sozinho.

## Recursos usados

| Recurso | Onde |
| --- | --- |
| `v-component` | o jogo inteiro e um componente registrado com `V.component` |
| `v-show` | as quatro telas sobrepostas, sem tirar o canvas do DOM |
| `v-for` | a faixa de power-ups ativos |
| `v-ref` / `$refs` | acesso ao `<canvas>` a partir do `mounted` |
| `@click`, `@pointerdown` | menus e os botoes grandes de toque |
| `:class`, `:style` | tremor de tela e a cor de cada power-up |
| `computed` | coracoes de vida e a descricao do canvas para leitor de tela |
| `V.storage` | recorde que sobrevive ao recarregar |
| `V.sound` | efeitos sintetizados, incluindo quatro definidos com `V.sound.define` |
| `v-mute`, `v-theme-toggle` | silencio e tema claro/escuro, sem JavaScript proprio |

## Detalhes de comportamento

- **Teclado e toque.** Setas ou `A`/`D` movem, `Espaco` lanca, `P` ou `Esc`
  pausa, `R` reinicia. No celular, o dedo arrasta a raquete direto sobre o palco
  e ha tres botoes grandes que so aparecem em ponteiro grosso.
- **Sem vazamento.** O loop e cancelado no `beforeUnmount` e no `pagehide`, e
  todos os ouvintes sao removidos junto. Se a aba sai de vista, o jogo pausa.
- **Movimento reduzido.** `prefers-reduced-motion` desliga o tremor de tela e as
  animacoes de interface. O jogo em si continua animando, senao nao existe jogo.
- **Acessibilidade.** O canvas carrega um `aria-label` que descreve o estado da
  partida, o placar e `aria-live`, e todos os controles sao botoes reais
  alcancaveis por `Tab`.
