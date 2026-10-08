
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

const MAX_COMMENTS = 5;

function getLastPlayer(game: GameState): string {
  return game.turn === "black"
    ? game.white.participant.displayName
    : game.black.participant.displayName;
}

function generateFallbackComment(game: GameState): string {
  if (!game.lastMove) return "La partida continúa.";

  const player = getLastPlayer(game);
  const { from, to } = game.lastMove;

  if (game.status === "finished") {
    if (game.reason === "checkmate") {
      return "¡Jaque mate! La partida ha terminado.";
    }

    return "La partida ha terminado.";
  }

  return `${player} mueve de ${from} a ${to}. La partida continúa.`;
}

function generateLiveSummary(
  game: GameState,
  lastNarratedMove: number,
): string {
  const difference = game.moveCount - lastNarratedMove;

  if (game.status === "finished") {
    if (game.reason === "checkmate") {
      return "¡Jaque mate! Tenemos un ganador.";
    }

    return "La partida ha llegado a su final.";
  }

  if (game.status === "incident") {
    return "La partida se ha detenido por una incidencia técnica.";
  }

  if (!game.lastMove) {
    return "La partida continúa.";
  }

  const player = getLastPlayer(game);
  const { from, to } = game.lastMove;

  if (difference >= 3) {
    return (
      `¡La partida avanza rápidamente! ` +
      `Se han realizado ${difference} movimientos. ` +
      `${player} acaba de jugar de ${from} a ${to}.`
    );
  }

  if (difference === 2) {
    return (
      `Dos nuevas jugadas sobre el tablero. ` +
      `${player} acaba de mover de ${from} a ${to}.`
    );
  }

  return `${player} mueve de ${from} a ${to}.`;
}

