# Mundo aberto

Uma cidade pequena e coesa em 3D, gerada por codigo, com ciclo de dia e noite,
sombras, nevoa e transito. WebGL2 puro: sem Three.js, sem Babylon, sem CDN. A
Voodoo tem zero dependencias de runtime e os exemplos respeitam isso.

Abra em `http://localhost:5173/examples/mundo-aberto/`.

## A divisao que a demo existe para provar

Sao dois arquivos, e a fronteira entre eles e o assunto:

| Arquivo | Responsabilidade |
| --- | --- |
| **`mundo.js`** | WebGL2 puro. Terreno, cidade, sombras, ceu, fisica, transito. Nao conhece a Voodoo, nao toca no DOM da interface, nao sabe o que e um slider. |
| **`index.html`** | Voodoo declarativo. HUD, velocimetro, relogio, minimapa, painel de ajustes, menu de pausa, controles de toque. Nao escreve uma linha de GL. |

A ponte inteira cabe em tres coisas:

- `motor.opcoes`, um objeto de valores simples que a interface escreve;
- `motor.controle`, que os botoes de toque empurram;
- `motor.aoAtualizar(fn)`, um callback que devolve numeros para um store.

**Nenhuma reatividade atravessa o laco de render.** Ler um proxy sessenta vezes
por segundo seria desperdicio: o motor avisa a interface dez vezes por segundo
e a interface escreve no motor so quando alguem mexe em alguma coisa.

## O que a Voodoo controla

**Tres componentes com `V.component`.** `relogio-mundo` so formata a hora e a
fase do dia; `velocimetro` desenha um arco SVG e um numero; `mundo-aberto`
segura o resto. Os dois primeiros nao sabem que existe um motor 3D: leem o
store e devolvem marcacao.

**Um store global com `V.store`.** `$store.jogo` guarda a tela atual, o FPS, a
velocidade, a hora, a posicao, a distancia percorrida e o recorde de
velocidade. O HUD le tudo direto do HTML com `{ $store.jogo.fps }`, e nenhum
componente precisa conversar com outro para isso.

**Preferencias em `V.storage`.** Hora, nevoa, distancia de visao, intensidade
do sol, qualidade, camera e o botao de transito voltam como voce deixou na
visita anterior. Valores adulterados no storage caem no padrao, campo a campo.

**Cada slider muda o mundo no mesmo frame.** `v-model.number` grava no estado
do componente e o `@input` copia para `motor.opcoes`. Nao existe botao de
aplicar.

**As listas sao `v-for`.** Os niveis de qualidade, os modos de camera, as
marcas do velocimetro e ate a skyline decorativa da tela de "sem WebGL2" saem
de arrays.

**As telas sao `v-show` sobre um store.** Tela inicial, jogo e pausa sao tres
blocos que olham para `$store.jogo.tela`.

## Tecnicas de renderizacao

**Terreno como malha unica.** Ruido de valor escrito na mao, com seed fixa,
amostrado numa grade de 168x168 (cerca de 56 mil triangulos). As ruas seguem o
relevo em vez de serem aplanadas: da o ar de cidade em morro e sai de graca,
porque e uma malha so, sem recorte. A mesma funcao `altura(x, z)` responde
"qual a altura aqui?" para o carro e para o transito, entao nada flutua nem
afunda.

**Ruas desenhadas no fragment shader.** A malha da cidade e periodica, entao
asfalto, calcada, meio-fio, faixa central tracejada, linha de bordo e faixa de
pedestre saem todos de duas funcoes `mod` sobre a coordenada de mundo. Nenhuma
geometria, nenhuma textura.

**Instanciacao para tudo que e volume.** Predios, postes, troncos, carros e
pedestres sao a mesma caixa unitaria, desenhada com
`drawElementsInstanced`. Cada instancia leva posicao, tamanho, cor, uma matriz
3x3 de rotacao e um par `(tipo, semente)`. As copas das arvores usam uma
esfera de poucos poligonos, no mesmo esquema. Sao **quatro chamadas de desenho
por quadro**: ceu, terreno, instancias estaticas, instancias dinamicas.

**Janelas proceduralmente, no shader.** O `tipo` da instancia liga uma grade de
janelas calculada em coordenadas locais em metros, com moldura, laje entre
andares, parapeito no topo e uma faixa de terreo diferente. Quais janelas estao
acesas sai de um hash sobre `(coluna, andar, semente)`, entao o mesmo predio
acende sempre as mesmas.

**Shadow map direcional.** Uma textura `DEPTH_COMPONENT24` com
`COMPARE_REF_TO_TEXTURE`, amostrada com `sampler2DShadow` e PCF 3x3. O volume
de luz e ortogonal e acompanha o carro. Alem disso, a base de cada predio
recebe uma **oclusao de contato falsa** (um escurecimento em `smoothstep` nos
primeiros metros): mesmo com a sombra desligada na qualidade baixa, o volume
continua ancorado no chao.

**Ceu num triangulo de tela cheia.** Gradiente por altura, disco do sol e da
lua, estrelas por hash que aparecem so a noite, e nuvens de fbm projetadas num
plano alto. A funcao `corCeu(dir)` e a mesma usada pela nevoa, entao o
horizonte e a nevoa sao literalmente a mesma cor e o fim do mundo desaparece
sem costura.

