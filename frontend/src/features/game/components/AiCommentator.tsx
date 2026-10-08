
import { useCallback, useEffect, useRef, useState } from "react";

import { getMoves } from "../../../services/api/gameApi";
import type { GameState, Move } from "../../../types/api";

interface AiCommentatorProps {
  game: GameState;
}

type MoveCategory =
  | "normal"
  | "development"
  | "center"
  | "capture"
  | "check"
  | "checkmate"
  | "castle"
  | "promotion";

interface Commentary {
  id: number;
  moveNumber: number;
  player: string;
  move: string;
  message: string;
  category: MoveCategory;
}

interface ChessCommentary {
  text: string;
  category: MoveCategory;
  excitement: number;
}

const MAX_COMMENTS = 8;

const PIECE_NAMES: Record<string, string> = {
  p: "peón",
  n: "caballo",
  b: "alfil",
  r: "torre",
  q: "dama",
  k: "rey",
};

function getLastPlayer(game: GameState): string {
  return game.turn === "black"
    ? game.white.participant.displayName
    : game.black.participant.displayName;
}

function getPieceName(move?: Move): string {
  if (!move) return "pieza";

  const san = move.san;

  if (san.startsWith("N")) return "caballo";
  if (san.startsWith("B")) return "alfil";
  if (san.startsWith("R")) return "torre";
  if (san.startsWith("Q")) return "dama";
  if (san.startsWith("K")) return "rey";

  return PIECE_NAMES[move.piece.toLowerCase()] ?? "peón";
}

function getMoveCategory(
  move: Move | undefined,
  game: GameState,
): MoveCategory {
  if (
    game.status === "finished" &&
    game.reason === "checkmate"
  ) {
    return "checkmate";
  }

  if (!move) return "normal";

  const san = move.san;

  if (san.includes("#")) return "checkmate";
  if (san.includes("+")) return "check";
  if (/^O-O(-O)?/.test(san)) return "castle";
  if (san.includes("=")) return "promotion";
  if (san.includes("x")) return "capture";

  if (["d4", "e4", "d5", "e5"].includes(move.to)) {
    return "center";
  }

  if (
    ["n", "b"].includes(move.piece.toLowerCase()) &&
    move.ply <= 16
  ) {
    return "development";
  }

  return "normal";
}

