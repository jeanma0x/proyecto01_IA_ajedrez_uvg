
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

  return (
    <div className="chess-app min-h-screen text-slate-100">

      {/* ENCABEZADO PREMIUM */}
      <header className="chess-header">
        <div className="mx-auto flex w-[min(calc(100%-28px),1280px)] flex-wrap items-center justify-between gap-4 py-5 sm:w-[min(calc(100%-48px),1280px)]">

          <div className="flex items-center gap-4">
            <div className="chess-logo" aria-hidden="true">
              ♛
            </div>

            <div>
              <h1 className="chess-title m-0 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Duelo de Inteligencias
              </h1>

              <p className="mb-0 mt-1 text-sm text-slate-400">
                Ajedrez entre humanos y modelos de inteligencia artificial
              </p>
            </div>
          </div>

          <span className="chess-tag">
            ♟ AI CHESS
          </span>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="mx-auto w-[min(calc(100%-28px),1280px)] py-7 sm:w-[min(calc(100%-48px),1280px)] sm:py-9">

        {/* CONFIGURACIÓN DE PARTIDA */}
        {!game && (
          <div className="mx-auto mt-5 w-full max-w-2xl">

            <div className="mb-7 text-center">
              <div className="mb-3 text-5xl text-amber-400">
                ♚
              </div>

              <h2 className="chess-title text-3xl font-bold">
                El desafío comienza aquí
              </h2>

              <p className="mt-3 text-slate-400">
                Configura tu partida y prepárate para
                desafiar a la inteligencia artificial.
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

        {/* REVISOR DE PARTIDAS */}
        {game && isReviewing && (
          <div>
            <div className="mb-6">
              <h2 className="chess-title text-2xl font-bold">
                ♛ Análisis de partida
              </h2>

              <p className="mt-2 text-slate-400">
                Revisa cada movimiento y estudia tus decisiones.
              </p>
            </div>

            <GameReview
              game={game}
              onClose={handleCloseReview}
            />
          </div>
        )}

        {/* PARTIDA NORMAL */}
        {game && !isReviewing && (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,650px)_minmax(0,1fr)] lg:gap-8">

            {/* TABLERO */}
            <div className="mx-auto w-full max-w-[650px] lg:mx-0">

              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="chess-panel-title">
                  ♟ Tablero de juego
                </h2>

                <span className="chess-tag">
                  {game.status === "finished" ||
                   game.status === "incident"
                    ? "PARTIDA FINALIZADA"
                    : "PARTIDA EN CURSO"}
                </span>
              </div>

              <div className="chess-board-shell">
                <ChessBoard
                  game={game}
                  onGameChange={setGame}
                />
              </div>
            </div>

            {/* BOTÓN NUEVA PARTIDA DEBAJO DEL TABLERO */}
            {game.status !== "finished" &&
              game.status !== "incident" && (
            <section className="mt-4 rounded-xl border border-[#59412A] bg-[#241A15] p-4 shadow-lg">
            <button
              type="button"
              className="chess-button-gold w-full"
              onClick={handleNewGame}
              >
                ♟ Nueva partida
            </button>
            </section>
            )}

            {/* PANEL DERECHO */}
            <aside
              className="flex min-w-0 flex-col gap-4"
              aria-label="Información y controles de la partida"
            >

              {/* CONTROLES */}
              <GameControls
                game={game}
                onGameChange={setGame}
              />

              {/* COMENTARISTA IA */}
              <AiCommentator game={game} />

              {/* HISTORIAL */}
              <MoveHistory
                gameId={game.id}
                moveCount={game.moveCount}
              />

              {/* RESULTADO */}
              <GameResult
                game={game}
                onNewGame={handleNewGame}
              />

              {/* ANÁLISIS */}
              {(game.status === "finished" ||
                game.status === "incident") && (
                <section className="chess-panel">

                  <h2 className="chess-panel-title">
                    ♛ Análisis de partida
                  </h2>

                  <p className="mb-5 mt-2 text-sm text-slate-400">
                    Revisa los movimientos realizados
                    y descubre cómo evolucionó el tablero.
                  </p>

                  <button
                    type="button"
                    onClick={handleOpenReview}
                    className="chess-button-gold w-full"
                  >
                    Revisar partida
                  </button>
                </section>
              )}


            </aside>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="mt-12 border-t border-amber-500/20 py-6 text-center">
        <p className="m-0 text-xs text-slate-400">
          ♛ Duelo de Inteligencias · Chess Experience
        </p>
      </footer>
    </div>
  );
}

export default App;
