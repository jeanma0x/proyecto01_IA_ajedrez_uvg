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
  const [moves, setMoves] =
    useState<Move[]>([]);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadMoves() {
      try {
        const gameMoves =
          await getMoves(gameId);

        setMoves(gameMoves);
        setError(null);
      } catch (caughtError) {
        if (
          caughtError instanceof ApiClientError
        ) {
          setError(caughtError.message);
        } else {
          setError(
            "No fue posible cargar el historial.",
          );
        }
      }
    }

    void loadMoves();
  }, [gameId, moveCount]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mt-0 mb-4 text-lg font-bold text-slate-900">
        Historial de movimientos
      </h2>

      {error && (
        <p
          role="alert"
          className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800"
        >
          {error}
        </p>
      )}

      {!error && moves.length === 0 && (
        <p className="m-0 text-slate-600">
          Aún no se han realizado movimientos.
        </p>
      )}

      {moves.length > 0 && (
        <ol className="m-0 max-h-72 overflow-y-auto pl-6">
          {moves.map((move) => (
            <li
              key={move.id}
              className="border-b border-slate-100 px-1 py-2 last:border-b-0"
            >
              <span>
                <strong>
                  {move.color === "white"
                    ? "Blancas"
                    : "Negras"}
                </strong>

                {" · "}
                {move.san}
              </span>

              <span className="mt-0.5 block text-sm text-slate-500">
                {move.from} → {move.to}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}