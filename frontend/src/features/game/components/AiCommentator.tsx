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

  const [
    speakingCommentId,
    setSpeakingCommentId,
  ] = useState<number | null>(null);

  /*
   * Voces disponibles en el navegador.
   */
  const [voices, setVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);

  /*
   * Nombre de la voz seleccionada.
   */
  const [selectedVoice, setSelectedVoice] =
    useState("");

  /*
   * 1.15 produce una narración un poco más
   * dinámica que la velocidad estándar.
   */
  const [speechRate, setSpeechRate] =
    useState(1.15);

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
   * Carga las voces disponibles del navegador.
   *
   * Algunos navegadores no las tienen listas
   * inmediatamente, por eso escuchamos
   * "voiceschanged".
   */
  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      return;
    }

    function loadVoices() {
      const availableVoices =
        window.speechSynthesis.getVoices();

      setVoices(availableVoices);

      if (
        availableVoices.length > 0 &&
        !selectedVoice
      ) {
        const spanishVoices =
          availableVoices.filter((voice) =>
            voice.lang
              .toLowerCase()
              .startsWith("es"),
          );

        /*
         * Intentamos encontrar primero voces
         * que normalmente suenan más naturales.
         */
        const preferredVoice =
          spanishVoices.find((voice) =>
            /natural|neural|google|microsoft/i.test(
              voice.name,
            ),
          ) ??
          spanishVoices[0] ??
          availableVoices[0];

        if (preferredVoice) {
          setSelectedVoice(
            preferredVoice.name,
          );
        }
      }
    }

    loadVoices();

    window.speechSynthesis.addEventListener(
      "voiceschanged",
      loadVoices,
    );

    return () => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        loadVoices,
      );
    };
  }, [selectedVoice]);

  /*
   * Detecta cuando se realizó un nuevo
   * movimiento.
   */
  useEffect(() => {
    if (
      game.moveCount <=
      previousMoveCount.current
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
     * game.turn pertenece al siguiente
     * jugador.
     *
     * Si ahora juegan negras, quien acaba
     * de mover fueron las blancas.
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
      /*
       * Intentamos obtener el comentario
       * desde el endpoint de IA.
       */
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
       * Mientras el endpoint de IA no exista
       * o si falla, utilizamos un comentario
       * generado localmente.
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

    /*
     * Guardamos solamente los últimos
     * cinco comentarios.
     */
    setComments((current) =>
      [newComment, ...current].slice(0, 5),
    );

    /*
     * Narración automática.
     *
     * En velocidad máxima no reproducimos
     * automáticamente para evitar que las
     * voces se corten constantemente.
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

  /*
   * Reproduce un comentario utilizando
   * Web Speech API.
   */
  function speakCommentary(
    text: string,
    commentId?: number,
  ) {
    if (!("speechSynthesis" in window)) {
      return;
    }

    /*
     * Detenemos cualquier comentario
     * que estuviera reproduciéndose.
     */
    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(text);

    /*
     * Buscamos la voz seleccionada.
     */
    const selected =
      voices.find(
        (voice) =>
          voice.name === selectedVoice,
      );

    if (selected) {
      utterance.voice = selected;
      utterance.lang = selected.lang;
    } else {
      /*
       * Respaldo si todavía no cargaron
       * las voces.
       */
      utterance.lang = "es-ES";
    }

    utterance.rate = speechRate;
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

  /*
   * Detiene manualmente la narración.
   */
  function stopSpeaking() {
    if (!("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    setIsSpeaking(false);
    setSpeakingCommentId(null);
  }

  /*
   * Activa/desactiva la narración
   * automática.
   */
  function toggleVoice() {
    const nextValue = !voiceEnabled;

    setVoiceEnabled(nextValue);

    if (!nextValue) {
      stopSpeaking();
    }
  }

  /*
   * Solo mostramos voces en español
   * dentro del selector.
   */
  const spanishVoices = voices.filter(
    (voice) =>
      voice.lang
        .toLowerCase()
        .startsWith("es"),
  );

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
                ? "La narración automática se pausa en velocidad máxima."
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

        {/* CONFIGURACIÓN DE VOZ */}
        {voiceEnabled && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* SELECTOR DE VOZ */}
            <div>
              <label
                htmlFor="commentator-voice"
                className="mb-1 block text-xs font-semibold text-slate-600"
              >
                Voz del comentarista
              </label>

              <select
                id="commentator-voice"
                value={selectedVoice}
                onChange={(event) =>
                  setSelectedVoice(
                    event.target.value,
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                {spanishVoices.length ===
                0 ? (
                  <option value="">
                    Voz predeterminada
                  </option>
                ) : (
                  spanishVoices.map(
                    (voice) => (
                      <option
                        key={`${voice.name}-${voice.lang}`}
                        value={voice.name}
                      >
                        {voice.name} (
                        {voice.lang})
                      </option>
                    ),
                  )
                )}
              </select>
            </div>

            {/* SELECTOR DE VELOCIDAD */}
            <div>
              <label
                htmlFor="commentator-speed"
                className="mb-1 block text-xs font-semibold text-slate-600"
              >
                Ritmo de narración
              </label>

              <select
                id="commentator-speed"
                value={speechRate}
                onChange={(event) =>
                  setSpeechRate(
                    Number(
                      event.target.value,
                    ),
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <option value={1}>
                  Tranquila
                </option>

                <option value={1.15}>
                  Natural
                </option>

                <option value={1.25}>
                  Dinámica
                </option>

                <option value={1.4}>
                  Rápida
                </option>
              </select>
            </div>
          </div>
        )}

        {/* ESTADO DE REPRODUCCIÓN */}
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
              Los comentarios aparecerán y
              podrán ser narrados durante la
              partida.
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

                  {/* BOTÓN ESCUCHAR */}
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