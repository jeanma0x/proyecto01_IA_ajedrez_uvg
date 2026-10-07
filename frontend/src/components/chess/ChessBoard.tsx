import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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

import type { GameSpeed, GameState } from "../../types/api";

interface ChessBoardProps {
  game: GameState;
  onGameChange: (game: GameState) => void;
}

// RF-19/20: la velocidad solo cambia el ritmo entre jugadas de IA, nunca
// oculta movimientos ni altera su orden (ver lib/game/move-service.ts en el
// backend, que sigue aplicando un movimiento a la vez).
const AI_MOVE_DELAY_MS: Record<GameSpeed, number> = {
  normal: 1200,
  fast: 400,
  maximum: 0,
};

export function ChessBoard({
  game,
  onGameChange,
}: ChessBoardProps) {
  const [error, setError] =
    useState<string | null>(null);

  const [
    isSubmittingMove,
    setIsSubmittingMove,
  ] = useState(false);

  const [legalTargets, setLegalTargets] =
    useState<string[]>([]);

  const [aiError, setAiError] =
    useState<string | null>(null);

  const [
    isRequestingAiMove,
    setIsRequestingAiMove,
  ] = useState(false);

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

  // Dispara automáticamente el turno de la IA (RF-13): sin esto, una
  // partida con IA nunca avanza por sí sola. Se reprograma solo cuando
  // cambia el turno/estado/velocidad — pausar limpia el timer pendiente.
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
        if (
          caughtError instanceof ApiClientError
        ) {
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

  const squareStyles: Record<
    string,
    React.CSSProperties
  > = {};

  if (game.lastMove) {
    squareStyles[game.lastMove.from] = {
      backgroundColor:
        "rgba(250, 204, 21, 0.45)",
    };

    squareStyles[game.lastMove.to] = {
      backgroundColor:
        "rgba(250, 204, 21, 0.45)",
    };
  }

  for (const square of legalTargets) {
    squareStyles[square] = {
      ...squareStyles[square],
      boxShadow:
        "inset 0 0 0 5px rgba(37, 99, 235, 0.55)",
    };
  }

  return (
    <section className="w-full max-w-[650px]">
      <div className="w-full overflow-hidden rounded-xl shadow-md">
        <Chessboard
          options={{
            position: game.fen,
            boardOrientation,
            onPieceDrop: handlePieceDrop,
            onPieceDrag: handlePieceDrag,
            squareStyles,
            allowDragging: canInteract,
          }}
        />
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mt-0 mb-4 text-lg font-bold text-slate-900">
          Estado de la partida
        </h2>

        <div className="grid grid-cols-2 gap-x-5 gap-y-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Blancas
            </span>

            <strong>
              {
                game.white.participant
                  .displayName
              }
            </strong>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Negras
            </span>

            <strong>
              {
                game.black.participant
                  .displayName
              }
            </strong>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Turno
            </span>

            <strong>
              {game.turn === "white"
                ? "Blancas"
                : "Negras"}
            </strong>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Movimientos
            </span>

            <strong>{game.moveCount}</strong>
          </div>
        </div>

        {game.status === "active" &&
          !currentTurnIsHuman &&
          !aiError && (
            <p className="mt-3 mb-0 text-slate-600">
              {isRequestingAiMove
                ? "La IA está pensando..."
                : "Esperando movimiento de la IA..."}
            </p>
          )}

        {isSubmittingMove && (
          <p className="mt-3 mb-0 text-slate-600">
            Procesando movimiento...
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-3 mb-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800"
          >
            {error}
          </p>
        )}

        {aiError && (
          <div
            role="alert"
            className="mt-3 flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800"
          >
            <span>{aiError}</span>

            <button
              type="button"
              className="min-h-9 self-start rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-800 transition hover:bg-red-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              onClick={requestAiTurn}
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    </section>
  );
}