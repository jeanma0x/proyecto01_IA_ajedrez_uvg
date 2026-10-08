import OpenAI from "openai";

import {
  DIFFICULTY_PROFILES,
  MOVE_FUNCTION_DESCRIPTION,
  MOVE_FUNCTION_NAME,
  MOVE_FUNCTION_PARAMETERS,
  buildPrompt,
} from "./prompt";
import { parseMoveArguments } from "./parse";
import { AdapterError, withTimeout } from "./types";
import type { AiAdapter, MoveRequest, MoveResponse } from "./types";

export class OpenAiAdapter implements AiAdapter {
  readonly provider = "OpenAI";
  readonly modelId: string;

  private client: OpenAI;

  constructor(apiKey: string, modelId = "gpt-5-nano") {
    this.client = new OpenAI({ apiKey });
    this.modelId = modelId;
  }

  async requestMove(request: MoveRequest): Promise<MoveResponse> {
    const profile = DIFFICULTY_PROFILES[request.difficulty];

    let completion: OpenAI.Chat.Completions.ChatCompletion;

    try {
      completion = await withTimeout(
        this.client.chat.completions.create({
          model: this.modelId,
          // gpt-5-nano es un modelo de razonamiento: solo acepta
          // max_completion_tokens (no max_tokens) en Chat Completions, y sin
          // reasoning_effort "minimal" gasta el presupuesto pensando antes
          // de llamar a la función — mismo patrón que Gemini/gpt-oss (ver
          // docs/04-MODELOS_PENDIENTE.md, 2026-10-08).
          // Con "low" a veces el razonamiento se come el presupuesto
          // compartido (600-1200 según nivel) antes de llegar a la llamada
          // de función — se le da un piso más alto solo a este adaptador.
          max_completion_tokens: Math.max(profile.maxOutputTokens, 1500),
          reasoning_effort: "low",
          messages: [{ role: "user", content: buildPrompt(request) }],
          tools: [
            {
              type: "function",
              function: {
                name: MOVE_FUNCTION_NAME,
                description: MOVE_FUNCTION_DESCRIPTION,
                parameters: MOVE_FUNCTION_PARAMETERS,
              },
            },
          ],
          tool_choice: "required",
        }),
        request.timeoutMs,
      );
    } catch (error) {
      throw translateError(error);
    }

    const rawResponse = JSON.stringify(completion).slice(0, 2000);
    const toolCall = completion.choices[0]?.message.tool_calls?.[0];

    if (!toolCall || toolCall.type !== "function") {
      throw new AdapterError("INVALID_FORMAT", "El modelo no devolvió una llamada a la función de jugada.");
    }

    const move = parseMoveArguments(toolCall.function.arguments, rawResponse);

    return { ...move, rawResponse };
  }
}

function translateError(error: unknown): AdapterError {
  if (error instanceof AdapterError) {
    return error;
  }

  if (error instanceof OpenAI.APIError) {
    if (error.status === 401 || error.status === 403) {
      return new AdapterError("AUTH", "Credenciales inválidas para OpenAI.");
    }

    if (error.status === 429) {
      return new AdapterError("RATE_LIMIT", "Límite de cuota alcanzado en OpenAI.");
    }

    if (error.status && error.status >= 500) {
      return new AdapterError("UNAVAILABLE", "OpenAI no está disponible en este momento.");
    }

    // Mismo bug encontrado con Groq (2026-10-08): si el modelo no llama a la
    // función con tool_choice "required", la API puede responder 400 en vez
    // de una respuesta sin tool_calls. Es "jugada mal formada" (RF-15,
    // reintenta), no un servicio caído (RF-16, incidencia directa).
    if (error.status === 400) {
      return new AdapterError("INVALID_FORMAT", "El modelo no llamó a la función de jugada.");
    }
  }

  return new AdapterError("UNAVAILABLE", `Error inesperado llamando a OpenAI: ${String(error)}`);
}
