import { useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { PieceDropHandlerArgs } from "react-chessboard";

function App() {
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
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1>Duelo de Inteligencias</h1>

      <p>Prueba de compatibilidad de react-chessboard.</p>

      <div
        style={{
          width: "min(80vw, 650px)",
          marginTop: "2rem",
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
    </main>
  );
}

export default App;