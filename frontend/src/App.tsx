
import { useEffect, useRef, useState } from "react";
import { BarChart3, Crown, LayoutGrid, Loader2, Plus } from "lucide-react";
import "./App.css";

import { ChessBoard } from "./components/chess/ChessBoard";
import { GameConfiguration } from "./features/game/components/GameConfiguration";
import { GameControls } from "./features/game/components/GameControls";
import { GameResult } from "./features/game/components/GameResult";
import { GameResultModal } from "./features/game/components/GameResultModal";
import { MoveHistory } from "./features/game/components/MoveHistory";
import { AiCommentator } from "./features/game/components/AiCommentator";
import { GameReview } from "./features/analysis/components/GameReview";
import { StatisticsView } from "./features/statistics/components/StatisticsView";

import { getGame } from "./services/api/gameApi";

import type { GameState } from "./types/api";

// Guardar el ID de la partida para recuperarla al actualizar la página.
const ACTIVE_GAME_STORAGE_KEY = "duelo-ia:active-game-id";

function App() {
  const [game, setGame] = useState<GameState | null>(null);

  const [isReviewing, setIsReviewing] = useState(false);

  const [isViewingStatistics, setIsViewingStatistics] =
    useState(false);

  const [isRestoringGame, setIsRestoringGame] = useState(
    () => localStorage.getItem(ACTIVE_GAME_STORAGE_KEY) !== null,
  );

  const [showNewGameConfirm, setShowNewGameConfirm] =
    useState(false);

  const [showResultModal, setShowResultModal] = useState(false);

  // Guarda el status anterior de la partida para detectar la transición
  // "activa -> finalizada" en vivo, sin disparar el modal cuando se restaura
  // una partida que ya estaba finalizada (ej. al refrescar la página).
  const previousStatusRef = useRef<GameState["status"] | null>(null);

  // RESTAURAR PARTIDA GUARDADA
  useEffect(() => {
    const savedGameId = localStorage.getItem(
      ACTIVE_GAME_STORAGE_KEY,
    );

    if (!savedGameId) {
      return;
    }

    getGame(savedGameId)
      .then((restoredGame) => {
        setGame(restoredGame);
      })
      .catch(() => {
        localStorage.removeItem(ACTIVE_GAME_STORAGE_KEY);
      })
      .finally(() => {
        setIsRestoringGame(false);
      });
  }, []);

  // GUARDAR PARTIDA ACTUAL
  useEffect(() => {
    if (game) {
      localStorage.setItem(
        ACTIVE_GAME_STORAGE_KEY,
        game.id,
      );
    } else {
      localStorage.removeItem(
        ACTIVE_GAME_STORAGE_KEY,
      );
    }
  }, [game]);

  // Reinicia la referencia de status cada vez que cambia de partida, para
  // que la detección de "recién finalizada" parta de un estado limpio.
  useEffect(() => {
    previousStatusRef.current = null;
  }, [game?.id]);

  // DETECTAR TRANSICIÓN A PARTIDA FINALIZADA (para el modal de resultado)
  useEffect(() => {
    if (!game) {
      return;
    }

    const previousStatus = previousStatusRef.current;
    const isNowFinished =
      game.status === "finished" || game.status === "incident";
    const wasActive =
      previousStatus === "active" || previousStatus === "paused";

    if (previousStatus !== null && wasActive && isNowFinished) {
      setShowResultModal(true);
    }

    previousStatusRef.current = game.status;
    // Solo debe re-evaluarse cuando cambia la identidad de la partida o su
    // status — no en cada actualización de movimiento/turno/fen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.id, game?.status]);

  function handleNewGame() {
    setShowNewGameConfirm(false);
    setShowResultModal(false);
    setIsReviewing(false);
    setIsViewingStatistics(false);
    setGame(null);
  }

  function handleRequestNewGame() {
    setShowNewGameConfirm(true);
  }

  function handleOpenReview() {
    setIsReviewing(true);
    setIsViewingStatistics(false);
  }

  function handleCloseReview() {
    setIsReviewing(false);
  }

  function handleOpenStatistics() {
    setIsViewingStatistics(true);
  }

  function handleCloseStatistics() {
    setIsViewingStatistics(false);
  }

  function handleCloseResultModal() {
    setShowResultModal(false);
  }

  function handleReviewFromModal() {
    setShowResultModal(false);
    handleOpenReview();
  }

  const isGameFinished =
    game?.status === "finished" ||
    game?.status === "incident";

  return (
    <div className="chess-app min-h-screen">

      {/* ENCABEZADO */}
      <header className="chess-header">
        <div className="chess-container flex flex-wrap items-center justify-between gap-4 py-4">

          {/* LOGO Y TÍTULO */}
          <div className="flex items-center gap-3">
            <div
              className="chess-logo flex items-center justify-center"
              aria-hidden="true"
            >
              <Crown className="h-6 w-6" />
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

          {/* ACCIONES DEL ENCABEZADO */}
          <div className="flex flex-wrap items-center gap-3">

            <span className="chess-tag">
              AI CHESS
            </span>

            <button
              type="button"
              onClick={
                isViewingStatistics
                  ? handleCloseStatistics
                  : handleOpenStatistics
              }
              className={
                isViewingStatistics
                  ? "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#E8B84B] bg-[#E8B84B] px-4 py-2 text-sm font-bold text-[#211712] transition hover:bg-[#F5D782]"
                  : "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#E8B84B] bg-[#362718] px-4 py-2 text-sm font-bold text-[#E8B84B] transition hover:bg-[#49331E]"
              }
            >
              {isViewingStatistics ? (
                <>
                  <Crown className="h-4 w-4" aria-hidden="true" />
                  Volver al juego
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4" aria-hidden="true" />
                  Estadísticas
                </>
              )}
            </button>

          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="chess-container py-5">

        {/* VISTA DE ESTADÍSTICAS */}
        {isViewingStatistics && (
          <div className="mx-auto max-w-7xl">
            <StatisticsView />
          </div>
        )}

        {/* RESTAURANDO PARTIDA */}
        {!isViewingStatistics &&
          !game &&
          isRestoringGame && (
            <div className="flex min-h-[60vh] items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-[#B6A18A]">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                Cargando tu partida...
              </div>
            </div>
          )}

        {/* CONFIGURACIÓN DE PARTIDA */}
        {!isViewingStatistics &&
          !game &&
          !isRestoringGame && (
            <div className="flex min-h-[70vh] items-center justify-center">
              <div className="mx-auto w-full max-w-3xl">

                <div className="mb-5 text-center">
                  <h2 className="chess-title flex items-center justify-center gap-2 text-2xl font-bold">
                    <Crown className="h-6 w-6" aria-hidden="true" />
                    El desafío comienza aquí
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
                      setIsViewingStatistics(false);
                    }}
                  />
                </div>

              </div>
            </div>
          )}

        {/* REVISOR DE PARTIDAS */}
        {!isViewingStatistics &&
          game &&
          isReviewing && (
            <div className="mx-auto max-w-6xl">
              <GameReview
                game={game}
                onClose={handleCloseReview}
              />
            </div>
          )}

        {/* DASHBOARD DE PARTIDA */}
        {!isViewingStatistics &&
          game &&
          !isReviewing && (
            <div className="chess-game-layout">

              {/* COLUMNA IZQUIERDA */}
              <div className="chess-game-left">

                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">

                  <h2 className="chess-panel-title flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5" aria-hidden="true" />
                    Tablero de juego
                  </h2>

                  <span className="chess-tag">
                    {isGameFinished
                      ? "PARTIDA FINALIZADA"
                      : game.status === "paused"
                        ? "PARTIDA PAUSADA"
                        : game.status === "incident"
                          ? "INCIDENCIA TÉCNICA"
                          : "PARTIDA EN CURSO"}
                  </span>

                </div>

                {/* TABLERO */}
                <div className="chess-board-shell">
                  <ChessBoard
                    game={game}
                    onGameChange={setGame}
                  />
                </div>

                {/* NUEVA PARTIDA */}
                {!isGameFinished && (
                  <div className="chess-new-game">
                    <button
                      type="button"
                      className="chess-button-gold flex w-full items-center justify-center gap-2"
                      onClick={handleRequestNewGame}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Nueva partida
                    </button>
                  </div>
                )}

              </div>

              {/* COLUMNA DERECHA */}
              <aside
                className="chess-game-right"
                aria-label="Información y controles de la partida"
              >

                {/* RESULTADO — primero en la columna cuando la partida ya
                    terminó (no renderiza nada mientras sigue activa) */}
                <div className="chess-result-theme">
                  <GameResult
                    game={game}
                    onNewGame={handleNewGame}
                  />
                </div>

                {/* CONTROLES */}
                <GameControls
                  game={game}
                  onGameChange={setGame}
                />

                {/* HISTORIAL DE MOVIMIENTOS */}
                <MoveHistory
                  gameId={game.id}
                  moveCount={game.moveCount}
                />

                {/* COMENTARISTA IA */}
                <AiCommentator game={game} />

                {/* ANÁLISIS */}
                {isGameFinished && (
                  <section className="chess-panel">

                    <h2 className="chess-panel-title flex items-center gap-2">
                      <Crown className="h-5 w-5" aria-hidden="true" />
                      Análisis de partida
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

      {/* MODAL DE RESULTADO — aviso inmediato al terminar la partida */}
      {showResultModal && game && (
        <GameResultModal
          game={game}
          onClose={handleCloseResultModal}
          onReview={handleReviewFromModal}
          onNewGame={handleNewGame}
        />
      )}

      {/* CONFIRMACIÓN DE NUEVA PARTIDA */}
      {showNewGameConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-new-game-title"
        >
          <div className="chess-panel w-full max-w-sm">

            <h2
              id="confirm-new-game-title"
              className="chess-panel-title"
            >
              ¿Cancelar la partida actual?
            </h2>

            <p className="mb-5 mt-2 text-sm text-[#B6A18A]">
              Si inicias una partida nueva, la que está en curso se perderá y
              no podrás continuarla.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row">

              <button
                type="button"
                className="chess-button-gold w-full cursor-pointer"
                onClick={handleNewGame}
              >
                Sí, iniciar nueva partida
              </button>

              <button
                type="button"
                className="w-full cursor-pointer rounded-lg border border-[#B6A18A]/40 bg-transparent px-4 py-2 text-sm font-semibold text-[#B6A18A] transition-colors duration-200 hover:bg-[#B6A18A]/10"
                onClick={() =>
                  setShowNewGameConfirm(false)
                }
              >
                Cancelar
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
