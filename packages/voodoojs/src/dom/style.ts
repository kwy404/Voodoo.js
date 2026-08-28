/**
 * @module dom/style
 *
 * Injecao de CSS sob demanda. Cada bloco entra no documento uma unica vez, so
 * quando o recurso correspondente e realmente usado, o que evita CSS morto.
 *
 * Todos os estilos usam variaveis CSS com valor padrao embutido. Se o projeto
 * carregar o design system da Voodoo, as cores seguem automaticamente o tema.
 */

import { config } from '../runtime/registry';

const injected = new Set<string>();

/** Injeta um bloco de CSS identificado por `id`. Repetir a chamada nao duplica. */
export function injectStyle(id: string, css: string): void {
  if (typeof document === 'undefined') return;
  if (!config.injectStyles) return;
  if (injected.has(id)) return;
  injected.add(id);

  const style = document.createElement('style');
  style.setAttribute('data-voodoo', id);
  style.textContent = css;
  document.head.appendChild(style);
}

/** Tokens base compartilhados pelos componentes de UI da Voodoo. */
export const BASE_TOKENS = `
:root{
  --v-primary:#6D3BF5;
  --v-primary-hover:#5A2FD8;
  --v-primary-contrast:#fff;
  --v-accent:#FF3D8B;
  --v-success:#2ED9A5;
  --v-warning:#FFB35C;
  --v-danger:#FF4D4D;
  --v-info:#9B7BFF;
  --v-surface:#fff;
  --v-surface-2:#FBF7F2;
  --v-text:#14111F;
  --v-text-muted:#6B6580;
  --v-border:#E6E0F0;
  --v-radius:12px;
  --v-radius-sm:8px;
  --v-shadow:0 10px 30px rgba(20,17,31,.14);
  --v-z-modal:1000;
  --v-z-drawer:1000;
  --v-z-dropdown:900;
  --v-z-toast:1100;
  --v-z-tooltip:1200;
  --v-ease:cubic-bezier(.22,1,.36,1);
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --v-surface:#1C1830;
    --v-surface-2:#14111F;
    --v-text:#F4F1FB;
    --v-text-muted:#A9A2C4;
    --v-border:#332C50;
    --v-shadow:0 10px 30px rgba(0,0,0,.45);
  }
}
:root[data-theme="dark"]{
  --v-surface:#1C1830;
  --v-surface-2:#14111F;
  --v-text:#F4F1FB;
  --v-text-muted:#A9A2C4;
  --v-border:#332C50;
  --v-shadow:0 10px 30px rgba(0,0,0,.45);
}
[v-cloak]{display:none !important}
`;

/** Garante que os tokens estejam presentes antes de qualquer componente de UI. */
export function ensureTokens(): void {
  injectStyle('tokens', BASE_TOKENS);
}
