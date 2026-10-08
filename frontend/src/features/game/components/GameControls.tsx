
import { useState } from "react";

import { Crown, Pause, Play } from "lucide-react";

import { ApiClientError } from "../../../services/api/apiClient";
import { controlGame } from "../../../services/api/gameApi";

import type { GameSpeed, GameState } from "../../../types/api";

interface GameControlsProps {
  game: GameState;
  onGameChange: (game: GameState) => void;
}

export function GameControls({
  game,
  onGameChange,
}: GameControlsProps) {
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const isAiVsAi =
    game.white.participant.type === "ai" &&
    game.black.participant.type === "ai";

  async function updateControl(
    action: "pause" | "resume" | "change_speed",
    speed?: GameSpeed,
  ) {
    setError(null);
    setIsUpdating(true);

    try {
      const updatedGame = await controlGame(game.id, {
        action,
        ...(speed ? { speed } : {}),
      });

      onGameChange(updatedGame);
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError) {
        setError(caughtError.message);
      } else {
        setError("No fue posible actualizar la partida.");
      }
    } finally {
      setIsUpdating(false);
    }
  }

  if (!isAiVsAi) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-xl border border-[#59412A] bg-[#241A15] shadow-xl">

      {/* ENCABEZADO */}
      <div className="flex items-center justify-between border-b border-[#493522] bg-[#302218] px-5 py-4">
        <div>
          <h2 className="m-0 flex items-center gap-2 text-lg font-bold text-[#E8B84B]">
            <Crown className="h-5 w-5" aria-hidden="true" />
            Controles de partida
          </h2>
          <p className="mb-0 mt-1 text-xs text-[#B6A18A]">
            Administración de la partida
          </p>
        </div>

        <span className="rounded-md border border-[#75572A] bg-[#3A2A1B] px-3 py-1 text-xs font-bold text-[#E8B84B]">
          IA VS IA
        </span>
      </div>

      {/* CONTENIDO */}
      <div className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">

          <div className="flex flex-1 flex-col gap-2">
            <label
              className="text-sm font-semibold text-[#D9C5A7]"
              htmlFor="game-speed-control"
            >
              Velocidad de juego
            </label>

            <select
              id="game-speed-control"
              className="min-h-11 w-full rounded-lg border border-[#62492E] bg-[#36271D] px-3 py-2 text-[#F0DFBF] outline-none transition focus:border-[#E8B84B] focus:ring-1 focus:ring-[#E8B84B] disabled:opacity-50"
              value={game.speed}
              disabled={
                isUpdating ||
                game.status === "finished"
              }
              onChange={(event) =>
                void updateControl(
                  "change_speed",
                  event.target.value as GameSpeed,
                )
              }
            >
              <option value="normal">Normal</option>
              <option value="fast">Rápida</option>
              <option value="maximum">Máxima</option>
            </select>
          </div>

          <div className="shrink-0">
            {game.status === "active" && (
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#E8B84B] bg-[#E8B84B] px-5 py-2 font-bold text-[#211712] transition hover:bg-[#F5D782] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                disabled={isUpdating}
                onClick={() => void updateControl("pause")}
              >
                <Pause className="h-4 w-4" aria-hidden="true" />
                Pausar
              </button>
            )}

            {game.status === "paused" && (
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#E8B84B] bg-[#E8B84B] px-5 py-2 font-bold text-[#211712] transition hover:bg-[#F5D782] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                disabled={isUpdating}
                onClick={() => void updateControl("resume")}
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                Reanudar
              </button>
            )}
          </div>
        </div>

        {/* ESTADO */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#493522] bg-[#1B130F] px-4 py-3">
          <span className="text-sm text-[#B6A18A]">
            Estado de la partida
          </span>

          <span className="flex items-center gap-2 text-sm font-bold text-[#E8B84B]">
            <span className="h-2 w-2 rounded-full bg-[#E8B84B]" />
            {game.status === "active"
              ? "Activa"
              : game.status === "paused"
                ? "Pausada"
                : game.status}
          </span>
        </div>

        {isUpdating && (
          <p className="mb-0 mt-3 text-sm text-[#E8B84B]">
            Actualizando partida...
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mb-0 mt-3 rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300"
          >
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
