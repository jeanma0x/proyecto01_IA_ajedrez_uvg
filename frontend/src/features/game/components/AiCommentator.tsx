
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getMoves,
  requestAiCommentary,
} from "../../../services/api/gameApi";
import type { GameState, Move } from "../../../types/api";

interface AiCommentatorProps {
  game: GameState;
}

type NarratorStyle = "deportivo" | "profesional" | "epico";

type MoveCategory =
  | "normal"
  | "development"
  | "center"
  | "capture"
  | "check"
  | "checkmate"
  | "castle"
  | "promotion"
  | "final"
  | "incident";

type AiStatus = "idle" | "generating" | "success" | "error";

interface Commentary {
  id: number;
  moveNumber: number;
  player: string;
  move: string;
  message: string;
  category: MoveCategory;
  source: "ai" | "local";
}

interface Narration {
  text: string;
  moveNumber: number;
}

const MAX_COMMENTS = 8;
const AI_WAIT_MS = 1500;

const CATEGORY_LABELS: Record<MoveCategory, string> = {
  normal: "JUGADA",
  development: "DESARROLLO",
  center: "CENTRO",
  capture: "CAPTURA",
  check: "JAQUE",
  checkmate: "JAQUE MATE",
  castle: "ENROQUE",
  promotion: "PROMOCIÓN",
  final: "FINAL",
  incident: "INCIDENCIA",
};

const PIECE_NAMES: Record<string, string> = {
  p: "peón",
  n: "caballo",
  b: "alfil",
  r: "torre",
  q: "dama",
  k: "rey",
};

const PHRASES: Record<
  NarratorStyle,
  Record<MoveCategory, string[]>
