/**
 * Testes de `dom/style`.
 *
 * O modulo guarda os ids ja injetados em um `Set` de escopo de modulo. Como o
 * vitest isola cada arquivo de teste, esse `Set` nasce vazio aqui e so e
 * afetado pelos testes deste arquivo. Ainda assim, cada caso usa um id proprio
 * para nao depender da ordem de execucao.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BASE_TOKENS, ensureTokens, injectStyle } from '../src/dom/style';
import { config } from '../src/runtime/registry';

/** Quantos blocos com aquele id existem no `head`. */
function blocos(id: string): number {
  return document.head.querySelectorAll(`style[data-voodoo="${id}"]`).length;
}

describe('injectStyle', () => {
  beforeEach(() => {
    document.head.querySelectorAll('style[data-voodoo]').forEach((el) => el.remove());
  });

  afterEach(() => {
    config.injectStyles = true;
    vi.unstubAllGlobals();
  });

  it('injeta o bloco uma vez e marca com data-voodoo', () => {
    injectStyle('caso-basico', '.a{color:red}');
    expect(blocos('caso-basico')).toBe(1);
    const el = document.head.querySelector('style[data-voodoo="caso-basico"]') as HTMLStyleElement;
    expect(el.textContent).toBe('.a{color:red}');
  });

  it('nao duplica na segunda chamada, mesmo com CSS diferente', () => {
    injectStyle('caso-duplo', '.a{color:red}');
    injectStyle('caso-duplo', '.a{color:blue}');
    injectStyle('caso-duplo', '.a{color:green}');
    expect(blocos('caso-duplo')).toBe(1);
    const el = document.head.querySelector('style[data-voodoo="caso-duplo"]') as HTMLStyleElement;
    // O primeiro CSS vence: repetir a chamada e um no-op, nao uma atualizacao.
    expect(el.textContent).toBe('.a{color:red}');
  });

  it('ids diferentes geram blocos diferentes', () => {
    injectStyle('caso-a', '.a{}');
    injectStyle('caso-b', '.b{}');
    expect(blocos('caso-a')).toBe(1);
    expect(blocos('caso-b')).toBe(1);
  });

  it('respeita config.injectStyles = false e nao marca o id como usado', () => {
    config.injectStyles = false;
    injectStyle('caso-desligado', '.a{color:red}');
    expect(blocos('caso-desligado')).toBe(0);

    // O id nao entrou no registro, entao religar a config volta a injetar.
    config.injectStyles = true;
    injectStyle('caso-desligado', '.a{color:red}');
    expect(blocos('caso-desligado')).toBe(1);
  });

  it('nao lanca quando nao existe document', () => {
    vi.stubGlobal('document', undefined);
    expect(() => injectStyle('caso-sem-document', '.a{}')).not.toThrow();
    vi.unstubAllGlobals();

    // Tambem nao marcou o id: com o document de volta, a injecao acontece.
    injectStyle('caso-sem-document', '.a{}');
    expect(blocos('caso-sem-document')).toBe(1);
  });

  it('aceita CSS vazio sem quebrar', () => {
    injectStyle('caso-vazio', '');
    expect(blocos('caso-vazio')).toBe(1);
  });
});

describe('ensureTokens', () => {
  it('insere os tokens uma unica vez e com o conteudo de BASE_TOKENS', () => {
    // Chamado varias vezes de proposito: cada componente de UI chama antes de
    // desenhar, entao a idempotencia e o contrato principal desta funcao.
    ensureTokens();
    ensureTokens();
    ensureTokens();
    expect(blocos('tokens')).toBe(1);
    const el = document.head.querySelector('style[data-voodoo="tokens"]') as HTMLStyleElement;
    expect(el.textContent).toBe(BASE_TOKENS);
  });

  it('BASE_TOKENS traz as variaveis do design system e a regra de v-cloak', () => {
    expect(BASE_TOKENS).toContain('--v-primary:');
    expect(BASE_TOKENS).toContain('--v-surface:');
    expect(BASE_TOKENS).toContain('--v-z-modal:');
    expect(BASE_TOKENS).toContain('[v-cloak]{display:none !important}');
    // Tema escuro por preferencia do sistema e por atributo explicito.
    expect(BASE_TOKENS).toContain('prefers-color-scheme: dark');
    expect(BASE_TOKENS).toContain('[data-theme="dark"]');
  });
});
