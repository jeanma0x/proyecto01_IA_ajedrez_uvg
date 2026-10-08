
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
  aiAnalysis?: string;
  category: MoveCategory;
}

interface Narration {
  text: string;
  moveNumber: number;
  category: MoveCategory;
}

interface PendingAiRequest {
  gameId: string;
  moveNumber: number;
  fen: string;
  from: string;
  to: string;
  category: MoveCategory;
}

const MAX_COMMENTS = 8;

const NOTABLE_CATEGORIES: MoveCategory[] = [
  "capture",
  "check",
  "checkmate",
  "castle",
  "promotion",
];

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

const INTROS: Record<NarratorStyle, string[]> = {
  deportivo: [
    "¡Atención, señoras y señores!",
    "¡Se mueve el tablero!",
    "¡Ojo con esta jugada!",
    "¡Tenemos acción!",
    "¡Qué duelo de inteligencias!",
    "¡La emoción continúa!",
    "¡Esto se pone interesante!",
    "¡Ahí viene la respuesta!",
    "¡No pierdan de vista el tablero!",
    "¡Seguimos en vivo!",
    "¡Nueva decisión sobre el tablero!",
    "¡Qué ritmo llevan estos modelos!",
    "¡La batalla continúa!",
    "¡El enfrentamiento sigue!",
    "¡Aquí viene otra jugada!",
    "¡Se enciende la partida!",
    "¡Qué intensidad!",
    "¡Vamos con la siguiente!",
    "¡Esto no se detiene!",
    "¡Continúa el espectáculo!",
  ],
  profesional: [
    "Observemos esta jugada.",
    "Analicemos el movimiento.",
    "La posición continúa evolucionando.",
    "Tenemos una nueva decisión.",
    "Veamos el desarrollo de la partida.",
    "El enfrentamiento avanza.",
    "Continuamos con el análisis.",
    "La posición presenta una nueva disposición.",
    "Observemos el tablero.",
    "El juego sigue su curso.",
  ],
  epico: [
    "¡La batalla de las inteligencias continúa!",
    "¡El tablero vuelve a cobrar vida!",
    "¡Un nuevo capítulo comienza!",
    "¡Las piezas entran en acción!",
    "¡La contienda sigue su marcha!",
    "¡El destino de la partida continúa abierto!",
    "¡Una nueva maniobra sacude el tablero!",
    "¡La historia de este duelo sigue escribiéndose!",
    "¡El campo de batalla está preparado!",
    "¡Cada movimiento forma parte de esta batalla!",
  ],
};

const REACTIONS: Record<NarratorStyle, string[]> = {
  deportivo: [
    "¡Veremos cómo responde su rival!",
    "¡Esto promete!",
    "¡Seguimos atentos!",
    "¡Qué duelo estamos viendo!",
    "¡La acción continúa!",
    "¡Todavía queda mucho ajedrez!",
    "¡Vamos con la respuesta!",
    "¡El siguiente movimiento será interesante!",
    "¡No se despeguen del tablero!",
    "¡Menudo enfrentamiento!",
    "¡Qué intensidad!",
    "¡La partida sigue abierta!",
  ],
  profesional: [
    "La respuesta del rival será importante.",
    "Habrá que observar la continuación.",
    "La posición todavía admite distintas posibilidades.",
    "El siguiente turno ofrecerá más información.",
    "Continuaremos analizando la posición.",
    "La partida sigue en desarrollo.",
  ],
  epico: [
    "¡La batalla todavía tiene mucho por contar!",
    "¡El rival prepara su respuesta!",
    "¡El desenlace aún no está escrito!",
    "¡La contienda sigue abierta!",
    "¡Las piezas esperan el siguiente movimiento!",
    "¡El enfrentamiento continúa!",
  ],
};

const PHRASES: Record<
  NarratorStyle,
  Record<MoveCategory, string[]>
