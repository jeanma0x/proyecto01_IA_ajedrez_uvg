import { NextResponse } from "next/server";
import type { AiAttemptOutcome, Difficulty } from "@prisma/client";

import { prisma } from "@/lib/db/client";
import { getLegalMovesSan, isMoveLegal } from "@/lib/chess/engine";
import { getAdapterForParticipantId } from "@/lib/adapters/registry";
import { AdapterError } from "@/lib/adapters/types";
import type { AdapterErrorCode } from "@/lib/adapters/types";
import { serializeGame } from "@/lib/game/dto";
import { commitMove, currentTurnParticipant, loadActiveGame, markAsIncident } from "@/lib/game/move-service";
import { ApiError, handleRouteError } from "@/lib/http/errors";

const MAX_RETRIES_ON_INVALID_MOVE = 2;
const AI_REQUEST_TIMEOUT_MS = 9_000;
const RECENT_HISTORY_SIZE = 10;

const ADAPTER_ERROR_TO_OUTCOME: Record<AdapterErrorCode, AiAttemptOutcome> = {
  AUTH: "auth_error",
  RATE_LIMIT: "rate_limit",
  TIMEOUT: "timeout",
  UNAVAILABLE: "unavailable",
  INVALID_FORMAT: "invalid_format",
};

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

    const legalMovesSan = getLegalMovesSan(game.fen);

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

    while (true) {
      const startedAt = Date.now();

      try {
        const move = await adapter.requestMove({
          fen: game.fen,
          color: game.turn,
          difficulty,
          legalMovesSan,
          recentSanHistory,
          timeoutMs: AI_REQUEST_TIMEOUT_MS,
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

          // Solo "jugada inválida" (formato o legalidad) consume el
          // presupuesto de reintentos (RF-15). Un fallo de servicio
          // (auth/cuota/timeout/caído) pasa directo a incidencia (RF-16).
          if (outcome === "invalid_format" && retryNumber < MAX_RETRIES_ON_INVALID_MOVE) {
            retryNumber += 1;
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
