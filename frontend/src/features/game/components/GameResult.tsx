
import {
  AlertTriangle,
  Crown,
  Download,
  FileJson2,
  FileSpreadsheet,
  FileText,
  Plus,
  Table,
} from "lucide-react";

import type { GameState } from "../../../types/api";

import {
  formatDuration,
  getGameOutcomeFlags,
  getResultLabel,
  reasonLabels,
} from "../utils/resultLabels";

interface GameResultProps {
  game: GameState;
  onNewGame: () => void;
}

// URL del backend para exportar partidas.
const API_BASE_URL =
  (
    import.meta.env.VITE_API_BASE_URL ??
    "http://localhost:3000/api"
  ).replace(/\/$/, "");

// ESTILO DE LOS BOTONES DE EXPORTACIÓN
const exportButtonClass =
  "flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#75572A] bg-[#362718] px-4 py-3 text-sm font-bold text-[#F5D782] transition duration-200 hover:border-[#E8B84B] hover:bg-[#49331E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8B84B]";

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

  const { isTechnicalIncident, isDraw, hasWinner } = getGameOutcomeFlags(game);

  // Construir URL de exportación.
  function getExportUrl(
    format: "pgn" | "csv" | "json" | "xlsx",
  ): string {
    return `${API_BASE_URL}/games/${encodeURIComponent(
      game.id,
    )}/export?format=${format}`;
  }

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
            className="m-0 flex items-center gap-2 text-lg font-bold text-[#E8B84B]"
          >
            <Crown className="h-5 w-5" aria-hidden="true" />
            Partida finalizada
          </h2>

          <p className="mb-0 mt-1 text-xs text-[#B6A18A]">
            Resumen del enfrentamiento
          </p>
        </div>

        <span className="rounded-lg border border-[#75572A] bg-[#3A2A1B] px-3 py-1 text-xs font-bold text-[#E8B84B]">
          {isTechnicalIncident
            ? "INCIDENCIA"
            : "FINALIZADA"}
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
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#75572A] bg-[#241A15] text-[#E8B84B]">
              {isTechnicalIncident ? (
                <AlertTriangle className="h-6 w-6" aria-hidden="true" />
              ) : hasWinner ? (
                <Crown className="h-6 w-6" aria-hidden="true" />
              ) : isDraw ? (
                <span className="text-xl font-bold" aria-hidden="true">½</span>
              ) : (
                <Crown className="h-6 w-6" aria-hidden="true" />
              )}
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
          <h3 className="mb-4 mt-0 flex items-center gap-2 text-sm font-bold text-[#E8B84B]">
            <Crown className="h-4 w-4" aria-hidden="true" />
            Participantes
          </h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

            {/* BLANCAS */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E8D0A9] text-[#211712]">
                <Crown className="h-5 w-5" aria-hidden="true" />
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

            {/* NEGRAS */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#75572A] bg-[#302218] text-[#E8B84B]">
                <Crown className="h-5 w-5" aria-hidden="true" />
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

        {/* EXPORTAR PARTIDA */}
        <div className="mb-5 rounded-xl border border-[#75572A] bg-[#302218] p-4">

          <div className="mb-4">
            <h3 className="m-0 flex items-center gap-2 text-base font-bold text-[#E8B84B]">
              <Download className="h-4 w-4" aria-hidden="true" />
              Exportar partida
            </h3>

            <p className="mb-0 mt-2 text-xs leading-relaxed text-[#B6A18A]">
              Descarga los movimientos y resultados del
              enfrentamiento para revisarlos, compartirlos
              o analizarlos posteriormente.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">

            {/* EXPORTAR EXCEL (destacado — formato con colores y estilo) */}
            <a
              href={getExportUrl("xlsx")}
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#1D6F42] bg-[#1D6F42] px-4 py-2 text-xs font-bold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#237A4B] hover:shadow-lg hover:shadow-[#1D6F42]/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D6F42]"
              aria-label="Descargar partida en formato Excel con colores y formato profesional"
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              Descargar Excel
            </a>

            {/* EXPORTAR PGN */}
            <a
              href={getExportUrl("pgn")}
              className={exportButtonClass}
              aria-label="Descargar partida en formato PGN"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Descargar PGN
            </a>

            {/* EXPORTAR CSV */}
            <a
              href={getExportUrl("csv")}
              className={exportButtonClass}
              aria-label="Descargar partida en formato CSV"
            >
              <Table className="h-4 w-4" aria-hidden="true" />
              Descargar CSV
            </a>

            {/* EXPORTAR JSON */}
            <a
              href={getExportUrl("json")}
              className={exportButtonClass}
              aria-label="Descargar partida en formato JSON"
            >
              <FileJson2 className="h-4 w-4" aria-hidden="true" />
              Descargar JSON
            </a>
          </div>

          <p className="mb-0 mt-3 text-xs text-[#B6A18A]">
            Excel: formato visual con colores y hojas (resumen, movimientos,
            intentos de IA) · PGN: ajedrez · CSV: hojas de cálculo simples ·
            JSON: datos estructurados.
          </p>
        </div>

        {/* BOTÓN NUEVA PARTIDA */}
        <button
          type="button"
          className="flex min-h-12 w-full items-center justify-center gap-3 rounded-lg border border-[#E8B84B] bg-[#E8B84B] px-5 py-3 text-sm font-bold text-[#211712] transition duration-200 hover:-translate-y-0.5 hover:bg-[#F5D782] hover:shadow-lg hover:shadow-[#E8B84B]/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5D782]"
          onClick={onNewGame}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nueva partida
        </button>
      </div>
    </section>
  );
}