> = {
  deportivo: {
    normal: [
      "¡Atención! {player} mueve su {piece} hacia {to}.",
      "¡Se mueve el tablero! {player} juega hacia {to}.",
      "¡Aquí viene la respuesta! {player} desplaza su {piece}.",
      "¡Nueva maniobra! El {piece} de {player} llega a {to}.",
      "¡Seguimos en vivo! {player} mueve desde {from} hasta {to}.",
      "¡Qué duelo de inteligencias! {player} continúa la partida.",
      "¡No pierdan de vista el tablero! {player} juega hacia {to}.",
      "¡La batalla continúa! {player} moviliza su {piece}.",
    ],
    development: [
      "¡Entra en acción! {player} desarrolla su {piece}.",
      "¡Las piezas comienzan a movilizarse! {player} juega hacia {to}.",
      "¡Atención al desarrollo! El {piece} de {player} entra en juego.",
      "¡Una nueva pieza sale a escena! {player} desarrolla su {piece}.",
    ],
    center: [
      "¡La batalla por el centro! {player} ocupa {to}.",
      "¡Al corazón del tablero! {player} juega su {piece} hacia {to}.",
      "¡Tenemos acción central! {player} ocupa una casilla clave.",
      "¡El centro recibe otra pieza! {player} juega hacia {to}.",
    ],
    capture: [
      "¡Tenemos captura! {player} se lleva una pieza rival.",
      "¡Cae una pieza! {player} captura en {to}.",
      "¡Atención a esa captura! El {piece} de {player} entra en acción.",
      "¡Una pieza menos sobre el tablero! Captura de {player}.",
      "¡Qué momento! {player} captura con su {piece}.",
      "¡Se produce una captura! {player} llega a {to}.",
    ],
    check: [
      "¡Jaque, jaque! {player} amenaza al rey contrario.",
      "¡Cuidado con el rey! {player} acaba de dar jaque.",
      "¡Se encienden las alarmas! El rey rival está en jaque.",
      "¡Momento de tensión! {player} da jaque.",
      "¡Atención! El rey contrario debe responder al jaque.",
    ],
    checkmate: [
      "¡Jaque mate! ¡Se acabó! ¡Victoria de {player}!",
      "¡No hay escapatoria! ¡{player} gana por jaque mate!",
      "¡Qué desenlace! ¡Jaque mate de {player}!",
      "¡Final del enfrentamiento! ¡{player} consigue el mate!",
    ],
    castle: [
      "¡Y llega el enroque! {player} reubica a su rey.",
      "¡Maniobra clásica! {player} completa el enroque.",
      "¡El monarca cambia de posición! Enroque de {player}.",
    ],
    promotion: [
      "¡Increíble! ¡{player} promociona un peón!",
      "¡El peón llega a la última fila! ¡Promoción de {player}!",
      "¡Tenemos una promoción sobre el tablero!",
    ],
    final: [
      "¡La partida ha terminado!",
      "¡Llegamos al final de este duelo de inteligencias!",
    ],
    incident: [
      "¡Atención! La partida se ha detenido por una incidencia técnica.",
    ],
  },

  profesional: {
    normal: [
      "{player} mueve su {piece} hacia {to}.",
      "{player} desplaza su {piece} desde {from} hasta {to}.",
      "La jugada de {player} sitúa su {piece} en {to}.",
      "El enfrentamiento continúa con un movimiento de {player}.",
    ],
    development: [
      "{player} desarrolla su {piece} hacia {to}.",
      "El {piece} de {player} entra en juego.",
    ],
    center: [
      "{player} ocupa la casilla central {to}.",
      "El {piece} de {player} se sitúa en el centro.",
    ],
    capture: [
      "{player} captura una pieza rival en {to}.",
      "Se registra una captura de {player}.",
    ],
    check: [
      "{player} da jaque al rey contrario.",
      "El rey rival se encuentra en jaque.",
    ],
    checkmate: [
      "Jaque mate. {player} gana la partida.",
      "{player} consigue el jaque mate definitivo.",
    ],
    castle: [
      "{player} realiza el enroque.",
      "El rey de {player} cambia de posición mediante el enroque.",
    ],
    promotion: [
      "{player} promociona un peón.",
      "Un peón de {player} alcanza la última fila.",
    ],
    final: [
      "La partida ha concluido.",
    ],
    incident: [
      "La partida se ha detenido por una incidencia técnica.",
    ],
  },

  epico: {
    normal: [
      "¡La batalla continúa! {player} mueve su {piece} hacia {to}.",
      "¡Una nueva maniobra sacude el tablero!",
      "¡{player} desplaza su {piece} y continúa la contienda!",
      "¡Otro capítulo de este duelo! {player} juega hacia {to}.",
    ],
    development: [
      "¡Una nueva pieza entra en escena! {player} desarrolla su {piece}.",
      "¡Las fuerzas de {player} comienzan a movilizarse!",
    ],
    center: [
      "¡La batalla por el corazón del tablero! {player} ocupa {to}.",
      "¡{player} lleva su {piece} al centro del enfrentamiento!",
    ],
    capture: [
      "¡Una pieza cae en el campo de batalla! ¡Captura de {player}!",
      "¡El {piece} de {player} elimina una pieza rival!",
      "¡La contienda se cobra otra pieza! Captura en {to}.",
    ],
    check: [
      "¡El rey está en peligro! ¡Jaque de {player}!",
      "¡Las alarmas resuenan sobre el tablero! ¡Jaque!",
    ],
    checkmate: [
      "¡Jaque mate! ¡La batalla ha terminado! ¡Victoria de {player}!",
      "¡El desenlace ha llegado! ¡{player} consigue el mate!",
    ],
    castle: [
      "¡El monarca se reubica! ¡Enroque de {player}!",
      "¡Las defensas se reorganizan mediante el enroque!",
    ],
    promotion: [
      "¡Un humilde peón alcanza su destino! ¡Promoción de {player}!",
      "¡Una nueva pieza nace sobre el tablero!",
    ],
    final: [
      "¡La contienda ha llegado a su final!",
    ],
    incident: [
      "¡Una incidencia técnica detiene la batalla!",
    ],
  },
};

