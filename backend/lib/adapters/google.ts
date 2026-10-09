import { GoogleGenAI, ThinkingLevel } from "@google/genai";

import { DIFFICULTY_PROFILES, MOVE_FUNCTION_PARAMETERS, buildPrompt } from "./prompt";
import { parseMoveArguments } from "./parse";
import { AdapterError, withTimeout } from "./types";
import type { AiAdapter, MoveRequest, MoveResponse } from "./types";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: MOVE_FUNCTION_PARAMETERS.properties,
  required: MOVE_FUNCTION_PARAMETERS.required,
};

export class GoogleAdapter implements AiAdapter {
  readonly provider = "Google";
  readonly modelId: string;

  private client: GoogleGenAI;

  constructor(apiKey: string, modelId = "gemini-3.8-flash") {
    this.client = new GoogleGenAI({ apiKey });
    this.modelId = modelId;
  }

  async requestMove(request: MoveRequest): Promise<MoveResponse> {
    const profile = DIFFICULTY_PROFILES[request.difficulty];

    let rawText: string;
    let reasoningSummary = "";

    try {
      const response = await withTimeout(
        this.client.models.generateContent({
          model: this.modelId,
          contents: buildPrompt(request),
          config: {
            temperature: profile.temperature,
            maxOutputTokens: profile.maxOutputTokens,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            // Sin esto, Gemini 3.x gasta buena parte de maxOutputTokens en
            // "pensamiento" interno antes del JSON final, y la respuesta
            // llega truncada a medias (bug real encontrado el 2026-10-08:
            // ver docs/04-MODELOS_PENDIENTE.md). La tarea es elegir una
            // jugada, no requiere razonamiento profundo.
            // `includeThoughts` solo expone el resumen de ese razonamiento
            // (no cambia cuánto piensa, sigue gobernado por thinkingLevel
            // LOW) — se usa para mostrarlo en vivo durante la demo.
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW, includeThoughts: true },
          },
        }),
        request.timeoutMs,
      );

      if (response.candidates?.[0]?.finishReason === "MAX_TOKENS") {
        throw new AdapterError(
          "INVALID_FORMAT",
          "La respuesta de Gemini se truncó por límite de tokens antes de completar el JSON.",
        );
      }

      rawText = response.text ?? "";
      // Las partes marcadas con thought=true son el resumen de razonamiento,
      // separado del texto final (que ya las excluye, ver tipos del SDK).
      reasoningSummary = (response.candidates?.[0]?.content?.parts ?? [])
        .filter((part) => part.thought && part.text)
        .map((part) => part.text)
        .join("\n")
        .trim();
    } catch (error) {
      throw translateError(error);
    }

    const move = parseMoveArguments(rawText, rawText);

    return {
      ...move,
      rawResponse: rawText.slice(0, 2000),
      reasoningSummary: reasoningSummary || undefined,
    };
  }
}

function translateError(error: unknown): AdapterError {
  if (error instanceof AdapterError) {
    return error;
  }

  const status = (error as { status?: number; code?: number })?.status ?? (error as { code?: number })?.code;

  if (status === 401 || status === 403) {
    return new AdapterError("AUTH", "Credenciales inválidas para Google Gemini.");
  }

  if (status === 429) {
    return new AdapterError("RATE_LIMIT", "Límite de cuota alcanzado en Google Gemini.");
  }

  if (typeof status === "number" && status >= 500) {
    return new AdapterError("UNAVAILABLE", "Google Gemini no está disponible en este momento.");
  }

  return new AdapterError("UNAVAILABLE", `Error inesperado llamando a Google Gemini: ${String(error)}`);
}
