// Carga del diccionario real en el cliente - ver docs/dictionary-license.md
// El binario (formato "front coding", ver dictionary-codec.ts) se sirve como asset
// estatico publico (copiado desde packages/game-engine/data, ver scripts/copy-dictionary.mjs)
// para que el service worker lo precachee y el modo Local funcione offline (NFR1, R4.2).

import { createSortedArrayDictionary, decodeFrontCoded, setDictionary } from '@duelo-lexico/game-engine';

let loadPromise: Promise<number> | null = null;

export function loadDictionary(): Promise<number> {
  loadPromise ??= fetch('/dictionary/es-words.dict')
    .then((res) => {
      if (!res.ok) throw new Error(`No se pudo cargar el diccionario: HTTP ${res.status}`);
      return res.arrayBuffer();
    })
    .then((buffer) => {
      const words = decodeFrontCoded(new Uint8Array(buffer));
      setDictionary(createSortedArrayDictionary(words));
      return words.length;
    });
  return loadPromise;
}
