import { useEffect, useState } from "react";

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
  {
    value: "beginner",
    label: "Principiante",
  },
  {
    value: "advanced",
    label: "Avanzado",
  },
  {
    value: "master",
    label: "Maestro",
  },
];

const selectClasses =
  "min-h-10 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-slate-900 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

export function GameConfiguration({
  onGameCreated,
}: GameConfigurationProps) {
  const [participants, setParticipants] =
    useState<Participant[]>([]);

  const [
    whiteParticipantId,
    setWhiteParticipantId,
  ] = useState("");

  const [
    blackParticipantId,
    setBlackParticipantId,
  ] = useState("");

  const [whiteDifficulty, setWhiteDifficulty] =
    useState<Difficulty>("beginner");

  const [blackDifficulty, setBlackDifficulty] =
    useState<Difficulty>("beginner");

  const [gameSpeed, setGameSpeed] =
    useState<GameSpeed>("normal");

  const [
    isLoadingParticipants,
    setIsLoadingParticipants,
  ] = useState(true);

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
        if (
          caughtError instanceof ApiClientError
        ) {
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
    whiteParticipant.id === blackParticipant.id;

  const configurationIsValid =
    Boolean(whiteParticipant) &&
    Boolean(blackParticipant) &&
    !sameAiSelected;

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !whiteParticipant ||
      !blackParticipant
    ) {
      setError(
        "Selecciona ambos participantes.",
      );
      return;
    }

    if (sameAiSelected) {
      setError(
        "Selecciona modelos de IA diferentes para cada bando.",
      );
      return;
    }

    setError(null);
    setIsCreatingGame(true);

    try {
      const game = await createGame({
        whiteParticipantId:
          whiteParticipant.id,

        blackParticipantId:
          blackParticipant.id,

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
      if (
        caughtError instanceof ApiClientError
      ) {
        setError(caughtError.message);
      } else {
        setError(
          "No fue posible crear la partida.",
        );
      }
    } finally {
      setIsCreatingGame(false);
    }
  }

  if (isLoadingParticipants) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="m-0 text-slate-600">
          Cargando participantes...
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mt-0 mb-4 text-lg font-bold text-slate-900">
        Configurar partida
      </h2>

      <form onSubmit={handleSubmit}>
        <fieldset
          disabled={isCreatingGame}
          className="m-0 border-0 p-0"
        >
          <legend className="mb-4 font-semibold text-slate-700">
            Participantes
          </legend>

          <div className="grid gap-4">
            {/* BLANCAS */}

            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="m-0 text-sm font-bold tracking-wide text-slate-700 uppercase">
                Blancas
              </h3>

              <div className="grid items-center gap-1.5 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-3">
                <label
                  className="font-semibold"
                  htmlFor="white-participant"
                >
                  Participante
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

                  {participants.map(
                    (participant) => (
                      <option
                        key={participant.id}
                        value={participant.id}
                      >
                        {
                          participant.displayName
                        }
                      </option>
                    ),
                  )}
                </select>
              </div>

              {whiteParticipant?.type ===
                "ai" && (
                <div className="grid items-center gap-1.5 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-3">
                  <label
                    className="font-semibold"
                    htmlFor="white-difficulty"
                  >
                    Dificultad
                  </label>

                  <select
                    className={selectClasses}
                    id="white-difficulty"
                    value={whiteDifficulty}
                    onChange={(event) =>
                      setWhiteDifficulty(
                        event.target
                          .value as Difficulty,
                      )
                    }
                  >
                    {difficultyOptions.map(
                      (difficulty) => (
                        <option
                          key={
                            difficulty.value
                          }
                          value={
                            difficulty.value
                          }
                        >
                          {difficulty.label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              )}
            </div>

            {/* NEGRAS */}

            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="m-0 text-sm font-bold tracking-wide text-slate-700 uppercase">
                Negras
              </h3>

              <div className="grid items-center gap-1.5 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-3">
                <label
                  className="font-semibold"
                  htmlFor="black-participant"
                >
                  Participante
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

                  {participants.map(
                    (participant) => (
                      <option
                        key={participant.id}
                        value={participant.id}
                      >
                        {
                          participant.displayName
                        }
                      </option>
                    ),
                  )}
                </select>
              </div>

              {blackParticipant?.type ===
                "ai" && (
                <div className="grid items-center gap-1.5 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-3">
                  <label
                    className="font-semibold"
                    htmlFor="black-difficulty"
                  >
                    Dificultad
                  </label>

                  <select
                    className={selectClasses}
                    id="black-difficulty"
                    value={blackDifficulty}
                    onChange={(event) =>
                      setBlackDifficulty(
                        event.target
                          .value as Difficulty,
                      )
                    }
                  >
                    {difficultyOptions.map(
                      (difficulty) => (
                        <option
                          key={
                            difficulty.value
                          }
                          value={
                            difficulty.value
                          }
                        >
                          {difficulty.label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              )}
            </div>

            {sameAiSelected && (
              <p
                role="alert"
                className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800"
              >
                Selecciona modelos de IA
                diferentes para cada bando.
              </p>
            )}

            {/* IA VS IA */}

            {isAiVsAi &&
              !sameAiSelected && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <h3 className="mt-0 mb-3 text-sm font-bold tracking-wide text-blue-800 uppercase">
                    Partida IA vs IA
                  </h3>

                  <div className="grid items-center gap-1.5 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-3">
                    <label
                      className="font-semibold"
                      htmlFor="game-speed"
                    >
                      Velocidad
                    </label>

                    <select
                      className={selectClasses}
                      id="game-speed"
                      value={gameSpeed}
                      onChange={(event) =>
                        setGameSpeed(
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
                </div>
              )}

            <div className="flex justify-stretch sm:justify-end">
              <button
                type="submit"
                className="min-h-10 w-full rounded-lg border border-blue-700 bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500 sm:w-auto"
                disabled={
                  !configurationIsValid ||
                  isCreatingGame
                }
              >
                {isCreatingGame
                  ? "Creando partida..."
                  : "Iniciar partida"}
              </button>
            </div>
          </div>
        </fieldset>
      </form>

      {error && (
        <p
          role="alert"
          className="mt-4 mb-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800"
        >
          {error}
        </p>
      )}
    </section>
  );
}