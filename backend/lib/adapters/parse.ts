import { AdapterError } from "./types";

const SQUARE_PATTERN = /^[a-h][1-8]$/;
const PROMOTION_VALUES = new Set(["q", "r", "b", "n"]);

export function parseMoveArguments(
  rawArguments: unknown,
  rawResponse: string,
): { from: string; to: string; promotion?: "q" | "r" | "b" | "n" } {
  const payload =
    typeof rawArguments === "string" ? safeJsonParse(rawArguments, rawResponse) : rawArguments;

  if (!payload || typeof payload !== "object") {
    throw new AdapterError("INVALID_FORMAT", "El proveedor no devolvió un objeto de jugada válido.");
  }

  const { from, to, promotion } = payload as Record<string, unknown>;

  if (typeof from !== "string" || !SQUARE_PATTERN.test(from)) {
    throw new AdapterError("INVALID_FORMAT", `Casilla de origen inválida: ${String(from)}`);
  }

  if (typeof to !== "string" || !SQUARE_PATTERN.test(to)) {
    throw new AdapterError("INVALID_FORMAT", `Casilla de destino inválida: ${String(to)}`);
  }

  if (promotion !== undefined && (typeof promotion !== "string" || !PROMOTION_VALUES.has(promotion))) {
    throw new AdapterError("INVALID_FORMAT", `Pieza de promoción inválida: ${String(promotion)}`);
  }

  return {
    from,
    to,
    promotion: promotion as "q" | "r" | "b" | "n" | undefined,
  };
}

function safeJsonParse(text: string, rawResponse: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new AdapterError("INVALID_FORMAT", `No se pudo parsear la respuesta del proveedor: ${rawResponse}`);
  }
}
