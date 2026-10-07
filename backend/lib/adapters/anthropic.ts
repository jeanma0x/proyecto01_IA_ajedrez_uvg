import Anthropic from "@anthropic-ai/sdk";

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

export class AnthropicAdapter implements AiAdapter {
  readonly provider = "Anthropic";
  readonly modelId: string;

  private client: Anthropic;

  constructor(apiKey: string, modelId = "claude-haiku-4-5-20251001") {
    this.client = new Anthropic({ apiKey });
    this.modelId = modelId;
  }

  async requestMove(request: MoveRequest): Promise<MoveResponse> {
    const profile = DIFFICULTY_PROFILES[request.difficulty];

    let response: Anthropic.Messages.Message;

    try {
      response = await withTimeout(
        this.client.messages.create({
          model: this.modelId,
          max_tokens: profile.maxOutputTokens,
          temperature: profile.temperature,
          messages: [{ role: "user", content: buildPrompt(request) }],
          tools: [
            {
              name: MOVE_FUNCTION_NAME,
              description: MOVE_FUNCTION_DESCRIPTION,
              input_schema: {
                type: "object",
                properties: MOVE_FUNCTION_PARAMETERS.properties,
                required: [...MOVE_FUNCTION_PARAMETERS.required],
              },
            },
          ],
          tool_choice: { type: "tool", name: MOVE_FUNCTION_NAME },
        }),
        request.timeoutMs,
      );
    } catch (error) {
      throw translateError(error);
    }

    const rawResponse = JSON.stringify(response).slice(0, 2000);
    const toolUse = response.content.find(
      (block): block is Anthropic.Messages.ToolUseBlock => block.type === "tool_use",
    );

    if (!toolUse) {
      throw new AdapterError("INVALID_FORMAT", "Claude no devolvió una llamada a la función de jugada.");
    }

    const move = parseMoveArguments(toolUse.input, rawResponse);

    return { ...move, rawResponse };
  }
}

function translateError(error: unknown): AdapterError {
  if (error instanceof AdapterError) {
    return error;
  }

  if (error instanceof Anthropic.APIError) {
    if (error.status === 401 || error.status === 403) {
      return new AdapterError("AUTH", "Credenciales inválidas para Anthropic.");
    }

    if (error.status === 429) {
      return new AdapterError("RATE_LIMIT", "Límite de cuota alcanzado en Anthropic.");
    }

    if (error.status && error.status >= 500) {
      return new AdapterError("UNAVAILABLE", "Anthropic no está disponible en este momento.");
    }
  }

  return new AdapterError("UNAVAILABLE", `Error inesperado llamando a Anthropic: ${String(error)}`);
}