**Nevoa com queda cubica.** `1 - exp(-(d * k)^3)`: o campo proximo fica limpo e
o mundo fecha rapido no fim. Com expoente 2 o meio da rua ja saia lavado. O `k`
e derivado da distancia de visao, entao os dois sliders nunca brigam.

**Iluminacao.** Sol direcional com cor e forca vindas de uma paleta de dez
chaves por hora, ambiente hemisferico dessaturado (as cores do ceu sao
saturadas demais para servirem de luz difusa direto), especular Blinn-Phong,
reflexo do ceu por Fresnel bem de raspao, e um cone de farol que ilumina
terreno e predios. Os postes de rua nao sao luzes de verdade: a poca de luz e
calculada por `mod` nas mesmas coordenadas em que os postes foram plantados.
Fecha em ACES filmico com gama.

**Ciclo de dia e noite.** Uma paleta de dez chaves interpolada por hora
controla zenite, horizonte, cor e forca do sol, ambiente e exposicao. Abaixo do
horizonte a luz principal vira a lua. Os emissivos (janelas, farois, lanternas,
lampadas) sao divididos pela exposicao, senao saturariam em branco puro na
exposicao alta da noite.

## Desempenho

Medido em Chrome, WebGL2, no navegador desta maquina:

| Cenario | Custo por quadro |
| --- | --- |
| Qualidade alta, 1280x720 | ~0,8 ms |
| Qualidade alta, 1920x1080 | ~1,2 ms |
| Qualidade baixa, 1920x1080 | ~1,1 ms |

O orcamento de 60 FPS e 16,7 ms, entao a demo roda **travada em 60 FPS pelo
vsync**, com folga larga. O HUD mostra o FPS real medido pelo proprio laco.

A medicao foi feita enfileirando quadros e forcando sincronia com `readPixels`.
`gl.finish()` nao serve: no Chrome ele volta antes de a GPU ter terminado.

O mundo tem **199 predios, 295 arvores e 264 postes**, cerca de 1500 instancias
por quadro contando o transito, e 56 mil triangulos de terreno.

## O que foi cortado, e por que

- **Uma cascata de sombras so.** O volume de luz acompanha o carro e cobre
  210 metros. Predios altos com sol baixo projetam sombra mais longa do que
  isso e a sombra e cortada no fim. Uma segunda cascata dobraria o passe de
  profundidade e nao valia o custo para um mundo deste tamanho.
- **Sem culling.** As instancias estaticas vao inteiras para a GPU todo quadro.
  Com 1500 caixas isso e mais barato do que reconstruir o buffer por frustum a
  cada quadro; num mundo dez vezes maior a conta se inverteria.
- **Colisao simplificada.** Nao ha teste por predio. Como a cidade e uma grade,
  o carro so e impedido de entrar no miolo do quarteirao, e raspar custa
  velocidade em proporcao ao tranco. E barato, esta sempre certo e nunca deixa
  o carro atravessar uma parede — mas tambem nao bate em poste nem em arvore.
- **Transito sem colisao entre si.** Os carros atravessam uns aos outros e o
  jogador. Eles existem para o mundo parecer vivo, nao para simular transito.
- **Um cone de farol, nao dois.** Duas luzes pareceriam duas luzes. Uma so, mais
  larga, custa metade e ninguem repara.
- **Postes so nas avenidas.** As ruas transversais nao tem poste. Isso metade o
  numero de instancias e o contraste entre avenida iluminada e rua escura
  acabou ficando mais interessante do que a versao simetrica.
- **Sem antialiasing configuravel.** O MSAA do contexto e fixo na criacao. A
  qualidade mexe em resolucao (`devicePixelRatio` maximo), tamanho do shadow
  map e distancia de visao.

## Controles

| Acao | Teclado | Toque |
| --- | --- | --- |
| Acelerar / re | `W` `S` ou setas | pedais da direita |
| Virar | `A` `D` ou setas | pedais da esquerda |
| Turbo | `Shift` | — |
| Freio | `Espaco` | — |
| Trocar de camera | `C` | painel de ajustes |
| Esconder minimapa e velocimetro | `H` | painel de ajustes |
| Pausar | `Esc` | botao Pausa |

Os controles de toque aparecem sozinhos em ponteiro grosseiro ou em tela ate
860 px.

## Detalhes de comportamento

- O laco pausa no `visibilitychange` e volta quando a aba reaparece.
- Ao desmontar, o componente remove todos os listeners, apaga programas,
  buffers, VAOs, textura e framebuffer, e solta o contexto.
- As animacoes de interface respeitam `prefers-reduced-motion`. O mundo
  continua se movendo: ele e o conteudo, nao um enfeite.
- Sem WebGL2, a demo mostra uma tela explicando o motivo, com uma skyline
  desenhada em CSS. Todo o resto da pagina continua funcionando.
- Se o modulo `V.gpu` existir, esta demo nao depende dele: o caminho WebGL2
  daqui e autossuficiente de proposito.
