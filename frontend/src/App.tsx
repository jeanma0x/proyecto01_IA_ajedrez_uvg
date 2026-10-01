import { useState } from "react";

import { ChessBoard } from "./components/chess/ChessBoard";
import { GameConfiguration } from "./features/game/components/GameConfiguration";
import { GameControls } from "./features/game/components/GameControls";
import { GameResult } from "./features/game/components/GameResult";
import { MoveHistory } from "./features/game/components/MoveHistory";

import type { GameState } from "./types/api";

function App() {
  const [game, setGame] = useState<GameState | null>(null);

  function handleNewGame() {
    setGame(null);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto w-[min(calc(100%-28px),1280px)] py-5 sm:w-[min(calc(100%-48px),1280px)]">
          <h1 className="m-0 text-2xl font-bold leading-tight sm:text-3xl">
            Duelo de Inteligencias
          </h1>

          <p className="mt-1.5 mb-0 text-sm text-slate-300">
            Ajedrez entre humanos y modelos de inteligencia artificial
          </p>
        </div>
      </header>

      <main className="mx-auto w-[min(calc(100%-28px),1280px)] py-6 sm:w-[min(calc(100%-48px),1280px)] sm:py-7">
        {!game && (
          <div className="mx-auto mt-5 w-full max-w-2xl">
            <GameConfiguration
              onGameCreated={setGame}
            />
          </div>
        )}

        {game && (
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(480px,650px)_minmax(320px,1fr)] lg:gap-8">
            <div className="mx-auto w-full max-w-[650px] lg:mx-0">
              <ChessBoard
                game={game}
                onGameChange={setGame}
              />
            </div>

            <aside
              className="flex min-w-0 flex-col gap-3.5"
              aria-label="Información y controles de la partida"
            >
              <GameControls
                game={game}
                onGameChange={setGame}
              />

              <MoveHistory
                gameId={game.id}
                moveCount={game.moveCount}
              />

              <GameResult
                game={game}
                onNewGame={handleNewGame}
              />

              {game.status !== "finished" &&
                game.status !== "incident" && (
                  <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <button
                      type="button"
                      className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                      onClick={handleNewGame}
                    >
                      Nueva partida
                    </button>
                  </section>
                )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;