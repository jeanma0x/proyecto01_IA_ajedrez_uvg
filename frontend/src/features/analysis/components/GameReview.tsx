
import { useEffect, useState } from "react";
import { Chessboard } from "react-chessboard";

import { getMoves } from "../../../services/api/gameApi";
import type { GameState, Move } from "../../../types/api";

interface GameReviewProps {
  game: GameState;
  onClose: () => void;
}

const INITIAL_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function GameReview({
  game,
  onClose,
}: GameReviewProps) {
  const [moves, setMoves] = useState<Move[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMoves() {
      setLoading(true);
      setError(null);

      try {
        const response = await getMoves(game.id);

        if (!cancelled) {
          const orderedMoves = [...response].sort(
            (a, b) => a.ply - b.ply
          );

          setMoves(orderedMoves);
          setCurrentIndex(0);
        }
      } catch {
        if (!cancelled) {
          setError(
            "No se pudo cargar el historial de movimientos."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMoves();

    return () => {
      cancelled = true;
    };
  }, [game.id]);

  const currentMove =
    currentIndex > 0
      ? moves[currentIndex - 1]
      : null;

  const currentFen =
    currentMove?.fenAfter ?? INITIAL_FEN;

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < moves.length;

  function goToStart() {
    setCurrentIndex(0);
  }

  function goBack() {
    setCurrentIndex((index) =>
      Math.max(0, index - 1)
    );
  }

  function goForward() {
    setCurrentIndex((index) =>
      Math.min(moves.length, index + 1)
    );
  }

  function goToEnd() {
    setCurrentIndex(moves.length);
  }

  function getMoveType(move: Move): {
    label: string;
    description: string;
  } {
    const san = move.san;

    if (san.includes("#")) {
      return {
        label: "Jaque mate",
        description:
          "Este movimiento finalizó la partida mediante jaque mate.",
      };
    }

    if (san.includes("+")) {
      return {
        label: "Jaque",
        description:
          "Este movimiento puso al rey rival en jaque.",
      };
    }

    if (san === "O-O" || san === "O-O-O") {
      return {
        label: "Enroque",
        description:
          "El jugador realizó un enroque para mejorar la seguridad de su rey.",
      };
    }

    if (san.includes("=")) {
      return {
        label: "Promoción",
        description:
          "Un peón llegó a la última fila y fue promocionado.",
      };
    }

    if (san.includes("x")) {
      return {
        label: "Captura",
        description:
          "El jugador capturó una pieza del adversario.",
      };
    }

    return {
      label: "Movimiento normal",
      description:
        "Movimiento realizado durante el desarrollo de la partida.",
    };
  }

  const moveType = currentMove
    ? getMoveType(currentMove)
    : null;

  return (
    <section className="space-y-5">
      {/* ENCABEZADO */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-2xl font-bold text-slate-900">
            🧠 Revisor de partida
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {game.white.participant.displayName}
            {" vs. "}
            {game.black.participant.displayName}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          ← Volver a la partida
        </button>
      </div>

      {/* CARGANDO */}
      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-slate-600">
            Cargando historial de movimientos...
          </p>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
        >
          {error}
        </div>
      )}

      {/* REVISOR */}
      {!loading && !error && (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">

          {/* COLUMNA IZQUIERDA */}
          <div className="space-y-4">

            {/* TABLERO */}
            <div className="overflow-hidden rounded-xl shadow-md">
              <Chessboard
                options={{
                  position: currentFen,
                  allowDragging: false,
                  boardOrientation: "white",
                  squareStyles: currentMove
                    ? {
                        [currentMove.from]: {
                          backgroundColor:
                            "rgba(250, 204, 21, 0.45)",
                        },
                        [currentMove.to]: {
                          backgroundColor:
                            "rgba(250, 204, 21, 0.45)",
                        },
                      }
                    : {},
                }}
              />
            </div>

            {/* CONTROLES */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-center text-base font-bold text-slate-900">
                Navegación de la partida
              </h3>

              <p className="mb-4 text-center text-sm text-slate-600">
                Movimiento{" "}
                <strong>{currentIndex}</strong>
                {" de "}
                <strong>{moves.length}</strong>
              </p>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={goToStart}
                  disabled={!canGoBack}
                  title="Ir al inicio"
                  className="min-h-11 rounded-lg bg-slate-100 px-4 py-2 font-bold text-slate-800 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ⏮
                </button>

                <button
                  type="button"
                  onClick={goBack}
                  disabled={!canGoBack}
                  title="Movimiento anterior"
                  className="min-h-11 rounded-lg bg-slate-100 px-4 py-2 font-bold text-slate-800 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ◀
                </button>

                <button
                  type="button"
                  onClick={goForward}
                  disabled={!canGoForward}
                  title="Siguiente movimiento"
                  className="min-h-11 rounded-lg bg-blue-600 px-4 py-2 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ▶
                </button>

                <button
                  type="button"
                  onClick={goToEnd}
                  disabled={!canGoForward}
                  title="Ir al final"
                  className="min-h-11 rounded-lg bg-slate-100 px-4 py-2 font-bold text-slate-800 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ⏭
                </button>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA */}
          <aside className="space-y-4">

            {/* HISTORIAL */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-slate-900">
                📋 Historial de movimientos
              </h3>

              {moves.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No hay movimientos registrados.
                </p>
              ) : (
                <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto">
                  {moves.map((move, index) => (
                    <button
                      type="button"
                      key={move.id}
                      onClick={() =>
                        setCurrentIndex(index + 1)
                      }
                      className={`rounded-lg border p-3 text-left text-sm transition ${
                        currentIndex === index + 1
                          ? "border-blue-500 bg-blue-50 text-blue-800"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="block text-xs text-slate-500">
                        {move.color === "white"
                          ? "Blancas"
                          : "Negras"}
                      </span>

                      <strong>
                        {Math.ceil(move.ply / 2)}
                        {move.color === "white"
                          ? ". "
                          : "... "}
                        {move.san}
                      </strong>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* MOVIMIENTO SELECCIONADO */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-slate-900">
                🔎 Análisis del movimiento
              </h3>

              {currentMove ? (
                <div className="space-y-3">

                  <div className="rounded-lg bg-blue-50 p-3">
                    <p className="mb-1 text-xs font-semibold uppercase text-blue-600">
                      Movimiento seleccionado
                    </p>

                    <p className="m-0 text-xl font-bold text-slate-900">
                      {currentMove.san}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">
                        Jugador
                      </p>
                      <p className="font-semibold text-slate-800">
                        {currentMove.color === "white"
                          ? game.white.participant.displayName
                          : game.black.participant.displayName}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Tipo de jugada
                      </p>
                      <p className="font-semibold text-slate-800">
                        {moveType?.label}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Origen
                      </p>
                      <p className="font-semibold text-slate-800">
                        {currentMove.from}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Destino
                      </p>
                      <p className="font-semibold text-slate-800">
                        {currentMove.to}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="m-0 text-sm leading-relaxed text-slate-700">
                      {moveType?.description}
                    </p>
                  </div>

                  {currentMove.latencyMs !== undefined && (
                    <p className="text-xs text-slate-500">
                      Tiempo de respuesta:{" "}
                      {(currentMove.latencyMs / 1000).toFixed(2)}
                      {" segundos"}
                    </p>
                  )}
                </div>
              ) : (
                <div className="py-5 text-center">
                  <p className="text-sm text-slate-500">
                    Selecciona un movimiento para consultar
                    sus detalles.
                  </p>
                </div>
              )}
            </div>

            {/* FUTURO ANÁLISIS */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-lg font-bold text-slate-900">
                ♟️ Evaluación de jugadas
              </h3>

              <p className="m-0 text-sm leading-relaxed text-slate-600">
                Próximamente: evaluación con Stockfish
                para identificar mejores movimientos,
                imprecisiones y errores graves.
              </p>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
