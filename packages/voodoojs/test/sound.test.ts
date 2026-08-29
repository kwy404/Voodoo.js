/**
 * Testes do modulo de som.
 *
 * O jsdom nao implementa a Web Audio API, entao o contexto e substituido por um
 * dublê que registra o que teria sido tocado. Isso permite verificar as
 * frequencias, as duracoes e o envelope sem depender de audio de verdade.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reactive } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk } from '../src/runtime/walker';
import { sound, efeitos, frequenciaDaNota } from '../src/sound';
import '../src/core';

interface Toque {
  forma: string;
  frequencia: number;
  inicio: number;
  fim: number;
  volume: number;
}

let tocados: Toque[] = [];

/** Contexto de audio de mentira, suficiente para o modulo funcionar. */
function instalarAudioFalso(): void {
  tocados = [];

  class OsciladorFalso {
    type = 'sine';
    frequency = {
      valor: 0,
      setValueAtTime(v: number) {
        this.valor = v;
      },
      exponentialRampToValueAtTime() {
        // O deslize nao muda o que precisamos verificar.
      },
    };
    private inicio = 0;
    private ganho: GanhoFalso | null = null;

    connect(destino: GanhoFalso): void {
      this.ganho = destino;
    }
    start(quando: number): void {
      this.inicio = quando;
    }
    stop(quando: number): void {
      tocados.push({
        forma: this.type,
        frequencia: this.frequency.valor,
        inicio: this.inicio,
        fim: quando,
        volume: this.ganho?.pico ?? 0,
      });
    }
  }

  class GanhoFalso {
    pico = 0;
    gain = {
      dono: this as GanhoFalso,
      setValueAtTime() {
        // valor inicial, sem interesse para o teste
      },
      exponentialRampToValueAtTime(valor: number) {
        if (valor > this.dono.pico) this.dono.pico = valor;
      },
    };
    connect(): void {
      // destino final, nada a fazer
    }
  }

  class ContextoFalso {
    currentTime = 0;
    state = 'running';
    destination = {};
    createOscillator(): OsciladorFalso {
      return new OsciladorFalso();
    }
    createGain(): GanhoFalso {
      return new GanhoFalso();
    }
    resume(): Promise<void> {
      return Promise.resolve();
    }
  }

  (window as unknown as { AudioContext: unknown }).AudioContext =
    ContextoFalso as unknown as typeof AudioContext;
}

beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  instalarAudioFalso();
  sound.unmute();
  sound.volume(0.5);
});

describe('efeitos prontos', () => {
  it('a biblioteca traz os efeitos de interface esperados', () => {
    for (const nome of ['click', 'pop', 'success', 'error', 'notify', 'open', 'close']) {
      expect(sound.names).toContain(nome);
    }
  });

  it('tocar um efeito gera uma camada por som declarado', () => {
    sound.play('success');
    expect(tocados.length).toBe(efeitos.success.camadas.length);
  });

  it('o efeito de sucesso sobe de tom, e o de erro desce', () => {
    sound.play('success');
    const subida = tocados.map((t) => t.frequencia);
    expect(subida[1]).toBeGreaterThan(subida[0]);

    tocados = [];
    sound.play('error');
    const descida = tocados.map((t) => t.frequencia);
    expect(descida[1]).toBeLessThan(descida[0]);
  });

  it('camadas com atraso comecam depois', () => {
    sound.play('complete');
    expect(tocados[1].inicio).toBeGreaterThan(tocados[0].inicio);
    expect(tocados[2].inicio).toBeGreaterThan(tocados[1].inicio);
  });
});

describe('notas e frequencias', () => {
  it('converte nome de nota em hertz', () => {
    expect(frequenciaDaNota('la')).toBeCloseTo(440, 1);
    expect(frequenciaDaNota('do')).toBeCloseTo(261.63, 1);
    expect(frequenciaDaNota('a')).toBeCloseTo(440, 1);
  });

  it('a oitava dobra a frequencia', () => {
    expect(frequenciaDaNota('la5')).toBeCloseTo(880, 1);
    expect(frequenciaDaNota('la3')).toBeCloseTo(220, 1);
  });

  it('nome desconhecido devolve nulo', () => {
    expect(frequenciaDaNota('xyz')).toBeNull();
  });

  it('tone toca a frequencia pedida', () => {
    sound.tone(660, 100);
    expect(tocados[0].frequencia).toBe(660);
    // O oscilador para 20 ms depois do fim do envelope, margem que evita o
    // estalo de quando o volume corta de uma vez.
    expect(tocados[0].fim - tocados[0].inicio).toBeCloseTo(0.12, 2);
  });

  it('note aceita o nome da nota', () => {
    sound.note('sol');
    expect(tocados[0].frequencia).toBeCloseTo(392, 1);
  });

  it('play com nome de nota funciona sem efeito registrado', () => {
    sound.play('mi');
    expect(tocados[0].frequencia).toBeCloseTo(329.63, 1);
  });
});

