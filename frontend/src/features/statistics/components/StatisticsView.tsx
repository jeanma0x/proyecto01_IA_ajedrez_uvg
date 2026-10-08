
import { useEffect, useMemo, useState } from "react";

import { getStatistics } from "../../../services/api/gameApi";
import type { StatisticRow } from "../../../types/api";

interface StatisticsViewProps {
  onClose: () => void;
}

const difficultyLabels: Record<string, string> = {
  beginner: "Principiante",
  advanced: "Avanzado",
  master: "Maestro",
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-GT", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function StatisticsView({
  onClose,
}: StatisticsViewProps) {
  const [statistics, setStatistics] = useState<StatisticRow[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadStatistics() {
      setLoading(true);
      setError(null);

      try {
        const response = await getStatistics();

        if (!cancelled) {
          setStatistics(response);
        }
      } catch {
        if (!cancelled) {
          setError(
            "No fue posible cargar las estadísticas. Inténtalo nuevamente.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadStatistics();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const participants = useMemo(() => {
    const unique = new Map<string, string>();

    for (const row of statistics) {
      unique.set(row.participantId, row.displayName);
    }

    return [...unique.entries()].sort((a, b) =>
      a[1].localeCompare(b[1]),
    );
  }, [statistics]);

  const filteredStatistics = useMemo(() => {
    return statistics
      .filter(
        (row) =>
          !selectedParticipant ||
          row.participantId === selectedParticipant,
      )
      .sort(
        (a, b) =>
          b.winRate - a.winRate ||
          b.wins - a.wins ||
          a.displayName.localeCompare(b.displayName),
      );
  }, [statistics, selectedParticipant]);

  const totals = useMemo(() => {
    return filteredStatistics.reduce(
      (acc, row) => ({
        played: acc.played + row.played,
        wins: acc.wins + row.wins,
        losses: acc.losses + row.losses,
        draws: acc.draws + row.draws,
      }),
      { played: 0, wins: 0, losses: 0, draws: 0 },
    );
  }, [filteredStatistics]);

  return (
    <section className="space-y-5 text-[#EADFCF]">
      {/* ENCABEZADO */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="m-0 text-2xl font-bold text-[#E8B84B]">
            ♛ Estadísticas de jugadores
          </h2>

          <p className="mb-0 mt-2 text-sm text-[#B6A18A]">
            Rendimiento de los participantes en partidas finalizadas.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[#75572A] bg-[#362718] px-4 py-2 font-semibold text-[#F0DFBF] transition hover:bg-[#49331E]"
        >
          ← Volver
        </button>
      </div>

      {/* FILTROS */}
      <div className="overflow-hidden rounded-xl border border-[#59412A] bg-[#241A15]">
        <div className="border-b border-[#493522] bg-[#302218] px-4 py-3">
          <h3 className="m-0 font-bold text-[#E8B84B]">
            Filtrar estadísticas
          </h3>
        </div>

        <div className="flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[200px] flex-1">
            <label
              htmlFor="statistics-participant"
              className="mb-2 block text-xs font-semibold text-[#D9C5A7]"
            >
              Participante
            </label>

            <select
              id="statistics-participant"
              value={selectedParticipant}
              onChange={(event) =>
                setSelectedParticipant(event.target.value)
              }
              className="w-full rounded-lg border border-[#62492E] bg-[#1B130F] px-3 py-2.5 text-sm text-[#F0DFBF]"
            >
              <option value="">Todos los participantes</option>

              {participants.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            disabled={loading}
            className="rounded-lg border border-[#75572A] bg-[#362718] px-4 py-2.5 text-sm font-bold text-[#F0DFBF] hover:bg-[#49331E] disabled:opacity-50"
          >
            ↻ Actualizar
          </button>
        </div>
      </div>

      {/* ESTADOS */}
      {loading && (
        <div className="rounded-xl border border-[#59412A] bg-[#241A15] p-8 text-center text-[#E8B84B]">
          Cargando estadísticas...
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* RESUMEN */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Participaciones", value: totals.played },
              { label: "Victorias", value: totals.wins },
              { label: "Derrotas", value: totals.losses },
              { label: "Empates", value: totals.draws },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-[#59412A] bg-[#241A15] p-4"
              >
                <p className="m-0 text-xs text-[#B6A18A]">
                  {item.label}
                </p>

                <p className="mb-0 mt-2 text-2xl font-extrabold text-[#E8B84B]">
                  {formatNumber(item.value)}
                </p>
              </div>
            ))}
          </div>

          {/* TABLA */}
          <div className="overflow-hidden rounded-xl border border-[#59412A] bg-[#241A15] shadow-lg">
            <div className="border-b border-[#493522] bg-[#302218] px-4 py-3">
              <h3 className="m-0 font-bold text-[#E8B84B]">
                ♟ Rendimiento por participante y dificultad
              </h3>
            </div>

            {filteredStatistics.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#B6A18A]">
                No hay estadísticas de partidas finalizadas
                para los filtros seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] border-collapse text-left text-sm">
                  <thead className="bg-[#302218] text-xs uppercase text-[#E8B84B]">
                    <tr>
                      <th className="px-4 py-3">Participante</th>
                      <th className="px-4 py-3">Dificultad</th>
                      <th className="px-3 py-3 text-center">Jugadas</th>
                      <th className="px-3 py-3 text-center">Ganadas</th>
                      <th className="px-3 py-3 text-center">Perdidas</th>
                      <th className="px-3 py-3 text-center">Empatadas</th>
                      <th className="px-3 py-3 text-center">% Victorias</th>
                      <th className="px-4 py-3 text-center">
                        Prom. movimientos por victoria
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredStatistics.map((row) => (
                      <tr
                        key={`${row.participantId}-${row.difficulty ?? "human"}`}
                        className="border-t border-[#493522] transition hover:bg-[#302218]"
                      >
                        <td className="px-4 py-3 font-semibold text-[#F0DFBF]">
                          {row.displayName}
                        </td>

                        <td className="px-4 py-3 text-[#D9C5A7]">
                          {row.difficulty
                            ? difficultyLabels[row.difficulty] ??
                              row.difficulty
                            : "No aplica"}
                        </td>

                        <td className="px-3 py-3 text-center">
                          {row.played}
                        </td>

                        <td className="px-3 py-3 text-center text-emerald-400">
                          {row.wins}
                        </td>

                        <td className="px-3 py-3 text-center text-red-400">
                          {row.losses}
                        </td>

                        <td className="px-3 py-3 text-center">
                          {row.draws}
                        </td>

                        <td className="px-3 py-3 text-center font-bold text-[#E8B84B]">
                          {formatNumber(row.winRate)}%
                        </td>

                        <td className="px-4 py-3 text-center">
                          {row.avgMovesPerWin === null
                            ? "—"
                            : formatNumber(row.avgMovesPerWin)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-xs text-[#B6A18A]">
            Las estadísticas consideran únicamente partidas
            finalizadas. Las incidencias técnicas no se incluyen.
            Una partida puede contabilizarse para ambos participantes.
          </p>
        </>
      )}
    </section>
  );
}