function getPieceName(move?: Move): string {
  if (!move) return "pieza";

  if (/^N/.test(move.san)) return "caballo";
  if (/^B/.test(move.san)) return "alfil";
  if (/^R/.test(move.san)) return "torre";
  if (/^Q/.test(move.san)) return "dama";
  if (/^K/.test(move.san)) return "rey";

  return PIECE_NAMES[move.piece.toLowerCase()] ?? "peón";
}

function getMoveCategory(
  move: Move | undefined,
  game: GameState,
): MoveCategory {
  if (game.status === "incident") return "incident";

  if (move) {
    const san = move.san;

    if (san.includes("#")) return "checkmate";
    if (san.includes("+")) return "check";
    if (/^O-O(-O)?/.test(san)) return "castle";
    if (san.includes("=")) return "promotion";
    if (san.includes("x")) return "capture";
  }

  if (game.reason === "checkmate") return "checkmate";
  if (game.status === "finished") return "final";
  if (!move) return "normal";

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

function createLocalComment(
  game: GameState,
  move: Move | undefined,
  style: NarratorStyle,
  recent: string[],
  previousMove: number,
): Commentary {
  const player =
    game.turn === "black"
      ? game.white.participant.displayName
      : game.black.participant.displayName;

  const category = getMoveCategory(move, game);
  const piece = getPieceName(move);
  const from = game.lastMove?.from ?? "";
  const to = game.lastMove?.to ?? "";

  const options = PHRASES[style][category];
  const available = options.filter((item) => !recent.includes(item));
  const pool = available.length ? available : options;

  const template = pool[Math.floor(Math.random() * pool.length)];

  recent.push(template);
  if (recent.length > 15) recent.shift();

  let message = template
    .replaceAll("{player}", player)
    .replaceAll("{piece}", piece)
    .replaceAll("{from}", from)
    .replaceAll("{to}", to);

  const gap = game.moveCount - previousMove;

  if (
    gap >= 3 &&
    category !== "checkmate" &&
    category !== "incident"
  ) {
    message =
      style === "profesional"
        ? `Desde la última narración se realizaron ${gap} movimientos. ${message}`
        : `¡Qué ritmo lleva esta partida! Tras ${gap} movimientos, ${message}`;
  }

  return {
    id: game.moveCount,
    moveNumber: game.moveCount,
    player,
    move: game.lastMove ? `${from} → ${to}` : "Final",
    message,
    category,
    source: "local",
  };
}

export function AiCommentator({ game }: AiCommentatorProps) {
  const [comments, setComments] = useState<Commentary[]>([]);
  const [narratorStyle, setNarratorStyle] =
    useState<NarratorStyle>("deportivo");

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [speechRate, setSpeechRate] = useState(1.25);

  const [currentNarration, setCurrentNarration] =
    useState<Narration | null>(null);

  const [aiStatus, setAiStatus] = useState<AiStatus>("idle");

  const latestGameRef = useRef(game);
  const commentsRef = useRef<Commentary[]>([]);
  const movesRef = useRef<Move[]>([]);

  const gameIdRef = useRef(game.id);
  const lastHandledMoveRef = useRef(game.moveCount);
  const lastNarratedMoveRef = useRef(game.moveCount);

  const recentExpressionsRef = useRef<string[]>([]);

  const voiceEnabledRef = useRef(voiceEnabled);
  const narratorStyleRef = useRef(narratorStyle);

  const voiceSettingsRef = useRef({
    voices,
    selectedVoice,
    speechRate,
  });

  const speakingRef = useRef(false);
  const preparingRef = useRef(false);
  const mountedRef = useRef(false);
  const sessionRef = useRef(0);

  const activeUtteranceRef =
    useRef<SpeechSynthesisUtterance | null>(null);

  const playLatestRef = useRef<() => void>(() => {});

  // Mantiene una sola solicitud activa.
  const aiBusyRef = useRef(false);

  useEffect(() => {
    latestGameRef.current = game;
  }, [game]);

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  useEffect(() => {
    narratorStyleRef.current = narratorStyle;
  }, [narratorStyle]);

  useEffect(() => {
    voiceSettingsRef.current = {
      voices,
      selectedVoice,
      speechRate,
    };
  }, [voices, selectedVoice, speechRate]);

  const saveComment = useCallback((comment: Commentary) => {
    const updated = [
      comment,
      ...commentsRef.current.filter(
        (item) => item.moveNumber !== comment.moveNumber,
      ),
    ]
      .sort((a, b) => b.moveNumber - a.moveNumber)
      .slice(0, MAX_COMMENTS);

    commentsRef.current = updated;
    setComments(updated);
  }, []);

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

    setCurrentNarration(null);
  }, []);

  const speakText = useCallback(
    (comment: Commentary, automatic = true) => {
      if (!mountedRef.current || speakingRef.current) return;
      if (!("speechSynthesis" in window)) return;

      speakingRef.current = true;
      const session = sessionRef.current;

      const utterance =
        new SpeechSynthesisUtterance(comment.message);

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

      const exciting = [
        "capture",
        "check",
        "checkmate",
        "promotion",
      ].includes(comment.category);

      utterance.pitch = exciting ? 1.15 : 1.05;
      utterance.volume = 1;

      lastNarratedMoveRef.current = Math.max(
        lastNarratedMoveRef.current,
        comment.moveNumber,
      );

      setCurrentNarration({
        text: comment.message,
        moveNumber: comment.moveNumber,
      });

      let completed = false;

      const finish = () => {
        if (completed || session !== sessionRef.current) return;

        completed = true;
        speakingRef.current = false;
        activeUtteranceRef.current = null;

        if (!mountedRef.current) return;

        setCurrentNarration(null);

        if (automatic) {
          playLatestRef.current();
        }
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
    if (!mountedRef.current) return;
    if (speakingRef.current || preparingRef.current) return;
    if (!voiceEnabledRef.current) return;

    const latest = latestGameRef.current;

    if (latest.speed === "maximum") return;
    if (latest.moveCount <= lastNarratedMoveRef.current) return;
    if (!latest.lastMove) return;

    preparingRef.current = true;

    const session = sessionRef.current;
    const gameId = latest.id;
    const moveNumber = latest.moveCount;

    const prepare = async () => {
      let latestMove: Move | undefined;

      try {
        const moves = await getMoves(gameId);

        if (
          !mountedRef.current ||
          session !== sessionRef.current ||
          gameIdRef.current !== gameId
        ) {
          return;
        }

        movesRef.current = moves;
        latestMove = moves.find(
          (move) => move.ply === moveNumber,
        );
      } catch (error) {
        console.warn(
          "[AiCommentator] No se pudo cargar el movimiento:",
          error,
        );
      }

      if (
        !mountedRef.current ||
        session !== sessionRef.current ||
        gameIdRef.current !== gameId
      ) {
        return;
      }

      const localComment = createLocalComment(
        latest,
        latestMove,
        narratorStyleRef.current,
        recentExpressionsRef.current,
        lastNarratedMoveRef.current,
      );

      let finalComment = localComment;

      // Si Groq ya está ocupado, usar respaldo local.
      if (!aiBusyRef.current) {
        aiBusyRef.current = true;
        setAiStatus("generating");

        try {
          const aiPromise = requestAiCommentary(gameId, {
            fen: latest.fen,
            moveNumber,
            lastMove: {
              from: latest.lastMove!.from,
              to: latest.lastMove!.to,
            },
          });

          // No se envía otra solicitud hasta que
          // la anterior haya terminado realmente.
          const outcome = await Promise.race([
            aiPromise.then(
              (response) => ({
                kind: "success" as const,
                response,
              }),
              (error: unknown) => ({
                kind: "error" as const,
                error,
              }),
            ),
            new Promise<{ kind: "timeout" }>((resolve) => {
              window.setTimeout(
                () => resolve({ kind: "timeout" }),
                AI_WAIT_MS,
              );
            }),
          ]);

          if (
            !mountedRef.current ||
            session !== sessionRef.current ||
            gameIdRef.current !== gameId
          ) {
            return;
          }

          if (outcome.kind === "success") {
            const text = outcome.response.commentary?.trim();

            if (text) {
              finalComment = {
                ...localComment,
                message: text,
                source: "ai",
              };
              setAiStatus("success");
            } else {
              setAiStatus("error");
            }
          } else if (outcome.kind === "error") {
            console.warn(
              "[AiCommentator] Groq no disponible:",
              outcome.error,
            );
            setAiStatus("error");
          } else {
            // La respuesta tardía se descarta.
            // La petición sigue ocupando la conexión
            // hasta que termina realmente.
            setAiStatus("idle");
          }

          void aiPromise
            .catch(() => undefined)
            .finally(() => {
              aiBusyRef.current = false;
            });
        } catch (error) {
          aiBusyRef.current = false;
          setAiStatus("error");
          console.warn("[AiCommentator] Error:", error);
        }
      }

      if (
        !mountedRef.current ||
        session !== sessionRef.current ||
        gameIdRef.current !== gameId
      ) {
        return;
      }

      // Solo narrar la posición más reciente.
      if (latestGameRef.current.moveCount !== moveNumber) {
        return;
      }

      // Guardar una única tarjeta.
      saveComment(finalComment);

      // Reproducir exactamente el mismo texto.
      speakText(finalComment);
    };

    void prepare().finally(() => {
      preparingRef.current = false;

      if (
        mountedRef.current &&
        session === sessionRef.current &&
        !speakingRef.current
      ) {
        // Evita dejar sin narrar una jugada nueva.
        if (
          latestGameRef.current.moveCount >
          lastNarratedMoveRef.current
        ) {
          window.setTimeout(() => {
            playLatestRef.current();
          }, 0);
        }
      }
    });
  }, [saveComment, speakText]);

  useEffect(() => {
    playLatestRef.current = playLatest;
  }, [playLatest]);

  // Montaje y limpieza.
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      sessionRef.current += 1;

      if (activeUtteranceRef.current) {
        activeUtteranceRef.current.onend = null;
        activeUtteranceRef.current.onerror = null;
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

  // Reiniciar al cambiar de partida.
  useEffect(() => {
    if (gameIdRef.current === game.id) return;

    gameIdRef.current = game.id;

    stopSpeaking();

    commentsRef.current = [];
    movesRef.current = [];
    recentExpressionsRef.current = [];

    lastHandledMoveRef.current = game.moveCount;
    lastNarratedMoveRef.current = game.moveCount;

    setComments([]);
    setAiStatus("idle");
  }, [game.id, game.moveCount, stopSpeaking]);

  // Detectar nuevas jugadas.
  useEffect(() => {
    if (game.moveCount <= lastHandledMoveRef.current) {
      lastHandledMoveRef.current = game.moveCount;
      return;
    }

    lastHandledMoveRef.current = game.moveCount;

    if (!game.lastMove) return;
    if (!voiceEnabledRef.current) return;

    playLatest();
  }, [game, playLatest]);

  function toggleVoice() {
    const next = !voiceEnabled;

    voiceEnabledRef.current = next;
    setVoiceEnabled(next);

    if (!next) {
      stopSpeaking();
      lastNarratedMoveRef.current =
        latestGameRef.current.moveCount;
    } else {
      lastNarratedMoveRef.current =
        latestGameRef.current.moveCount;
    }
  }

  function listenManually(comment: Commentary) {
    stopSpeaking();
    speakText(comment, false);
  }

  const spanishVoices = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith("es"),
  );

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

      {/* ESTADO DEL MOTOR */}
      <div className="border-b border-[#493522] bg-[#241A15] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="m-0 text-xs font-bold text-[#E8B84B]">
              ✨ Motor de comentarios Groq
            </p>

            <p className="mb-0 mt-1 text-xs text-[#B6A18A]">
              {aiStatus === "generating"
                ? "Preparando narración con IA..."
                : aiStatus === "success"
                  ? "Último comentario generado por IA."
                  : aiStatus === "error"
                    ? "IA no disponible. Narración local activa."
                    : "Motor preparado para la siguiente jugada."}
            </p>
          </div>

          <span
            className={
              aiStatus === "success"
                ? "rounded-full border border-emerald-700 bg-emerald-950/50 px-3 py-1 text-xs font-bold text-emerald-400"
                : aiStatus === "generating"
                  ? "rounded-full border border-blue-700 bg-blue-950/50 px-3 py-1 text-xs font-bold text-blue-300"
                  : aiStatus === "error"
                    ? "rounded-full border border-amber-700 bg-amber-950/50 px-3 py-1 text-xs font-bold text-amber-300"
                    : "rounded-full border border-[#75572A] bg-[#362718] px-3 py-1 text-xs font-bold text-[#F5D782]"
            }
          >
            {aiStatus === "success"
              ? "✓ IA ACTIVA"
              : aiStatus === "generating"
                ? "◌ GENERANDO"
                : aiStatus === "error"
                  ? "RESPALDO LOCAL"
                  : "EN ESPERA"}
          </span>
        </div>
      </div>

      {/* CONTROLES */}
      <div className="border-b border-[#493522] bg-[#2B1E17] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="m-0 text-sm font-semibold text-[#F0DFBF]">
              🔊 Narración por voz
            </p>

            <p className="mb-0 mt-1 text-xs text-[#B6A18A]">
              {game.speed === "maximum"
                ? "Narración automática desactivada en velocidad máxima."
                : voiceEnabled
                  ? "Groq prioritario. Voz y texto sincronizados."
                  : "Narración automática desactivada."}
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

        <div className="mt-4">
          <label
            htmlFor="narrator-style"
            className="mb-2 block text-xs font-semibold text-[#D9C5A7]"
          >
            Personalidad del narrador
          </label>

          <select
            id="narrator-style"
            value={narratorStyle}
            onChange={(event) =>
              setNarratorStyle(event.target.value as NarratorStyle)
            }
            className="w-full rounded-lg border border-[#62492E] bg-[#1B130F] px-3 py-2 text-xs text-[#F0DFBF]"
          >
            <option value="deportivo">
              ⚽ Deportivo — Emocionante
            </option>
            <option value="profesional">
              ♟ Profesional — Analítico
            </option>
            <option value="epico">
              🔥 Épico — Dramático
            </option>
          </select>
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
                className="w-full rounded-lg border border-[#62492E] bg-[#1B130F] px-3 py-2 text-xs text-[#F0DFBF]"
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
                className="w-full rounded-lg border border-[#62492E] bg-[#1B130F] px-3 py-2 text-xs text-[#F0DFBF]"
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
      {currentNarration && (
        <div className="border-b border-[#75572A] bg-[#3A2A1B] p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wide text-[#E8B84B]">
              🔊 Narrando ahora · Movimiento{" "}
              {currentNarration.moveNumber}
            </span>

            <button
              type="button"
              onClick={stopSpeaking}
              className="text-xs font-bold text-red-400 hover:underline"
            >
              Detener
            </button>
          </div>

          <p className="m-0 text-sm font-semibold leading-relaxed text-[#F5D782]">
            {currentNarration.text}
          </p>
        </div>
      )}

      {/* HISTORIAL ÚNICO */}
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

                  {comment.source === "ai" && (
                    <span className="rounded-md border border-purple-500/40 bg-purple-950/40 px-2 py-1 text-[10px] font-bold text-purple-300">
                      ✨ IA
                    </span>
                  )}
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
