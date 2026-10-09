export type Difficulty = "beginner" | "advanced" | "master";
export type ChessColor = "white" | "black";

export interface LegalMoveOption {
  from: string;
  to: string;
  san: string;
  promotion?: "q" | "r" | "b" | "n";
}

export type AdapterErrorCode = "AUTH" | "RATE_LIMIT" | "TIMEOUT" | "UNAVAILABLE" | "INVALID_FORMAT";

export class AdapterError extends Error {
  code: AdapterErrorCode;

  constructor(code: AdapterErrorCode, message: string) {
    super(message);
    this.name = "AdapterError";
    this.code = code;
  }
}

export interface MoveRequest {
  fen: string;
  color: ChessColor;
  difficulty: Difficulty;
  legalMoves: LegalMoveOption[];
  recentSanHistory: string[];
  timeoutMs: number;
  // Explica por qué el intento anterior (si hubo uno) fue rechazado — sin
  // esto, un reintento reenvía el mismo prompt y el modelo tiende a repetir
  // la misma jugada inválida (bug real: ver docs/04-MODELOS_PENDIENTE.md,
  // 2026-10-08).
  retryFeedback?: string;
}

export interface MoveResponse {
  from: string;
  to: string;
  promotion?: "q" | "r" | "b" | "n";
  rawResponse: string;
  // Resumen del razonamiento del modelo antes de decidir la jugada, cuando el
  // proveedor lo expone (hoy solo Google Gemini, vía `includeThoughts`). No
  // se persiste en base de datos — es transitorio, solo para mostrarlo en
  // vivo en el turno en que se generó.
  reasoningSummary?: string;
}

export interface AiAdapter {
  readonly provider: string;
  readonly modelId: string;
  requestMove(request: MoveRequest): Promise<MoveResponse>;
}

// Envuelve una promesa de proveedor con un timeout propio (independiente del
// límite de la plataforma) — ver riesgo documentado en docs/04-MODELOS_PENDIENTE.md.
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AdapterError("TIMEOUT", "El proveedor no respondió a tiempo.")), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}
