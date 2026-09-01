/**
 * @module dom/style
 *
 * On-demand CSS injection. Each block enters the document only once, only
 * when the corresponding resource is actually used, avoiding dead CSS.
 *
 * All styles use CSS variables with built-in default values. If the project
 * loads Voodoo's design system, colors automatically follow the theme.
 */

import { config } from '../runtime/registry';

const injected = new Set<string>();

/** Injects a CSS block identified by `id`. Repeating the call does not duplicate. */
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

/** Base tokens shared by Voodoo's UI components. */
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

/** Ensures tokens are present before any UI component. */
export function ensureTokens(): void {
  injectStyle('tokens', BASE_TOKENS);
}
