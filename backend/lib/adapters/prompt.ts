import type { Difficulty, MoveRequest } from "./types";

export interface DifficultyProfile {
  temperature: number;
  maxOutputTokens: number;
  instruction: string;
}

// Perfiles de prompting por nivel — ver docs/01-ARQUITECTURA.md. Son etiquetas
// de configuración, no una afirmación de fuerza real de ajedrez.
//
// maxOutputTokens alto incluso en "beginner": modelos de razonamiento (ej.
// gpt-oss vía Groq) gastan tokens en razonamiento interno antes de llamar a
// la función — con un límite bajo, el proveedor corta la respuesta antes de
// emitir la jugada y la rechaza ("model did not call a tool"). Confirmado
// empíricamente el 2026-10-01, ver docs/04-MODELOS_PENDIENTE.md.
export const DIFFICULTY_PROFILES: Record<Difficulty, DifficultyProfile> = {
  beginner: {
    temperature: 0.9,
    maxOutputTokens: 600,
    instruction: "Elige rápidamente una jugada legal razonable. No expliques tu razonamiento.",
  },
  advanced: {
    temperature: 0.5,
    maxOutputTokens: 900,
    instruction: "Analiza brevemente la posición antes de decidir tu jugada.",
  },
  master: {
    temperature: 0.2,
    maxOutputTokens: 1200,
    instruction: "Compara al menos dos jugadas candidatas y elige la mejor antes de responder.",
  },
};

export const MOVE_FUNCTION_NAME = "submit_move";

export const MOVE_FUNCTION_DESCRIPTION =
  "Envía la jugada de ajedrez elegida como casillas de origen y destino en notación algebraica.";

export const MOVE_FUNCTION_PARAMETERS = {
  type: "object",
  properties: {
    from: {
      type: "string",
      description: "Casilla de origen en notación algebraica, ej. e2",
    },
    to: {
      type: "string",
      description: "Casilla de destino en notación algebraica, ej. e4",
    },
    promotion: {
      type: "string",
      enum: ["q", "r", "b", "n"],
      description: "Pieza de promoción si el movimiento corona un peón",
    },
  },
  required: ["from", "to"],
} as const;

export function buildPrompt(request: MoveRequest): string {
  const profile = DIFFICULTY_PROFILES[request.difficulty];

  const historyLine =
    request.recentSanHistory.length > 0
      ? `Movimientos recientes: ${request.recentSanHistory.join(", ")}.`
      : "Es el primer movimiento de la partida.";

  // Listamos origen→destino (el mismo formato que exige la función de
  // jugada), no solo SAN — así el modelo puede copiar una opción exacta en
  // vez de tener que derivar from/to desde la notación algebraica, que es
  // donde ocurrían la mayoría de jugadas "ilegales" repetidas (ver
  // docs/04-MODELOS_PENDIENTE.md, 2026-10-09).
  const legalMovesLine = request.legalMoves
    .map((move) => `${move.from}-${move.to}${move.promotion ? `=${move.promotion.toUpperCase()}` : ""} (${move.san})`)
    .join(", ");

  return [
    `Eres un jugador de ajedrez controlando las piezas ${request.color === "white" ? "blancas" : "negras"}.`,
    `Posición actual en FEN: ${request.fen}`,
    historyLine,
    `Movimientos legales disponibles (origen-destino, con su notación SAN entre paréntesis): ${legalMovesLine}`,
    "Tu jugada (from/to) debe copiar EXACTAMENTE una de esas opciones de origen-destino.",
    profile.instruction,
    `Responde únicamente llamando a la función "${MOVE_FUNCTION_NAME}" con tu jugada elegida.`,
    ...(request.retryFeedback ? [request.retryFeedback] : []),
  ].join("\n");
}
