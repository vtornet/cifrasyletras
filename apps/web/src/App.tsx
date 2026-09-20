import { useCallback, useEffect, useState } from 'react';
import { loadDictionary } from './dictionary';
import { hasPersistedSession, useOnlineMatchStore } from './modes/online';
import { HomePage } from './pages/HomePage';
import { LocalMatchPage } from './pages/LocalMatchPage';
import { OnlineLobbyPage } from './pages/OnlineLobbyPage';
import { OnlineMatchPage } from './pages/OnlineMatchPage';
import { StatsPage } from './pages/StatsPage';

// Shell minimo de navegacion entre pantallas - sin router externo por ahora
// (pocas pantallas: Home, Local, Online lobby/match, Stats). Revisar si hace falta
// react-router cuando crezca (AGENTS.md #3 - politica de dependencias).
type Screen = 'home' | 'local' | 'online-lobby' | 'online-match' | 'stats';
type DictionaryStatus = 'loading' | 'ready' | 'error';

/** Enlace de invitacion (R5.1): ?room=CODIGO en la URL. */
function readRoomCodeFromUrl(): string | null {
  try {
    return new URLSearchParams(window.location.search).get('room');
  } catch {
    return null;
  }
}

function App() {
  const [autoJoinCode] = useState<string | null>(readRoomCodeFromUrl);
  // Si no hay un enlace de invitacion en la URL pero si una sesion online guardada de una
  // visita anterior, se entra directo a la partida y se intenta retomarla (#10).
  const [screen, setScreen] = useState<Screen>(() => {
    if (autoJoinCode) return 'online-lobby';
    if (hasPersistedSession()) return 'online-match';
    return 'home';
  });
  const [dictionaryStatus, setDictionaryStatus] = useState<DictionaryStatus>('loading');
  const restoreSession = useOnlineMatchStore((state) => state.restoreSession);

  useEffect(() => {
    loadDictionary()
      .then(() => setDictionaryStatus('ready'))
      .catch((err: unknown) => {
        console.error('Error cargando el diccionario', err);
        setDictionaryStatus('error');
      });
  }, []);

  useEffect(() => {
    if (!autoJoinCode) return;
    // Limpia el ?room=... de la barra de direcciones para que recargar la pagina no
    // intente volver a unirse (la sesion se retoma por sessionToken, no por la URL).
    const url = new URL(window.location.href);
    url.search = '';
    window.history.replaceState({}, '', url.toString());
  }, [autoJoinCode]);

  useEffect(() => {
    if (autoJoinCode) return;
    restoreSession();
  }, [autoJoinCode, restoreSession]);

  const goHome = useCallback(() => setScreen('home'), []);
  const goOnlineMatch = useCallback(() => setScreen('online-match'), []);
  const goStats = useCallback(() => setScreen('stats'), []);

  if (dictionaryStatus === 'loading') {
    return (
      <main>
        <p>Cargando diccionario…</p>
      </main>
    );
  }

  if (dictionaryStatus === 'error') {
    return (
      <main>
        <p>No se pudo cargar el diccionario. Comprueba tu conexión e inténtalo de nuevo.</p>
      </main>
    );
  }

  switch (screen) {
    case 'local':
      return <LocalMatchPage onExit={goHome} onViewStats={goStats} />;
    case 'online-lobby':
      return <OnlineLobbyPage onRoomReady={goOnlineMatch} autoJoinCode={autoJoinCode} />;
    case 'online-match':
      return <OnlineMatchPage onExit={goHome} />;
    case 'stats':
      return <StatsPage onExit={goHome} />;
    case 'home':
    default:
      return (
        <HomePage
          onSelectLocal={() => setScreen('local')}
          onSelectOnline={() => setScreen('online-lobby')}
          onSelectStats={goStats}
        />
      );
  }
}

export default App;
