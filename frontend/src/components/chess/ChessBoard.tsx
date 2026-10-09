
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { AlertTriangle, Brain, Crown } from "lucide-react";

import { Chessboard } from "react-chessboard";

import type {
  PieceDropHandlerArgs,
  PieceHandlerArgs,
} from "react-chessboard";

import { ApiClientError } from "../../services/api/apiClient";

import {
  getLegalMoves,
  makeMove,
  requestAiMove,
} from "../../services/api/gameApi";

import type {
  GameSpeed,
  GameState,
} from "../../types/api";

interface ChessBoardProps {
  game: GameState;
  onGameChange: (game: GameState) => void;
}

const AI_MOVE_DELAY_MS: Record<GameSpeed, number> = {
  normal: 1200,
  fast: 400,
  maximum: 0,
};

export function ChessBoard({
  game,
  onGameChange,
}: ChessBoardProps) {
  const [error, setError] = useState<string | null>(null);

  const [isSubmittingMove, setIsSubmittingMove] =
    useState(false);

  const [legalTargets, setLegalTargets] =
    useState<string[]>([]);

  const [aiError, setAiError] =
    useState<string | null>(null);

  const [isRequestingAiMove, setIsRequestingAiMove] =
    useState(false);

  const aiRequestInFlightRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const whiteIsHuman =
    game.white.participant.type === "human";

  const blackIsHuman =
    game.black.participant.type === "human";

  const boardOrientation =
    !whiteIsHuman && blackIsHuman
      ? "black"
      : "white";

  const currentTurnIsHuman =
    game.turn === "white"
      ? whiteIsHuman
      : blackIsHuman;

  const canInteract =
    game.status === "active" &&
    currentTurnIsHuman &&
    !isSubmittingMove;

  const requestAiTurn = useCallback(() => {
    if (aiRequestInFlightRef.current) {
      return;
    }

    aiRequestInFlightRef.current = true;
    setIsRequestingAiMove(true);
    setAiError(null);

    void requestAiMove(game.id)
      .then((updatedGame) => {
        if (mountedRef.current) {
          onGameChange(updatedGame);
        }
      })
      .catch((caughtError: unknown) => {
        if (!mountedRef.current) {
          return;
        }

        if (caughtError instanceof ApiClientError) {
          setAiError(caughtError.message);
        } else {
          setAiError(
            "No fue posible obtener el movimiento de la IA.",
          );
        }
      })
      .finally(() => {
        aiRequestInFlightRef.current = false;

        if (mountedRef.current) {
          setIsRequestingAiMove(false);
        }
      });
  }, [game.id, onGameChange]);

  // Mantiene el movimiento automático de la IA.
  useEffect(() => {
    if (game.status !== "active" || currentTurnIsHuman) {
      return;
    }

    const timer = setTimeout(
      requestAiTurn,
      AI_MOVE_DELAY_MS[game.speed],
    );

    return () => {
      clearTimeout(timer);
    };
  }, [
    game.status,
    game.turn,
    game.speed,
    currentTurnIsHuman,
    requestAiTurn,
  ]);

  function handlePieceDrag({
    square,
  }: PieceHandlerArgs): void {
    if (!canInteract || !square) {
      setLegalTargets([]);
      return;
    }

    void getLegalMoves(game.id, square)
      .then((response) => {
        setLegalTargets(response.targets);
      })
      .catch(() => {
        setLegalTargets([]);
      });
  }

  function handlePieceDrop({
    sourceSquare,
    targetSquare,
  }: PieceDropHandlerArgs): boolean {
    setLegalTargets([]);

    if (!targetSquare || !canInteract) {
      return false;
    }

    setError(null);
    setIsSubmittingMove(true);

    void makeMove(game.id, {
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    })
      .then((updatedGame) => {
        onGameChange(updatedGame);
      })
      .catch((caughtError: unknown) => {
        if (caughtError instanceof ApiClientError) {
          setError(caughtError.message);
        } else {
          setError(
            "No fue posible procesar el movimiento.",
          );
        }
      })
      .finally(() => {
        setIsSubmittingMove(false);
      });

    return true;
  }

  // COLORES DEL TABLERO
  const LIGHT_SQUARE = "#E8D0A9";
  const DARK_SQUARE = "#A67C52";

  const squareStyles: Record<
    string,
    React.CSSProperties
  > = {};

  // Resaltar el último movimiento en dorado.
  if (game.lastMove) {
    squareStyles[game.lastMove.from] = {
      backgroundColor: "rgba(232, 184, 75, 0.50)",
    };

    squareStyles[game.lastMove.to] = {
      backgroundColor: "rgba(232, 184, 75, 0.50)",
    };
  }

  // Movimientos legales.
  for (const square of legalTargets) {
    squareStyles[square] = {
      ...squareStyles[square],
      boxShadow:
        "inset 0 0 0 5px rgba(232, 184, 75, 0.75)",
    };
  }

  // Rey en jaque, en rojo — el backend calcula esto (capa de motor), el
  // frontend solo lo pinta.
  if (game.isCheck && game.checkedSquare) {
    squareStyles[game.checkedSquare] = {
      ...squareStyles[game.checkedSquare],
      backgroundColor: "rgba(220, 38, 38, 0.65)",
      boxShadow: "inset 0 0 0 3px rgba(220, 38, 38, 0.95)",
    };
  }

  return (
    <section className="w-full max-w-[650px]">

      {/* TABLERO */}
      <div className="overflow-hidden rounded-lg border border-[#8A662F] bg-[#2B1E17] shadow-2xl">
        <Chessboard
          options={{
            position: game.fen,
            boardOrientation,
            onPieceDrop: handlePieceDrop,
            onPieceDrag: handlePieceDrag,
            squareStyles,
            allowDragging: canInteract,
            lightSquareStyle: {
              backgroundColor: LIGHT_SQUARE,
            },
            darkSquareStyle: {
              backgroundColor: DARK_SQUARE,
            },
            // Contraste de las coordenadas (a-h, 1-8) contra cada tono de
            // casilla — medido con la fórmula WCAG, antes 2.10:1/2.72:1
            // (muy por debajo del mínimo de 4.5:1). En la casilla clara,
            // 9.19:1 (cumple). En la oscura, blanco puro es el máximo
            // matemáticamente alcanzable contra #A67C52 sin oscurecer la
            // casilla (~3.73:1) — mejora real de +37% sobre el original,
            // documentado así en vez de afirmar cumplimiento total.
            lightSquareNotationStyle: {
              color: "#3A2A1B",
            },
            darkSquareNotationStyle: {
              color: "#FFFFFF",
            },
          }}
        />
      </div>

      {/* INFORMACIÓN DE PARTIDA */}
      <div className="mt-4 overflow-hidden rounded-xl border border-[#59412A] bg-[#241A15] shadow-lg">

        <div className="border-b border-[#493522] bg-[#302218] px-5 py-4">
          <h2 className="m-0 flex items-center gap-2 text-lg font-bold text-[#E8B84B]">
            <Crown className="h-5 w-5" aria-hidden="true" />
            Estado de la partida
          </h2>
          <p className="mb-0 mt-1 text-xs text-[#B6A18A]">
            Información actual del enfrentamiento
          </p>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-2 gap-4">

            {/* BLANCAS */}
            <div className="rounded-lg border border-[#493522] bg-[#1B130F] p-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#B6A18A]">
                Blancas
              </span>
              <strong className="mt-2 block break-words text-sm text-[#F0DFBF]">
                {game.white.participant.displayName}
              </strong>
            </div>

            {/* NEGRAS */}
            <div className="rounded-lg border border-[#493522] bg-[#1B130F] p-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#B6A18A]">
                Negras
              </span>
              <strong className="mt-2 block break-words text-sm text-[#F0DFBF]">
                {game.black.participant.displayName}
              </strong>
            </div>

            {/* TURNO */}
            <div className="rounded-lg border border-[#493522] bg-[#1B130F] p-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#B6A18A]">
                Turno actual
              </span>
              <strong className="mt-2 block text-sm text-[#E8B84B]">
                {game.turn === "white"
                  ? "Blancas"
                  : "Negras"}
              </strong>
            </div>

            {/* MOVIMIENTOS */}
            <div className="rounded-lg border border-[#493522] bg-[#1B130F] p-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#B6A18A]">
                Movimientos
              </span>
              <strong className="mt-2 block text-lg text-[#E8B84B]">
                {game.moveCount}
              </strong>
            </div>
          </div>

          {/* JAQUE */}
          {game.isCheck && game.status === "active" && (
            <p
              role="status"
              className="mb-0 mt-4 flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm font-semibold text-red-300"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              ¡Jaque al rey {game.turn === "white" ? "blanco" : "negro"}!
            </p>
          )}

          {/* IA PENSANDO */}
          {game.status === "active" &&
            !currentTurnIsHuman &&
            !aiError && (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-[#75572A] bg-[#362718] px-4 py-3">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#E8B84B]" />
                <p className="m-0 text-sm text-[#F5D782]">
                  {isRequestingAiMove
                    ? "La IA está pensando..."
                    : "Esperando movimiento de la IA..."}
                </p>
              </div>
            )}

          {/* RAZONAMIENTO DE LA IA — solo Gemini lo expone (ver
              lib/adapters/google.ts, includeThoughts). Se queda visible
              hasta la siguiente jugada que lo reemplace o lo limpie. */}
          {game.lastMoveReasoning && (
            <div className="mt-4 rounded-lg border border-[#493522] bg-[#1B130F] p-4">
              <div className="mb-2 flex items-center gap-2">
                <Brain className="h-4 w-4 text-[#E8B84B]" aria-hidden="true" />
                <span className="text-xs font-semibold uppercase tracking-wide text-[#B6A18A]">
                  Razonamiento de Gemini (en inglés)
                </span>
              </div>
              <p className="m-0 text-sm italic leading-relaxed text-[#D9C5A7]">
                {game.lastMoveReasoning}
              </p>
            </div>
          )}

          {isSubmittingMove && (
            <p className="mb-0 mt-3 text-sm text-[#E8B84B]">
              Procesando movimiento...
            </p>
          )}

          {/* ERRORES */}
          {error && (
            <p
              role="alert"
              className="mb-0 mt-4 rounded-lg border border-red-800 bg-red-950/50 px-3 py-3 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          {aiError && (
            <div
              role="alert"
              className="mt-4 flex flex-col gap-3 rounded-lg border border-red-800 bg-red-950/50 px-3 py-3 text-sm text-red-300"
            >
              <span>{aiError}</span>

              <button
                type="button"
                className="min-h-11 self-start rounded-lg border border-red-700 bg-red-900/40 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-900/70"
                onClick={requestAiTurn}
              >
                Reintentar movimiento
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
