# Reglas de referencia — formato original

Notas de investigación sobre la dinámica de *Cifras y Letras* (RTVE), usadas como base para el diseño en `AGENTS.md`. Esto es documentación de investigación, no texto oficial de RTVE.

## Estructura general del programa (no replicada íntegra en el MVP)

1. La llave (1 prueba)
2. La palabra más larga y la cifra exacta: 10 pruebas (5 letras + 5 cifras, alternadas) — **esto es lo que implementa el MVP**
3. Los duelos: 4 duelos de 30s, valorados 10/20/30/50 puntos — Fase 2
4. La ronda final: 12 palabras temáticas en 3 minutos — Fase 3

## Prueba de Letras

- El jugador en turno elige cuántas vocales quiere, entre **3 y 6**, de un total de **10 letras**.
- **30 segundos** para formar la palabra más larga.
- Válido: cualquier conjugación verbal, terminaciones reflexivas, plurales.
- Mínimo **5 letras** para puntuar; debe existir en el diccionario de referencia.
- Puntuación: **1 punto por letra** de la palabra válida más larga. Empate reparte puntos a ambos.

## Prueba de Cifras

- **6 números**: combinación de números "pequeños" (1–10, con repetición permitida en la bolsa) y "grandes" (25, 50, 75, 100, uno de cada). El jugador en turno decide cuántos números grandes quiere (0 a 4).
- Número objetivo aleatorio entre **100 y 999**.
- Tiempo: **40 segundos** (versiones antiguas usaban 45s).
- Operaciones: suma, resta, multiplicación, división. No es obligatorio usar todos los números; ninguno se puede repetir más veces de las que aparece.
- Puntuación: **10 puntos** por resultado exacto, **7 puntos** por la mejor aproximación válida. Empate reparte puntos a ambos.
- Distribución estándar de la bolsa de números en el formato internacional (*Countdown*, origen del formato): 2 copias de cada número 1–10 (20 fichas) + 1 copia de cada 25/50/75/100 (4 fichas) = 24 fichas. RTVE no publica si difiere de esto; se asume igual.

## Los Duelos (Fase 2)

4 duelos de 30s cada uno (10/20/30/50 puntos). Tipos de prueba:
- Letras: "3 en 1" (palabra con definición y 3 letras reveladas progresivamente), "Doble Palabra" (dos palabras de 10 letras), "2 para 2" (dos palabras con pistas), "Doble Sentido" (palabra polisémica).
- Cifras: "El Cálculo" (serie de operaciones mental con paréntesis), "El Esprint Numérico" (cifra exacta mental).
- Quien pulsa primero y acierta suma los puntos; fallar da los puntos al rival.

## Ronda Final (Fase 3)

- 3 minutos para encontrar 12 palabras relacionadas con un tema, cada una a partir de un grupo de 10 letras con la longitud indicada.
- Premios económicos del programa original (100€/palabra, 1.500€ a 11, bote a las 12) — **no aplica** a este proyecto; se sustituiría por puntos o logros.
- Desempate: adivinar una palabra concreta pulsando primero.

## Sistema de campeón (Fase 3, opcional)

El ganador del día vuelve al episodio siguiente; si gana el bote, se retira invicto. Para este proyecto equivaldría a un sistema de "racha" entre partidas online sucesivas, opcional y no bloqueante para el MVP.

## Fuentes consultadas

- [Cifras y letras — Wikipedia](https://es.wikipedia.org/wiki/Cifras_y_letras)
- [Cifras y Letras: Prueba de Letras — Playing Python](https://lmerchante.github.io/playing_python/chapters/cifrasyletrasII/soluciones.html)
- [Cifras y Letras – Blog del Instituto de Matemáticas de la Universidad de Sevilla](https://institucional.us.es/blogimus/2024/10/cifras-y-letras/)
- [Resolviendo "Cifras y Letras" (I) — El Cedazo](https://eltamiz.com/elcedazo/2011/06/27/resolviendo-cifras-y-letras-i/)
- [Un juego llamado Cifras y Letras (blog)](https://juego-cifrasyletras.blogspot.com/)
