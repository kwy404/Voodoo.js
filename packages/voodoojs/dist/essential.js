import { core, sound, hotkey, palette, registerMask, unmask, applyMask, masks, mask, clearErrors, showFieldError, showFormErrors, messages, serializeForm, validate, validator, dialog, prompt, confirm, alert, modal, VoodooCollection, fromHtml, ready2, query, setAppHost } from './chunk-RE54OOJN.js';
import './chunk-LKL4O7ZD.js';
import { magic } from './chunk-5KUKRKGS.js';
import './chunk-HFGBXDJZ.js';
import './chunk-IHL3M2A2.js';
import './chunk-22SCIQQX.js';
import './chunk-Z7IHVPPQ.js';
import './chunk-WM5AQ4SD.js';
import './chunk-I7ECQM6Y.js';

/**
 * Voodoo.js v1.0.0
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
setAppHost(V);
var essential_default = V;

export { V, essential_default as default };
//# sourceMappingURL=essential.js.map
//# sourceMappingURL=essential.js.map