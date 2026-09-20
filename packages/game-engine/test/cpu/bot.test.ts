import { beforeEach, describe, expect, it } from 'vitest';
import { cpuAnswerLetters, cpuAnswerNumbers, CPU_DIFFICULTY_CONFIG } from '../../src/cpu/bot.js';
import { setDictionary, validateWord, type Dictionary } from '../../src/letters/dictionary.js';

/** Diccionario de prueba en memoria: valido para tests, no para produccion. */
function createFakeDictionary(words: string[]): Dictionary {
  const set = new Set(words.map((w) => w.toLowerCase()));
  return {
    has: (word) => set.has(word),
    hasPrefix: (prefix) => {
      for (const word of set) {
        if (word.startsWith(prefix)) return true;
      }
      return false;
    },
  };
}

/** RNG determinista que siempre devuelve el mismo valor (util para forzar/evitar el missChance). */
function constantRng(value: number) {
  return () => value;
}

describe('cpuAnswerLetters', () => {
  beforeEach(() => {
    setDictionary(createFakeDictionary(['casa', 'casas', 'mesa', 'perro', 'perros']));
  });

  it('nunca falla (rng bajo el missChance de cada dificultad) y devuelve null si no hay palabra formable', () => {
    const letters = 'z z z z z z z z z z'.split(' ');
    for (const difficulty of ['easy', 'normal', 'hard'] as const) {
      expect(cpuAnswerLetters(letters, difficulty, constantRng(0.999))).toBeNull();
    }
  });

  it('no responde si el rng cae por debajo de missChance de la dificultad', () => {
    // easy tiene missChance 0.35: un rng que siempre da 0 esta por debajo, asi que falla.
    const letters = 'p e r r o s x y z w'.split(' ');
    expect(cpuAnswerLetters(letters, 'easy', constantRng(0))).toBeNull();
  });

  it('en dificultad "hard" (ve todas las letras, missChance 0) encuentra la palabra valida mas larga', () => {
    const letters = 'p e r r o s x y z w'.split(' ');
    const word = cpuAnswerLetters(letters, 'hard', constantRng(0.999));
    expect(word).toBe('perros');
  });

  it('toda palabra devuelta es realmente valida segun el diccionario activo', () => {
    const letters = 'p e r r o s c a m x'.split(' ');
    for (const difficulty of ['easy', 'normal', 'hard'] as const) {
      // rng intermedio: no cae en missChance de ninguna dificultad, y baraja de forma fija.
      const word = cpuAnswerLetters(letters, difficulty, constantRng(0.5));
      if (word !== null) expect(validateWord(word).isValid).toBe(true);
    }
  });
});

describe('cpuAnswerNumbers', () => {
  it('nunca falla (rng bajo el missChance de cada dificultad) y siempre encuentra al menos un valor', () => {
    for (const difficulty of ['easy', 'normal', 'hard'] as const) {
      const result = cpuAnswerNumbers([2, 3, 6, 8, 50, 100], 471, difficulty, constantRng(0.999));
      expect(result).not.toBeNull();
      expect(Number.isFinite(result!.value)).toBe(true);
    }
  });

  it('no responde si el rng cae por debajo de missChance de la dificultad', () => {
    expect(cpuAnswerNumbers([2, 3, 6, 8, 50, 100], 471, 'easy', constantRng(0))).toBeNull();
  });

  it('en dificultad "hard" (ve todos los numeros, missChance 0) encuentra el resultado exacto cuando existe', () => {
    // 100 + 1 = 101; 3 x 101 = 303; 6 x 8 = 48; 2 x 48 = 96; 303 - 96 = 207 (caso real de un reporte de usuario)
    const result = cpuAnswerNumbers([100, 1, 3, 6, 8, 2], 207, 'hard', constantRng(0.999));
    expect(result!.value).toBe(207);
  });

  it('cada paso devuelto es coherente (el steps produce exactamente value)', () => {
    const result = cpuAnswerNumbers([2, 3, 6, 8, 50, 100], 471, 'hard', constantRng(0.999));
    expect(result).not.toBeNull();
    if (result!.steps.length > 0) {
      expect(result!.steps[result!.steps.length - 1]!.result).toBe(result!.value);
    }
  });
});

describe('CPU_DIFFICULTY_CONFIG', () => {
  it('a mayor dificultad, ve mas fichas y falla menos (progresion monotona)', () => {
    expect(CPU_DIFFICULTY_CONFIG.easy.letterSampleSize).toBeLessThan(CPU_DIFFICULTY_CONFIG.normal.letterSampleSize);
    expect(CPU_DIFFICULTY_CONFIG.normal.letterSampleSize).toBeLessThan(CPU_DIFFICULTY_CONFIG.hard.letterSampleSize);
    expect(CPU_DIFFICULTY_CONFIG.easy.numberSampleSize).toBeLessThan(CPU_DIFFICULTY_CONFIG.normal.numberSampleSize);
    expect(CPU_DIFFICULTY_CONFIG.normal.numberSampleSize).toBeLessThan(CPU_DIFFICULTY_CONFIG.hard.numberSampleSize);
    expect(CPU_DIFFICULTY_CONFIG.easy.missChance).toBeGreaterThan(CPU_DIFFICULTY_CONFIG.normal.missChance);
    expect(CPU_DIFFICULTY_CONFIG.normal.missChance).toBeGreaterThan(CPU_DIFFICULTY_CONFIG.hard.missChance);
  });
});
