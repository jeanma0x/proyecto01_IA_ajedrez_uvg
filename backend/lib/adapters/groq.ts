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

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

export class GroqAdapter implements AiAdapter {
  // La empresa relevante para RN-03 es la creadora del modelo (OpenAI), no el
  // host (Groq) — ver docs/04-MODELOS_PENDIENTE.md.
  readonly provider = "OpenAI";
  readonly modelId: string;

  private client: OpenAI;

  constructor(apiKey: string, modelId = "openai/gpt-oss-120b") {
    this.client = new OpenAI({ apiKey, baseURL: GROQ_BASE_URL });
    this.modelId = modelId;
  }

  async requestMove(request: MoveRequest): Promise<MoveResponse> {
    const profile = DIFFICULTY_PROFILES[request.difficulty];

    let completion: OpenAI.Chat.Completions.ChatCompletion;

    try {
      completion = await withTimeout(
        this.client.chat.completions.create({
          model: this.modelId,
          temperature: profile.temperature,
          max_tokens: profile.maxOutputTokens,
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
      throw new AdapterError("INVALID_FORMAT", "El modelo (vía Groq) no devolvió una llamada a la función de jugada.");
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
      return new AdapterError("AUTH", "Credenciales inválidas para Groq.");
    }

    if (error.status === 429) {
      return new AdapterError("RATE_LIMIT", "Límite de cuota alcanzado en Groq.");
    }

    if (error.status && error.status >= 500) {
      return new AdapterError("UNAVAILABLE", "Groq no está disponible en este momento.");
    }
  }

  return new AdapterError("UNAVAILABLE", `Error inesperado llamando a Groq: ${String(error)}`);
}
