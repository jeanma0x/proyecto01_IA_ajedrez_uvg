import OpenAI from "openai";

import { withTimeout, AdapterError } from "./adapters/types";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const COMMENTARY_MODEL = "openai/gpt-oss-120b";
const COMMENTARY_TIMEOUT_MS = 15_000;

export interface CommentaryRequest {
  fen: string;
  moveNumber: number;
  lastMove: { from: string; to: string };
}

// Modo comentarista (RF-29/30): narra la jugada, nunca elige una ni afecta
// la partida (RN-12). Usa Groq (gratis) a propósito — es una funcionalidad
// secundaria, no vale la pena gastar presupuesto de Gemini/Claude en ella.
export async function generateCommentary(apiKey: string, request: CommentaryRequest): Promise<string> {
  const client = new OpenAI({ apiKey, baseURL: GROQ_BASE_URL });

  const prompt = [
    "Eres el comentarista de una partida de ajedrez entre humanos e inteligencias artificiales.",
    `Posición actual en FEN: ${request.fen}`,
    `Se acaba de jugar el movimiento número ${request.moveNumber}: de ${request.lastMove.from} a ${request.lastMove.to}.`,
    "Da un comentario breve (1-2 frases), en español, en tono de narrador deportivo.",
    "No afirmes quién va ganando de forma categórica ni inventes amenazas que no puedas verificar con la posición dada.",
    "No sugieras ni elijas la próxima jugada — solo narra lo que ya ocurrió.",
  ].join("\n");

  try {
    const completion = await withTimeout(
      client.chat.completions.create({
        model: COMMENTARY_MODEL,
        temperature: 0.8,
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
      COMMENTARY_TIMEOUT_MS,
    );

    const text = completion.choices[0]?.message.content?.trim();

    if (!text) {
      throw new AdapterError("INVALID_FORMAT", "El comentarista no devolvió texto.");
    }

    return text;
  } catch (error) {
    if (error instanceof AdapterError) {
      throw error;
    }

    throw new AdapterError("UNAVAILABLE", `Error inesperado generando comentario: ${String(error)}`);
  }
}
