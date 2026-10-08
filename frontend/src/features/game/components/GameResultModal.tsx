
import { AlertTriangle, Crown, Search, X } from "lucide-react";

import type { GameState } from "../../../types/api";

import {
  formatDuration,
  getGameOutcomeFlags,
  getResultLabel,
  reasonLabels,
} from "../utils/resultLabels";

interface GameResultModalProps {
  game: GameState;
  onClose: () => void;
  onReview: () => void;
  onNewGame: () => void;
}

// Aviso inmediato al terminar una partida — la tarjeta GameResult sigue
// siendo el resumen persistente/exportación en la página, este modal solo
// evita que el resultado quede enterrado al final de una columna larga.
export function GameResultModal({
  game,
  onClose,
  onReview,
  onNewGame,
}: GameResultModalProps) {
  const { isTechnicalIncident, isDraw } = getGameOutcomeFlags(game);

  const reason = game.reason !== null ? reasonLabels[game.reason] : "No especificada";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-result-modal-title"
    >
      <div className="chess-panel w-full max-w-md">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#75572A] bg-[#241A15] text-[#E8B84B]">
              {isTechnicalIncident ? (
                <AlertTriangle className="h-6 w-6" aria-hidden="true" />
              ) : isDraw ? (
                <span className="text-xl font-bold" aria-hidden="true">½</span>
              ) : (
                <Crown className="h-6 w-6" aria-hidden="true" />
              )}
            </div>

            <h2
              id="game-result-modal-title"
              className="chess-panel-title m-0"
            >
              {isTechnicalIncident ? "Incidencia técnica" : "Partida finalizada"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#B6A18A] transition hover:bg-[#B6A18A]/10 hover:text-[#F0DFBF]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <p className="mb-5 text-sm font-bold text-[#F5D782]">
          {getResultLabel(game)}
        </p>

        <div className="mb-5 grid grid-cols-3 gap-2">
          <div className="min-w-0 rounded-lg border border-[#493522] bg-[#1B130F] p-3">
            <p className="m-0 text-[10px] font-semibold uppercase tracking-wide text-[#B6A18A]">
              Causa
            </p>
            <p className="mb-0 mt-1 break-words text-xs font-bold text-[#F0DFBF]">
              {reason}
            </p>
          </div>

          <div className="min-w-0 rounded-lg border border-[#493522] bg-[#1B130F] p-3">
            <p className="m-0 text-[10px] font-semibold uppercase tracking-wide text-[#B6A18A]">
              Duración
            </p>
            <p className="mb-0 mt-1 text-sm font-bold text-[#E8B84B]">
              {formatDuration(game.startedAt, game.endedAt)}
            </p>
          </div>

          <div className="min-w-0 rounded-lg border border-[#493522] bg-[#1B130F] p-3">
            <p className="m-0 text-[10px] font-semibold uppercase tracking-wide text-[#B6A18A]">
              Movimientos
            </p>
            <p className="mb-0 mt-1 text-sm font-bold text-[#E8B84B]">
              {game.moveCount}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="chess-button-gold flex w-full cursor-pointer items-center justify-center gap-2"
            onClick={onReview}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Revisar partida
          </button>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="w-full cursor-pointer rounded-lg border border-[#B6A18A]/40 bg-transparent px-4 py-2 text-sm font-semibold text-[#B6A18A] transition-colors duration-200 hover:bg-[#B6A18A]/10"
              onClick={onClose}
            >
              Ver detalles
            </button>

            <button
              type="button"
              className="w-full cursor-pointer rounded-lg border border-[#B6A18A]/40 bg-transparent px-4 py-2 text-sm font-semibold text-[#B6A18A] transition-colors duration-200 hover:bg-[#B6A18A]/10"
              onClick={onNewGame}
            >
              Nueva partida
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
