
import { useCallback, useEffect, useRef, useState } from "react";
import { getMoves } from "../../../services/api/gameApi";
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

interface Commentary {
  id: number;
  moveNumber: number;
  player: string;
  move: string;
  message: string;
  category: MoveCategory;
}

interface MoveContext {
  player: string;
  piece: string;
  from: string;
  to: string;
  san: string;
  ply: number;
  category: MoveCategory;
  gap: number;
}

interface Narration {
  text: string;
  moveNumber: number;
  category: MoveCategory;
}

const MAX_COMMENTS = 8;

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
    "¡Ojo con lo que ocurre!",
    "¡Se mueve el tablero!",
    "¡Aquí viene otra jugada!",
    "¡Esto se pone interesante!",
    "¡Tenemos acción!",
    "¡Continúa el enfrentamiento!",
    "¡Vaya duelo de inteligencias!",
    "¡Qué intensidad!",
    "¡Ahí viene la respuesta!",
    "¡No pierdan de vista el tablero!",
    "¡Se enciende la partida!",
    "¡Seguimos en vivo!",
    "¡Hay movimiento!",
    "¡Qué ritmo llevan estos modelos!",
    "¡Y la batalla sigue!",
    "¡Nueva decisión sobre el tablero!",
    "¡Vamos con la siguiente!",
    "¡Esto no se detiene!",
    "¡Señoras y señores, seguimos!",
  ],
  profesional: [
    "Observemos esta jugada.",
    "Una nueva decisión en la posición.",
    "Veamos el desarrollo de la partida.",
    "El siguiente movimiento merece atención.",
    "La posición continúa evolucionando.",
    "Analicemos lo ocurrido.",
    "Tenemos una nueva jugada.",
    "El enfrentamiento avanza.",
    "Una decisión más sobre el tablero.",
    "Continuamos con el análisis.",
    "Veamos cómo cambia la disposición de las piezas.",
    "El juego sigue su curso.",
  ],
  epico: [
    "¡El tablero vuelve a cobrar vida!",
    "¡La batalla de las inteligencias continúa!",
    "¡Una nueva pieza entra en escena!",
    "¡El duelo escribe otro capítulo!",
    "¡La tensión se siente en cada casilla!",
    "¡Dos mentes artificiales siguen enfrentándose!",
    "¡El tablero es testigo de otra decisión!",
    "¡La contienda está lejos de terminar!",
    "¡Una nueva maniobra sacude el enfrentamiento!",
    "¡La historia de esta partida continúa!",
    "¡Cada pieza tiene su papel en esta batalla!",
    "¡El espectáculo del ajedrez sigue adelante!",
  ],
};

const REACTIONS: Record<NarratorStyle, string[]> = {
  deportivo: [
    "¡Veremos cómo responde su rival!",
    "¡Seguimos atentos!",
    "¡Todavía queda mucho ajedrez!",
    "¡La siguiente respuesta será interesante!",
    "¡Qué duelo estamos viendo!",
    "¡Vamos a ver qué sucede!",
    "¡El enfrentamiento continúa!",
    "¡Hay que seguir esta partida!",
    "¡Esto promete!",
    "¡La acción sigue!",
    "¡No se despeguen del tablero!",
    "¡Y seguimos con más ajedrez!",
    "¡La próxima jugada ya se aproxima!",
    "¡Menudo enfrentamiento!",
    "¡Vamos con la respuesta!",
  ],
  profesional: [
    "La respuesta del rival definirá la continuación.",
    "Habrá que observar la siguiente jugada.",
    "La posición continúa desarrollándose.",
    "El siguiente turno ofrecerá más información.",
    "La partida mantiene abiertas distintas posibilidades.",
    "Continuaremos observando la posición.",
    "La secuencia todavía está en desarrollo.",
    "Es importante considerar la respuesta del oponente.",
  ],
  epico: [
    "¡El siguiente capítulo está por comenzar!",
    "¡La batalla todavía tiene mucho por contar!",
    "¡El rival prepara su respuesta!",
    "¡La contienda sigue abierta!",
    "¡Una nueva decisión espera al otro lado!",
    "¡El destino de la partida aún no está escrito!",
    "¡Las piezas esperan el siguiente movimiento!",
    "¡El enfrentamiento continúa su marcha!",
  ],
};