describe('volume e silencio', () => {
  it('o volume geral entra no calculo do pico', () => {
    sound.volume(1);
    sound.tone(440, 50, { volume: 1 });
    const alto = tocados[0].volume;

    tocados = [];
    sound.volume(0.25);
    sound.tone(440, 50, { volume: 1 });
    const baixo = tocados[0].volume;

    expect(baixo).toBeLessThan(alto);
  });

  it('silenciado nao toca nada', () => {
    sound.mute();
    sound.play('click');
    sound.tone(440, 50);
    sound.note('la');
    expect(tocados.length).toBe(0);
  });

  it('toggle alterna e devolve o estado novo', () => {
    expect(sound.muted).toBe(false);
    expect(sound.toggle()).toBe(true);
    expect(sound.muted).toBe(true);
    expect(sound.toggle()).toBe(false);
  });

  it('a preferencia de volume fica guardada', () => {
    sound.volume(0.7);
    expect(localStorage.getItem('voodoo:sound:volume')).toContain('0.7');
  });
});

describe('efeitos proprios', () => {
  it('define registra um efeito novo e play encontra', () => {
    sound.define('meuAviso', {
      volume: 0.5,
      camadas: [{ frequencia: 700, duracao: 0.1 }],
    });
    expect(sound.names).toContain('meuAviso');

    sound.play('meuAviso');
    expect(tocados[0].frequencia).toBe(700);
  });
});

describe('directive v-sound', () => {
  function montar(html: string, dados: Record<string, unknown> = {}) {
    const root = document.createElement('div');
    root.innerHTML = html;
    document.body.appendChild(root);
    walk(root, new Scope(reactive(dados)));
    return root;
  }

  it('toca ao clicar, que e o evento padrao', () => {
    const root = montar('<button v-sound="click">ok</button>');
    expect(tocados.length).toBe(0);

    root.querySelector('button')!.click();
    expect(tocados.length).toBeGreaterThan(0);
  });

  it('o argumento escolhe outro evento', () => {
    const root = montar('<input v-sound:input="type">');
    const campo = root.querySelector('input')!;

    campo.click();
    expect(tocados.length).toBe(0);

    campo.dispatchEvent(new Event('input'));
    expect(tocados.length).toBe(1);
  });

  it('aceita nome de nota', () => {
    const root = montar('<button v-sound="la">nota</button>');
    root.querySelector('button')!.click();
    expect(tocados[0].frequencia).toBeCloseTo(440, 1);
  });

  it('para de tocar depois que o elemento sai', async () => {
    const root = montar('<button v-sound="click">ok</button>');
    const botao = root.querySelector('button')!;

    const { destroy } = await import('../src/runtime/walker');
    destroy(root);

    botao.click();
    expect(tocados.length).toBe(0);
  });
});

describe('directive v-mute', () => {
  it('alterna o silencio e reflete no proprio botao', () => {
    const root = document.createElement('div');
    root.innerHTML = '<button v-mute>Som</button>';
    document.body.appendChild(root);
    walk(root, new Scope(reactive({})));

    const botao = root.querySelector('button')!;
    expect(botao.getAttribute('aria-pressed')).toBe('false');

    botao.click();
    expect(sound.muted).toBe(true);
    expect(botao.getAttribute('aria-pressed')).toBe('true');
    expect(botao.classList.contains('v-muted')).toBe(true);

    botao.click();
    expect(sound.muted).toBe(false);
    expect(botao.classList.contains('v-muted')).toBe(false);
  });
});

describe('ambiente sem suporte', () => {
  it('nao lanca quando a Web Audio API nao existe', () => {
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
    const aviso = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => sound.play('click')).not.toThrow();
    expect(() => sound.tone(440)).not.toThrow();

    aviso.mockRestore();
  });
});
