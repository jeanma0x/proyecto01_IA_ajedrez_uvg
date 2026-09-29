import type {
  GameEndReason,
  GameState,
} from "../../../types/api";

interface GameResultProps {
  game: GameState;
  onNewGame: () => void;
}

const reasonLabels: Record<
  Exclude<GameEndReason, null>,
  string
> = {
  checkmate: "Jaque mate",
  draw: "Tablas",
  stalemate: "Ahogado",
  insufficient_material: "Material insuficiente",
  threefold_repetition: "Triple repetición",
  fifty_move_rule: "Regla de los cincuenta movimientos",
  human_resignation: "Abandono",
  technical_incident: "Incidencia técnica",
};

function getResultLabel(game: GameState): string {
  switch (game.result) {
    case "white_win":
      return `Ganador: ${game.white.participant.displayName} (Blancas)`;

    case "black_win":
      return `Ganador: ${game.black.participant.displayName} (Negras)`;

    case "draw":
      return "Resultado: Empate";

    case "technical_incident":
      return "Partida finalizada por incidencia técnica";

    default:
      return "Partida finalizada";
  }
}

function formatDuration(
  startedAt: string | null,
  endedAt: string | null,
): string {
  if (!startedAt || !endedAt) {
    return "No disponible";
  }

  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    end < start
  ) {
    return "No disponible";
  }

  const totalSeconds = Math.floor((end - start) / 1000);

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function GameResult({
  game,
  onNewGame,
}: GameResultProps) {
  if (game.status !== "finished" && game.status !== "incident") {
    return null;
  }

  const reason =
    game.reason !== null
      ? reasonLabels[game.reason]
      : "No especificada";

  return (
    <section aria-labelledby="game-result-title">
      <h2 id="game-result-title">
        Partida finalizada
      </h2>

      <p>
        <strong>{getResultLabel(game)}</strong>
      </p>

      <p>
        Causa: <strong>{reason}</strong>
      </p>

      <p>
        Duración:{" "}
        <strong>
          {formatDuration(game.startedAt, game.endedAt)}
        </strong>
      </p>

      <p>
        Movimientos totales:{" "}
        <strong>{game.moveCount}</strong>
      </p>

      <button
        type="button"
        onClick={onNewGame}
      >
        Nueva partida
      </button>
    </section>
  );
}