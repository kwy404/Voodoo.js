import { core, sound, hotkey, palette, registerMask, unmask, applyMask, masks, mask, clearErrors, showFieldError, showFormErrors, messages, serializeForm, validate, validator, dialog, prompt, confirm, alert, modal, VoodooCollection, fromHtml, ready2, query } from './chunk-MPYWCGEB.js';
import './chunk-7C5ZZ7B5.js';
import { magic } from './chunk-IVTMYVWQ.js';
import './chunk-2P6ZNPMO.js';
import './chunk-BFZ6IVJ2.js';
import './chunk-JUDHTE7Z.js';
import './chunk-AZQE7TB5.js';
import './chunk-54Y37JIN.js';
import './chunk-X55TLYJX.js';

/**
 * Voodoo.js v0.4.5
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