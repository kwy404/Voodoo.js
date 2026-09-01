# Charts

> This module comes only in `voodoo.full.min.js` or in a custom build.

Pure SVG charts with no external dependencies. All drawing is generated as text and delivered to the
container at once, which keeps redrawing cheap even when data changes every frame.

Three principles guide the module:

- **responsive**, with `viewBox`, `preserveAspectRatio`, and `ResizeObserver`;
- **accessible**, with `role="img"`, descriptive `aria-label` generated from the data itself, and
  `<title>` per shape;
- **themed**, using `--v-*` variables, so it works in light and dark.

## v-chart

```html
<div v-chart="{ type: 'line', data: vendas, labels: meses, smooth: true }"></div>
```

The value can be the full options object, or just the data:

```html
<div v-data="{ vendas: [12, 19, 8, 25, 30] }">
  <div v-chart="vendas"></div>
</div>
```

> Always prefer the object form when data is reactive. The `v-chart-*` attributes are
> read on mount and work well for static charts, but the type declared in them doesn't survive
> the first data update. With `v-chart="{ type: 'bar', data: vendas }"` everything stays
> correct with each redraw.

The chart is reactive: changing a number in the array redraws it, because the effect walks the
entire structure and subscribes to each value.

## Types

| Type | What it does |
| --- | --- |
| `line` | Evolution over time. Default |
| `area` | Like line, with the area filled |
| `bar` | Vertical bars |
| `column` | Horizontal bars |
| `stacked` | Stacked bars for composition |
| `pie` | Pie for share |
| `donut` | Donut with space in the middle |
| `sparkline` | Tiny trend, no axes, fits in a cell |
| `radar` | Comparison of multiple dimensions |
| `scatter` | Scatter with `x` and `y` |
| `progress` | Circular progress |

```html
<div v-chart="{ type: 'area', data: receita, labels: meses, smooth: true }"></div>
<div v-chart="{ type: 'donut', data: fatias }"></div>
<div v-chart="{ type: 'sparkline', data: [3, 5, 4, 8, 7, 11] }"></div>
<div v-chart="{ type: 'progress', data: 68, max: 100 }"></div>
```

## Data formats

**Bare numbers** with separate labels:

```js
{ type: 'bar', data: [12, 19, 8], labels: ['Jan', 'Fev', 'Mar'] }
```

**Named points**:

```js
{ type: 'pie', data: [
  { label: 'Orgânico', value: 48 },
  { label: 'Pago', value: 32 },
  { label: 'Direto', value: 20 },
] }
```

**Named series** for multiple lines or bars:

```js
{ type: 'line', labels: ['Jan', 'Fev', 'Mar'], data: [
  { name: '2025', data: [10, 14, 12] },
  { name: '2026', data: [16, 18, 25], color: '#FF3D8B' },
] }
```

**Scatter** with coordinates:

```js
{ type: 'scatter', data: [{ x: 1, y: 4 }, { x: 2, y: 7 }, { x: 3, y: 3 }] }
```

**Single number** for `progress`:

```js
{ type: 'progress', data: 68 }
```

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `type` | `line` | Chart type |
| `data` | | Data in any accepted format |
| `labels` | | Category axis labels |
| `name` | | Name of single series, used in legend and tooltip |
| `colors` | brand palette | Series colors |
| `height` | 260, or 56 for `sparkline` | Height in pixels |
| `width` | | Width used when container doesn't have measure |
| `showGrid` | `true` | Grid lines and value axis labels |
| `showLegend` | auto | Clickable legend |
| `showValues` | `false` | Writes value of each point, bar, or slice |
| `animate` | `true` | Animates drawing on entry |
| `smooth` | `false` | Smooth curves on lines and areas |
| `max`, `min` | auto | Scale ceiling and floor |
| `format` | `number` | `number`, `currency`, or `percent` |
| `tooltip` | `true` | Tooltip on mouse hover |

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

## v-chart-* attributes

For static charts, adjustments fit in attributes:

```html
<div v-chart="[12, 19, 8, 25]" v-chart-type="bar" v-chart-height="200"></div>
<div v-chart="dados" v-chart-format="currency" v-chart-colors="#6D3BF5,#2ED9A5"></div>
<div v-chart="dados" v-chart-grid="false" v-chart-legend="false" v-chart-tooltip="false"></div>
```

Accepted attributes: `v-chart-type`, `v-chart-height`, `v-chart-format`, `v-chart-colors`,
`v-chart-max`, `v-chart-min`, `v-chart-smooth`, `v-chart-grid`, `v-chart-legend`,
`v-chart-values`, `v-chart-tooltip`, `v-chart-animate`.

Booleans accept empty attribute, `true`, `1`, `false`, and `0`.

## Colors

Without `colors`, the chart uses the brand palette:

```
#6D3BF5  #FF3D8B  #2ED9A5  #FFB35C  #9B7BFF  #FF4D4D  #14111F  #3BB6F5
```

It's in `V.chartColors` and `V.charts.colors`. Grid, text, and background colors come from
`--v-*` variables, so the chart follows the configured theme and palette.

## Legend and tooltip

The legend appears on its own when there's more than one series or when the chart is categorical. Clicking an
item toggles that series, and the chart is recalculated.

The tooltip shows all series for the category under the cursor. On pie, donut, scatter, progress,
and radar, it follows the shape.

## Via JavaScript

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

`V.chart` is an alias for `V.renderChart`. The entire module is in `V.charts`:

| Member | What it is |
| --- | --- |
| `V.charts.render` | Same as `V.renderChart` |
| `V.charts.format` | Formats a value in chart format |
| `V.charts.colors` | Default palette |

## A complete dashboard

```html
<div v-data="{ periodo: '30d' }" v-resource="painel: /api/painel" v-params="{ periodo: periodo }">
  <select v-model="periodo" v-change="painel.reload()">
    <option value="7d">7 days</option>
    <option value="30d">30 days</option>
  </select>

  <div v-if="painel.loading">Loading...</div>

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

## Accessibility

Each chart receives `role="img"` and an `aria-label` written from the data, with the type, number
of series, minimum, maximum, and average. Each shape has its own `<title>`, read on focus.
Entry animation respects `prefers-reduced-motion`.

For important datasets, also offer a table:

```html
<div v-chart="{ type: 'bar', data: vendas, labels: meses }"></div>

<details>
  <summary>View data as table</summary>
  <VTable columns="mes:Mês, valor:Valor:right" :rows="tabelaDeVendas" />
</details>
```

---

Previous: [Animations](animacoes.md) · Next: [Router](roteador.md)
