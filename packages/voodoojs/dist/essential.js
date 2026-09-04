import { core, sound, hotkey, palette, registerMask, unmask, applyMask, masks, mask, clearErrors, showFieldError, showFormErrors, messages, serializeForm, validate, validator, dialog, prompt, confirm, alert, modal, VoodooCollection, fromHtml, ready2, query } from './chunk-JNRO4MX7.js';
import './chunk-OL43Y2J5.js';
import { magic } from './chunk-I3AF6CVN.js';
import './chunk-5PIAZICF.js';
import './chunk-3U3S2KO4.js';
import './chunk-F6HSKCEY.js';
import './chunk-3WZF7NYL.js';
import './chunk-XJSOTA6W.js';
import './chunk-7ASZQLMN.js';

/**
 * Voodoo.js v0.9.0
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