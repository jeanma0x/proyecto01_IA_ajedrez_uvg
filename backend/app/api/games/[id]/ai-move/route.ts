import { NextResponse } from "next/server";
import type { AiAttemptOutcome, Difficulty } from "@prisma/client";

import { prisma } from "@/lib/db/client";
import { getLegalMovesDetailed, isMoveLegal } from "@/lib/chess/engine";
import { getAdapterForParticipantId } from "@/lib/adapters/registry";
import { AdapterError } from "@/lib/adapters/types";
import type { AdapterErrorCode } from "@/lib/adapters/types";
import { serializeGame } from "@/lib/game/dto";
import { commitMove, currentTurnParticipant, loadActiveGame, markAsIncident } from "@/lib/game/move-service";
import { ApiError, handleRouteError } from "@/lib/http/errors";

const MAX_RETRIES_ON_INVALID_MOVE = 2;
// RF-16 pide dar oportunidad de recuperación ante una falla de servicio, no
// matar la partida en el primer timeout/429/5xx. Evidencia real en
// producción (2026-10-09): timeouts y rate limits de Gemini/Claude son en su
// mayoría transitorios bajo carga de pruebas simultáneas — un reintento con
// pausa corta suele resolverse solo. AUTH no se reintenta (no se arregla
// solo). Ver docs/04-MODELOS_PENDIENTE.md.
const MAX_RETRIES_ON_SERVICE_ERROR = 2;
const SERVICE_ERROR_RETRY_DELAY_MS: Partial<Record<AdapterErrorCode, number>> = {
  TIMEOUT: 1500,
  UNAVAILABLE: 1500,
  RATE_LIMIT: 4000,
};
// Evidencia real (2026-10-09): jugadas exitosas de Gemini tardaron hasta
// 8.6s; con un límite de 9s, un solo pico de latencia normal terminaba la
// partida entera como incidencia sin dar chance de reintentar. Vercel Pro
// (Fluid Compute) soporta cientos de segundos, así que hay margen de sobra
// para subir este límite sin arriesgar el timeout de la plataforma.
const AI_REQUEST_TIMEOUT_MS = 20_000;
const RECENT_HISTORY_SIZE = 10;

