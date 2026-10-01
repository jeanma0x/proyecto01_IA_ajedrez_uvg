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
  insufficient_material:
    "Material insuficiente",
  threefold_repetition:
    "Triple repetición",
  fifty_move_rule:
    "Regla de los cincuenta movimientos",
  human_resignation: "Abandono",
  technical_incident:
    "Incidencia técnica",
};

function getResultLabel(
  game: GameState,
): string {
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

  const start =
    new Date(startedAt).getTime();

  const end =
    new Date(endedAt).getTime();

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    end < start
  ) {
    return "No disponible";
  }

  const totalSeconds =
    Math.floor((end - start) / 1000);

  const minutes =
    Math.floor(totalSeconds / 60);

  const seconds =
    totalSeconds % 60;

  return `${minutes}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export function GameResult({
  game,
  onNewGame,
}: GameResultProps) {
  if (
    game.status !== "finished" &&
    game.status !== "incident"
  ) {
    return null;
  }

  const reason =
    game.reason !== null
      ? reasonLabels[game.reason]
      : "No especificada";

  return (
    <section
      className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm"
      aria-labelledby="game-result-title"
    >
      <h2
        id="game-result-title"
        className="mt-0 mb-4 text-lg font-bold text-slate-900"
      >
        Partida finalizada
      </h2>

      <div className="mb-4 rounded-lg bg-blue-50 p-3 font-bold text-blue-900">
        {getResultLabel(game)}
      </div>

      <dl className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <dt className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Causa
          </dt>

          <dd className="m-0 font-semibold">
            {reason}
          </dd>
        </div>

        <div>
          <dt className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Duración
          </dt>

          <dd className="m-0 font-semibold">
            {formatDuration(
              game.startedAt,
              game.endedAt,
            )}
          </dd>
        </div>

        <div>
          <dt className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Movimientos
          </dt>

          <dd className="m-0 font-semibold">
            {game.moveCount}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        className="min-h-10 rounded-lg border border-blue-700 bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        onClick={onNewGame}
      >
        Nueva partida
      </button>
    </section>
  );
}