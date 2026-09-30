import { useState } from "react";
import { Chessboard } from "react-chessboard";

import type {
  PieceDropHandlerArgs,
  PieceHandlerArgs,
} from "react-chessboard";

import { ApiClientError } from "../../services/api/apiClient";

import {
  getLegalMoves,
  makeMove,
} from "../../services/api/gameApi";

import type { GameState } from "../../types/api";

interface ChessBoardProps {
  game: GameState;
  onGameChange: (game: GameState) => void;
}

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
          !currentTurnIsHuman && (
            <p className="mt-3 mb-0 text-slate-600">
              Esperando movimiento de la IA...
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
      </div>
    </section>
  );
}