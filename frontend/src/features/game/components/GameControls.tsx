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
    <section>
      <h2>Controles de partida</h2>

      <div>
        <label htmlFor="game-speed">
          Velocidad
        </label>

        <select
          id="game-speed"
          value={game.speed}
          disabled={isUpdating || game.status === "finished"}
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

      {game.status === "active" && (
        <button
          type="button"
          disabled={isUpdating}
          onClick={() => void updateControl("pause")}
        >
          Pausar
        </button>
      )}

      {game.status === "paused" && (
        <button
          type="button"
          disabled={isUpdating}
          onClick={() => void updateControl("resume")}
        >
          Reanudar
        </button>
      )}

      <p>
        Estado: <strong>{game.status}</strong>
      </p>

      {isUpdating && <p>Actualizando partida...</p>}

      {error && <p role="alert">{error}</p>}
    </section>
  );
}