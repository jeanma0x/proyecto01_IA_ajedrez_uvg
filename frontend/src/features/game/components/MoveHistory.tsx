import { useEffect, useState } from "react";

import { ApiClientError } from "../../../services/api/apiClient";
import { getMoves } from "../../../services/api/gameApi";

import type { Move } from "../../../types/api";

interface MoveHistoryProps {
  gameId: string;
  moveCount: number;
}

export function MoveHistory({
  gameId,
  moveCount,
}: MoveHistoryProps) {
  const [moves, setMoves] = useState<Move[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMoves() {
      try {
        const gameMoves = await getMoves(gameId);
        setMoves(gameMoves);
        setError(null);
      } catch (caughtError) {
        if (caughtError instanceof ApiClientError) {
          setError(caughtError.message);
        } else {
          setError("No fue posible cargar el historial.");
        }
      }
    }

    void loadMoves();
  }, [gameId, moveCount]);

  return (
    <section>
      <h2>Historial de movimientos</h2>

      {error && <p role="alert">{error}</p>}

      {!error && moves.length === 0 && (
        <p>Aún no se han realizado movimientos.</p>
      )}

      {moves.length > 0 && (
        <ol>
          {moves.map((move) => (
            <li key={move.id}>
              <strong>
                {move.color === "white" ? "Blancas" : "Negras"}
              </strong>
              {": "}
              {move.san}
              {" · "}
              {move.from} → {move.to}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}