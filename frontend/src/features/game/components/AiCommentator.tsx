
import { useCallback, useEffect, useRef, useState } from "react";

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

interface SpeechItem {
  id: number;
  text: string;
}

const MAX_PENDING = 3;
const MAX_COMMENTS = 5;

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
    `Movimiento interesante de ${player}. La pieza abandona ${from} y ocupa ${to}, modificando la posición.`,
    `${player} continúa desarrollando su estrategia con ${from} a ${to}. Habrá que observar la respuesta del rival.`,
    `La posición cambia después del movimiento de ${from} a ${to}. ${player} intenta tomar la iniciativa.`,
    `${player} elige mover de ${from} a ${to}. La partida continúa abierta.`,
  ];

  return comments[game.moveCount % comments.length];
}

export function AiCommentator({ game }: AiCommentatorProps) {
  const [comments, setComments] = useState<Commentary[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingCommentId, setSpeakingCommentId] =
    useState<number | null>(null);

  const [pendingCount, setPendingCount] = useState(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [speechRate, setSpeechRate] = useState(1.15);

  const previousMoveCount = useRef(game.moveCount);

  const speechQueue = useRef<SpeechItem[]>([]);
  const speakingRef = useRef(false);
  const speechSessionRef = useRef(0);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const voiceSettingsRef = useRef({
    voices,
    selectedVoice,
    speechRate,
  });

  const voiceEnabledRef = useRef(voiceEnabled);
  const speedRef = useRef(game.speed);
  const mountedRef = useRef(true);
  const gameIdRef = useRef(game.id);
  const pendingRequestsRef = useRef(0);

  // Mantener actualizadas las preferencias para las callbacks.
  useEffect(() => {
    voiceSettingsRef.current = {
      voices,
      selectedVoice,
      speechRate,
    };
  }, [voices, selectedVoice, speechRate]);

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  useEffect(() => {
    speedRef.current = game.speed;
  }, [game.speed]);

  // Reproduce los comentarios pendientes uno por uno.
  const processSpeechQueue = useCallback(() => {
    if (speakingRef.current || !mountedRef.current) return;

    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      speechQueue.current = [];
      setPendingCount(0);
      return;
    }

    const next = speechQueue.current.shift();

    if (!next) {
      setIsSpeaking(false);
      setSpeakingCommentId(null);
      setPendingCount(0);
      return;
    }

    const session = speechSessionRef.current;
    const synth = window.speechSynthesis;

    speakingRef.current = true;
    setPendingCount(speechQueue.current.length);

    const utterance = new SpeechSynthesisUtterance(next.text);
    activeUtteranceRef.current = utterance;

    const settings = voiceSettingsRef.current;

    const selected = settings.voices.find(
      (voice) => voice.voiceURI === settings.selectedVoice,
    );

    if (selected) {
      utterance.voice = selected;
      utterance.lang = selected.lang;
    } else {
      utterance.lang = "es-ES";
    }

    utterance.rate = settings.speechRate;
    utterance.pitch = 1;
    utterance.volume = 1;

    setIsSpeaking(true);
    setSpeakingCommentId(next.id);

    let completed = false;

    const finish = () => {
      if (completed || session !== speechSessionRef.current) {
        return;
      }

      completed = true;
      speakingRef.current = false;
      activeUtteranceRef.current = null;

      setIsSpeaking(false);
      setSpeakingCommentId(null);

      processSpeechQueue();
    };

    utterance.onend = finish;
    utterance.onerror = finish;

    try {
      synth.speak(utterance);
    } catch {
      finish();
    }
  }, []);

  const enqueueCommentary = useCallback(
    (text: string, id: number) => {
      if (!mountedRef.current) return;

      speechQueue.current.push({ id, text });

      if (speechQueue.current.length > MAX_PENDING) {
        speechQueue.current =
          speechQueue.current.slice(-MAX_PENDING);
      }

      setPendingCount(speechQueue.current.length);
      processSpeechQueue();
    },
    [processSpeechQueue],
  );

  // Detiene la narración y limpia todos los pendientes.
  const stopSpeaking = useCallback(() => {
    speechSessionRef.current += 1;

    speechQueue.current = [];
    speakingRef.current = false;

    const utterance = activeUtteranceRef.current;

    if (utterance) {
      utterance.onend = null;
      utterance.onerror = null;
      activeUtteranceRef.current = null;
    }

    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.cancel();
    }

    if (mountedRef.current) {
      setIsSpeaking(false);
      setSpeakingCommentId(null);
      setPendingCount(0);
    }
  }, []);

  // Al cerrar el componente se detiene toda la narración.
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      speechSessionRef.current += 1;
      speechQueue.current = [];
      speakingRef.current = false;

      if (activeUtteranceRef.current) {
        activeUtteranceRef.current.onend = null;
        activeUtteranceRef.current.onerror = null;
        activeUtteranceRef.current = null;
      }

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Cargar voces del navegador.
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    const synth = window.speechSynthesis;

    function loadVoices() {
      const available = synth.getVoices();
      setVoices(available);

      setSelectedVoice((current) => {
        if (
          current &&
          available.some((voice) => voice.voiceURI === current)
        ) {
          return current;
        }

        const spanish = available.filter((voice) =>
          voice.lang.toLowerCase().startsWith("es"),
        );

        const preferred =
          spanish.find((voice) =>
            /natural|neural|google|microsoft/i.test(voice.name),
          ) ??
          spanish[0] ??
          available[0];

        return preferred?.voiceURI ?? "";
      });
    }

    loadVoices();
    synth.addEventListener("voiceschanged", loadVoices);

    return () => {
      synth.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  // Si cambia la partida, reiniciar historial y narración.
  useEffect(() => {
    if (gameIdRef.current === game.id) return;

    gameIdRef.current = game.id;
    previousMoveCount.current = game.moveCount;

    stopSpeaking();
    setComments([]);
    pendingRequestsRef.current = 0;
    setIsGenerating(false);
  }, [game.id, game.moveCount, stopSpeaking]);

  // Detectar movimientos nuevos.
  useEffect(() => {
    if (game.moveCount <= previousMoveCount.current) {
      previousMoveCount.current = game.moveCount;
      return;
    }

    previousMoveCount.current = game.moveCount;

    if (!game.lastMove) return;

    const snapshot = {
      ...game,
      lastMove: { ...game.lastMove },
    };

    let valid = true;

    const player =
      snapshot.turn === "black"
        ? snapshot.white.participant.displayName
        : snapshot.black.participant.displayName;

    const move =
      `${snapshot.lastMove.from} → ${snapshot.lastMove.to}`;

    pendingRequestsRef.current += 1;
    setIsGenerating(true);

    async function generateCommentary() {
      let message: string;
      let generatedByAi = false;

      try {
        const response = await requestAiCommentary(snapshot.id, {
          fen: snapshot.fen,
          moveNumber: snapshot.moveCount,
          lastMove: snapshot.lastMove,
        });

        if (!response.commentary?.trim()) {
          throw new Error("Comentario vacío");
        }

        message = response.commentary.trim();
        generatedByAi = true;
      } catch {
        message = generateFallbackComment(snapshot, player);
      } finally {
        pendingRequestsRef.current = Math.max(
          0,
          pendingRequestsRef.current - 1,
        );

        if (mountedRef.current) {
          setIsGenerating(pendingRequestsRef.current > 0);
        }
      }

      if (!valid || !mountedRef.current) return;
      if (gameIdRef.current !== snapshot.id) return;

      const newComment: Commentary = {
        id: snapshot.moveCount,
        moveNumber: snapshot.moveCount,
        player,
        move,
        message,
        generatedByAi,
      };

      setComments((current) =>
        [newComment, ...current]
          .sort((a, b) => b.moveNumber - a.moveNumber)
          .slice(0, MAX_COMMENTS),
      );

      // La narración automática no interrumpe la actual.
      // En modo rápido narra cada tres movimientos.
      if (
        voiceEnabledRef.current &&
        speedRef.current !== "maximum" &&
        (
          speedRef.current === "normal" ||
          snapshot.moveCount % 3 === 0
        )
      ) {
        enqueueCommentary(message, newComment.id);
      }
    }

    void generateCommentary();

    return () => {
      // La respuesta del movimiento anterior puede seguir siendo
      // válida; no cancelamos su narración por cambiar moveCount.
      valid = true;
    };
  }, [
    game.id,
    game.moveCount,
    game.fen,
    game.turn,
    game.lastMove,
    game.white,
    game.black,
    enqueueCommentary,
  ]);

  function speakCommentary(text: string, commentId: number) {
    // Escuchar manualmente tiene prioridad y reinicia la cola.
    stopSpeaking();
    enqueueCommentary(text, commentId);
  }

  function toggleVoice() {
    const next = !voiceEnabled;
    voiceEnabledRef.current = next;
    setVoiceEnabled(next);

    if (!next) stopSpeaking();
  }

  const spanishVoices = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith("es"),
  );

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* ENCABEZADO */}
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
                ? "Sin narración automática en velocidad máxima."
                : voiceEnabled
                  ? "Los comentarios se narran sin interrumpirse."
                  : "La narración automática está desactivada."}
            </p>
          </div>

          <button
            type="button"
            onClick={toggleVoice}
            aria-pressed={voiceEnabled}
            className={
              voiceEnabled
                ? "rounded-full bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                : "rounded-full bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-300"
            }
          >
            {voiceEnabled ? "VOZ ON" : "VOZ OFF"}
          </button>
        </div>

        {voiceEnabled && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  setSelectedVoice(event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-700"
              >
                {spanishVoices.length === 0 ? (
                  <option value="">
                    Voz predeterminada
                  </option>
                ) : (
                  spanishVoices.map((voice) => (
                    <option
                      key={voice.voiceURI}
                      value={voice.voiceURI}
                    >
                      {voice.name} ({voice.lang})
                    </option>
                  ))
                )}
              </select>
            </div>

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
                  setSpeechRate(Number(event.target.value))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs text-slate-700"
              >
                <option value={1}>Tranquila</option>
                <option value={1.15}>Natural</option>
                <option value={1.25}>Dinámica</option>
                <option value={1.4}>Rápida</option>
              </select>
            </div>
          </div>
        )}

        {isSpeaking && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
            <span className="text-xs font-semibold text-green-800">
              🔊 Narrando comentario...
              {pendingCount > 0 && (
                <span className="ml-2">
                  ({pendingCount} en espera)
                </span>
              )}
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

      {/* COMENTARIOS */}
      <div className="p-4">
        {isGenerating && (
          <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            🤖 Analizando movimiento...
          </div>
        )}

        {comments.length === 0 ? (
          <div className="py-5 text-center">
            <div className="mb-2 text-3xl">♟️</div>
            <p className="m-0 font-semibold text-slate-700">
              Esperando el primer movimiento
            </p>
            <p className="mt-1 mb-0 text-sm text-slate-500">
              Los comentarios aparecerán durante la partida.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {comments.map((comment, index) => (
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
                    Movimiento {comment.moveNumber}
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
                    {comment.generatedByAi ? "IA" : "LOCAL"}
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

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() =>
                      speakCommentary(comment.message, comment.id)
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {speakingCommentId === comment.id
                      ? "🔊 Reproduciendo..."
                      : "🔊 Escuchar"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
