
import { useEffect, useState } from "react";

import { Crown, Loader2, Zap } from "lucide-react";

import { ApiClientError } from "../../../services/api/apiClient";
import {
  createGame,
  getParticipants,
} from "../../../services/api/gameApi";

import type {
  Difficulty,
  GameSpeed,
  GameState,
  Participant,
} from "../../../types/api";

interface GameConfigurationProps {
  onGameCreated: (game: GameState) => void;
}

const difficultyOptions: {
  value: Difficulty;
  label: string;
}[] = [
  { value: "beginner", label: "Principiante" },
  { value: "advanced", label: "Avanzado" },
  { value: "master", label: "Maestro" },
];

const selectClasses =
  "min-h-11 w-full min-w-0 rounded-lg border border-[#75572A] bg-[#1B130F] px-3 py-2.5 text-sm text-[#F0DFBF] outline-none transition focus:border-[#E8B84B] focus:ring-2 focus:ring-[#E8B84B]/20 disabled:opacity-50";

const labelClasses =
  "mb-2 block text-sm font-semibold text-[#D9C5A7]";

export function GameConfiguration({
  onGameCreated,
}: GameConfigurationProps) {
  const [participants, setParticipants] =
    useState<Participant[]>([]);

  const [whiteParticipantId, setWhiteParticipantId] =
    useState("");

  const [blackParticipantId, setBlackParticipantId] =
    useState("");

  const [whiteDifficulty, setWhiteDifficulty] =
    useState<Difficulty>("beginner");

  const [blackDifficulty, setBlackDifficulty] =
    useState<Difficulty>("beginner");

  const [gameSpeed, setGameSpeed] =
    useState<GameSpeed>("normal");

  const [isLoadingParticipants, setIsLoadingParticipants] =
    useState(true);

  const [isCreatingGame, setIsCreatingGame] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadParticipants() {
      try {
        const availableParticipants =
          await getParticipants();

        setParticipants(availableParticipants);
      } catch (caughtError) {
        if (caughtError instanceof ApiClientError) {
          setError(caughtError.message);
        } else {
          setError(
            "No fue posible cargar los participantes.",
          );
        }
      } finally {
        setIsLoadingParticipants(false);
      }
    }

    void loadParticipants();
  }, []);

  const whiteParticipant = participants.find(
    (participant) =>
      participant.id === whiteParticipantId,
  );

  const blackParticipant = participants.find(
    (participant) =>
      participant.id === blackParticipantId,
  );

  const isAiVsAi =
    whiteParticipant?.type === "ai" &&
    blackParticipant?.type === "ai";

  const sameAiSelected =
    whiteParticipant?.type === "ai" &&
    blackParticipant?.type === "ai" &&
    whiteParticipant.id === blackParticipant.id &&
    whiteDifficulty === blackDifficulty;

  const configurationIsValid =
    Boolean(whiteParticipant) &&
    Boolean(blackParticipant) &&
    !sameAiSelected;

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!whiteParticipant || !blackParticipant) {
      setError("Selecciona ambos participantes.");
      return;
    }

    if (sameAiSelected) {
      setError(
        "Selecciona un modelo distinto o un nivel de dificultad distinto para cada bando.",
      );
      return;
    }

    setError(null);
    setIsCreatingGame(true);

    try {
      const game = await createGame({
        whiteParticipantId: whiteParticipant.id,
        blackParticipantId: blackParticipant.id,

        ...(whiteParticipant.type === "ai"
          ? { whiteDifficulty }
          : {}),

        ...(blackParticipant.type === "ai"
          ? { blackDifficulty }
          : {}),

        ...(isAiVsAi
          ? { speed: gameSpeed }
          : {}),
      });

      onGameCreated(game);
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError) {
        setError(caughtError.message);
      } else {
        setError("No fue posible crear la partida.");
      }
    } finally {
      setIsCreatingGame(false);
    }
  }

  if (isLoadingParticipants) {
    return (
      <section className="rounded-xl border border-[#59412A] bg-[#241A15] p-6 text-center">
        <div className="mb-3 flex justify-center text-[#E8B84B]">
          <Loader2 className="h-9 w-9 animate-spin" aria-hidden="true" />
        </div>

        <p className="m-0 text-[#D9C5A7]">
          Cargando participantes...
        </p>
      </section>
    );
  }

  return (
    <section className="w-full text-[#EADFCF]">

      {/* ENCABEZADO */}
      <div className="mb-6 text-center">
        <div className="mb-3 flex justify-center text-[#E8B84B]">
          <Crown className="h-9 w-9" aria-hidden="true" />
        </div>

        <h2 className="m-0 text-2xl font-bold text-[#E8B84B]">
          Configurar partida
        </h2>

        <p className="mb-0 mt-2 text-sm text-[#B6A18A]">
          Elige a los participantes y prepara el duelo.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <fieldset
          disabled={isCreatingGame}
          className="m-0 min-w-0 border-0 p-0"
        >
          <legend className="mb-4 text-sm font-bold uppercase tracking-widest text-[#E8B84B]">
            Selección de participantes
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">

            {/* JUGADOR BLANCO */}
            <div className="min-w-0 overflow-hidden rounded-xl border border-[#59412A] bg-[#2B1E17]">
              <div className="flex items-center gap-3 border-b border-[#493522] bg-[#35261C] px-4 py-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#D9C5A7] bg-[#E8D0A9] text-[#211712]">
                  <Crown className="h-6 w-6" aria-hidden="true" />
                </div>

                <div>
                  <h3 className="m-0 text-base font-bold text-[#F0DFBF]">
                    Piezas blancas
                  </h3>

                  <p className="m-0 text-xs text-[#B6A18A]">
                    Primer participante
                  </p>
                </div>
              </div>

              <div className="grid gap-4 p-4">
                <div>
                  <label
                    className={labelClasses}
                    htmlFor="white-participant"
                  >
                    Seleccionar jugador o IA
                  </label>

                  <select
                    className={selectClasses}
                    id="white-participant"
                    value={whiteParticipantId}
                    onChange={(event) =>
                      setWhiteParticipantId(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Selecciona un participante
                    </option>

                    {participants.map((participant) => (
                      <option
                        key={participant.id}
                        value={participant.id}
                      >
                        {participant.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                {whiteParticipant?.type === "ai" && (
                  <div>
                    <label
                      className={labelClasses}
                      htmlFor="white-difficulty"
                    >
                      Nivel de dificultad
                    </label>

                    <select
                      className={selectClasses}
                      id="white-difficulty"
                      value={whiteDifficulty}
                      onChange={(event) =>
                        setWhiteDifficulty(
                          event.target.value as Difficulty,
                        )
                      }
                    >
                      {difficultyOptions.map((difficulty) => (
                        <option
                          key={difficulty.value}
                          value={difficulty.value}
                        >
                          {difficulty.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="rounded-lg border border-[#493522] bg-[#1B130F] px-3 py-3">
                  <p className="m-0 text-xs text-[#B6A18A]">
                    Participante seleccionado
                  </p>

                  <p className="mb-0 mt-1 break-words text-sm font-semibold text-[#F0DFBF]">
                    {whiteParticipant?.displayName ??
                      "Sin seleccionar"}
                  </p>
                </div>
              </div>
            </div>

            {/* JUGADOR NEGRO */}
            <div className="min-w-0 overflow-hidden rounded-xl border border-[#59412A] bg-[#2B1E17]">
              <div className="flex items-center gap-3 border-b border-[#493522] bg-[#35261C] px-4 py-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#75572A] bg-[#160F0D] text-[#E8B84B]">
                  <Crown className="h-6 w-6" aria-hidden="true" />
                </div>

                <div>
                  <h3 className="m-0 text-base font-bold text-[#F0DFBF]">
                    Piezas negras
                  </h3>

                  <p className="m-0 text-xs text-[#B6A18A]">
                    Segundo participante
                  </p>
                </div>
              </div>

              <div className="grid gap-4 p-4">
                <div>
                  <label
                    className={labelClasses}
                    htmlFor="black-participant"
                  >
                    Seleccionar jugador o IA
                  </label>

                  <select
                    className={selectClasses}
                    id="black-participant"
                    value={blackParticipantId}
                    onChange={(event) =>
                      setBlackParticipantId(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Selecciona un participante
                    </option>

                    {participants.map((participant) => (
                      <option
                        key={participant.id}
                        value={participant.id}
                      >
                        {participant.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                {blackParticipant?.type === "ai" && (
                  <div>
                    <label
                      className={labelClasses}
                      htmlFor="black-difficulty"
                    >
                      Nivel de dificultad
                    </label>

                    <select
                      className={selectClasses}
                      id="black-difficulty"
                      value={blackDifficulty}
                      onChange={(event) =>
                        setBlackDifficulty(
                          event.target.value as Difficulty,
                        )
                      }
                    >
                      {difficultyOptions.map((difficulty) => (
                        <option
                          key={difficulty.value}
                          value={difficulty.value}
                        >
                          {difficulty.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="rounded-lg border border-[#493522] bg-[#1B130F] px-3 py-3">
                  <p className="m-0 text-xs text-[#B6A18A]">
                    Participante seleccionado
                  </p>

                  <p className="mb-0 mt-1 break-words text-sm font-semibold text-[#F0DFBF]">
                    {blackParticipant?.displayName ??
                      "Sin seleccionar"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* VALIDACIÓN */}
          {sameAiSelected && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300"
            >
              Selecciona un modelo distinto o un nivel
              de dificultad distinto para cada bando.
            </p>
          )}

          {/* VELOCIDAD IA VS IA */}
          {isAiVsAi && !sameAiSelected && (
            <div className="mt-5 rounded-xl border border-[#75572A] bg-[#302218] p-4">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-[#E8B84B]">
                  <Zap className="h-6 w-6" aria-hidden="true" />
                </span>

                <div>
                  <h3 className="m-0 text-sm font-bold text-[#E8B84B]">
                    Partida IA vs IA
                  </h3>

                  <p className="mb-0 mt-1 text-xs text-[#B6A18A]">
                    Configura el ritmo del enfrentamiento
                  </p>
                </div>
              </div>

              <label
                className={labelClasses}
                htmlFor="game-speed"
              >
                Velocidad de juego
              </label>

              <select
                className={selectClasses}
                id="game-speed"
                value={gameSpeed}
                onChange={(event) =>
                  setGameSpeed(
                    event.target.value as GameSpeed,
                  )
                }
              >
                <option value="normal">Normal</option>
                <option value="fast">Rápida</option>
                <option value="maximum">Máxima</option>
              </select>
            </div>
          )}

          {/* BOTÓN INICIAR */}
          <div className="mt-6 border-t border-[#59412A] pt-5">
            <button
              type="submit"
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-lg border border-[#E8B84B] bg-[#E8B84B] px-5 py-3 text-base font-bold text-[#211712] shadow-lg transition duration-200 hover:-translate-y-0.5 hover:bg-[#F5D782] hover:shadow-[#E8B84B]/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
              disabled={
                !configurationIsValid ||
                isCreatingGame
              }
            >
              {isCreatingGame ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Crown className="h-4 w-4" aria-hidden="true" />
              )}

              {isCreatingGame
                ? "Creando partida..."
                : "Iniciar partida"}
            </button>

            <p className="mb-0 mt-3 text-center text-xs text-[#B6A18A]">
              Prepara tu estrategia y domina el tablero.
            </p>
          </div>
        </fieldset>
      </form>

      {/* ERRORES */}
      {error && (
        <p
          role="alert"
          className="mb-0 mt-4 rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </p>
      )}
    </section>
  );
}