const EVENT_PHRASES: Record<
  NarratorStyle,
  Record<MoveCategory, string[]>
> = {
  deportivo: {
    normal: [
      "{player} mueve su {piece} hacia {to}.",
      "{player} lleva su {piece} desde {from} hasta {to}.",
      "El {piece} de {player} llega a {to}.",
      "{player} elige la casilla {to} para su {piece}.",
      "Nueva maniobra de {player} con su {piece}.",
      "{player} pone en movimiento su {piece}.",
      "El {piece} avanza hacia {to} bajo las órdenes de {player}.",
      "{player} responde con una jugada hacia {to}.",
      "Tenemos al {piece} de {player} en {to}.",
      "{player} cambia la posición de su {piece}.",
      "El {piece} se desplaza de {from} a {to}.",
      "{player} ejecuta una nueva maniobra con su {piece}.",
    ],
    development: [
      "{player} desarrolla su {piece} hacia {to}.",
      "El {piece} de {player} entra en acción.",
      "{player} moviliza su {piece} y continúa el desarrollo.",
      "Las piezas de {player} comienzan a salir de sus casillas iniciales.",
      "{player} incorpora su {piece} al juego.",
      "El {piece} abandona {from} y llega a {to}.",
      "Una nueva pieza de {player} se suma al enfrentamiento.",
      "{player} continúa organizando sus piezas con {piece} a {to}.",
    ],
    center: [
      "{player} ocupa la casilla central {to} con su {piece}.",
      "El {piece} de {player} llega al corazón del tablero.",
      "{player} se instala en {to}, una casilla central.",
      "La lucha por el centro recibe una nueva jugada de {player}.",
      "{player} lleva su {piece} directamente a {to}.",
      "El centro del tablero recibe al {piece} de {player}.",
      "{player} disputa espacio central con su {piece}.",
      "El {piece} de {player} ocupa una de las casillas clave del centro.",
    ],
    capture: [
      "¡Tenemos captura! {player} se lleva una pieza rival con su {piece}.",
      "¡Una pieza menos! El {piece} de {player} captura en {to}.",
      "¡Hay intercambio de material! {player} captura en {to}.",
      "¡Cae una pieza! {player} ejecuta una captura con su {piece}.",
      "¡Atención a esa captura! El {piece} de {player} llega a {to}.",
      "¡Se retira una pieza del tablero! {player} acaba de capturar.",
      "¡Qué momento! {player} realiza una captura en {to}.",
      "¡Movimiento de contacto! El {piece} de {player} captura una pieza rival.",
    ],
    check: [
      "¡Jaque! {player} pone al rey contrario bajo amenaza.",
      "¡Cuidado con el rey! {player} acaba de dar jaque.",
      "¡Se encienden las alarmas! El rey rival está en jaque.",
      "¡Atención! {player} obliga al rival a responder al jaque.",
      "¡Jaque sobre el tablero! El rey contrario necesita una respuesta.",
      "¡El rey está amenazado! {player} encuentra un jaque.",
      "¡Momento de tensión! {player} pone al monarca rival en jaque.",
      "¡Tenemos jaque! La siguiente jugada deberá resolver la amenaza.",
    ],
    checkmate: [
      "¡Jaque mate! ¡Se acabó, se acabó! ¡{player} gana el duelo!",
      "¡Impresionante! ¡Jaque mate de {player}! ¡Qué final!",
      "¡Final de partida! ¡{player} consigue el jaque mate!",
      "¡No hay escapatoria! ¡Jaque mate y victoria para {player}!",
      "¡El rey no tiene salida! ¡{player} sentencia el enfrentamiento!",
      "¡Qué desenlace! ¡Jaque mate de {player}!",
    ],
    castle: [
      "¡Y llega el enroque! {player} cambia la posición de su rey.",
      "¡Maniobra clásica! {player} realiza el enroque.",
      "¡El rey se reubica! {player} completa el enroque.",
      "¡Atención a la defensa! {player} ejecuta un enroque.",
      "¡Movimiento de seguridad! {player} realiza el enroque.",
      "¡El monarca cambia de casilla! Enroque de {player}.",
    ],
    promotion: [
      "¡Increíble! ¡{player} consigue promocionar un peón!",
      "¡El peón llega hasta el final! ¡Promoción de {player}!",
      "¡Qué momento! {player} transforma uno de sus peones.",
      "¡Promoción en el tablero! {player} obtiene una nueva pieza.",
      "¡Atención! Un peón de {player} alcanza la última fila.",
      "¡Se produce una promoción! ¡Qué momento de la partida!",
    ],
    final: [
      "¡Final del enfrentamiento! La partida ha terminado.",
      "¡Se acabó la partida! Tenemos el resultado definitivo.",
      "¡Llegamos al final de este duelo de inteligencias!",
      "¡Concluye el enfrentamiento sobre el tablero!",
    ],
    incident: [
      "¡Atención! La partida se ha detenido por una incidencia técnica.",
      "¡Tenemos una interrupción técnica en el enfrentamiento!",
      "¡El duelo queda detenido! Se ha registrado una incidencia.",
    ],
  },
  profesional: {
    normal: [
      "{player} desplaza su {piece} desde {from} hasta {to}.",
      "El movimiento de {player} sitúa su {piece} en {to}.",
      "{player} continúa la partida con {piece} a {to}.",
      "La nueva posición del {piece} de {player} es {to}.",
      "{player} ejecuta una jugada de {from} a {to}.",
      "El {piece} de {player} cambia de casilla.",
    ],
    development: [
      "{player} desarrolla su {piece} hacia {to}.",
      "El {piece} de {player} abandona su posición inicial.",
      "{player} continúa movilizando sus piezas.",
      "La jugada incorpora el {piece} de {player} al desarrollo.",
    ],
    center: [
      "{player} ocupa la casilla central {to}.",
      "El {piece} de {player} se sitúa en el centro.",
      "{player} disputa una casilla central con su {piece}.",
      "La jugada de {player} se concentra en la región central.",
    ],
    capture: [
      "{player} captura una pieza rival con su {piece}.",
      "La jugada de {player} retira una pieza contraria.",
      "Se registra una captura de {player} en {to}.",
      "El {piece} de {player} realiza una captura.",
    ],
    check: [
      "{player} da jaque al rey contrario.",
      "El rey rival se encuentra en jaque.",
      "{player} obliga al oponente a resolver una amenaza al rey.",
      "La jugada de {player} produce un jaque.",
    ],
    checkmate: [
      "Jaque mate. {player} gana la partida.",
      "La posición termina en jaque mate a favor de {player}.",
      "{player} consigue el jaque mate definitivo.",
    ],
    castle: [
      "{player} realiza el enroque.",
      "El rey de {player} cambia de posición mediante el enroque.",
      "{player} completa una maniobra de enroque.",
    ],
    promotion: [
      "{player} promociona un peón.",
      "Un peón de {player} alcanza la última fila.",
      "La jugada de {player} produce una promoción.",
    ],
    final: [
      "La partida ha concluido.",
      "El enfrentamiento llega a su final.",
      "Se ha registrado el resultado definitivo.",
    ],
    incident: [
      "La partida se ha detenido por una incidencia técnica.",
      "El enfrentamiento ha sido interrumpido técnicamente.",
    ],
  },
  epico: {
    normal: [
      "¡{player} mueve su {piece} hacia {to}! ¡La batalla continúa!",
      "¡Una nueva maniobra de {player} sacude el tablero!",
      "¡El {piece} de {player} entra en una nueva posición!",
      "¡Otra decisión se escribe en la historia de este duelo!",
      "¡{player} desplaza su {piece} y la contienda sigue!",
      "¡La siguiente jugada pertenece a {player}!",
    ],
    development: [
      "¡El {piece} de {player} entra en escena!",
      "¡{player} despliega una nueva pieza en el campo de batalla!",
      "¡Las fuerzas de {player} comienzan a movilizarse!",
      "¡El desarrollo de {player} continúa con su {piece}!",
    ],
    center: [
      "¡{player} lleva su {piece} al corazón del tablero!",
      "¡La batalla por el centro recibe una nueva maniobra!",
      "¡El {piece} de {player} ocupa la casilla central {to}!",
      "¡{player} disputa el corazón de esta contienda!",
    ],
    capture: [
      "¡Una pieza cae en el campo de batalla! ¡Captura de {player}!",
      "¡El {piece} de {player} elimina una pieza rival!",
      "¡La contienda se cobra otra pieza! ¡Captura en {to}!",
      "¡{player} ejecuta una captura en pleno enfrentamiento!",
    ],
    check: [
      "¡El rey está en peligro! ¡Jaque de {player}!",
      "¡Las alarmas resuenan sobre el tablero! ¡Jaque!",
      "¡{player} amenaza directamente al monarca enemigo!",
      "¡El rey rival debe encontrar una salida al jaque!",
    ],
    checkmate: [
      "¡Jaque mate! ¡La batalla ha terminado! ¡Victoria de {player}!",
      "¡El desenlace ha llegado! ¡{player} consigue el jaque mate!",
      "¡No queda escapatoria! ¡{player} conquista la victoria!",
      "¡El tablero tiene vencedor! ¡Jaque mate de {player}!",
    ],
    castle: [
      "¡El monarca se reubica! ¡Enroque de {player}!",
      "¡{player} ejecuta una maniobra para resguardar a su rey!",
      "¡Las defensas se reorganizan mediante el enroque!",
    ],
    promotion: [
      "¡Un humilde peón alcanza su destino! ¡Promoción de {player}!",
      "¡La transformación se completa! ¡Un peón de {player} promociona!",
      "¡Una nueva pieza nace en el tablero gracias a {player}!",
    ],
    final: [
      "¡La contienda ha llegado a su final!",
      "¡El último capítulo de este duelo ha concluido!",
      "¡El tablero guarda el desenlace del enfrentamiento!",
    ],
    incident: [
      "¡La batalla queda detenida por una incidencia técnica!",
      "¡Una interrupción técnica detiene el duelo!",
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

  const piece = move.piece.toLowerCase();

  return PIECE_NAMES[piece] ?? "peón";
}

function getMoveCategory(
  move: Move | undefined,
  game: GameState,
): MoveCategory {
  if (game.status === "incident") return "incident";

  if (game.reason === "checkmate") return "checkmate";

  if (game.status === "finished") return "final";

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

function fillTemplate(template: string, context: MoveContext): string {
  return template
    .replaceAll("{player}", context.player)
    .replaceAll("{piece}", context.piece)
    .replaceAll("{from}", context.from)
    .replaceAll("{to}", context.to)
    .replaceAll("{san}", context.san);
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
  const context: MoveContext = {
    player: getLastPlayer(game),
    piece: getPieceName(move),
    from: game.lastMove?.from ?? "",
    to: game.lastMove?.to ?? "",
    san: move?.san ?? "",
    ply: game.moveCount,
    category: getMoveCategory(move, game),
    gap: Math.max(1, game.moveCount - previousNarratedMove),
  };

  const category = context.category;
  const phrases = EVENT_PHRASES[style][category];

  const main = fillTemplate(
    chooseExpression(phrases, recent),
    context,
  );

  let text = main;

  // Comentarios especiales: mayor emoción y prioridad.
  const isCritical = [
    "capture",
    "check",
    "checkmate",
    "promotion",
  ].includes(category);

  // Si avanzaron varias jugadas, narrar el estado reciente.
  if (
    context.gap >= 3 &&
    !isCritical &&
    category !== "final" &&
    category !== "incident"
  ) {
    const summaries = [
      `¡Qué ritmo lleva esta partida! Han pasado ${context.gap} jugadas. ${context.player} acaba de mover su ${context.piece} hacia ${context.to}.`,
      `¡Esto no se detiene! El tablero avanzó ${context.gap} movimientos y ${context.player} realizó la última jugada.`,
      `¡Vaya velocidad! Tras ${context.gap} jugadas, ${context.player} acaba de jugar hacia ${context.to}.`,
      `¡La acción sigue! Se registraron ${context.gap} movimientos y la última jugada pertenece a ${context.player}.`,
    ];

    if (style === "profesional") {
      text = `Desde la última intervención se realizaron ${context.gap} jugadas. ${context.player} acaba de mover su ${context.piece} hacia ${context.to}.`;
    } else {
      text = chooseExpression(summaries, recent);
    }
  } else if (
    category !== "final" &&
    category !== "incident" &&
    category !== "checkmate"
  ) {
    // Alternar comentarios breves y comentarios compuestos.
    // Los breves ayudan a evitar retrasos de narración.
    const addIntro = context.ply % 4 === 0;
    const addReaction = context.ply % 5 === 0;

    if (addIntro) {
      const intro = chooseExpression(INTROS[style], recent);
      text = `${intro} ${text}`;
    }

    if (addReaction && !addIntro) {
      const reaction = chooseExpression(REACTIONS[style], recent);
      text = `${text} ${reaction}`;
    }
  }

  return {
    id: game.moveCount,
    moveNumber: game.moveCount,
    player: context.player,
    move: game.lastMove
      ? `${context.from} → ${context.to}`
      : "Final",
    message: text,
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

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [speechRate, setSpeechRate] = useState(1.25);

  const latestGameRef = useRef(game);
  latestGameRef.current = game;

  const movesRef = useRef(moves);
  movesRef.current = moves;

  const previousMoveCountRef = useRef(game.moveCount);
  const lastNarratedMoveRef = useRef(game.moveCount);

  const recentExpressionsRef = useRef<string[]>([]);
  const speakingRef = useRef(false);
  const mountedRef = useRef(true);
  const sessionRef = useRef(0);
  const gameIdRef = useRef(game.id);

  const activeUtteranceRef =
    useRef<SpeechSynthesisUtterance | null>(null);

  const voiceEnabledRef = useRef(voiceEnabled);
  voiceEnabledRef.current = voiceEnabled;

  const narratorStyleRef = useRef(narratorStyle);
  narratorStyleRef.current = narratorStyle;

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

      const isExciting = [
        "check",
        "checkmate",
        "capture",
        "promotion",
      ].includes(comment.category);

      utterance.pitch = isExciting ? 1.15 : 1.05;
      utterance.volume = 1;

      lastNarratedMoveRef.current =
        latestGameRef.current.moveCount;

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

        // Al finalizar, se comenta la situación más reciente.
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

    if (latest.moveCount <= lastNarratedMoveRef.current) {
      return;
    }

    const latestMove = movesRef.current.find(
      (move) => move.ply === latest.moveCount,
    );

    const commentary = createCommentary(
      latest,
      latestMove,
      narratorStyleRef.current,
      recentExpressionsRef.current,
      lastNarratedMoveRef.current,
    );

    speakText(commentary);
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

  // Reiniciar cuando cambia la partida.
  useEffect(() => {
    if (gameIdRef.current === game.id) return;

    gameIdRef.current = game.id;
    stopSpeaking();

    previousMoveCountRef.current = game.moveCount;
    lastNarratedMoveRef.current = game.moveCount;
    recentExpressionsRef.current = [];

    setComments([]);
    setMoves([]);
  }, [game.id, game.moveCount, stopSpeaking]);

  // Consultar movimientos y reconocer eventos.
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
        // Si falla la consulta, continuar sin historial.
      }
    }

    void loadMoves();

    return () => {
      cancelled = true;
    };
  }, [game.id, game.moveCount]);

  // Detectar nuevas jugadas.
  useEffect(() => {
    if (game.moveCount <= previousMoveCountRef.current) {
      previousMoveCountRef.current = game.moveCount;
      return;
    }

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
      Math.max(0, game.moveCount - 1),
    );

    setComments((current) =>
      [commentary, ...current]
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

      {/* CONTROLES */}
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
                  ? "Comentarios deportivos sin cola acumulada."
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
            className="w-full rounded-lg border border-[#62492E] bg-[#1B130F] px-3 py-2 text-xs text-[#F0DFBF] outline-none focus:border-[#E8B84B]"
          >
            <option value="deportivo">⚽ Deportivo — Emocionante</option>
            <option value="profesional">♟ Profesional — Analítico</option>
            <option value="epico">🔥 Épico — Dramático</option>
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
