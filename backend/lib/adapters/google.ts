import { GoogleGenAI } from "@google/genai";

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
          },
        }),
        request.timeoutMs,
      );

      rawText = response.text ?? "";
    } catch (error) {
      throw translateError(error);
    }

    const move = parseMoveArguments(rawText, rawText);

    return { ...move, rawResponse: rawText.slice(0, 2000) };
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
