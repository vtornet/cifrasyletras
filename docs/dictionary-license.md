# Diccionario de palabras — origen y licencia

> Referenciado desde `AGENTS.md` §12. Estado: **resuelto** (ya no es una decisión pendiente).

## Fuente

- **Paquete:** [`an-array-of-spanish-words`](https://github.com/words/an-array-of-spanish-words) (organización `words`, autor Zeke Sikelianos).
- **Origen de los datos:** derivado de la *Letterpress word list* (según el propio README del paquete).
- **Descripción:** ~636.000 palabras en español, en minúsculas, sin tildes, un array JSON plano.
- **Licencia:** MIT. Copyright (c) 2016 Zeke Sikelianos `<zeke@sikelianos.com>`.
- **Fecha de descarga:** 2026-09-19, desde `https://raw.githubusercontent.com/words/an-array-of-spanish-words/master/index.json`.

### Texto de la licencia (reproducido íntegro, requisito de MIT)

```
(The MIT License)

Copyright (c) 2016 Zeke Sikelianos <zeke@sikelianos.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

MIT permite uso, copia, modificación y redistribución (incluso comercial) siempre que se
mantenga este aviso de copyright — de ahí que se reproduzca íntegro arriba y no solo enlazado.

## Procesado aplicado

Reproducible con `pnpm --filter @duelo-lexico/game-engine build:dictionary`
(`packages/game-engine/scripts/build-dictionary.mjs`):

1. Descarga el array bruto (~636.598 palabras) desde la fuente.
2. Filtra: longitud ≥ 5 (coincide con `MIN_VALID_WORD_LENGTH` en `letters/dictionary.ts`) y solo
   caracteres `a-z` + `ñ` (el listado ya viene sin tildes — ver nota más abajo).
3. Deduplica y ordena en orden ordinal UTF-16 (el que usa `Array.prototype.sort()` por defecto).
4. Comprime el array ordenado con "front coding" (`letters/dictionary-codec.ts`, ver más abajo) y
   escribe `packages/game-engine/data/es-words.dict` — **633.108 palabras**, ~2,25 MB (antes ~7,9 MB
   como JSON plano; ver «Compresión» más abajo).

## Compresión: "front coding"

El listado ya está ordenado lexicográficamente, así que palabras consecutivas suelen compartir un
prefijo largo (p. ej. `abordable` / `abordado`). `encodeFrontCoded`/`decodeFrontCoded`
(`packages/game-engine/src/letters/dictionary-codec.ts`) aprovechan esto: en vez de repetir el
prefijo compartido en cada palabra, cada entrada guarda solo *cuántos caracteres comparte con la
palabra anterior* (1 byte) + el sufijo que cambia (UTF-8) + un separador. Formato binario completo:

```
[4 bytes] recuento de palabras N (uint32 little-endian)
[N bytes] longitud del prefijo compartido con la palabra anterior (0-255)
[resto]   los N sufijos en UTF-8, cada uno seguido de un byte separador 0x00
```

Reduce el peso en **~71,6 %** frente al JSON plano (8,29 MB → 2,25 MB) — mucho más que un simple
listado de palabras separadas por saltos de línea (~7,0 MB, solo ~15 % de ahorro), porque
aprovecha específicamente que el listado está ordenado. Es simétrico y reversible al 100 %:
`decodeFrontCoded(encodeFrontCoded(words))` reproduce el array original exactamente — verificado
tanto con tests (`test/letters/dictionary-codec.test.ts`) como manualmente contra las 633.108
palabras reales al migrar del JSON al binario. No se eligió un DAWG/trie serializado (la otra
opción barajada) por ser bastante más complejo de implementar y depurar para una ganancia de
tamaño similar en este caso concreto.

## Nota sobre las tildes

El bombo de letras (`letters/bag.ts`) no tiene fichas acentuadas (las vocales son A/E/I/O/U sin
tilde). La fuente elegida ya viene sin tildes de origen, lo cual encaja con esa limitación: un
jugador nunca podría "necesitar" escribir una tilde porque no hay ficha que la lleve. Esto es una
simplificación deliberada respecto al programa original (donde sí se escriben tildes en la
tableta) — ver AGENTS.md §16 si se quiere revisar en el futuro.

## Cómo se usa en tiempo de ejecución

El binario se decodifica una vez a un array (`decodeFrontCoded`) y ese array se pasa a
`createSortedArrayDictionary(words)` (`letters/dictionary.ts`), que hace búsqueda binaria (`has` y
`hasPrefix`, O(log n)) sobre el array ya reconstruido — no se construye un trie en memoria.

- **Servidor** (`apps/server`): `require.resolve()` localiza el subpath del paquete
  `@duelo-lexico/game-engine/dictionary-data`, se lee como bytes crudos (`fs.readFileSync`, no es
  JSON) y se decodifica, una vez al arrancar.
- **Web** (`apps/web`): el mismo binario se sirve como asset estático público
  (`/dictionary/es-words.dict`, copiado desde `packages/game-engine/data/` — ver script en
  `apps/web`) y se hace `fetch()` + `arrayBuffer()` + `decodeFrontCoded()` una vez al arrancar la
  app; el service worker lo precachea para que el modo Local funcione offline (NFR1, R4.2). El
  precache total de la PWA bajó de ~8,47 MB a ~2,66 MB al pasar de JSON a este formato.

## Limitación conocida (backlog) — resuelta

~~7,9 MB sin comprimir es pesado para un primer download de PWA en móvil.~~ Resuelto: ver
«Compresión» más arriba (2,25 MB, ~71,6 % menos). Si en el futuro hiciera falta reducir aún más
(p. ej. si el listado crece mucho), las siguientes opciones quedan documentadas para retomar:
DAWG/trie serializado, o particionar por letra inicial y cargar bajo demanda.
