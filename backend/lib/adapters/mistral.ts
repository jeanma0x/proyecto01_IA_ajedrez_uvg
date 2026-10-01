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

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

interface MistralToolCall {
  function: { name: string; arguments: string };
}

interface MistralChatCompletion {
  choices: Array<{ message: { content?: string | null; tool_calls?: MistralToolCall[] } }>;
}

export class MistralAdapter implements AiAdapter {
  readonly provider = "Mistral AI";
  readonly modelId: string;

  constructor(
    private readonly apiKey: string,
    modelId = "mistral-small-latest",
  ) {
    this.modelId = modelId;
  }

  async requestMove(request: MoveRequest): Promise<MoveResponse> {
    const profile = DIFFICULTY_PROFILES[request.difficulty];
    const controller = new AbortController();

    let response: Response;

    try {
      response = await withTimeout(
        fetch(MISTRAL_API_URL, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
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
            tool_choice: "any",
          }),
        }),
        request.timeoutMs,
      );
    } catch (error) {
      controller.abort();
      throw translateNetworkError(error);
    }

    if (!response.ok) {
      throw translateHttpError(response.status, await safeText(response));
    }

    const payload = (await response.json()) as MistralChatCompletion;
    const rawResponse = JSON.stringify(payload).slice(0, 2000);

    const toolCall = payload.choices[0]?.message.tool_calls?.[0];

    if (!toolCall) {
      throw new AdapterError("INVALID_FORMAT", "Mistral no devolvió una llamada a la función de jugada.");
    }

    const move = parseMoveArguments(toolCall.function.arguments, rawResponse);

    return { ...move, rawResponse };
  }
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function translateNetworkError(error: unknown): AdapterError {
  if (error instanceof AdapterError) {
    return error;
  }

  return new AdapterError("UNAVAILABLE", `No fue posible conectar con Mistral AI: ${String(error)}`);
}

function translateHttpError(status: number, body: string): AdapterError {
  if (status === 401 || status === 403) {
    return new AdapterError("AUTH", "Credenciales inválidas para Mistral AI.");
  }

  if (status === 429) {
    return new AdapterError("RATE_LIMIT", "Límite de cuota alcanzado en Mistral AI.");
  }

  if (status >= 500) {
    return new AdapterError("UNAVAILABLE", "Mistral AI no está disponible en este momento.");
  }

  return new AdapterError("INVALID_FORMAT", `Mistral AI devolvió un error inesperado: ${body.slice(0, 500)}`);
}
