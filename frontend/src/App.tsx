
import { useState } from "react";
import "./App.css";

import { ChessBoard } from "./components/chess/ChessBoard";
import { GameConfiguration } from "./features/game/components/GameConfiguration";
import { GameControls } from "./features/game/components/GameControls";
import { GameResult } from "./features/game/components/GameResult";
import { MoveHistory } from "./features/game/components/MoveHistory";
import { AiCommentator } from "./features/game/components/AiCommentator";
import { GameReview } from "./features/analysis/components/GameReview";

import type { GameState } from "./types/api";

function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);

  function handleNewGame() {
    setIsReviewing(false);
    setGame(null);
  }

  function handleOpenReview() {
    setIsReviewing(true);
  }

  function handleCloseReview() {
    setIsReviewing(false);
  }

  const isGameFinished =
    game?.status === "finished" ||
    game?.status === "incident";

  return (
    <div className="chess-app min-h-screen">

      {/* ENCABEZADO */}
      <header className="chess-header">
        <div className="chess-container flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <div className="chess-logo" aria-hidden="true">
              ♛
            </div>

            <div>
              <h1 className="chess-title m-0 text-xl font-extrabold tracking-tight sm:text-2xl">
                Duelo de Inteligencias
              </h1>

              <p className="mb-0 mt-1 text-xs text-[#B6A18A]">
                Ajedrez entre humanos y modelos de inteligencia artificial
              </p>
            </div>
          </div>

          <span className="chess-tag">
            ♟ AI CHESS
          </span>
        </div>
      </header>

      <main className="chess-container py-5">

        {/* CONFIGURACIÓN */}
        {!game && (
          <div className="mx-auto w-full max-w-3xl">
            <div className="mb-5 text-center">
              <h2 className="chess-title text-2xl font-bold">
                ♛ El desafío comienza aquí
              </h2>

              <p className="mt-2 text-sm text-[#B6A18A]">
                Configura los participantes y comienza tu partida.
              </p>
            </div>

            <div className="chess-panel">
              <GameConfiguration
                onGameCreated={(createdGame) => {
                  setGame(createdGame);
                  setIsReviewing(false);
                }}
              />
            </div>
          </div>
        )}

        {/* REVISIÓN */}
        {game && isReviewing && (
          <div className="mx-auto max-w-6xl">
            <div className="mb-5">
              <h2 className="chess-title text-2xl font-bold">
                ♛ Análisis de partida
              </h2>

              <p className="mt-2 text-sm text-[#B6A18A]">
                Revisa los movimientos de la partida.
              </p>
            </div>

            <GameReview
              game={game}
              onClose={handleCloseReview}
            />
          </div>
        )}

        {/* DASHBOARD DE PARTIDA */}
        {game && !isReviewing && (
          <div className="chess-game-layout">

            {/* COLUMNA IZQUIERDA */}
            <div className="chess-game-left">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="chess-panel-title">
                  ♟ Tablero de juego
                </h2>

                <span className="chess-tag">
                  {isGameFinished
                    ? "PARTIDA FINALIZADA"
                    : game.status === "paused"
                      ? "PARTIDA PAUSADA"
                      : "PARTIDA EN CURSO"}
                </span>
              </div>

              <div className="chess-board-shell">
                <ChessBoard
                  game={game}
                  onGameChange={setGame}
                />
              </div>

              {/* NUEVA PARTIDA A LA IZQUIERDA */}
              {!isGameFinished && (
                <div className="chess-new-game">
                  <button
                    type="button"
                    className="chess-button-gold w-full"
                    onClick={handleNewGame}
                  >
                    ♟ Nueva partida
                  </button>
                </div>
              )}
            </div>

            {/* COLUMNA DERECHA */}
            <aside
              className="chess-game-right"
              aria-label="Información y controles de la partida"
            >
              <GameControls
                game={game}
                onGameChange={setGame}
              />

              <AiCommentator game={game} />

              <MoveHistory
                gameId={game.id}
                moveCount={game.moveCount}
              />

              <GameResult
                game={game}
                onNewGame={handleNewGame}
              />

              {/* ANÁLISIS */}
              {isGameFinished && (
                <section className="chess-panel">
                  <h2 className="chess-panel-title">
                    ♛ Análisis de partida
                  </h2>

                  <p className="mb-4 mt-2 text-sm text-[#B6A18A]">
                    Revisa los movimientos realizados
                    y analiza las decisiones.
                  </p>

                  <button
                    type="button"
                    className="chess-button-gold w-full"
                    onClick={handleOpenReview}
                  >
                    Revisar partida
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