const ADAPTER_ERROR_TO_OUTCOME: Record<AdapterErrorCode, AiAttemptOutcome> = {
  AUTH: "auth_error",
  RATE_LIMIT: "rate_limit",
  TIMEOUT: "timeout",
  UNAVAILABLE: "unavailable",
  INVALID_FORMAT: "invalid_format",
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const game = await loadActiveGame(id);

    const participant = currentTurnParticipant(game);

    if (participant.type !== "ai") {
      throw new ApiError("AI_NOT_CONFIGURED", "No es el turno de un participante IA.");
    }

    const difficulty = (game.turn === "white" ? game.whiteDifficulty : game.blackDifficulty) as Difficulty | null;

    if (!difficulty) {
      throw new ApiError("AI_NOT_CONFIGURED", "El participante IA no tiene nivel de dificultad configurado.");
    }

    let adapter: ReturnType<typeof getAdapterForParticipantId>;

    try {
      adapter = getAdapterForParticipantId(participant.id);
    } catch {
      // No exponer el nombre de la variable de entorno faltante al
      // frontend (RF-31) — solo un mensaje genérico y accionable.
      throw new ApiError(
        "AI_NOT_CONFIGURED",
        "Este modelo de IA no está disponible todavía. Elige otro rival o inténtalo más tarde.",
      );
    }

    const legalMoves = getLegalMovesDetailed(game.fen);

    const recentSanHistory = (
      await prisma.move.findMany({
        where: { gameId: game.id },
        orderBy: { ply: "desc" },
        take: RECENT_HISTORY_SIZE,
        select: { san: true },
      })
    )
      .reverse()
      .map((move) => move.san);

    let retryNumber = 0;
    let serviceRetryNumber = 0;
    // Sin esto, un reintento reenvía el prompt idéntico y el modelo tiende a
    // repetir la misma jugada rechazada (bug real: Claude repitió c6-f6 tres
    // veces seguidas el 2026-10-08, ver docs/04-MODELOS_PENDIENTE.md).
    let retryFeedback: string | undefined;

    while (true) {
      const startedAt = Date.now();

      try {
        const move = await adapter.requestMove({
          fen: game.fen,
          color: game.turn,
          difficulty,
          legalMoves,
          recentSanHistory,
          timeoutMs: AI_REQUEST_TIMEOUT_MS,
          retryFeedback,
        });

        const latencyMs = Date.now() - startedAt;

        if (!isMoveLegal(game.fen, move)) {
          await logAttempt(game.id, game.moveCount + 1, adapter, difficulty, retryNumber, "illegal_move", {
            rawResponse: move.rawResponse,
            parsedFrom: move.from,
            parsedTo: move.to,
            latencyMs,
          });

          if (retryNumber >= MAX_RETRIES_ON_INVALID_MOVE) {
            const incidentGame = await markAsIncident(game.id);
            return NextResponse.json(serializeGame(incidentGame));
          }

          retryNumber += 1;
          retryFeedback = `Tu intento anterior (${move.from}-${move.to}) NO es un movimiento legal en esta posición. No lo repitas — copia EXACTAMENTE una de las opciones origen-destino listadas arriba.`;
          continue;
        }

        await logAttempt(game.id, game.moveCount + 1, adapter, difficulty, retryNumber, "accepted", {
          rawResponse: move.rawResponse,
          parsedFrom: move.from,
          parsedTo: move.to,
          latencyMs,
        });

        const updated = await commitMove(game, move, latencyMs);
        return NextResponse.json(serializeGame(updated));
      } catch (error) {
        const latencyMs = Date.now() - startedAt;

        if (error instanceof AdapterError) {
          const outcome = ADAPTER_ERROR_TO_OUTCOME[error.code];

          await logAttempt(game.id, game.moveCount + 1, adapter, difficulty, retryNumber, outcome, {
            rawResponse: error.message,
            latencyMs,
          });

          // "Jugada inválida" (formato o legalidad) consume el presupuesto de
          // reintentos de RF-15. Un fallo de servicio (timeout/cuota/caído)
          // también se reintenta un par de veces con pausa corta antes de
          // declarar incidencia (RF-16: "pausar y permitir reintentar"), ya
          // que en producción la mayoría son transitorios bajo carga. AUTH
          // nunca se reintenta — una credencial inválida no se arregla sola.
          if (outcome === "invalid_format" && retryNumber < MAX_RETRIES_ON_INVALID_MOVE) {
            retryNumber += 1;
            retryFeedback = `Tu respuesta anterior no pudo interpretarse como una jugada válida (${error.message}). Responde solo con la llamada a la función, sin texto adicional.`;
            continue;
          }

          const serviceRetryDelayMs = SERVICE_ERROR_RETRY_DELAY_MS[error.code];

          if (serviceRetryDelayMs !== undefined && serviceRetryNumber < MAX_RETRIES_ON_SERVICE_ERROR) {
            serviceRetryNumber += 1;
            await sleep(serviceRetryDelayMs);
            continue;
          }

          const incidentGame = await markAsIncident(game.id);
          return NextResponse.json(serializeGame(incidentGame));
        }

        throw error;
      }
    }
  } catch (error) {
    return handleRouteError(error);
  }
}

async function logAttempt(
  gameId: string,
  ply: number,
  adapter: { provider: string; modelId: string },
  difficulty: Difficulty,
  retryNumber: number,
  outcome: AiAttemptOutcome,
  data: { rawResponse?: string; parsedFrom?: string; parsedTo?: string; latencyMs: number },
) {
  await prisma.aiAttempt.create({
    data: {
      gameId,
      ply,
      provider: adapter.provider,
      modelId: adapter.modelId,
      difficulty,
      retryNumber,
      outcome,
      rawResponse: data.rawResponse?.slice(0, 2000),
      parsedFrom: data.parsedFrom,
      parsedTo: data.parsedTo,
      latencyMs: data.latencyMs,
    },
  });
}
