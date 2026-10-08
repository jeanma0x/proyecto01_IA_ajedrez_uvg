
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
    let cancelled = false;

    async function loadMoves() {
      try {
        const gameMoves = await getMoves(gameId);

        if (!cancelled) {
          setMoves(gameMoves);
          setError(null);
        }
      } catch (caughtError) {
        if (cancelled) return;

        if (caughtError instanceof ApiClientError) {
          setError(caughtError.message);
        } else {
          setError("No fue posible cargar el historial.");
        }
      }
    }

    void loadMoves();

    return () => {
      cancelled = true;
    };
  }, [gameId, moveCount]);

  return (
    <section className="overflow-hidden rounded-xl border border-[#59412A] bg-[#241A15] text-[#EADFCF] shadow-xl">

      {/* ENCABEZADO */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#493522] bg-[#302218] px-5 py-4">
        <div>
          <h2 className="m-0 text-lg font-bold text-[#E8B84B]">
            ♟ Historial de movimientos
          </h2>

          <p className="mb-0 mt-1 text-xs text-[#B6A18A]">
            Registro de jugadas de la partida
          </p>
        </div>

        <span className="rounded-lg border border-[#75572A] bg-[#3A2A1B] px-3 py-1 text-xs font-bold text-[#E8B84B]">
          {moves.length} jugadas
        </span>
      </div>

      {/* CONTENIDO */}
      <div className="p-4">
        {error && (
          <p
            role="alert"
            className="m-0 rounded-lg border border-red-800 bg-red-950/50 px-3 py-3 text-sm text-red-300"
          >
            {error}
          </p>
        )}

        {!error && moves.length === 0 && (
          <div className="py-7 text-center">
            <div className="mb-3 text-4xl text-[#E8B84B]">
              ♟
            </div>

            <p className="m-0 font-semibold text-[#F0DFBF]">
              Sin movimientos todavía
            </p>

            <p className="mb-0 mt-2 text-sm text-[#B6A18A]">
              Las jugadas aparecerán aquí
              cuando comience la partida.
            </p>
          </div>
        )}

        {!error && moves.length > 0 && (
          <ol className="m-0 flex max-h-80 list-none flex-col gap-2 overflow-y-auto p-0">
            {moves.map((move, index) => {
              const isLatest = index === moves.length - 1;
              const isWhite = move.color === "white";

              return (
                <li
                  key={move.id}
                  className={
                    isLatest
                      ? "rounded-lg border border-[#A67C36] bg-[#3A2A1B] p-3"
                      : "rounded-lg border border-[#493522] bg-[#1B130F] p-3"
                  }
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#59412A] bg-[#302218] text-xs font-bold text-[#E8B84B]">
                        {index + 1}
                      </span>

                      <div>
                        <span className="block text-xs font-medium text-[#B6A18A]">
                          {isWhite ? "♙ Blancas" : "♟ Negras"}
                        </span>

                        <strong className="mt-1 block text-base text-[#F0DFBF]">
                          {move.san}
                        </strong>
                      </div>
                    </div>

                    {isLatest && (
                      <span className="rounded-md bg-[#E8B84B] px-2 py-1 text-[10px] font-bold text-[#211712]">
                        ÚLTIMO
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-md bg-[#160F0D] px-3 py-2">
                    <span className="text-xs text-[#B6A18A]">
                      Movimiento
                    </span>

                    <code className="text-xs font-bold text-[#E8B84B]">
                      {move.from} → {move.to}
                    </code>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
