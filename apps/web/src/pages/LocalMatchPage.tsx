// Modo Local (1 jugador, o contra el bot con R4.3) - R4.1, R4.2. Orquesta rondas usando
// modes/local/store.ts (que a su vez usa @duelo-lexico/game-engine directamente), sin red.

import { BIG_NUMBERS, MAX_VOWELS, MIN_VOWELS, type CpuDifficulty } from '@duelo-lexico/game-engine';
import { useEffect, useState } from 'react';
import { ChoicePicker } from '../components/ChoicePicker';
import { Cronometro } from '../components/Cronometro';
import { HomeButton } from '../components/HomeButton';
import { LetterBoard } from '../components/LetterBoard';
import { Marcador } from '../components/Marcador';
import { NumberBoard } from '../components/NumberBoard';
import { OpponentPicker } from '../components/OpponentPicker';
import { formatStepsInline, StepsList } from '../components/StepsList';
import { CPU_PLAYER_ID, LOCAL_PLAYER_ID, useLocalMatchStore } from '../modes/local';
import styles from './MatchPage.module.css';

export interface LocalMatchPageProps {
  onExit: () => void;
  onViewStats: () => void;
}

export function LocalMatchPage({ onExit, onViewStats }: LocalMatchPageProps) {
  const [opponentChosen, setOpponentChosen] = useState<CpuDifficulty | null | undefined>(undefined);
  const {
    phase,
    matchState,
    opponent,
    letters,
    numbers,
    target,
    deadline,
    lastAnswer,
    lastAnswerSteps,
    lastPoints,
    lastBestWord,
    lastBestSteps,
    lastBestValue,
    lastCpuAnswer,
    lastCpuAnswerSteps,
    lastCpuPoints,
    totalScore,
    cpuTotalScore,
    history,
    startMatch,
    submitChoice,
    submitAnswer,
    timeUp,
    continueToNextRound,
  } = useLocalMatchStore();

  useEffect(() => {
    if (opponentChosen === undefined) return;
    startMatch(opponentChosen);
    // startMatch reinicia toda la partida; solo se ejecuta al elegir rival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opponentChosen]);

  if (opponentChosen === undefined) {
    return <OpponentPicker onChoose={setOpponentChosen} onExit={onExit} />;
  }

  if (phase === 'idle' || !matchState) {
    return (
      <main>
        <p>Preparando partida…</p>
      </main>
    );
  }

  const roundConfig = matchState.config.rounds[matchState.currentRoundIndex];
  const roundNumber = matchState.currentRoundIndex + 1;
  const totalRounds = matchState.config.rounds.length;

  if (phase === 'finished') {
    const isVsCpu = opponent !== null;
    const isWinner = isVsCpu && totalScore > cpuTotalScore;
    const isTie = isVsCpu && totalScore === cpuTotalScore;

    return (
      <main>
        <h1>Partida terminada</h1>
        {isVsCpu && (
          <p className={`${styles.finalScore} gradient-text`}>{isTie ? 'Empate' : isWinner ? '¡Has ganado!' : 'Ha ganado la CPU'}</p>
        )}
        {isVsCpu ? (
          <Marcador scores={{ [LOCAL_PLAYER_ID]: totalScore, [CPU_PLAYER_ID]: cpuTotalScore }} />
        ) : (
          <p className={`${styles.finalScore} gradient-text`}>{totalScore}</p>
        )}

        <ol className={styles.historyList}>
          {history.map((entry, i) => (
            <li key={i} className={styles.historyItem}>
              {entry.kind === 'letters'
                ? `Letras: "${entry.answer ?? '(sin respuesta)'}" — ${entry.points} pts (mejor posible: ${entry.bestWord ?? '—'})`
                : `Cifras (objetivo ${entry.target}): "${entry.answer ?? '(sin respuesta)'}" — ${entry.points} pts (mejor posible: ${formatStepsInline(entry.bestSteps ?? [], entry.bestValue)})`}
              {isVsCpu && ` · CPU: "${entry.cpuAnswer ?? '(sin respuesta)'}" — ${entry.cpuPoints ?? 0} pts`}
            </li>
          ))}
        </ol>

        <div className={styles.actions}>
          <button type="button" onClick={onViewStats}>
            Ver estadísticas
          </button>
          <button type="button" className="primary" onClick={onExit}>
            Volver al inicio
          </button>
        </div>
      </main>
    );
  }

  return (
    <main>
      <HomeButton onExit={onExit} confirmExit />
      <p className="badge">
        Ronda {roundNumber} de {totalRounds} — {roundConfig?.kind === 'letters' ? 'Letras' : 'Cifras'}
      </p>
      {opponent ? (
        <Marcador scores={{ [LOCAL_PLAYER_ID]: totalScore, [CPU_PLAYER_ID]: cpuTotalScore }} />
      ) : (
        <Marcador scores={{ [LOCAL_PLAYER_ID]: totalScore }} />
      )}

      {phase === 'choosing' && roundConfig && (
        <div className="card">
          <ChoicePicker
            kind={roundConfig.kind}
            min={roundConfig.kind === 'letters' ? MIN_VOWELS : 0}
            max={roundConfig.kind === 'letters' ? MAX_VOWELS : BIG_NUMBERS.length}
            onChoose={submitChoice}
          />
        </div>
      )}

      {phase === 'answering' && deadline && (
        <div className="card">
          <Cronometro deadline={deadline} onExpire={timeUp} />
          {roundConfig?.kind === 'letters' && letters && (
            <LetterBoard letters={[...letters.vowels, ...letters.consonants]} onSubmit={submitAnswer} />
          )}
          {roundConfig?.kind === 'numbers' && numbers && target !== null && (
            <>
              <p className={styles.objective}>
                Objetivo: <span className={styles.objectiveValue}>{target}</span>
              </p>
              <NumberBoard numbers={numbers} onSubmit={submitAnswer} />
            </>
          )}
        </div>
      )}

      {phase === 'reveal' && (
        <div className={`card ${styles.revealPanel}`}>
          <p className={styles.answerLabel}>Tu respuesta</p>
          {roundConfig?.kind === 'numbers' && lastAnswerSteps && lastAnswerSteps.length > 0 ? (
            <StepsList steps={lastAnswerSteps} />
          ) : (
            <p>{lastAnswer ?? '(sin respuesta)'}</p>
          )}

          <span className={`${styles.pointsEarned} ${lastPoints === 0 ? styles.zero : 'gradient-text'}`}>
            +{lastPoints}
          </span>

          {opponent && (
            <div className={styles.solutionBlock}>
              <p className={styles.answerLabel}>Respuesta de la CPU</p>
              {roundConfig?.kind === 'numbers' && lastCpuAnswerSteps && lastCpuAnswerSteps.length > 0 ? (
                <StepsList steps={lastCpuAnswerSteps} />
              ) : (
                <p>{lastCpuAnswer ?? '(sin respuesta)'}</p>
              )}
              <span className={`${styles.pointsEarned} ${lastCpuPoints === 0 ? styles.zero : 'gradient-text'}`}>
                +{lastCpuPoints}
              </span>
            </div>
          )}

          <div className={styles.solutionBlock}>
            {roundConfig?.kind === 'letters' && (
              <>
                <p className={styles.answerLabel}>Mejor palabra posible</p>
                <p>{lastBestWord ?? '—'}</p>
              </>
            )}
            {roundConfig?.kind === 'numbers' && (
              <>
                <p className={styles.answerLabel}>Mejor solución</p>
                <StepsList steps={lastBestSteps ?? []} fallbackValue={lastBestValue ?? undefined} />
              </>
            )}
          </div>

          <div className={styles.actions}>
            <button type="button" className="primary" onClick={continueToNextRound}>
              Siguiente ronda
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
