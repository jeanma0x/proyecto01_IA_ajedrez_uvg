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
  const whiteIsHuman = game.white.participant.type === "human";
const blackIsHuman = game.black.participant.type === "human";

const boardOrientation =
  !whiteIsHuman && blackIsHuman ? "black" : "white";

const currentTurnIsHuman =
  game.turn === "white" ? whiteIsHuman : blackIsHuman;

const canInteract =
  game.status === "active" &&
  currentTurnIsHuman &&
  !isSubmittingMove;

  function handlePieceDrop({
    sourceSquare,
    targetSquare,
  }: PieceDropHandlerArgs): boolean {
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
    boardOrientation,
    onPieceDrop: handlePieceDrop,
    allowDragging: canInteract,
  }}
/>
      </div>

      <p>
        Turno:{" "}
        <strong>
          {game.turn === "white" ? "Blancas" : "Negras"}
        </strong>
      </p>
{game.status === "active" && !currentTurnIsHuman && (
  <p>Esperando movimiento de la IA...</p>
)}
      <p>
        Movimientos: <strong>{game.moveCount}</strong>
      </p>

      {isSubmittingMove && <p>Procesando movimiento...</p>}

      {error && <p role="alert">{error}</p>}
    </section>
  );
}