> = {
  deportivo: {
    normal: [
      "{player} mueve su {piece} hacia {to}.",
      "El {piece} de {player} llega a {to}.",
      "{player} lleva su {piece} desde {from} hasta {to}.",
      "Nueva maniobra de {player} con su {piece}.",
      "{player} elige la casilla {to}.",
      "El {piece} cambia de posición.",
      "{player} continúa con una jugada hacia {to}.",
      "Tenemos movimiento de {player}.",
      "El {piece} se desplaza hacia {to}.",
      "{player} ejecuta otra maniobra sobre el tablero.",
    ],
    development: [
      "{player} desarrolla su {piece} hacia {to}.",
      "¡El {piece} de {player} entra en acción!",
      "{player} moviliza una nueva pieza.",
      "¡Continúa el desarrollo de {player}!",
      "El {piece} abandona su casilla inicial.",
      "{player} incorpora su {piece} al enfrentamiento.",
      "¡Las piezas comienzan a movilizarse!",
      "{player} continúa organizando su posición.",
    ],
    center: [
      "¡{player} ocupa la casilla central {to}!",
      "¡El {piece} llega al corazón del tablero!",
      "{player} disputa espacio en el centro.",
      "¡La batalla por el centro continúa!",
      "{player} instala su {piece} en {to}.",
      "¡Tenemos acción en las casillas centrales!",
      "El centro recibe una nueva pieza de {player}.",
    ],
    capture: [
      "¡Tenemos captura! {player} se lleva una pieza rival.",
      "¡Cae una pieza! {player} captura en {to}.",
      "¡Atención a esa captura!",
      "¡Una pieza menos sobre el tablero!",
      "¡{player} ejecuta una captura con su {piece}!",
      "¡Qué momento! Una pieza rival acaba de caer.",
      "¡El {piece} de {player} captura en {to}!",
      "¡La batalla se cobra otra pieza!",
      "¡Tenemos un enfrentamiento directo!",
      "¡{player} retira una pieza contraria!",
    ],
    check: [
      "¡Jaque! {player} amenaza al rey rival.",
      "¡Cuidado con el rey! Tenemos jaque.",
      "¡Se encienden las alarmas!",
      "¡{player} pone al monarca contrario en jaque!",
      "¡El rey necesita una respuesta inmediata!",
      "¡Momento de máxima tensión!",
      "¡Tenemos jaque sobre el tablero!",
      "¡El rey rival está amenazado!",
    ],
    checkmate: [
      "¡Jaque mate! ¡{player} gana el enfrentamiento!",
      "¡Se acabó, se acabó! ¡Victoria de {player}!",
      "¡No hay escapatoria! ¡Jaque mate!",
      "¡Qué final de partida!",
      "¡El tablero tiene vencedor! ¡{player}!",
      "¡Impresionante desenlace! ¡Jaque mate!",
    ],
    castle: [
      "¡Y llega el enroque de {player}!",
      "¡Maniobra clásica! {player} realiza el enroque.",
      "¡El rey cambia de posición!",
      "¡{player} completa una maniobra defensiva!",
      "¡Atención! Tenemos enroque.",
      "¡El monarca se reubica sobre el tablero!",
    ],
    promotion: [
      "¡Increíble! ¡{player} promociona un peón!",
      "¡El peón llega hasta el final!",
      "¡Tenemos promoción sobre el tablero!",
      "¡Una nueva pieza entra en juego!",
      "¡Qué momento para {player}!",
      "¡El peón alcanza su última fila!",
    ],
    final: [
      "¡La partida ha terminado!",
      "¡Llegamos al final del enfrentamiento!",
      "¡Se acabó este duelo de inteligencias!",
    ],
    incident: [
      "¡Atención! La partida se detuvo por una incidencia técnica.",
      "¡Tenemos una interrupción técnica!",
      "¡El enfrentamiento ha quedado detenido!",
    ],
  },
  profesional: {
    normal: [
      "{player} desplaza su {piece} hacia {to}.",
      "El {piece} cambia de casilla.",
      "{player} continúa con su {piece} hacia {to}.",
      "La nueva posición del {piece} es {to}.",
      "{player} realiza una jugada desde {from}.",
    ],
    development: [
      "{player} desarrolla su {piece}.",
      "El {piece} abandona su posición inicial.",
      "{player} continúa movilizando sus piezas.",
      "La jugada contribuye al desarrollo.",
    ],
    center: [
      "{player} ocupa una casilla central.",
      "El {piece} se sitúa en {to}.",
      "{player} disputa el centro.",
      "La jugada se concentra en una casilla central.",
    ],
    capture: [
      "{player} captura una pieza rival.",
      "Se registra una captura en {to}.",
      "El {piece} realiza una captura.",
      "Una pieza contraria es retirada del tablero.",
    ],
    check: [
      "{player} da jaque al rey contrario.",
      "El rey rival se encuentra en jaque.",
      "La jugada produce una amenaza directa al rey.",
      "El oponente deberá resolver el jaque.",
    ],
    checkmate: [
      "Jaque mate. {player} gana la partida.",
      "La posición termina en jaque mate.",
      "{player} consigue la victoria definitiva.",
    ],
    castle: [
      "{player} realiza el enroque.",
      "El rey cambia de posición mediante el enroque.",
      "Se completa una maniobra de enroque.",
    ],
    promotion: [
      "{player} promociona un peón.",
      "Un peón alcanza la última fila.",
      "La jugada produce una promoción.",
    ],
    final: [
      "La partida ha concluido.",
      "El enfrentamiento llega a su final.",
    ],
    incident: [
      "La partida se detuvo por una incidencia técnica.",
      "Se ha registrado una interrupción del servicio.",
    ],
  },
  epico: {
    normal: [
      "¡{player} mueve su {piece} hacia {to}!",
      "¡Una nueva maniobra sacude el tablero!",
      "¡El {piece} entra en una nueva posición!",
      "¡La batalla continúa con {player}!",
      "¡Otra decisión se escribe en esta contienda!",
    ],
    development: [
      "¡El {piece} de {player} entra en escena!",
      "¡Las fuerzas de {player} comienzan a movilizarse!",
      "¡Una nueva pieza entra en el campo de batalla!",
      "¡El desarrollo continúa!",
    ],
    center: [
      "¡{player} ocupa el corazón del tablero!",
      "¡La batalla por el centro continúa!",
      "¡El {piece} llega a la casilla central {to}!",
      "¡El centro recibe una nueva maniobra!",
    ],
    capture: [
      "¡Una pieza cae en el campo de batalla!",
      "¡{player} ejecuta una captura!",
      "¡El enfrentamiento se cobra otra pieza!",
      "¡Una captura marca este nuevo capítulo!",
      "¡El {piece} de {player} elimina una pieza rival!",
    ],
    check: [
      "¡El rey está en peligro! ¡Jaque!",
      "¡Las alarmas resuenan sobre el tablero!",
      "¡{player} amenaza al monarca rival!",
      "¡El rey necesita encontrar una salida!",
    ],
    checkmate: [
      "¡Jaque mate! ¡La batalla ha terminado!",
      "¡{player} conquista la victoria!",
      "¡No queda escapatoria! ¡Tenemos vencedor!",
      "¡El desenlace definitivo ha llegado!",
    ],
    castle: [
      "¡El monarca se reubica!",
      "¡{player} reorganiza sus defensas!",
      "¡Una maniobra de enroque cambia la posición!",
    ],
    promotion: [
      "¡Un humilde peón alcanza su destino!",
      "¡Una nueva pieza nace sobre el tablero!",
      "¡{player} completa una promoción!",
    ],
    final: [
      "¡La contienda ha llegado a su final!",
      "¡El último capítulo ha concluido!",
    ],
    incident: [
      "¡Una incidencia técnica detiene la batalla!",
      "¡El duelo queda interrumpido!",
    ],
  },
};

