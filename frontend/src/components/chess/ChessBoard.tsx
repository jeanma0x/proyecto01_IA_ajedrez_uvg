import { useState } from "react";
import { Chessboard } from "react-chessboard";
import type { PieceDropHandlerArgs } from "react-chessboard";

import { makeMove } from "../../services/api/gameApi";
import { ApiClientError } from "../../services/api/apiClient";
import type { GameState } from "../../types/api";

interface ChessBoardProps {
  game: GameState;
  onGameChange: (game: GameState) => void;
}

export function ChessBoard({
  game,
  onGameChange,
}: ChessBoardProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);

  function handlePieceDrop({
    sourceSquare,
    targetSquare,
  }: PieceDropHandlerArgs): boolean {
    if (!targetSquare || isSubmittingMove) {
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
          setError("No fue posible procesar el movimiento.");
        }
      })
      .finally(() => {
        setIsSubmittingMove(false);
      });

    return true;
  }

  return (
    <section>
      <div
        style={{
          width: "min(80vw, 650px)",
        }}
      >
        <Chessboard
          options={{
            position: game.fen,
            onPieceDrop: handlePieceDrop,
            allowDragging:
              game.status === "active" && !isSubmittingMove,
          }}
        />
      </div>

      <p>
        Turno:{" "}
        <strong>
          {game.turn === "white" ? "Blancas" : "Negras"}
        </strong>
      </p>

      <p>
        Movimientos: <strong>{game.moveCount}</strong>
      </p>

      {isSubmittingMove && <p>Procesando movimiento...</p>}

      {error && <p role="alert">{error}</p>}
    </section>
  );
}