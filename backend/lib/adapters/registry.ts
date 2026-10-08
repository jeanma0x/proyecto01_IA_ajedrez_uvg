import { GoogleAdapter } from "./google";
import { AnthropicAdapter } from "./anthropic";
import { OpenAiAdapter } from "./openai";
import { AdapterError } from "./types";
import type { AiAdapter } from "./types";

let googleAdapter: AiAdapter | null = null;
let anthropicAdapter: AiAdapter | null = null;
let openaiAdapter: AiAdapter | null = null;

// Participant.id (ver prisma/seed.ts) -> instancia de adaptador. Centralizar
// aquí evita llamadas directas a un SDK de proveedor fuera de esta capa
// (ver CLAUDE.md, "convenciones de código").
export function getAdapterForParticipantId(participantId: string): AiAdapter {
  switch (participantId) {
    case "gemini-flash": {
      googleAdapter ??= new GoogleAdapter(requireEnv("GEMINI_API_KEY"));
      return googleAdapter;
    }

    case "claude-haiku": {
      anthropicAdapter ??= new AnthropicAdapter(requireEnv("ANTHROPIC_API_KEY"));
      return anthropicAdapter;
    }

    case "gpt-5-nano": {
      openaiAdapter ??= new OpenAiAdapter(requireEnv("OPENAI_API_KEY"));
      return openaiAdapter;
    }

    default:
      throw new AdapterError("UNAVAILABLE", `No hay adaptador configurado para el participante "${participantId}".`);
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new AdapterError("AUTH", `Falta configurar la variable de entorno ${name}.`);
  }

  return value;
}
