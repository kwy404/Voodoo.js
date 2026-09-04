import { core, sound, hotkey, palette, registerMask, unmask, applyMask, masks, mask, clearErrors, showFieldError, showFormErrors, messages, serializeForm, validate, validator, dialog, prompt, confirm, alert, modal, VoodooCollection, fromHtml, ready2, query } from './chunk-2GSZT3CX.js';
import './chunk-3MPIJH5X.js';
import { magic } from './chunk-ELIX2DRQ.js';
import './chunk-FAWOJTRM.js';
import './chunk-AR6WDY7K.js';
import './chunk-XGZ7SXD3.js';
import './chunk-NKQGUWVF.js';
import './chunk-FNTYILLW.js';
import './chunk-7XRFOONN.js';

/**
 * Voodoo.js v0.12.4
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