function generateChessCommentary(
  game: GameState,
  move?: Move,
  previousNarratedMove = game.moveCount - 1,
): ChessCommentary {
  const player = getLastPlayer(game);
  const from = game.lastMove?.from ?? "";
  const to = game.lastMove?.to ?? "";
  const piece = getPieceName(move);

  const difference = Math.max(
    1,
    game.moveCount - previousNarratedMove,
  );

  const category = getMoveCategory(move, game);

  if (game.status === "incident") {
    return {
      text: "¡Atención! El duelo se ha detenido por una incidencia técnica.",
      category: "normal",
      excitement: 2,
    };
  }

  if (
    game.status === "finished" &&
    game.reason !== "checkmate"
  ) {
    return {
      text: "¡Final del enfrentamiento! La partida ha llegado a su conclusión.",
      category: "normal",
      excitement: 3,
    };
  }

  const templates: Record<MoveCategory, string[]> = {
    checkmate: [
      `¡Jaque mate! ¡Se acabó, se acabó! ¡${player} sentencia el enfrentamiento!`,
      `¡Impresionante! ¡Jaque mate de ${player}! ¡Qué final de partida!`,
      `¡Final espectacular! ¡${player} consigue el jaque mate!`,
    ],

    check: [
      `¡Cuidado con ese rey! ¡${player} acaba de dar jaque!`,
      `¡Atención! ¡Jaque de ${player}! ¡El rival tiene que responder!`,
      `¡Se encienden las alarmas! ${player} amenaza directamente al rey rival.`,
    ],

    capture: [
      `¡Y tenemos captura! ¡${player} se lleva una pieza rival con su ${piece}!`,
      `¡Atención a esta jugada! El ${piece} de ${player} captura una pieza enemiga.`,
      `¡Se produce una captura! ${player} utiliza su ${piece} para eliminar una pieza rival.`,
    ],

    castle: [
      `¡Y llega el enroque! ${player} busca mayor seguridad para su rey.`,
      `¡Movimiento defensivo! ${player} realiza el enroque y protege a su monarca.`,
      `¡El rey cambia de posición! ${player} completa el enroque.`,
    ],

    promotion: [
      `¡Increíble momento! ¡${player} consigue promocionar un peón!`,
      `¡Qué jugada! ¡Un peón de ${player} alcanza la última fila!`,
      `¡Atención! ¡${player} transforma uno de sus peones en una nueva pieza!`,
    ],

    center: [
      `¡${player} va directo al centro! Su ${piece} ocupa ${to}.`,
      `¡Se pelea por el centro del tablero! ${player} mueve su ${piece} hacia ${to}.`,
      `¡Movimiento con intención! ${player} coloca su ${piece} en una casilla central.`,
    ],

    development: [
      `¡Ahí viene ${player}! Desarrolla su ${piece} hacia ${to}. ¡Comienza la batalla!`,
      `¡Se ponen las piezas en acción! ${player} moviliza su ${piece}.`,
      `¡Atención al desarrollo! ${player} lleva su ${piece} hacia ${to}.`,
    ],

    normal: [
      `¡Ahí va ${player}! Su ${piece} se desplaza hacia ${to}.`,
      `¡Tenemos nueva jugada! ${player} mueve su ${piece} hacia ${to}.`,
      `¡Continúa el duelo! ${player} coloca su ${piece} en ${to}.`,
      `¡Se mueve el tablero! ${player} juega con su ${piece}.`,
      `¡Nueva decisión de ${player}! Su ${piece} llega hasta ${to}.`,
      `¡Atención al tablero! ${player} mueve de ${from} a ${to}.`,
    ],
  };

  const options = templates[category];

  const index =
    (game.moveCount * 7 + (from.charCodeAt(0) || 0)) %
    options.length;

  let text = options[index] ?? options[0];

  if (
    difference >= 3 &&
    category !== "checkmate" &&
    category !== "check"
  ) {
    const summaries = [
      `¡Qué ritmo lleva esta partida! Han pasado ${difference} jugadas. ${player} acaba de mover su ${piece} hacia ${to}.`,
      `¡Esto no se detiene! Tras ${difference} movimientos, ${player} realiza la última jugada con su ${piece}.`,
      `¡Vaya velocidad! El tablero ha avanzado ${difference} jugadas. ${player} acaba de jugar hacia ${to}.`,
    ];

    text = summaries[game.moveCount % summaries.length];
  }

  const excitement =
    category === "checkmate"
      ? 5
      : category === "check" || category === "promotion"
        ? 4
        : category === "capture"
          ? 3
          : 2;

  return {
    text,
    category,
    excitement,
  };
}

