
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Crown,
  History,
  Loader2,
  Search,
  Swords,
} from "lucide-react";
import { Chessboard } from "react-chessboard";

import { getMoves } from "../../../services/api/gameApi";
import { StockfishService } from "../services/stockfishService";

import type { GameState, Move } from "../../../types/api";
import type {
  StockfishEvaluation,
} from "../services/stockfishService";

interface GameReviewProps {
  game: GameState;
  onClose: () => void;
}

interface AnalysisResult {
  fen: string;
  evaluation: StockfishEvaluation;
}

const INITIAL_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const panelClass =
  "overflow-hidden rounded-xl border border-[#59412A] bg-[#241A15] shadow-lg";

const panelHeaderClass =
  "border-b border-[#493522] bg-[#302218] px-4 py-3";

const secondaryButtonClass =
  "min-h-11 rounded-lg border border-[#75572A] bg-[#362718] px-3 py-2 font-bold text-[#F0DFBF] transition hover:bg-[#49331E] disabled:cursor-not-allowed disabled:opacity-30";

const goldButtonClass =
  "min-h-11 rounded-lg border border-[#E8B84B] bg-[#E8B84B] px-4 py-2 font-bold text-[#211712] transition hover:bg-[#F5D782] disabled:cursor-not-allowed disabled:opacity-40";

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

  if (/^O-O(-O)?/.test(san)) {
    return {
      label: "Enroque",
      description:
        "El jugador realizó un enroque para cambiar la posición de su rey y su torre.",
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

function formatEvaluation(
  evaluation: StockfishEvaluation,
): string {
  if (evaluation.mate !== null) {
    if (evaluation.mate > 0) {
      return `Mate en ${evaluation.mate}`;
    }

    if (evaluation.mate < 0) {
      return `Recibe mate en ${Math.abs(evaluation.mate)}`;
    }

    return "Jaque mate";
  }

  if (evaluation.scoreCp !== null) {
    const score = evaluation.scoreCp / 100;

    return `${score > 0 ? "+" : ""}${score.toFixed(2)}`;
  }

  return "Sin evaluación";
}

export function GameReview({
  game,
  onClose,
}: GameReviewProps) {
  // ========================================
  // HISTORIAL DE MOVIMIENTOS
  // ========================================

  const [moves, setMoves] = useState<Move[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // ========================================
  // STOCKFISH
  // ========================================

  const stockfishRef = useRef<StockfishService | null>(null);
  const analysisRequestRef = useRef(0);

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [analysisResult, setAnalysisResult] =
    useState<AnalysisResult | null>(null);

  const [analysisError, setAnalysisError] = useState<{
    fen: string;
    message: string;
  } | null>(null);

  // ========================================
  // CARGAR MOVIMIENTOS
  // ========================================

  useEffect(() => {
    let cancelled = false;

    async function loadMoves() {
      setLoading(true);
      setError(null);

      try {
        console.log(
          "[GameReview] Consultando movimientos:",
          game.id,
        );

        const response = await getMoves(game.id);

        if (!Array.isArray(response)) {
          throw new Error(
            "El servidor devolvió un historial con formato incorrecto.",
          );
        }

        if (!cancelled) {
          const orderedMoves = [...response].sort(
            (a, b) => a.ply - b.ply,
          );

          console.log(
            "[GameReview] Movimientos recuperados:",
            orderedMoves.length,
          );

          setMoves(orderedMoves);
          setCurrentIndex(0);
        }
      } catch (caughtError) {
        console.error(
          "[GameReview] Error al cargar movimientos:",
          caughtError,
        );

        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "No se pudo cargar el historial de movimientos.",
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
  }, [game.id, reloadKey]);

  // ========================================
  // INICIALIZAR STOCKFISH
  // ========================================

  useEffect(() => {
    const engine = new StockfishService();

    stockfishRef.current = engine;

    return () => {
      analysisRequestRef.current += 1;

      engine.destroy();

      if (stockfishRef.current === engine) {
        stockfishRef.current = null;
      }
    };
  }, []);

  // ========================================
  // POSICIÓN ACTUAL
  // ========================================

  const currentMove =
    currentIndex > 0
      ? moves[currentIndex - 1]
      : null;

  const currentFen =
    currentMove?.fenAfter ?? INITIAL_FEN;

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < moves.length;

  // Solo mostrar resultados de la posición seleccionada.
  const visibleEvaluation =
    analysisResult?.fen === currentFen
      ? analysisResult.evaluation
      : null;

  const visibleAnalysisError =
    analysisError?.fen === currentFen
      ? analysisError.message
      : null;

  // ========================================
  // NAVEGACIÓN
  // ========================================

  function goToStart() {
    if (isAnalyzing) return;
    setCurrentIndex(0);
  }

  function goBack() {
    if (isAnalyzing) return;

    setCurrentIndex((index) =>
      Math.max(0, index - 1),
    );
  }

  function goForward() {
    if (isAnalyzing) return;

    setCurrentIndex((index) =>
      Math.min(moves.length, index + 1),
    );
  }

  function goToEnd() {
    if (isAnalyzing) return;
    setCurrentIndex(moves.length);
  }

  function retryLoading() {
    setReloadKey((key) => key + 1);
  }

  // ========================================
  // ANALIZAR POSICIÓN CON STOCKFISH
  // ========================================

  async function analyzePosition() {
    const engine = stockfishRef.current;

    if (!engine || isAnalyzing) {
      return;
    }

    const requestId = ++analysisRequestRef.current;
    const fenToAnalyze = currentFen;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const result = await engine.evaluate(
        fenToAnalyze,
        12,
      );

      if (requestId === analysisRequestRef.current) {
        setAnalysisResult({
          fen: fenToAnalyze,
          evaluation: result,
        });
      }
    } catch (caughtError) {
      console.error(
        "[GameReview] Error de Stockfish:",
        caughtError,
      );

      if (requestId === analysisRequestRef.current) {
        setAnalysisError({
          fen: fenToAnalyze,
          message:
            caughtError instanceof Error
              ? caughtError.message
              : "No fue posible analizar la posición.",
        });
      }
    } finally {
      if (requestId === analysisRequestRef.current) {
        setIsAnalyzing(false);
      }
    }
  }

  const moveType = currentMove
    ? getMoveType(currentMove)
    : null;

  // ========================================
  // INTERFAZ
  // ========================================

  return (
    <section className="space-y-5 text-[#EADFCF]">

      {/* ENCABEZADO */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="m-0 flex items-center gap-2 text-2xl font-bold text-[#E8B84B]">
            <Crown className="h-6 w-6" aria-hidden="true" />
            Revisor de partida
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
          className={`${secondaryButtonClass} flex items-center gap-2`}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver a la partida
        </button>
      </div>

      {/* CARGANDO */}
      {loading && (
        <div className={`${panelClass} flex items-center justify-center gap-3 p-6 text-center`}>
          <Loader2 className="h-5 w-5 animate-spin text-[#E8B84B]" aria-hidden="true" />
          <p className="m-0 text-[#E8B84B]">
            Cargando historial de movimientos...
          </p>
        </div>
      )}

      {/* ERROR AL CARGAR */}
      {!loading && error && (
        <div
          role="alert"
          className="rounded-xl border border-red-800 bg-red-950/50 p-5"
        >
          <h3 className="m-0 text-base font-bold text-red-300">
            No fue posible cargar el historial
          </h3>

          <p className="mb-4 mt-2 break-words text-sm text-red-200">
            {error}
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={retryLoading}
              className={goldButtonClass}
            >
              ↻ Reintentar
            </button>

            <button
              type="button"
              onClick={onClose}
              className={secondaryButtonClass}
            >
              Volver a la partida
            </button>
          </div>
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
                <h3 className="m-0 flex items-center gap-2 text-base font-bold text-[#E8B84B]">
                  <Swords className="h-4 w-4" aria-hidden="true" />
                  Navegación de la partida
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
                    disabled={!canGoBack || isAnalyzing}
                    title="Ir al inicio"
                    className={secondaryButtonClass}
                  >
                    <ChevronFirst className="mx-auto h-4 w-4" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={goBack}
                    disabled={!canGoBack || isAnalyzing}
                    title="Movimiento anterior"
                    className={secondaryButtonClass}
                  >
                    <ChevronLeft className="mx-auto h-4 w-4" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={goForward}
                    disabled={!canGoForward || isAnalyzing}
                    title="Siguiente movimiento"
                    className={goldButtonClass}
                  >
                    <ChevronRight className="mx-auto h-4 w-4" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={goToEnd}
                    disabled={!canGoForward || isAnalyzing}
                    title="Ir al final"
                    className={secondaryButtonClass}
                  >
                    <ChevronLast className="mx-auto h-4 w-4" aria-hidden="true" />
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
                  <h3 className="m-0 flex items-center gap-2 text-base font-bold text-[#E8B84B]">
                    <History className="h-4 w-4" aria-hidden="true" />
                    Historial de movimientos
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
                        onClick={() => {
                          if (!isAnalyzing) {
                            setCurrentIndex(index + 1);
                          }
                        }}
                        disabled={isAnalyzing}
                        className={
                          currentIndex === index + 1
                            ? "rounded-lg border border-[#E8B84B] bg-[#49331E] p-3 text-left text-sm text-[#F5D782] transition disabled:opacity-50"
                            : "rounded-lg border border-[#493522] bg-[#1B130F] p-3 text-left text-sm text-[#D9C5A7] transition hover:border-[#75572A] hover:bg-[#362718] disabled:opacity-50"
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
                <h3 className="m-0 flex items-center gap-2 text-base font-bold text-[#E8B84B]">
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Análisis del movimiento
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
                    <span className="flex justify-center text-[#E8B84B]">
                      <Swords className="h-8 w-8" aria-hidden="true" />
                    </span>

                    <p className="mb-0 mt-3 text-sm text-[#B6A18A]">
                      Selecciona un movimiento para consultar sus detalles.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* EVALUACIÓN CON STOCKFISH */}
            <div className={panelClass}>
              <div className={panelHeaderClass}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="m-0 flex items-center gap-2 text-base font-bold text-[#E8B84B]">
                    <Crown className="h-4 w-4" aria-hidden="true" />
                    Evaluación de jugadas
                  </h3>

                  <span className="rounded-md border border-[#75572A] bg-[#3A2A1B] px-2 py-1 text-xs font-semibold text-[#F5D782]">
                    Stockfish 19
                  </span>
                </div>
              </div>

              <div className="space-y-4 p-4">
                <p className="m-0 text-sm leading-relaxed text-[#B6A18A]">
                  Analiza la posición seleccionada utilizando
                  Stockfish directamente en tu navegador.
                </p>

                <button
                  type="button"
                  onClick={() => void analyzePosition()}
                  disabled={isAnalyzing}
                  className={`${goldButtonClass} flex w-full items-center justify-center gap-2`}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Analizando posición...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" aria-hidden="true" />
                      Analizar posición
                    </>
                  )}
                </button>

                {visibleAnalysisError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300"
                  >
                    {visibleAnalysisError}
                  </div>
                )}

                {visibleEvaluation && (
                  <div className="space-y-4 rounded-lg border border-[#75572A] bg-[#362718] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#F0DFBF]">
                        Resultado del análisis
                      </span>

                      <span className="rounded-md bg-[#49331E] px-2 py-1 text-xs font-bold text-[#E8B84B]">
                        Profundidad {visibleEvaluation.depth}
                      </span>
                    </div>

                    <div>
                      <p className="mb-1 text-xs text-[#B6A18A]">
                        Evaluación del motor
                      </p>

                      <p className="m-0 text-3xl font-bold text-[#E8B84B]">
                        {formatEvaluation(visibleEvaluation)}
                      </p>

                      <p className="mb-0 mt-2 text-xs text-[#B6A18A]">
                        Valor desde la perspectiva del jugador al turno.
                        Un valor positivo favorece a quien debe mover.
                      </p>
                    </div>

                    <div className="border-t border-[#59412A] pt-3">
                      <p className="mb-1 text-xs text-[#B6A18A]">
                        Mejor movimiento recomendado
                      </p>

                      <p className="m-0 text-xl font-bold text-[#F5D782]">
                        {visibleEvaluation.bestMove ?? "No disponible"}
                      </p>

                      <p className="mb-0 mt-1 text-xs text-[#B6A18A]">
                        Notación UCI: casilla de origen y destino.
                      </p>
                    </div>

                    <p className="m-0 border-t border-[#59412A] pt-3 text-xs leading-relaxed text-[#B6A18A]">
                      Este resultado evalúa la posición actual.
                      Para clasificar la calidad de la jugada
                      necesitaremos comparar las evaluaciones
                      antes y después del movimiento.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}