/**
 * Build essencial da Voodoo.js, servido por padrao no CDN.
 *
 * Traz tudo que a maioria das paginas precisa: reatividade, directives,
 * componentes, DOM encadeavel, HTTP declarativo, formularios com validacao e
 * mascaras, interface e notificacoes.
 *
 * Fica de fora, para o arquivo continuar pequeno: graficos, animacoes com
 * fisica, roteador, idiomas, inspetor de reatividade e a biblioteca de
 * componentes prontos. Para esses, use `voodoo.full.min.js` ou monte um build
 * sob medida com `npx voodoo build`.
 */

import { core } from './core';
import { query, ready, VoodooCollection, fromHtml } from './dom/query';
import { magic } from './runtime/scope';

// Efeitos colaterais: registram as directives de cada modulo.
import './directives/ui';
import './directives/forms';
import './directives/state';

import { modal, alert, confirm, prompt, dialog } from './ui/dialog';
import { palette } from './ui/palette';
import { hotkey } from './directives/ui';
import {
  validator,
  validate,
  serializeForm,
  messages,
  showFormErrors,
  showFieldError,
  clearErrors,
} from './forms/validate';
import { mask, masks, applyMask, unmask, registerMask } from './forms/mask';

export interface VoodooEssential extends Omit<typeof core, never> {
  (input?: unknown, context?: unknown): VoodooCollection;
}

const V = ((input?: unknown, context?: unknown) =>
  query(input as never, context as never)) as unknown as VoodooEssential;

Object.assign(V, core, {
  query,
  ready,
  fromHtml,
  Collection: VoodooCollection,

  modal,
  alert,
  confirm,
  prompt,
  dialog,

  validator,
  validate,
  validateForm: validate,
  serializeForm,
  messages,
  showFormErrors,
  showFieldError,
  clearErrors,
  mask,
  masks,
  applyMask,
  unmask,
  registerMask,

  palette,
  hotkey,
  magic,
});

export default V;
export { V };