function getLastPlayer(game: GameState): string {
  return game.turn === "black"
    ? game.white.participant.displayName
    : game.black.participant.displayName;
}

function getPieceName(move?: Move): string {
  if (!move) return "pieza";

  const san = move.san;

  if (/^N/.test(san)) return "caballo";
  if (/^B/.test(san)) return "alfil";
  if (/^R/.test(san)) return "torre";
  if (/^Q/.test(san)) return "dama";
  if (/^K/.test(san)) return "rey";

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

function chooseExpression(
  options: string[],
  recent: string[],
): string {
  const available = options.filter(
    (option) => !recent.includes(option),
  );

  const pool = available.length > 0 ? available : options;
  const selected = pool[Math.floor(Math.random() * pool.length)];

  recent.push(selected);

  if (recent.length > 15) recent.shift();

  return selected;
}

function createCommentary(
  game: GameState,
  move: Move | undefined,
  style: NarratorStyle,
  recent: string[],
  previousNarratedMove: number,
): Commentary {
  const category = getMoveCategory(move, game);
  const player = getLastPlayer(game);
  const piece = getPieceName(move);
  const from = game.lastMove?.from ?? "";
  const to = game.lastMove?.to ?? "";

  const gap = Math.max(
    1,
    game.moveCount - previousNarratedMove,
  );

  const template = chooseExpression(
    PHRASES[style][category],
    recent,
  );

  let message = template
    .replaceAll("{player}", player)
    .replaceAll("{piece}", piece)
    .replaceAll("{from}", from)
    .replaceAll("{to}", to);

  if (
    gap >= 3 &&
    !NOTABLE_CATEGORIES.includes(category) &&
    category !== "final" &&
    category !== "incident"
  ) {
    message =
      style === "profesional"
        ? `Desde la última narración se realizaron ${gap} movimientos. ${player} acaba de mover su ${piece} hacia ${to}.`
        : `¡Qué ritmo lleva esta partida! Tras ${gap} movimientos, ${player} acaba de jugar hacia ${to}.`;
  } else if (
    category !== "final" &&
    category !== "incident" &&
    category !== "checkmate"
  ) {
    if (game.moveCount % 4 === 0) {
      const intro = chooseExpression(
        INTROS[style],
        recent,
      );
      message = `${intro} ${message}`;
    } else if (game.moveCount % 5 === 0) {
      const reaction = chooseExpression(
        REACTIONS[style],
        recent,
      );
      message = `${message} ${reaction}`;
    }
  }

  return {
    id: game.moveCount,
    moveNumber: game.moveCount,
    player,
    move: game.lastMove ? `${from} → ${to}` : "Final",
    message,
    category,
  };
}

export function AiCommentator({ game }: AiCommentatorProps) {
  const [comments, setComments] = useState<Commentary[]>([]);
  const [moves, setMoves] = useState<Move[]>([]);

  const [narratorStyle, setNarratorStyle] =
    useState<NarratorStyle>("deportivo");

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [currentNarration, setCurrentNarration] =
    useState<Narration | null>(null);

  const [voices, setVoices] =
    useState<SpeechSynthesisVoice[]>([]);

  const [selectedVoice, setSelectedVoice] = useState("");
  const [speechRate, setSpeechRate] = useState(1.25);

  const [aiStatus, setAiStatus] = useState<AiStatus>("idle");
  const [aiStatusMove, setAiStatusMove] = useState<number | null>(null);

  const latestGameRef = useRef(game);
  const movesRef = useRef(moves);
  const commentsRef = useRef<Commentary[]>([]);

  const previousMoveCountRef = useRef(game.moveCount);
  const lastNarratedMoveRef = useRef(game.moveCount);

  const recentExpressionsRef = useRef<string[]>([]);
  const requestedAiMovesRef = useRef(new Set<number>());

  const speakingRef = useRef(false);
  const mountedRef = useRef(false);
  const sessionRef = useRef(0);
  const gameIdRef = useRef(game.id);

  const activeUtteranceRef =
    useRef<SpeechSynthesisUtterance | null>(null);

  const voiceEnabledRef = useRef(voiceEnabled);
  const narratorStyleRef = useRef(narratorStyle);

  const voiceSettingsRef = useRef({
    voices,
    selectedVoice,
    speechRate,
  });

  const playLatestRef = useRef<() => void>(() => {});

  const aiBusyRef = useRef(false);

  const pendingAiRequestRef =
    useRef<PendingAiRequest | null>(null);

  const aiRequestVersionRef = useRef(0);

  const activeAiPromiseRef =
    useRef<Promise<void> | null>(null);

  useEffect(() => {
    latestGameRef.current = game;
  }, [game]);

  useEffect(() => {
    movesRef.current = moves;
  }, [moves]);

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

      const isExciting = NOTABLE_CATEGORIES.includes(
        comment.category,
      );

      utterance.pitch = isExciting ? 1.15 : 1.05;
      utterance.volume = 1;

      // Registrar el movimiento realmente narrado.
      lastNarratedMoveRef.current = comment.moveNumber;

      setCurrentNarration({
        text: comment.message,
        moveNumber: comment.moveNumber,
        category: comment.category,
      });

      setIsSpeaking(true);

      let completed = false;

      const finish = () => {
        if (completed || session !== sessionRef.current) return;

        completed = true;
        speakingRef.current = false;
        activeUtteranceRef.current = null;

        if (!mountedRef.current) return;

        setIsSpeaking(false);
        setCurrentNarration(null);

        // Al terminar, saltar a la última jugada disponible.
        if (automatic) playLatestRef.current();
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

    // Utilizar exactamente el comentario de la tarjeta.
    const existingComment = commentsRef.current.find(
      (comment) => comment.moveNumber === latest.moveCount,
    );

    if (existingComment) {
      speakText(existingComment);
      return;
    }

    // Si todavía no hay comentario, esperar al efecto
    // que lo crea, en lugar de generar otra frase aleatoria.
  }, [speakText]);

  useEffect(() => {
    playLatestRef.current = playLatest;
  }, [playLatest]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      sessionRef.current += 1;
      speakingRef.current = false;
      aiRequestVersionRef.current += 1;
      pendingAiRequestRef.current = null;

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

  // ==========================================
  // COLA DE GROQ
  // ==========================================

  const processAiRequest = useCallback(
    (request: PendingAiRequest) => {
      if (aiBusyRef.current) {
        pendingAiRequestRef.current = request;
        return;
      }

      aiBusyRef.current = true;

      const version = aiRequestVersionRef.current;

      const processQueue = async () => {
        let currentRequest: PendingAiRequest | null = request;

        try {
          while (
            currentRequest &&
            mountedRef.current &&
            version === aiRequestVersionRef.current
          ) {
            const activeRequest: PendingAiRequest = currentRequest;

            if (activeRequest.gameId !== gameIdRef.current) {
              break;
            }

            setAiStatus("generating");
            setAiStatusMove(activeRequest.moveNumber);

            try {
              // Esperar el HTTP real para evitar solicitudes
              // simultáneas. El backend controla sus tiempos.
              const response = await requestAiCommentary(
                activeRequest.gameId,
                {
                  fen: activeRequest.fen,
                  moveNumber: activeRequest.moveNumber,
                  lastMove: {
                    from: activeRequest.from,
                    to: activeRequest.to,
                  },
                },
              );

              if (
                !mountedRef.current ||
                version !== aiRequestVersionRef.current ||
                activeRequest.gameId !== gameIdRef.current
              ) {
                break;
              }

              const text = response.commentary?.trim();

              if (!text) {
                throw new Error(
                  "Groq devolvió un comentario vacío.",
                );
              }

              // Groq nunca reemplaza la narración local.
              setComments((current) =>
                current.map((comment) =>
                  comment.moveNumber === activeRequest.moveNumber
                    ? {
                        ...comment,
                        aiAnalysis: text,
                        category: activeRequest.category,
                      }
                    : comment,
                ),
              );

              setAiStatus("success");
              setAiStatusMove(activeRequest.moveNumber);
            } catch (error) {
              if (
                !mountedRef.current ||
                version !== aiRequestVersionRef.current
              ) {
                break;
              }

              console.warn(
                "[AiCommentator] Groq no disponible:",
                error,
              );

              setAiStatus("error");
              setAiStatusMove(activeRequest.moveNumber);
            }

            currentRequest = pendingAiRequestRef.current;
            pendingAiRequestRef.current = null;
          }
        } finally {
          aiBusyRef.current = false;
          activeAiPromiseRef.current = null;
        }
      };

      const operation = processQueue();
      activeAiPromiseRef.current = operation;
      void operation;
    },
    [],
  );

  // ==========================================
  // CAMBIO DE PARTIDA
  // ==========================================

  useEffect(() => {
    if (gameIdRef.current === game.id) return;

    gameIdRef.current = game.id;
    stopSpeaking();

    previousMoveCountRef.current = game.moveCount;
    lastNarratedMoveRef.current = game.moveCount;

    recentExpressionsRef.current = [];
    requestedAiMovesRef.current.clear();

    aiRequestVersionRef.current += 1;
    pendingAiRequestRef.current = null;

    commentsRef.current = [];

    setComments([]);
    setMoves([]);
    setAiStatus("idle");
    setAiStatusMove(null);
  }, [game.id, game.moveCount, stopSpeaking]);

  // ==========================================
  // CARGAR MOVIMIENTOS
  // ==========================================

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
      } catch (error) {
        console.warn(
          "[AiCommentator] Historial no disponible:",
          error,
        );
      }
    }

    void loadMoves();

    return () => {
      cancelled = true;
    };
  }, [game.id, game.moveCount]);

  // ==========================================
  // CREAR COMENTARIO LOCAL UNA SOLA VEZ
  // ==========================================

  useEffect(() => {
    if (game.moveCount <= previousMoveCountRef.current) {
      previousMoveCountRef.current = game.moveCount;
      return;
    }

    const previousCount = previousMoveCountRef.current;
    previousMoveCountRef.current = game.moveCount;

    if (!game.lastMove) return;

    const latestMove = movesRef.current.find(
      (move) => move.ply === game.moveCount,
    );

    const commentary = createCommentary(
      game,
      latestMove,
      narratorStyleRef.current,
      recentExpressionsRef.current,
      lastNarratedMoveRef.current,
    );

    // Si se saltaron movimientos, el comentario ya
    // resume el intervalo respecto a la última narración.
    if (game.moveCount > previousCount) {
      const updatedComments = [
        commentary,
        ...commentsRef.current.filter(
          (item) => item.moveNumber !== commentary.moveNumber,
        ),
      ]
        .sort((a, b) => b.moveNumber - a.moveNumber)
        .slice(0, MAX_COMMENTS);

      commentsRef.current = updatedComments;
      setComments(updatedComments);
    }

    playLatest();
  }, [game, playLatest]);

  // ==========================================
  // DETECTAR JUGADAS PARA GROQ
  // ==========================================

  useEffect(() => {
    if (!game.lastMove) return;

    const move = moves.find(
      (item) => item.ply === game.moveCount,
    );

    if (!move) return;

    const category = getMoveCategory(move, game);

    if (!NOTABLE_CATEGORIES.includes(category)) return;

    if (requestedAiMovesRef.current.has(game.moveCount)) {
      return;
    }

    requestedAiMovesRef.current.add(game.moveCount);

    processAiRequest({
      gameId: game.id,
      moveNumber: game.moveCount,
      fen: game.fen,
      from: game.lastMove.from,
      to: game.lastMove.to,
      category,
    });
  }, [game, moves, processAiRequest]);

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
    speakText(comment, false);
  }

  function listenAiAnalysis(comment: Commentary) {
    if (!comment.aiAnalysis) return;

    stopSpeaking();

    speakText(
      {
        ...comment,
        message: comment.aiAnalysis,
      },
      false,
    );
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

      {/* ESTADO DE GROQ */}
      <div className="border-b border-[#493522] bg-[#241A15] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="m-0 text-xs font-bold text-[#E8B84B]">
              ✨ Motor de análisis Groq
            </p>

            <p className="mb-0 mt-1 text-xs text-[#B6A18A]">
              {aiStatus === "generating"
                ? `Analizando movimiento ${aiStatusMove ?? ""}...`
                : aiStatus === "success"
                  ? "Último análisis IA recibido correctamente."
                  : aiStatus === "error"
                    ? "Groq no disponible. Narración local activa."
                    : "Narración local lista. IA para jugadas importantes."}
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
                  ? "Comentarios deportivos sincronizados."
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
                  <option value="">Voz predeterminada</option>
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
      {isSpeaking && currentNarration && (
        <div className="border-b border-[#75572A] bg-[#3A2A1B] p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wide text-[#E8B84B]">
              🔊 Narrando ahora · Movimiento {currentNarration.moveNumber}
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

      {/* HISTORIAL */}
      <div className="max-h-80 overflow-y-auto overscroll-contain p-4">
        {comments.length === 0 ? (
          <div className="py-7 text-center">
            <div className="mb-3 text-4xl text-[#E8B84B]">♟</div>
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

                  {comment.aiAnalysis && (
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

                {/* TEXTO EXACTO DEL NARRADOR */}
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#E8B84B]">
                    🔊 Comentario del narrador
                  </p>

                  <p className="m-0 text-sm leading-relaxed text-[#D9C5A7]">
                    {comment.message}
                  </p>

                  <button
                    type="button"
                    onClick={() => listenManually(comment)}
                    className="mt-3 rounded-lg border border-[#75572A] bg-[#49331E] px-4 py-2 text-xs font-semibold text-[#F5D782] transition hover:bg-[#624529]"
                  >
                    🔊 Escuchar comentario
                  </button>
                </div>

                {/* ANÁLISIS SEPARADO DE GROQ */}
                {comment.aiAnalysis && (
                  <div className="mt-4 rounded-lg border border-purple-500/30 bg-purple-950/20 p-3">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-purple-300">
                      ✨ Análisis de Groq
                    </p>

                    <p className="m-0 text-sm leading-relaxed text-[#E9D5FF]">
                      {comment.aiAnalysis}
                    </p>

                    <button
                      type="button"
                      onClick={() => listenAiAnalysis(comment)}
                      className="mt-3 rounded-lg border border-purple-500/40 bg-purple-950/40 px-3 py-2 text-xs font-semibold text-purple-200 transition hover:bg-purple-900/50"
                    >
                      🔊 Escuchar análisis IA
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
