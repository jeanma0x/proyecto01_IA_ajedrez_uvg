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

  const [voiceEnabled, setVoiceEnabled] =
    useState(true);

  const [isSpeaking, setIsSpeaking] =
    useState(false);

  const [speakingCommentId, setSpeakingCommentId] =
    useState<number | null>(null);

  const previousMoveCount = useRef(
    game.moveCount,
  );

  /*
   * Cancela cualquier narración cuando
   * se desmonta el componente.
   */
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /*
   * Detecta cuando se realizó un nuevo
   * movimiento.
   */
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

    /*
     * Después de realizar un movimiento,
     * game.turn ya pertenece al siguiente
     * jugador.
     */
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
      /*
       * Si el endpoint de IA todavía no existe
       * o falla, usamos el comentario local.
       */
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

    /*
     * Narración automática.
     *
     * En velocidad máxima la desactivamos
     * para evitar que los comentarios se
     * acumulen mientras las IAs juegan.
     */
    if (
      voiceEnabled &&
      game.speed !== "maximum"
    ) {
      speakCommentary(
        message,
        newComment.id,
      );
    }
  }

  function speakCommentary(
    text: string,
    commentId?: number,
  ) {
    if (!("speechSynthesis" in window)) {
      return;
    }

    /*
     * Detiene cualquier comentario anterior.
     */
    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(text);

    utterance.lang = "es-GT";

    /*
     * 1 = velocidad normal.
     * Puedes probar 0.9 si quieres una
     * narración ligeramente más pausada.
     */
    utterance.rate = 1;

    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setSpeakingCommentId(
        commentId ?? null,
      );
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingCommentId(null);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingCommentId(null);
    };

    window.speechSynthesis.speak(
      utterance,
    );
  }

  function stopSpeaking() {
    if (!("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    setIsSpeaking(false);
    setSpeakingCommentId(null);
  }

  function toggleVoice() {
    const nextValue = !voiceEnabled;

    setVoiceEnabled(nextValue);

    if (!nextValue) {
      stopSpeaking();
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* HEADER */}
      <div className="border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-bold">
              🎙️ Comentarista IA
            </h2>

            <p className="mt-1 mb-0 text-xs text-slate-300">
              Análisis y narración en vivo
            </p>
          </div>

          {game.status === "active" && (
            <span className="rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-semibold text-green-300">
              ● EN VIVO
            </span>
          )}
        </div>
      </div>

      {/* CONTROLES DE VOZ */}
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="m-0 text-sm font-semibold text-slate-800">
              🔊 Narración por voz
            </p>

            <p className="mt-0.5 mb-0 text-xs text-slate-500">
              {game.speed === "maximum"
                ? "Desactivada automáticamente en velocidad máxima."
                : voiceEnabled
                  ? "Los nuevos comentarios se narrarán automáticamente."
                  : "La narración automática está desactivada."}
            </p>
          </div>

          <button
            type="button"
            onClick={toggleVoice}
            aria-pressed={voiceEnabled}
            className={
              voiceEnabled
                ? "rounded-full bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700"
                : "rounded-full bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-300"
            }
          >
            {voiceEnabled
              ? "VOZ ON"
              : "VOZ OFF"}
          </button>
        </div>

        {isSpeaking && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
            <span className="text-xs font-semibold text-green-800">
              🔊 Narrando comentario...
            </span>

            <button
              type="button"
              onClick={stopSpeaking}
              className="text-xs font-bold text-red-600 hover:underline"
            >
              Detener
            </button>
          </div>
        )}
      </div>

      {/* CONTENIDO */}
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
              Los comentarios aparecerán y podrán
              ser narrados durante la partida.
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
                  {/* INFO DEL MOVIMIENTO */}
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

                    <span
                      className={
                        comment.generatedByAi
                          ? "rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700"
                          : "rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                      }
                    >
                      {comment.generatedByAi
                        ? "IA"
                        : "LOCAL"}
                    </span>
                  </div>

                  {/* JUGADOR Y MOVIMIENTO */}
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <strong className="text-sm text-slate-900">
                      {comment.player}
                    </strong>

                    <code className="rounded bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">
                      {comment.move}
                    </code>
                  </div>

                  {/* COMENTARIO */}
                  <p className="m-0 text-sm leading-relaxed text-slate-700">
                    {comment.message}
                  </p>

                  {/* BOTÓN REPETIR */}
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() =>
                        speakCommentary(
                          comment.message,
                          comment.id,
                        )
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {speakingCommentId ===
                      comment.id
                        ? "🔊 Reproduciendo..."
                        : "🔊 Escuchar"}
                    </button>
                  </div>
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

    `${player} continúa desarrollando su estrategia con ${from} a ${to}. Habrá que observar la respuesta del rival.`,

    `La posición cambia después del movimiento de ${from} a ${to}. ${player} intenta tomar la iniciativa.`,

    `${player} elige mover de ${from} a ${to}. La partida continúa abierta y el próximo movimiento podría ser importante.`,
  ];

  return comments[
    game.moveCount % comments.length
  ];
}