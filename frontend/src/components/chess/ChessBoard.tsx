import { useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { PieceDropHandlerArgs } from "react-chessboard";

export function ChessBoard() {
  const [game, setGame] = useState(() => new Chess());

  function handlePieceDrop({
    sourceSquare,
    targetSquare,
  }: PieceDropHandlerArgs): boolean {
    if (!targetSquare) {
      return false;
    }

    const gameCopy = new Chess(game.fen());

    try {
      gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });

      setGame(gameCopy);
      return true;
    } catch {
      return false;
    }
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
            position: game.fen(),
            onPieceDrop: handlePieceDrop,
          }}
        />
      </div>

      <p>
        Turno: <strong>{game.turn() === "w" ? "Blancas" : "Negras"}</strong>
      </p>
    </section>
  );
}