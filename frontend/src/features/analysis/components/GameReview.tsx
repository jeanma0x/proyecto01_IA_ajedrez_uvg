
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

const panelClass =
  "overflow-hidden rounded-xl border border-[#59412A] bg-[#241A15] shadow-lg";

const panelHeaderClass =
  "border-b border-[#493522] bg-[#302218] px-4 py-3";

const secondaryButtonClass =
  "min-h-10 rounded-lg border border-[#75572A] bg-[#362718] px-3 py-2 font-bold text-[#F0DFBF] transition hover:bg-[#49331E] disabled:cursor-not-allowed disabled:opacity-30";

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
            (a, b) => a.ply - b.ply,
          );

          setMoves(orderedMoves);
          setCurrentIndex(0);
        }
      } catch {
        if (!cancelled) {
          setError(
            "No se pudo cargar el historial de movimientos.",
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
      Math.max(0, index - 1),
    );
  }

  function goForward() {
    setCurrentIndex((index) =>
      Math.min(moves.length, index + 1),
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
    <section className="space-y-5 text-[#EADFCF]">

      {/* ENCABEZADO */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="m-0 text-2xl font-bold text-[#E8B84B]">
            ♛ Revisor de partida
          </h2>

          <p className="mb-0 mt-1 text-sm text-[#B6A18A]">
            {game.white.participant.displayName}
            {" vs. "}
            {game.black.participant.displayName}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className={secondaryButtonClass}
        >
          ← Volver a la partida
        </button>
      </div>

      {/* CARGANDO */}
      {loading && (
        <div className={`${panelClass} p-6 text-center`}>
          <p className="m-0 animate-pulse text-[#E8B84B]">
            Cargando historial de movimientos...
          </p>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-800 bg-red-950/50 p-4 text-red-300"
        >
          {error}
        </div>
      )}

      {/* REVISOR */}
      {!loading && !error && (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">

          {/* COLUMNA IZQUIERDA */}
          <div className="min-w-0 space-y-4">

            {/* TABLERO */}
            <div className="overflow-hidden rounded-xl border border-[#75572A] bg-[#2B1E17] p-2 shadow-xl">
              <Chessboard
                options={{
                  position: currentFen,
                  allowDragging: false,
                  boardOrientation: "white",
                  lightSquareStyle: {
                    backgroundColor: "#E8D0A9",
                  },
                  darkSquareStyle: {
                    backgroundColor: "#A67C52",
                  },
                  squareStyles: currentMove
                    ? {
                        [currentMove.from]: {
                          backgroundColor:
                            "rgba(232,184,75,0.5)",
                        },
                        [currentMove.to]: {
                          backgroundColor:
                            "rgba(232,184,75,0.5)",
                        },
                      }
                    : {},
                }}
              />
            </div>

            {/* NAVEGACIÓN */}
            <div className={panelClass}>
              <div className={panelHeaderClass}>
                <h3 className="m-0 text-base font-bold text-[#E8B84B]">
                  ♟ Navegación de la partida
                </h3>
              </div>

              <div className="p-4">
                <p className="mb-4 text-center text-sm text-[#B6A18A]">
                  Movimiento{" "}
                  <strong className="text-[#E8B84B]">
                    {currentIndex}
                  </strong>
                  {" de "}
                  <strong className="text-[#E8B84B]">
                    {moves.length}
                  </strong>
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={goToStart}
                    disabled={!canGoBack}
                    title="Ir al inicio"
                    className={secondaryButtonClass}
                  >
                    ⏮
                  </button>

                  <button
                    type="button"
                    onClick={goBack}
                    disabled={!canGoBack}
                    title="Movimiento anterior"
                    className={secondaryButtonClass}
                  >
                    ◀
                  </button>

                  <button
                    type="button"
                    onClick={goForward}
                    disabled={!canGoForward}
                    title="Siguiente movimiento"
                    className="min-h-10 rounded-lg border border-[#E8B84B] bg-[#E8B84B] px-4 py-2 font-bold text-[#211712] transition hover:bg-[#F5D782] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ▶
                  </button>

                  <button
                    type="button"
                    onClick={goToEnd}
                    disabled={!canGoForward}
                    title="Ir al final"
                    className={secondaryButtonClass}
                  >
                    ⏭
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA */}
          <aside className="min-w-0 space-y-4">

            {/* HISTORIAL */}
            <div className={panelClass}>
              <div className={panelHeaderClass}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="m-0 text-base font-bold text-[#E8B84B]">
                    ♟ Historial de movimientos
                  </h3>

                  <span className="rounded-md border border-[#75572A] bg-[#3A2A1B] px-2 py-1 text-xs font-bold text-[#E8B84B]">
                    {moves.length}
                  </span>
                </div>
              </div>

              <div className="p-3">
                {moves.length === 0 ? (
                  <p className="m-0 py-6 text-center text-sm text-[#B6A18A]">
                    No hay movimientos registrados.
                  </p>
                ) : (
                  <div className="grid max-h-80 grid-cols-2 content-start gap-2 overflow-y-auto overscroll-contain pr-2 [scrollbar-color:#8A662F_#1B130F] [scrollbar-width:thin]">
                    {moves.map((move, index) => (
                      <button
                        type="button"
                        key={move.id}
                        onClick={() =>
                          setCurrentIndex(index + 1)
                        }
                        className={
                          currentIndex === index + 1
                            ? "rounded-lg border border-[#E8B84B] bg-[#49331E] p-3 text-left text-sm text-[#F5D782] transition"
                            : "rounded-lg border border-[#493522] bg-[#1B130F] p-3 text-left text-sm text-[#D9C5A7] transition hover:border-[#75572A] hover:bg-[#362718]"
                        }
                      >
                        <span className="block text-xs text-[#B6A18A]">
                          {move.color === "white"
                            ? "Blancas"
                            : "Negras"}
                        </span>

                        <strong className="mt-1 block">
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
            </div>

            {/* ANÁLISIS DEL MOVIMIENTO */}
            <div className={panelClass}>
              <div className={panelHeaderClass}>
                <h3 className="m-0 text-base font-bold text-[#E8B84B]">
                  🔎 Análisis del movimiento
                </h3>
              </div>

              <div className="p-4">
                {currentMove ? (
                  <div className="space-y-4">

                    <div className="rounded-lg border border-[#75572A] bg-[#362718] p-3">
                      <p className="mb-1 text-xs font-semibold uppercase text-[#B6A18A]">
                        Movimiento seleccionado
                      </p>

                      <p className="m-0 text-xl font-bold text-[#E8B84B]">
                        {currentMove.san}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="mb-1 text-xs text-[#B6A18A]">
                          Jugador
                        </p>

                        <p className="m-0 break-words font-semibold text-[#F0DFBF]">
                          {currentMove.color === "white"
                            ? game.white.participant.displayName
                            : game.black.participant.displayName}
                        </p>
                      </div>

                      <div>
                        <p className="mb-1 text-xs text-[#B6A18A]">
                          Tipo de jugada
                        </p>

                        <p className="m-0 font-semibold text-[#F0DFBF]">
                          {moveType?.label}
                        </p>
                      </div>

                      <div>
                        <p className="mb-1 text-xs text-[#B6A18A]">
                          Origen
                        </p>

                        <p className="m-0 font-semibold text-[#E8B84B]">
                          {currentMove.from}
                        </p>
                      </div>

                      <div>
                        <p className="mb-1 text-xs text-[#B6A18A]">
                          Destino
                        </p>

                        <p className="m-0 font-semibold text-[#E8B84B]">
                          {currentMove.to}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-[#493522] bg-[#1B130F] p-3">
                      <p className="m-0 text-sm leading-relaxed text-[#D9C5A7]">
                        {moveType?.description}
                      </p>
                    </div>

                    {currentMove.latencyMs !== undefined && (
                      <p className="m-0 text-xs text-[#B6A18A]">
                        Tiempo de respuesta:{" "}
                        {(currentMove.latencyMs / 1000).toFixed(2)}
                        {" segundos"}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <span className="text-3xl text-[#E8B84B]">
                      ♟
                    </span>

                    <p className="mb-0 mt-3 text-sm text-[#B6A18A]">
                      Selecciona un movimiento para consultar sus detalles.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* EVALUACIÓN FUTURA */}
            <div className={panelClass}>
              <div className={panelHeaderClass}>
                <h3 className="m-0 text-base font-bold text-[#E8B84B]">
                  ♛ Evaluación de jugadas
                </h3>
              </div>

              <div className="p-4">
                <p className="m-0 text-sm leading-relaxed text-[#B6A18A]">
                  Próximamente: evaluación con Stockfish
                  para identificar mejores movimientos,
                  imprecisiones y errores graves.
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
