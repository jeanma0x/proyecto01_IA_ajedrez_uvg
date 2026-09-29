import { useState } from "react";

import { ChessBoard } from "./components/chess/ChessBoard";
import { GameConfiguration } from "./features/game/components/GameConfiguration";

import type { GameState } from "./types/api";

function App() {
  const [game, setGame] = useState<GameState | null>(null);

  function handleNewGame() {
    setGame(null);
  }

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

      {!game && (
        <GameConfiguration onGameCreated={setGame} />
      )}

      {game && (
        <>
          <ChessBoard
            game={game}
            onGameChange={setGame}
          />

          <button
            type="button"
            onClick={handleNewGame}
          >
            Nueva partida
          </button>
        </>
      )}
    </main>
  );
}

export default App;