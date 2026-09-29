
import { useEffect, useState } from "react";

import { ApiClientError } from "../../../services/api/apiClient";
import {
  createGame,
  getParticipants,
} from "../../../services/api/gameApi";

import type {
  Difficulty,
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

export function GameConfiguration({
  onGameCreated,
}: GameConfigurationProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);

  const [whiteParticipantId, setWhiteParticipantId] = useState("");
  const [blackParticipantId, setBlackParticipantId] = useState("");

  const [whiteDifficulty, setWhiteDifficulty] =
    useState<Difficulty>("beginner");

  const [blackDifficulty, setBlackDifficulty] =
    useState<Difficulty>("beginner");

  const [isLoadingParticipants, setIsLoadingParticipants] =
    useState(true);

  const [isCreatingGame, setIsCreatingGame] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadParticipants() {
      try {
        const availableParticipants = await getParticipants();
        setParticipants(availableParticipants);
      } catch (caughtError) {
        if (caughtError instanceof ApiClientError) {
          setError(caughtError.message);
        } else {
          setError("No fue posible cargar los participantes.");
        }
      } finally {
        setIsLoadingParticipants(false);
      }
    }

    void loadParticipants();
  }, []);

  const whiteParticipant = participants.find(
    (participant) => participant.id === whiteParticipantId,
  );

  const blackParticipant = participants.find(
    (participant) => participant.id === blackParticipantId,
  );

  const configurationIsValid =
    Boolean(whiteParticipant) && Boolean(blackParticipant);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!whiteParticipant || !blackParticipant) {
      setError("Selecciona ambos participantes.");
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
    return <p>Cargando participantes...</p>;
  }

  return (
    <section>
      <h2>Configurar partida</h2>

      <form onSubmit={handleSubmit}>
        <fieldset disabled={isCreatingGame}>
          <legend>Participantes</legend>

          <div>
            <label htmlFor="white-participant">
              Blancas
            </label>

            <select
              id="white-participant"
              value={whiteParticipantId}
              onChange={(event) =>
                setWhiteParticipantId(event.target.value)
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
              <label htmlFor="white-difficulty">
                Nivel de blancas
              </label>

              <select
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

          <div>
            <label htmlFor="black-participant">
              Negras
            </label>

            <select
              id="black-participant"
              value={blackParticipantId}
              onChange={(event) =>
                setBlackParticipantId(event.target.value)
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
              <label htmlFor="black-difficulty">
                Nivel de negras
              </label>

              <select
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

          <button
            type="submit"
            disabled={!configurationIsValid || isCreatingGame}
          >
            {isCreatingGame
              ? "Creando partida..."
              : "Iniciar partida"}
          </button>
        </fieldset>
      </form>

      {error && <p role="alert">{error}</p>}
    </section>
  );
}