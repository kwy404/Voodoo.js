import { core, sound, hotkey, palette, registerMask, unmask, applyMask, masks, mask, clearErrors, showFieldError, showFormErrors, messages, serializeForm, validate, validator, dialog, prompt, confirm, alert, modal, VoodooCollection, fromHtml, ready2, query } from './chunk-2FRZZXNJ.js';
import './chunk-JHGJRZZE.js';
import { magic } from './chunk-5EAFVNZ7.js';
import './chunk-LVNOUMWT.js';
import './chunk-P3MN7HO6.js';
import './chunk-NN7RSUYN.js';
import './chunk-RZ3U44G7.js';
import './chunk-U4ZRVL2E.js';
import './chunk-F62A4EMT.js';

/**
 * Voodoo.js v0.4.1
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