export function AiCommentator({ game }: AiCommentatorProps) {
  const [comments, setComments] = useState<Commentary[]>([]);
  const [moves, setMoves] = useState<Move[]>([]);

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentNarration, setCurrentNarration] =
    useState<string | null>(null);

  const [voices, setVoices] =
    useState<SpeechSynthesisVoice[]>([]);

  const [selectedVoice, setSelectedVoice] =
    useState("");

  const [speechRate, setSpeechRate] =
    useState(1.25);

  const latestGameRef = useRef(game);
  latestGameRef.current = game;

  const movesRef = useRef(moves);
  movesRef.current = moves;

  const previousMoveCountRef = useRef(game.moveCount);
  const lastNarratedMoveRef = useRef(game.moveCount);

  const speakingRef = useRef(false);
  const mountedRef = useRef(true);
  const sessionRef = useRef(0);

  const activeUtteranceRef =
    useRef<SpeechSynthesisUtterance | null>(null);

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
      setCurrentNarration(null);
    }

    lastNarratedMoveRef.current =
      latestGameRef.current.moveCount;
  }, []);

  const speakText = useCallback(
    (
      text: string,
      moveNumber: number,
      excitement = 2,
    ) => {
      if (!mountedRef.current || speakingRef.current) return;
      if (!("speechSynthesis" in window)) return;

      speakingRef.current = true;

      const session = sessionRef.current;
      const utterance = new SpeechSynthesisUtterance(text);

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

      utterance.pitch =
        excitement >= 4
          ? 1.18
          : excitement === 3
            ? 1.12
            : 1.05;

      utterance.volume = 1;

      lastNarratedMoveRef.current = moveNumber;

      setCurrentNarration(text);
      setIsSpeaking(true);

      let completed = false;

      const finish = () => {
        if (completed || session !== sessionRef.current) {
          return;
        }

        completed = true;
        speakingRef.current = false;
        activeUtteranceRef.current = null;

        if (!mountedRef.current) return;

        setIsSpeaking(false);
        setCurrentNarration(null);

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

    const latestMove = movesRef.current.find(
      (move) => move.ply === latest.moveCount,
    );

    const commentary = generateChessCommentary(
      latest,
      latestMove,
      lastNarratedMoveRef.current,
    );

    speakText(
      commentary.text,
      latest.moveCount,
      commentary.excitement,
    );
  }, [speakText]);

  playLatestRef.current = playLatest;

  // Limpiar narración al desmontar.
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

  // Cargar voces.
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    const synth = window.speechSynthesis;

    function loadVoices() {
      const available = synth.getVoices();

      setVoices(available);

      setSelectedVoice((current) => {
        if (
          current &&
          available.some(
            (voice) => voice.voiceURI === current,
          )
        ) {
          return current;
        }

        const spanish = available.filter((voice) =>
          voice.lang.toLowerCase().startsWith("es"),
        );

        const preferred =
          spanish.find((voice) =>
            /natural|neural|google|microsoft/i.test(
              voice.name,
            ),
          ) ??
          spanish[0] ??
          available[0];

        return preferred?.voiceURI ?? "";
      });
    }

    loadVoices();

    synth.addEventListener(
      "voiceschanged",
      loadVoices,
    );

    return () => {
      synth.removeEventListener(
        "voiceschanged",
        loadVoices,
      );
    };
  }, []);

  // Obtener historial de movimientos.
  useEffect(() => {
    let cancelled = false;

    async function loadMoves() {
      try {
        const response = await getMoves(game.id);

        if (!cancelled) {
          setMoves(
            [...response].sort((a, b) => a.ply - b.ply),
          );
        }
      } catch {
        // Continuar sin historial si la API falla.
      }
    }

    void loadMoves();

    return () => {
      cancelled = true;
    };
  }, [game.id, game.moveCount]);

  // Detectar movimientos.
  useEffect(() => {
    if (
      game.moveCount <= previousMoveCountRef.current
    ) {
      previousMoveCountRef.current = game.moveCount;
      return;
    }

    previousMoveCountRef.current = game.moveCount;

    if (!game.lastMove) return;

    const latestMove = movesRef.current.find(
      (move) => move.ply === game.moveCount,
    );

    const commentary = generateChessCommentary(
      game,
      latestMove,
      Math.max(0, game.moveCount - 1),
    );

    const player = getLastPlayer(game);

    const newComment: Commentary = {
      id: game.moveCount,
      moveNumber: game.moveCount,
      player,
      move: `${game.lastMove.from} → ${game.lastMove.to}`,
      message: commentary.text,
      category: commentary.category,
    };

    setComments((current) =>
      [newComment, ...current]
        .sort((a, b) => b.moveNumber - a.moveNumber)
        .slice(0, MAX_COMMENTS),
    );

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
      lastNarratedMoveRef.current =
        latestGameRef.current.moveCount;
    }
  }

  function listenManually(comment: Commentary) {
    stopSpeaking();

    speakText(
      comment.message,
      latestGameRef.current.moveCount,
      2,
    );
  }

  const spanishVoices = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith("es"),
  );

  const CATEGORY_LABELS: Record<MoveCategory, string> = {
    normal: "JUGADA",
    development: "DESARROLLO",
    center: "CENTRO",
    capture: "CAPTURA",
    check: "JAQUE",
    checkmate: "JAQUE MATE",
    castle: "ENROQUE",
    promotion: "PROMOCIÓN",
  };

  return (
    <section className="overflow-hidden rounded-xl border border-[#59412A] bg-[#241A15] text-[#EADFCF] shadow-xl">
      {/* ENCABEZADO */}
      <div className="border-b border-[#59412A] bg-[#302218] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-bold text-[#E8B84B]">
              🎙 Comentarista IA
            </h2>

            <p className="mb-0 mt-1 text-xs text-[#B6A18A]">
              Narración deportiva en vivo
            </p>
          </div>

          {game.status === "active" && (
            <span className="rounded-full border border-emerald-700/50 bg-emerald-950/50 px-3 py-1 text-xs font-bold text-emerald-400">
              ● EN VIVO
            </span>
          )}
        </div>
      </div>

      {/* CONTROLES DE VOZ */}
      <div className="border-b border-[#493522] bg-[#2B1E17] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="m-0 text-sm font-semibold text-[#F0DFBF]">
              🔊 Narración por voz
            </p>

            <p className="mb-0 mt-1 text-xs text-[#B6A18A]">
              {game.speed === "maximum"
                ? "Sin narración automática en velocidad máxima."
                : voiceEnabled
                  ? "Narración deportiva sin interrupciones."
                  : "La narración automática está desactivada."}
            </p>
          </div>

          <button
            type="button"
            onClick={toggleVoice}
            aria-pressed={voiceEnabled}
            className={
              voiceEnabled
                ? "rounded-lg border border-[#E8B84B] bg-[#E8B84B] px-4 py-2 text-xs font-bold text-[#211712] transition hover:bg-[#F5D782]"
                : "rounded-lg border border-[#75572A] bg-[#362718] px-4 py-2 text-xs font-bold text-[#B6A18A] transition hover:bg-[#49331E]"
            }
          >
            {voiceEnabled ? "● VOZ ON" : "○ VOZ OFF"}
          </button>
        </div>

        {voiceEnabled && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="commentator-voice"
                className="mb-2 block text-xs font-semibold text-[#D9C5A7]"
              >
                Voz del comentarista
              </label>

              <select
                id="commentator-voice"
                value={selectedVoice}
                onChange={(event) =>
                  setSelectedVoice(event.target.value)
                }
                className="w-full rounded-lg border border-[#62492E] bg-[#1B130F] px-3 py-2 text-xs text-[#F0DFBF] outline-none focus:border-[#E8B84B]"
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
                className="mb-2 block text-xs font-semibold text-[#D9C5A7]"
              >
                Ritmo de narración
              </label>

              <select
                id="commentator-speed"
                value={speechRate}
                onChange={(event) =>
                  setSpeechRate(Number(event.target.value))
                }
                className="w-full rounded-lg border border-[#62492E] bg-[#1B130F] px-3 py-2 text-xs text-[#F0DFBF] outline-none focus:border-[#E8B84B]"
              >
                <option value={1}>Tranquila</option>
                <option value={1.15}>Natural</option>
                <option value={1.25}>Dinámica</option>
                <option value={1.4}>Rápida</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* NARRACIÓN ACTUAL */}
      {isSpeaking && currentNarration && (
        <div className="border-b border-[#75572A] bg-[#3A2A1B] p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wide text-[#E8B84B]">
              🔊 Narrando ahora
            </span>

            <button
              type="button"
              onClick={stopSpeaking}
              className="text-xs font-bold text-red-400 hover:underline"
            >
              Detener
            </button>
          </div>

          <p
            aria-live="polite"
            className="m-0 text-sm font-semibold leading-relaxed text-[#F5D782]"
          >
            {currentNarration}
          </p>
        </div>
      )}

      {/* HISTORIAL DE COMENTARIOS */}
      <div className="max-h-80 overflow-y-auto overscroll-contain p-4">
        {comments.length === 0 ? (
          <div className="py-7 text-center">
            <div className="mb-3 text-4xl text-[#E8B84B]">
              ♟
            </div>

            <p className="m-0 font-semibold text-[#F0DFBF]">
              Esperando el primer movimiento
            </p>

            <p className="mb-0 mt-2 text-sm text-[#B6A18A]">
              Los comentarios aparecerán durante la partida.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {comments.map((comment, index) => (
              <article
                key={comment.id}
                className={
                  index === 0
                    ? "rounded-xl border border-[#8A662F] bg-[#382818] p-4"
                    : "rounded-xl border border-[#493522] bg-[#1B130F] p-4"
                }
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-[#B6A18A]">
                    Movimiento {comment.moveNumber}
                  </span>

                  {index === 0 && (
                    <span className="rounded-md bg-[#E8B84B] px-2 py-1 text-[10px] font-bold text-[#211712]">
                      ÚLTIMO
                    </span>
                  )}

                  <span className="rounded-md border border-[#75572A] bg-[#49331E] px-2 py-1 text-[10px] font-semibold text-[#F5D782]">
                    {CATEGORY_LABELS[comment.category]}
                  </span>
                </div>

                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <strong className="text-sm text-[#F0DFBF]">
                    {comment.player}
                  </strong>

                  <code className="rounded-md border border-[#59412A] bg-[#211712] px-3 py-1 text-xs font-bold text-[#E8B84B]">
                    {comment.move}
                  </code>
                </div>

                <p className="m-0 text-sm leading-relaxed text-[#D9C5A7]">
                  {comment.message}
                </p>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => listenManually(comment)}
                    className="rounded-lg border border-[#75572A] bg-[#49331E] px-4 py-2 text-xs font-semibold text-[#F5D782] transition hover:bg-[#624529]"
                  >
                    🔊 Escuchar comentario
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
