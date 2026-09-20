// Partida online (2 jugadores) - R5.2-R5.4. El servidor es la unica fuente de verdad
// (bombo, objetivo, cronometro, validacion); este componente solo refleja el estado
// recibido por socket (ver AGENTS.md #10).

import { ChoicePicker } from '../components/ChoicePicker';
import { Cronometro } from '../components/Cronometro';
import { InviteLink } from '../components/InviteLink';
import { LetterBoard } from '../components/LetterBoard';
import { Marcador } from '../components/Marcador';
import { NumberBoard } from '../components/NumberBoard';
import { StepsList } from '../components/StepsList';
import { useOnlineMatchStore } from '../modes/online';
import styles from './MatchPage.module.css';

export interface OnlineMatchPageProps {
  onExit: () => void;
}

function toFriendlyScores(scores: Record<string, number>, myPlayerId: string | null): Record<string, number> {
  const friendly: Record<string, number> = {};
  for (const [id, score] of Object.entries(scores)) {
    friendly[id === myPlayerId ? 'Tú' : 'Rival'] = score;
  }
  return friendly;
}

export function OnlineMatchPage({ onExit }: OnlineMatchPageProps) {
  const {
    phase,
    roomId,
    players,
    choosing,
    roundStart,
    reveal,
    matchEnd,
    playerId,
    errorMessage,
    submitChoice,
    submitAnswer,
    leaveRoom,
  } = useOnlineMatchStore();

  if (phase === 'connecting') {
    return (
      <main>
        <h1>Reconectando…</h1>
        <p className={styles.waitingNote}>Retomando tu partida</p>
      </main>
    );
  }

  if (phase === 'disconnected') {
    return (
      <main>
        <h1>No se pudo retomar la partida</h1>
        {errorMessage && <p role="alert">{errorMessage}</p>}
        <div className={styles.actions}>
          <button type="button" className="primary" onClick={onExit}>
            Volver al inicio
          </button>
        </div>
      </main>
    );
  }

  if (phase === 'waiting-for-opponent') {
    return (
      <main>
        <h1>Esperando rival…</h1>
        <div className="card">
          {roomId && <InviteLink roomId={roomId} />}
          <p className={styles.waitingNote}>Jugadores conectados: {players.length} / 2</p>
        </div>
        {errorMessage && <p role="alert">{errorMessage}</p>}
      </main>
    );
  }

  if (phase === 'choosing' && choosing) {
    const isMyTurn = choosing.chooserPlayerId === playerId;
    return (
      <main>
        <p className="badge">
          Ronda {choosing.roundIndex + 1} — {choosing.kind === 'letters' ? 'Letras' : 'Cifras'}
        </p>
        {errorMessage && <p role="alert">{errorMessage}</p>}
        <div className="card">
          {isMyTurn ? (
            <ChoicePicker
              kind={choosing.kind}
              min={choosing.min}
              max={choosing.max}
              deadline={choosing.deadline}
              onChoose={submitChoice}
            />
          ) : (
            <p className={styles.waitingNote}>
              Tu rival está eligiendo {choosing.kind === 'letters' ? 'cuántas vocales' : 'cuántos números grandes'}…
            </p>
          )}
        </div>
      </main>
    );
  }

  if (phase === 'finished' && matchEnd) {
    const isWinner = matchEnd.winnerId === playerId;
    const isTie = matchEnd.winnerId === null;
    return (
      <main>
        <h1>Partida terminada</h1>
        <p className={`${styles.finalScore} gradient-text`}>{isTie ? 'Empate' : isWinner ? '¡Has ganado!' : 'Ha ganado tu rival'}</p>
        <div className="card">
          <Marcador scores={toFriendlyScores(matchEnd.totals, playerId)} />
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className="primary"
            onClick={() => {
              leaveRoom();
              onExit();
            }}
          >
            Volver al inicio
          </button>
        </div>
      </main>
    );
  }

  return (
    <main>
      <p className="badge">Partida Online</p>
      {errorMessage && <p role="alert">{errorMessage}</p>}

      {reveal && <Marcador scores={toFriendlyScores(reveal.totals, playerId)} />}

      {phase === 'answering' && roundStart && (
        <div className="card">
          <p className={styles.roundHeader}>
            Ronda {roundStart.roundIndex + 1} — {roundStart.kind === 'letters' ? 'Letras' : 'Cifras'}
          </p>
          <Cronometro deadline={roundStart.deadline} />
          {roundStart.kind === 'letters' && roundStart.letters && (
            <LetterBoard
              letters={[...roundStart.letters.vowels, ...roundStart.letters.consonants]}
              onSubmit={submitAnswer}
            />
          )}
          {roundStart.kind === 'numbers' && roundStart.numbers && (
            <>
              <p className={styles.objective}>
                Objetivo: <span className={styles.objectiveValue}>{roundStart.target}</span>
              </p>
              <NumberBoard numbers={roundStart.numbers} onSubmit={submitAnswer} />
            </>
          )}
        </div>
      )}

      {phase === 'reveal' && reveal && (
        <div className={`card ${styles.revealPanel}`}>
          <p className={styles.answerLabel}>Respuestas</p>
          <ul className={styles.answersList}>
            {Object.entries(reveal.answers).map(([id, answer]) => (
              <li key={id} className={styles.answerRow}>
                <span>{id === playerId ? 'Tú' : 'Rival'}</span>
                <span>
                  {answer || '(sin respuesta)'} — {reveal.roundScores[id] ?? 0} pts
                </span>
              </li>
            ))}
          </ul>
          <div className={styles.solutionBlock}>
            <p className={styles.answerLabel}>Solución</p>
            {'word' in reveal.solution ? (
              <p>{reveal.solution.word ?? '—'}</p>
            ) : (
              <StepsList steps={reveal.solution.steps} fallbackValue={reveal.solution.value} />
            )}
          </div>
        </div>
      )}
    </main>
  );
}
