import { core, sound, hotkey, palette, registerMask, unmask, applyMask, masks, mask, clearErrors, showFieldError, showFormErrors, messages, serializeForm, validate, validator, dialog, prompt, confirm, alert, modal, VoodooCollection, fromHtml, ready2, query } from './chunk-RDHYPGH6.js';
import './chunk-D7675IJG.js';
import { magic } from './chunk-4M4ZXHNY.js';
import './chunk-LLNDLLKV.js';
import './chunk-72PMUUMT.js';
import './chunk-KN7NAKBL.js';
import './chunk-NP66JM2P.js';
import './chunk-T5ION5NG.js';
import './chunk-GXPNWCGE.js';

/**
 * Voodoo.js v0.12.1
 * JavaScript feels like magic.
 * (c) 2026 Voodoo.js contributors. MIT License.
 */

// src/essential.ts
var V = ((input, context) => query(input, context));
Object.assign(V, core, {
  query,
  ready: ready2,
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
  magic
});
var essential_default = V;

export { V, essential_default as default };
//# sourceMappingURL=essential.js.map
//# sourceMappingURL=essential.js.map