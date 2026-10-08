
import type {
  GameEndReason,
  GameState,
} from "../../../types/api";

interface GameResultProps {
  game: GameState;
  onNewGame: () => void;
}

// MOTIVOS DE FINALIZACIÓN
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

// OBTENER RESULTADO DE PARTIDA
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

// CALCULAR DURACIÓN
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

  const totalSeconds = Math.floor(
    (end - start) / 1000,
  );

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

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

  const isTechnicalIncident =
    game.status === "incident" ||
    game.result === "technical_incident";

  const isDraw = game.result === "draw";

  const hasWinner =
    game.result === "white_win" ||
    game.result === "black_win";

  return (
    <section
      className="w-full overflow-hidden rounded-xl border border-[#75572A] bg-[#241A15] text-[#EADFCF] shadow-xl"
      aria-labelledby="game-result-title"
    >
      {/* ENCABEZADO */}
      <div className="flex items-center justify-between gap-3 border-b border-[#59412A] bg-[#302218] px-5 py-4">
        <div>
          <h2
            id="game-result-title"
            className="m-0 text-lg font-bold text-[#E8B84B]"
          >
            ♛ Partida finalizada
          </h2>

          <p className="mb-0 mt-1 text-xs text-[#B6A18A]">
            Resumen del enfrentamiento
          </p>
        </div>

        <span className="rounded-lg border border-[#75572A] bg-[#3A2A1B] px-3 py-1 text-xs font-bold text-[#E8B84B]">
          FINALIZADA
        </span>
      </div>

      {/* CONTENIDO */}
      <div className="p-5">

        {/* RESULTADO PRINCIPAL */}
        <div
          className={
            isTechnicalIncident
              ? "mb-5 rounded-xl border border-[#A67C36] bg-[#362718] p-4"
              : "mb-5 rounded-xl border border-[#75572A] bg-[#3A2A1B] p-4"
          }
        >
          <div className="flex items-start gap-3">

            {/* ICONO */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#75572A] bg-[#241A15] text-2xl text-[#E8B84B]">
              {isTechnicalIncident
                ? "⚠"
                : hasWinner
                  ? "♛"
                  : isDraw
                    ? "½"
                    : "♟"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="m-0 text-xs font-bold uppercase tracking-wider text-[#B6A18A]">
                Resultado de la partida
              </p>

              <h3 className="mb-0 mt-2 break-words text-base font-bold text-[#F5D782]">
                {getResultLabel(game)}
              </h3>

              <p className="mb-0 mt-2 text-xs text-[#D9C5A7]">
                {isTechnicalIncident
                  ? "La partida se detuvo debido a una incidencia técnica."
                  : hasWinner
                    ? "El enfrentamiento ha concluido con un ganador."
                    : isDraw
                      ? "El enfrentamiento terminó en empate."
                      : "El enfrentamiento ha concluido."}
              </p>
            </div>
          </div>
        </div>

        {/* ESTADÍSTICAS */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">

          {/* CAUSA */}
          <div className="min-w-0 rounded-lg border border-[#493522] bg-[#1B130F] p-3">
            <p className="m-0 text-xs font-semibold uppercase tracking-wide text-[#B6A18A]">
              Causa
            </p>

            <p className="mb-0 mt-2 break-words text-sm font-bold text-[#F0DFBF]">
              {reason}
            </p>
          </div>

          {/* DURACIÓN */}
          <div className="min-w-0 rounded-lg border border-[#493522] bg-[#1B130F] p-3">
            <p className="m-0 text-xs font-semibold uppercase tracking-wide text-[#B6A18A]">
              Duración
            </p>

            <p className="mb-0 mt-2 text-lg font-bold text-[#E8B84B]">
              {formatDuration(
                game.startedAt,
                game.endedAt,
              )}
            </p>
          </div>

          {/* MOVIMIENTOS */}
          <div className="min-w-0 rounded-lg border border-[#493522] bg-[#1B130F] p-3">
            <p className="m-0 text-xs font-semibold uppercase tracking-wide text-[#B6A18A]">
              Movimientos
            </p>

            <p className="mb-0 mt-2 text-lg font-bold text-[#E8B84B]">
              {game.moveCount}
            </p>
          </div>
        </div>

        {/* PARTICIPANTES */}
        <div className="mb-5 rounded-xl border border-[#493522] bg-[#1B130F] p-4">
          <h3 className="m-0 mb-4 text-sm font-bold text-[#E8B84B]">
            ♟ Participantes
          </h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8D0A9] text-2xl text-[#211712]">
                ♔
              </div>

              <div className="min-w-0">
                <p className="m-0 text-xs text-[#B6A18A]">
                  Piezas blancas
                </p>

                <p className="mb-0 mt-1 break-words text-sm font-bold text-[#F0DFBF]">
                  {game.white.participant.displayName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#75572A] bg-[#302218] text-2xl text-[#E8B84B]">
                ♚
              </div>

              <div className="min-w-0">
                <p className="m-0 text-xs text-[#B6A18A]">
                  Piezas negras
                </p>

                <p className="mb-0 mt-1 break-words text-sm font-bold text-[#F0DFBF]">
                  {game.black.participant.displayName}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* BOTÓN NUEVA PARTIDA */}
        <button
          type="button"
          className="flex min-h-12 w-full items-center justify-center gap-3 rounded-lg border border-[#E8B84B] bg-[#E8B84B] px-5 py-3 text-sm font-bold text-[#211712] transition duration-200 hover:-translate-y-0.5 hover:bg-[#F5D782] hover:shadow-lg hover:shadow-[#E8B84B]/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5D782]"
          onClick={onNewGame}
        >
          <span aria-hidden="true">♟</span>
          Nueva partida
        </button>
      </div>
    </section>
  );
}
