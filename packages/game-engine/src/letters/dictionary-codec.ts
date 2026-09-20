// Codec de compresion "front coding" para el diccionario embebido (ver
// docs/dictionary-license.md). El listado esta ordenado lexicograficamente, asi que
// palabras consecutivas suelen compartir un prefijo largo (p.ej. "abordable"/"abordado");
// en vez de repetirlo, se guarda cuanto se comparte con la palabra anterior + el sufijo
// que cambia. Reduce el peso servido/cacheado por la PWA en ~70% frente al JSON plano.
//
// Formato binario:
//   [4 bytes] recuento de palabras N (uint32 little-endian)
//   [N bytes] longitud del prefijo compartido con la palabra anterior (0-255)
//   [resto]   los N sufijos en UTF-8, cada uno seguido de un byte separador 0x00

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const MAX_SHARED_PREFIX = 255; // cabe en 1 byte; ninguna palabra del diccionario se acerca

export function encodeFrontCoded(sortedWords: readonly string[]): Uint8Array {
  const n = sortedWords.length;
  const sharedLengths = new Uint8Array(n);
  const suffixes: string[] = new Array(n);
  let prev = '';

  for (let i = 0; i < n; i++) {
    const word = sortedWords[i]!;
    const max = Math.min(prev.length, word.length, MAX_SHARED_PREFIX);
    let shared = 0;
    while (shared < max && prev[shared] === word[shared]) shared++;
    sharedLengths[i] = shared;
    suffixes[i] = word.slice(shared);
    prev = word;
  }

  const suffixBytes = encoder.encode(n > 0 ? suffixes.join('\0') + '\0' : '');
  const header = new Uint8Array(4);
  new DataView(header.buffer).setUint32(0, n, true);

  const out = new Uint8Array(header.length + sharedLengths.length + suffixBytes.length);
  out.set(header, 0);
  out.set(sharedLengths, header.length);
  out.set(suffixBytes, header.length + sharedLengths.length);
  return out;
}

export function decodeFrontCoded(bytes: Uint8Array): string[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const n = view.getUint32(0, true);
  const sharedLengths = bytes.subarray(4, 4 + n);
  const suffixBytes = bytes.subarray(4 + n);
  const suffixes = n > 0 ? decoder.decode(suffixBytes).split('\0') : [];

  const words = new Array<string>(n);
  let prev = '';
  for (let i = 0; i < n; i++) {
    const word = prev.slice(0, sharedLengths[i]!) + suffixes[i]!;
    words[i] = word;
    prev = word;
  }
  return words;
}
