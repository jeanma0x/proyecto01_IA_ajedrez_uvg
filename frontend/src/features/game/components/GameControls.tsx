import { useState } from "react";

import { ApiClientError } from "../../../services/api/apiClient";
import { controlGame } from "../../../services/api/gameApi";

import type {
  GameSpeed,
  GameState,
} from "../../../types/api";

interface GameControlsProps {
  game: GameState;
  onGameChange: (game: GameState) => void;
}

export function GameControls({
  game,
  onGameChange,
}: GameControlsProps) {
  const [error, setError] =
    useState<string | null>(null);

  const [isUpdating, setIsUpdating] =
    useState(false);

  const isAiVsAi =
    game.white.participant.type === "ai" &&
    game.black.participant.type === "ai";

  async function updateControl(
    action:
      | "pause"
      | "resume"
      | "change_speed",
    speed?: GameSpeed,
  ) {
    setError(null);
    setIsUpdating(true);

    try {
      const updatedGame =
        await controlGame(game.id, {
          action,
          ...(speed ? { speed } : {}),
        });

      onGameChange(updatedGame);
    } catch (caughtError) {
      if (
        caughtError instanceof ApiClientError
      ) {
        setError(caughtError.message);
      } else {
        setError(
          "No fue posible actualizar la partida.",
        );
      }
    } finally {
      setIsUpdating(false);
    }
  }

  if (!isAiVsAi) {
    return null;
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mt-0 mb-4 text-lg font-bold text-slate-900">
        Controles de partida
      </h2>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <label
            className="font-semibold"
            htmlFor="game-speed-control"
          >
            Velocidad
          </label>

          <select
            className="min-h-10 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            id="game-speed-control"
            value={game.speed}
            disabled={
              isUpdating ||
              game.status === "finished"
            }
            onChange={(event) =>
              void updateControl(
                "change_speed",
                event.target
                  .value as GameSpeed,
              )
            }
          >
            <option value="normal">
              Normal
            </option>

            <option value="fast">
              Rápida
            </option>

            <option value="maximum">
              Máxima
            </option>
          </select>
        </div>

        <div className="shrink-0">
          {game.status === "active" && (
            <button
              type="button"
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isUpdating}
              onClick={() =>
                void updateControl("pause")
              }
            >
              Pausar
            </button>
          )}

          {game.status === "paused" && (
            <button
              type="button"
              className="min-h-10 rounded-lg border border-blue-700 bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isUpdating}
              onClick={() =>
                void updateControl("resume")
              }
            >
              Reanudar
            </button>
          )}
        </div>
      </div>

      <p className="mt-3 mb-0 text-slate-600">
        Estado:{" "}
        <strong className="text-slate-900">
          {game.status === "active"
            ? "Activa"
            : game.status === "paused"
              ? "Pausada"
              : game.status}
        </strong>
      </p>

      {isUpdating && (
        <p className="mt-2 mb-0 text-slate-600">
          Actualizando partida...
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
    </section>
  );
}