export function AiCommentator({ game }: AiCommentatorProps) {
  const [comments, setComments] = useState<Commentary[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingCommentId, setSpeakingCommentId] =
    useState<number | null>(null);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [speechRate, setSpeechRate] = useState(1.25);

  const latestGameRef = useRef(game);
  latestGameRef.current = game;

  const previousMoveCountRef = useRef(game.moveCount);
  const lastNarratedMoveRef = useRef(game.moveCount);

  const speakingRef = useRef(false);
  const activeUtteranceRef =
    useRef<SpeechSynthesisUtterance | null>(null);

  const sessionRef = useRef(0);
  const mountedRef = useRef(true);
  const gameIdRef = useRef(game.id);
  const pendingRequestsRef = useRef(0);

  const voiceEnabledRef = useRef(voiceEnabled);
  voiceEnabledRef.current = voiceEnabled;

  const voiceSettingsRef = useRef({
    voices,
    selectedVoice,
    speechRate,
  });

  voiceSettingsRef.current = {
    voices,
    selectedVoice,
    speechRate,
  };

  const playLatestRef = useRef<() => void>(() => {});

  // Detiene la voz solamente cuando el usuario lo solicita.
  const stopSpeaking = useCallback(() => {
    sessionRef.current += 1;
    speakingRef.current = false;

    if (activeUtteranceRef.current) {
      activeUtteranceRef.current.onend = null;
      activeUtteranceRef.current.onerror = null;
      activeUtteranceRef.current = null;
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (mountedRef.current) {
      setIsSpeaking(false);
      setSpeakingCommentId(null);
    }

    // No volver a narrar movimientos anteriores.
    lastNarratedMoveRef.current =
      latestGameRef.current.moveCount;
  }, []);

  const speakText = useCallback(
    (text: string, commentId: number | null, moveNumber: number) => {
      if (!mountedRef.current || speakingRef.current) return;
      if (!("speechSynthesis" in window)) return;

      speakingRef.current = true;
      const session = sessionRef.current;

      const utterance = new SpeechSynthesisUtterance(text);
      activeUtteranceRef.current = utterance;

      const settings = voiceSettingsRef.current;
      const voice = settings.voices.find(
        (item) => item.voiceURI === settings.selectedVoice,
      );

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = "es-ES";
      }

      utterance.rate = settings.speechRate;
      utterance.pitch = 1;
      utterance.volume = 1;

      lastNarratedMoveRef.current = moveNumber;
      setIsSpeaking(true);
      setSpeakingCommentId(commentId);

      let completed = false;

      const finish = () => {
        if (completed || session !== sessionRef.current) return;

        completed = true;
        speakingRef.current = false;
        activeUtteranceRef.current = null;

        if (!mountedRef.current) return;

        setIsSpeaking(false);
        setSpeakingCommentId(null);

        // Al terminar, revisar si el tablero avanzó.
        playLatestRef.current();
      };

      utterance.onend = finish;
      utterance.onerror = finish;

      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        finish();
      }
    },
    [],
  );

  const playLatest = useCallback(() => {
    if (!mountedRef.current || speakingRef.current) return;
    if (!voiceEnabledRef.current) return;

    const latest = latestGameRef.current;

    if (latest.speed === "maximum") return;

    if (
      latest.moveCount <= lastNarratedMoveRef.current
    ) {
      return;
    }

    const summary = generateLiveSummary(
      latest,
      lastNarratedMoveRef.current,
    );

    speakText(summary, null, latest.moveCount);
  }, [speakText]);

  playLatestRef.current = playLatest;

  // Limpieza al desmontar.
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      sessionRef.current += 1;
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

  // Cargar voces disponibles.
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

  // Reiniciar cuando cambia la partida.
  useEffect(() => {
    if (gameIdRef.current === game.id) return;

    gameIdRef.current = game.id;
    stopSpeaking();

    previousMoveCountRef.current = game.moveCount;
    lastNarratedMoveRef.current = game.moveCount;

    pendingRequestsRef.current = 0;
    setIsGenerating(false);
    setComments([]);
  }, [game.id, game.moveCount, stopSpeaking]);

  // Detectar movimientos y generar historial escrito.
  useEffect(() => {
    if (game.moveCount <= previousMoveCountRef.current) {
      previousMoveCountRef.current = game.moveCount;
      return;
    }

    previousMoveCountRef.current = game.moveCount;

    if (!game.lastMove) return;

    const snapshot = {
      ...game,
      lastMove: { ...game.lastMove },
    };

    const player = getLastPlayer(snapshot);
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
        message = generateFallbackComment(snapshot);
      } finally {
        pendingRequestsRef.current = Math.max(
          0,
          pendingRequestsRef.current - 1,
        );

        if (mountedRef.current) {
          setIsGenerating(pendingRequestsRef.current > 0);
        }
      }

      if (!mountedRef.current) return;
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
    }

    void generateCommentary();

    // La voz utiliza el último estado, no las respuestas
    // individuales de la API.
    playLatest();
  }, [
    game.id,
    game.moveCount,
    game.fen,
    game.turn,
    game.lastMove,
    game.white,
    game.black,
    playLatest,
  ]);

  function toggleVoice() {
    const next = !voiceEnabled;

    voiceEnabledRef.current = next;
    setVoiceEnabled(next);

    if (!next) {
      stopSpeaking();
    } else {
      // Comenzar con movimientos futuros, sin recuperar atrasados.
      lastNarratedMoveRef.current =
        latestGameRef.current.moveCount;
    }
  }

  function listenManually(comment: Commentary) {
    stopSpeaking();

    // El botón manual reproduce el comentario elegido.
    speakText(
      comment.message,
      comment.id,
      latestGameRef.current.moveCount,
    );
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
              Narración sincronizada con la partida
            </p>
          </div>

          {game.status === "active" && (
            <span className="rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-semibold text-green-300">
              ● EN VIVO
            </span>
          )}
        </div>
      </div>

      {/* CONTROLES */}
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
                  ? "Narración breve, sin interrupciones ni cola."
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
              🔊 Narrando en vivo...
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

      {/* HISTORIAL ESCRITO */}
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
                    onClick={() => listenManually(comment)}
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
