// Tablero de letras seleccionable - R2.1, R2.2. Reemplaza el antiguo par Bombo+PalabraInput:
// las letras se muestran en horizontal, se tocan para anadirlas a la respuesta, y tocar una
// letra ya puesta en la respuesta la quita (para poder corregir). Tamano tactil (>=44px).

import { useMemo, useState } from 'react';
import styles from './TileBoard.module.css';

export interface LetterBoardProps {
  letters: string[];
  onSubmit: (word: string) => void;
}

export function LetterBoard({ letters, onSubmit }: LetterBoardProps) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const usedSet = useMemo(() => new Set(selectedIndices), [selectedIndices]);
  const word = selectedIndices.map((i) => letters[i]).join('');

  function removeAt(position: number) {
    setSelectedIndices((prev) => prev.filter((_, i) => i !== position));
  }

  function handleSubmit() {
    onSubmit(word);
    setSelectedIndices([]);
  }

  return (
    <div>
      <div className={styles.answerRow} aria-label="Tu palabra">
        {selectedIndices.length === 0 && (
          <span className={styles.placeholder}>Toca las letras para formar tu palabra</span>
        )}
        {selectedIndices.map((tileIndex, position) => (
          <button
            key={position}
            type="button"
            className={styles.answerChip}
            onClick={() => removeAt(position)}
            aria-label={`Quitar ${letters[tileIndex]}`}
          >
            {letters[tileIndex]}
          </button>
        ))}
      </div>

      <div className={styles.tileRow} aria-label="Letras disponibles">
        {letters.map((letter, index) => (
          <button
            key={index}
            type="button"
            className={styles.tile}
            disabled={usedSet.has(index)}
            onClick={() => setSelectedIndices((prev) => [...prev, index])}
          >
            {letter.toUpperCase()}
          </button>
        ))}
      </div>

      <div className={styles.actions}>
        <button type="button" onClick={() => setSelectedIndices([])} disabled={selectedIndices.length === 0}>
          Borrar todo
        </button>
        <button type="button" onClick={handleSubmit} disabled={word.length === 0}>
          Enviar
        </button>
      </div>
    </div>
  );
}
