# Gráficos

> Este módulo vem apenas no `voodoo.full.min.js` ou em um build sob medida.

Gráficos em SVG puro, sem nenhuma dependência externa. Todo o desenho é gerado como texto e
entregue de uma vez ao container, o que mantém o redesenho barato mesmo com dados mudando a cada
quadro.

Três compromissos guiam o módulo:

- **responsivo**, com `viewBox`, `preserveAspectRatio` e `ResizeObserver`;
- **acessível**, com `role="img"`, `aria-label` descritivo gerado a partir dos próprios dados, e
  `<title>` por forma;
- **temático**, usando as variáveis `--v-*`, então funciona em claro e escuro.

## v-chart

```html
<div v-chart="{ type: 'line', data: vendas, labels: meses, smooth: true }"></div>
```

O valor pode ser o objeto de opções completo, ou apenas os dados:

```html
<div v-data="{ vendas: [12, 19, 8, 25, 30] }">
  <div v-chart="vendas"></div>
</div>
```

> Prefira sempre a forma de objeto quando os dados forem reativos. Os atributos `v-chart-*` são
> lidos na montagem e servem bem para gráficos estáticos, mas o tipo declarado neles não sobrevive
> à primeira atualização dos dados. Com `v-chart="{ type: 'bar', data: vendas }"` tudo continua
> certo a cada redesenho.

O gráfico é reativo: mudar um número dentro do array já redesenha, porque o efeito percorre a
estrutura inteira e assina cada valor.

## Tipos

| Tipo | Para que serve |
| --- | --- |
| `line` | Evolução ao longo do tempo. Padrão |
| `area` | Igual à linha, com a área preenchida |
| `bar` | Barras verticais |
| `column` | Barras horizontais |
| `stacked` | Barras empilhadas, para composição |
| `pie` | Pizza, para participação |
| `donut` | Rosca, com espaço no meio |
| `sparkline` | Tendência miúda, sem eixos, para caber numa célula |
| `radar` | Comparação de várias dimensões |
| `scatter` | Dispersão, com `x` e `y` |
| `progress` | Progresso circular |

```html
<div v-chart="{ type: 'area', data: receita, labels: meses, smooth: true }"></div>
<div v-chart="{ type: 'donut', data: fatias }"></div>
<div v-chart="{ type: 'sparkline', data: [3, 5, 4, 8, 7, 11] }"></div>
<div v-chart="{ type: 'progress', data: 68, max: 100 }"></div>
```

## Formatos de dados

**Números soltos**, com rótulos separados:

```js
{ type: 'bar', data: [12, 19, 8], labels: ['Jan', 'Fev', 'Mar'] }
```

**Pontos nomeados**:

```js
{ type: 'pie', data: [
  { label: 'Orgânico', value: 48 },
  { label: 'Pago', value: 32 },
  { label: 'Direto', value: 20 },
] }
```

**Séries nomeadas**, para várias linhas ou barras:

```js
{ type: 'line', labels: ['Jan', 'Fev', 'Mar'], data: [
  { name: '2025', data: [10, 14, 12] },
  { name: '2026', data: [16, 18, 25], color: '#FF3D8B' },
] }
```

**Dispersão**, com coordenadas:

```js
{ type: 'scatter', data: [{ x: 1, y: 4 }, { x: 2, y: 7 }, { x: 3, y: 3 }] }
```

**Um número só**, para `progress`:

```js
{ type: 'progress', data: 68 }
```

## Opções

| Opção | Padrão | O que faz |
| --- | --- | --- |
| `type` | `line` | Tipo do gráfico |
| `data` | | Dados, em qualquer formato aceito |
| `labels` | | Rótulos do eixo de categorias |
| `name` | | Nome da série única, usado na legenda e no tooltip |
| `colors` | paleta da marca | Cores das séries |
| `height` | 260, ou 56 em `sparkline` | Altura em pixels |
| `width` | | Largura usada quando o container ainda não tem medida |
| `showGrid` | `true` | Linhas de grade e rótulos do eixo de valores |
| `showLegend` | automático | Legenda clicável |
| `showValues` | `false` | Escreve o valor de cada ponto, barra ou fatia |
| `animate` | `true` | Anima o desenho na entrada |
| `smooth` | `false` | Curvas suaves em linhas e áreas |
| `max`, `min` | automático | Teto e piso da escala |
| `format` | `number` | `number`, `currency` ou `percent` |
| `tooltip` | `true` | Tooltip ao passar o mouse |

