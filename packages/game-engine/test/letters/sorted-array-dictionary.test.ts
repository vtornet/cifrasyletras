import { describe, expect, it } from 'vitest';
import { createSortedArrayDictionary } from '../../src/letters/dictionary.js';

describe('createSortedArrayDictionary', () => {
  const words = ['casa', 'casas', 'mesa', 'perro', 'perros'].sort();
  const dict = createSortedArrayDictionary(words);

  it('has() encuentra palabras presentes', () => {
    for (const w of words) expect(dict.has(w)).toBe(true);
  });

  it('has() no encuentra palabras ausentes', () => {
    expect(dict.has('xilofono')).toBe(false);
    expect(dict.has('cas')).toBe(false); // prefijo, no palabra completa
    expect(dict.has('')).toBe(false);
  });

  it('hasPrefix() reconoce prefijos validos e invalidos', () => {
    expect(dict.hasPrefix('cas')).toBe(true); // casa, casas
    expect(dict.hasPrefix('perr')).toBe(true);
    expect(dict.hasPrefix('zzz')).toBe(false);
  });

  it('hasPrefix() de una palabra completa tambien es true si hay una mas larga con ese prefijo', () => {
    expect(dict.hasPrefix('perro')).toBe(true); // perro y perros
  });

  it('funciona con un array vacio', () => {
    const empty = createSortedArrayDictionary([]);
    expect(empty.has('cualquier')).toBe(false);
    expect(empty.hasPrefix('c')).toBe(false);
  });
});
