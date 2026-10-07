import {
  useEffect,
  useRef,
  useState,
} from "react";

import { requestAiCommentary } from "../../../services/api/gameApi";

import type { GameState } from "../../../types/api";

interface AiCommentatorProps {
  game: GameState;
}

interface Commentary {
  id: number;
  moveNumber: number;
  player: string;
  move: string;
  message: string;
  generatedByAi: boolean;
}

export function AiCommentator({
  game,
}: AiCommentatorProps) {
  const [comments, setComments] = useState<
    Commentary[]
  >([]);

  const [isGenerating, setIsGenerating] =
    useState(false);

  const previousMoveCount = useRef(
    game.moveCount,
  );

  useEffect(() => {
    if (
      game.moveCount <= previousMoveCount.current
    ) {
      previousMoveCount.current =
        game.moveCount;

      return;
    }

    previousMoveCount.current =
      game.moveCount;

    if (!game.lastMove) {
      return;
    }

    void generateCommentary();
  }, [game.moveCount]);

  async function generateCommentary() {
    if (!game.lastMove) {
      return;
    }

    const player =
      game.turn === "black"
        ? game.white.participant.displayName
        : game.black.participant.displayName;

    const move =
      `${game.lastMove.from} → ${game.lastMove.to}`;

    setIsGenerating(true);

    let message: string;
    let generatedByAi = false;

    try {
      const response =
        await requestAiCommentary(game.id, {
          fen: game.fen,
          moveNumber: game.moveCount,
          lastMove: {
            from: game.lastMove.from,
            to: game.lastMove.to,
          },
        });

      message = response.commentary;
      generatedByAi = true;
    } catch {
      // Mientras el endpoint de IA no esté
      // disponible utilizamos un comentario local.
      message = generateFallbackComment(
        game,
        player,
      );
    } finally {
      setIsGenerating(false);
    }

    const newComment: Commentary = {
      id: Date.now(),
      moveNumber: game.moveCount,
      player,
      move,
      message,
      generatedByAi,
    };

    setComments((current) =>
      [newComment, ...current].slice(0, 5),
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-bold">
              🎙️ Comentarista IA
            </h2>

            <p className="mt-1 mb-0 text-xs text-slate-300">
              Análisis en vivo de la partida
            </p>
          </div>

          {game.status === "active" && (
            <span className="rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-semibold text-green-300">
              ● EN VIVO
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        {isGenerating && (
          <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
            <p className="m-0 text-sm text-blue-700">
              🤖 Analizando movimiento...
            </p>
          </div>
        )}

        {comments.length === 0 ? (
          <div className="py-5 text-center">
            <div className="mb-2 text-3xl">
              ♟️
            </div>

            <p className="m-0 font-semibold text-slate-700">
              Esperando el primer movimiento
            </p>

            <p className="mt-1 mb-0 text-sm text-slate-500">
              Los comentarios aparecerán durante
              la partida.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {comments.map(
              (comment, index) => (
                <article
                  key={comment.id}
                  className={
                    index === 0
                      ? "rounded-lg border border-blue-200 bg-blue-50 p-3"
                      : "border-t border-slate-100 pt-3"
                  }
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Movimiento{" "}
                      {comment.moveNumber}
                    </span>

                    {index === 0 && (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        ÚLTIMO
                      </span>
                    )}

                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {comment.generatedByAi
                        ? "IA"
                        : "LOCAL"}
                    </span>
                  </div>

                  <div className="mb-2 flex items-center justify-between gap-3">
                    <strong className="text-sm text-slate-900">
                      {comment.player}
                    </strong>

                    <code className="rounded bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">
                      {comment.move}
                    </code>
                  </div>

                  <p className="m-0 text-sm leading-relaxed text-slate-700">
                    {comment.message}
                  </p>
                </article>
              ),
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function generateFallbackComment(
  game: GameState,
  player: string,
): string {
  if (!game.lastMove) {
    return "Esperando el siguiente movimiento.";
  }

  const { from, to } = game.lastMove;

  const comments = [
    `${player} mueve de ${from} a ${to}, buscando mejorar su posición en el tablero.`,

    `Movimiento interesante de ${player}. La pieza abandona ${from} y ocupa ${to}, modificando el equilibrio de la posición.`,

    `${player} continúa desarrollando su estrategia con ${from} → ${to}. Habrá que observar la respuesta del rival.`,

    `La posición cambia después del movimiento ${from} → ${to}. ${player} intenta tomar la iniciativa.`,

    `${player} elige ${from} → ${to}. La partida continúa abierta y el próximo movimiento podría ser importante.`,
  ];

  return comments[
    game.moveCount % comments.length
  ];
}