```html
<div v-chart="{
  type: 'bar',
  data: faturamento,
  labels: meses,
  format: 'currency',
  showValues: true,
  showGrid: true,
  height: 320,
  colors: ['#6D3BF5', '#FF3D8B']
}"></div>
```

## Atributos v-chart-*

Para gráficos estáticos, os ajustes cabem em atributos:

```html
<div v-chart="[12, 19, 8, 25]" v-chart-type="bar" v-chart-height="200"></div>
<div v-chart="dados" v-chart-format="currency" v-chart-colors="#6D3BF5,#2ED9A5"></div>
<div v-chart="dados" v-chart-grid="false" v-chart-legend="false" v-chart-tooltip="false"></div>
```

Atributos aceitos: `v-chart-type`, `v-chart-height`, `v-chart-format`, `v-chart-colors`,
`v-chart-max`, `v-chart-min`, `v-chart-smooth`, `v-chart-grid`, `v-chart-legend`,
`v-chart-values`, `v-chart-tooltip`, `v-chart-animate`.

Os booleanos aceitam o atributo vazio, `true`, `1`, `false` e `0`.

## Cores

Sem `colors`, o gráfico usa a paleta da marca:

```
#6D3BF5  #FF3D8B  #2ED9A5  #FFB35C  #9B7BFF  #FF4D4D  #14111F  #3BB6F5
```

Ela está em `V.chartColors` e em `V.charts.colors`. As cores de grade, texto e fundo vêm das
variáveis `--v-*`, então o gráfico acompanha o tema e a paleta configurada.

## Legenda e tooltip

A legenda aparece sozinha quando há mais de uma série ou quando o gráfico é categórico. Clicar em
um item liga e desliga aquela série, e o gráfico é recalculado.

O tooltip mostra todas as séries da categoria sob o cursor. Em pizza, rosca, dispersão, progresso
e radar, ele acompanha a forma.

## Por JavaScript

```js
const grafico = V.renderChart(document.querySelector('#vendas'), {
  type: 'area',
  data: [12, 19, 8, 25, 30],
  labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai'],
  smooth: true,
});

grafico.update({ data: novosDados });
grafico.options;
grafico.destroy();
```

`V.chart` é um alias de `V.renderChart`. O módulo inteiro está em `V.charts`:

| Membro | O que é |
| --- | --- |
| `V.charts.render` | O mesmo que `V.renderChart` |
| `V.charts.format` | Formata um valor no padrão do gráfico |
| `V.charts.colors` | A paleta padrão |

## Um painel completo

```html
<div v-data="{ periodo: '30d' }" v-resource="painel: /api/painel" v-params="{ periodo: periodo }">
  <select v-model="periodo" v-change="painel.reload()">
    <option value="7d">7 dias</option>
    <option value="30d">30 dias</option>
  </select>

  <div v-if="painel.loading">Carregando...</div>

  <template v-else-if="painel.loaded">
    <VStat label="Receita" :value="painel.data.receita" :delta="painel.data.variacao" />

    <div v-chart="{
      type: 'area',
      data: painel.data.serie,
      labels: painel.data.dias,
      format: 'currency',
      smooth: true
    }"></div>

    <div v-chart="{ type: 'donut', data: painel.data.canais }"></div>
  </template>
</div>
```

## Acessibilidade

Cada gráfico recebe `role="img"` e um `aria-label` escrito a partir dos dados, com o tipo, a
quantidade de séries, mínimo, máximo e média. Cada forma tem um `<title>` próprio, lido no foco.
A animação de entrada respeita `prefers-reduced-motion`.

Para conjuntos importantes, ofereça também uma tabela:

```html
<div v-chart="{ type: 'bar', data: vendas, labels: meses }"></div>

<details>
  <summary>Ver os dados em tabela</summary>
  <VTable columns="mes:Mês, valor:Valor:right" :rows="tabelaDeVendas" />
</details>
```

---

Anterior: [Animações](animacoes.md) · Próximo: [Roteador](roteador.md)
