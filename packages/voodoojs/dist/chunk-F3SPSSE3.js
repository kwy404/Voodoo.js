import { config } from './chunk-UNICRHSA.js';

/**
 * Voodoo.js v0.2.1
 * JavaScript feels like magic.
 * (c) 2026 Voodoo.js contributors. MIT License.
 */

// src/runtime/avisos.ts
function emDesenvolvimento() {
  return config.devtools === true;
}
function descreverElemento(el) {
  if (!el) return "(sem elemento)";
  let out = el.tagName.toLowerCase();
  if (el.id) out += `#${el.id}`;
  const classes = (el.getAttribute("class") || "").trim().split(/\s+/).filter(Boolean);
  if (classes.length) out += `.${classes.slice(0, 2).join(".")}`;
  return `<${out}>`;
}
function avisar(mensagem) {
  if (!emDesenvolvimento()) return;
  console.warn(`[Voodoo] ${mensagem}`);
}
var jaAvisado = /* @__PURE__ */ new Set();
function avisarUmaVez(chave, mensagem) {
  if (!emDesenvolvimento()) return;
  if (jaAvisado.has(chave)) return;
  jaAvisado.add(chave);
  console.warn(`[Voodoo] ${mensagem}`);
}
var ATRIBUTOS_AUXILIARES = /* @__PURE__ */ new Set([
  "confirm-title",
  "confirm-label",
  "confirm-cancel",
  "hold-duration"
]);
function avisarDirectiveDesconhecida(el, raw, nome) {
  if (!emDesenvolvimento()) return;
  if (ATRIBUTOS_AUXILIARES.has(nome)) return;
  avisarUmaVez(
    `directive-desconhecida:${nome}`,
    `directive desconhecida "${raw}" em ${descreverElemento(el)}. Nenhuma directive chamada "${nome}" foi registrada. Verifique a grafia ou registre com V.directive("${nome}", ...).`
  );
}
function avisarComponenteDesconhecido(el, nome) {
  avisarUmaVez(
    `componente-desconhecido:${nome}`,
    `componente "${nome}" nao registrado em ${descreverElemento(el)}. Registre com V.component("${nome}", { ... }) antes de usar a tag, ou remova o atributo para deixar o elemento como HTML comum.`
  );
}
function avisarExpressaoInvalida(el, raw, expressao, err) {
  if (!emDesenvolvimento()) return;
  const motivo = err instanceof Error ? err.message.split("\n")[0] : String(err);
  avisar(
    `expressao invalida em ${raw}="${expressao}" no elemento ${descreverElemento(el)}.
Motivo: ${motivo}
Sugestao: expressoes de atributo aceitam um valor so. Se a logica for maior que uma linha, mova para um metodo do componente e chame o metodo aqui.`
  );
}
function avisarChaveDuplicada(el, chave, expressao) {
  if (!emDesenvolvimento()) return;
  avisar(
    `chave duplicada "${String(chave)}" em v-for="${expressao}" no elemento ${descreverElemento(el)}. Duas linhas com a mesma chave fazem a lista reaproveitar o bloco errado ao reordenar. Use uma chave unica, como o id do item.`
  );
}
function avisarPropObrigatoria(el, componente, prop) {
  if (!emDesenvolvimento()) return;
  avisar(
    `prop obrigatoria "${prop}" ausente no componente "${componente}" em ${descreverElemento(el)}. Passe o valor na tag, com ${prop}="..." para um texto fixo ou :${prop}="expressao" para um valor do estado.`
  );
}
function avisarAlias(alias, canonico) {
  avisarUmaVez(
    `alias:${alias}`,
    `"${alias}" e um apelido de "${canonico}" e continua funcionando, mas o nome oficial e "${canonico}". Prefira "${canonico}" em codigo novo.`
  );
}

export { avisar, avisarAlias, avisarChaveDuplicada, avisarComponenteDesconhecido, avisarDirectiveDesconhecida, avisarExpressaoInvalida, avisarPropObrigatoria, avisarUmaVez, descreverElemento, emDesenvolvimento };
//# sourceMappingURL=chunk-F3SPSSE3.js.map
//# sourceMappingURL=chunk-F3SPSSE3.js.map