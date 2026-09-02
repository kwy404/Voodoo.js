/**
 * Essential build of Voodoo.js, served by default on the CDN.
 *
 * Includes everything most pages need: reactivity, directives, components,
 * chainable DOM, declarative HTTP, forms with validation and masks, interface,
 * and notifications.
 *
 * Excluded to keep the file small: charts, physics-based animations, router,
 * internationalization, reactivity inspector, and the ready-to-use component
 * library. For these, use `voodoo.full.min.js` or build a custom version with
 * `npx voodoo build`.
 */

import { core } from './core';
import { query, ready, VoodooCollection, fromHtml } from './dom/query';
import { magic } from './runtime/scope';

// Side effects: register directives from each module.
import './directives/ui';
import './directives/forms';
import './directives/state';
// Registers v-sound and v-mute, plus the audio module side effect.
import './sound';

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
import { sound } from './sound';

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
  sound,
  magic,
});

export default V;
export { V };
