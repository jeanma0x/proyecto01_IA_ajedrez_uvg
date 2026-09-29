import { useEffect, useState } from "react";

import { ChessBoard } from "./components/chess/ChessBoard";
import { createGame } from "./services/api/gameApi";
import { ApiClientError } from "./services/api/apiClient";

import type { GameState } from "./types/api";

function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initializeGame() {
      try {
        const createdGame = await createGame({
          whiteParticipantId: "human",
          blackParticipantId: "human",
        });

        setGame(createdGame);
      } catch (caughtError) {
        if (caughtError instanceof ApiClientError) {
          setError(caughtError.message);
        } else {
          setError("No fue posible crear la partida.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    void initializeGame();
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1>Duelo de Inteligencias</h1>

      <p>Frente 1 · Tablero y experiencia visual</p>

      {isLoading && <p>Creando partida...</p>}

      {error && (
        <p role="alert">
          {error}
        </p>
      )}

      {game && (
        <ChessBoard
          game={game}
          onGameChange={setGame}
        />
      )}
    </main>
  );
}

export default App;