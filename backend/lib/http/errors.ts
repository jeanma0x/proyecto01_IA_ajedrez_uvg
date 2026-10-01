import { NextResponse } from "next/server";

// Mismo contrato de error que ya consume el frontend (ver
// frontend/src/types/api.ts ApiError) — no agregar códigos nuevos sin
// actualizar ese archivo también.
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "GAME_NOT_FOUND"
  | "GAME_NOT_ACTIVE"
  | "NOT_YOUR_TURN"
  | "ILLEGAL_MOVE"
  | "AI_NOT_CONFIGURED"
  | "AUTH"
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "UNAVAILABLE"
  | "INVALID_FORMAT"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  GAME_NOT_FOUND: 404,
  GAME_NOT_ACTIVE: 409,
  NOT_YOUR_TURN: 409,
  ILLEGAL_MOVE: 422,
  AI_NOT_CONFIGURED: 503,
  AUTH: 502,
  RATE_LIMIT: 429,
  TIMEOUT: 504,
  UNAVAILABLE: 503,
  INVALID_FORMAT: 502,
  INTERNAL_ERROR: 500,
};

export class ApiError extends Error {
  code: ApiErrorCode;
  details?: Record<string, unknown>;

  constructor(code: ApiErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

export function apiErrorResponse(
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>,
  init?: ResponseInit,
) {
  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status: init?.status ?? STATUS_BY_CODE[code], headers: init?.headers },
  );
}

export function handleRouteError(error: unknown) {
  if (error instanceof ApiError) {
    return apiErrorResponse(error.code, error.message, error.details);
  }

  console.error(error);
  return apiErrorResponse("INTERNAL_ERROR", "Ocurrió un error interno en el servidor.");
}
