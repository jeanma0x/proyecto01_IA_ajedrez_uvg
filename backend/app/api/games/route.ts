import { NextResponse } from "next/server";
import type { Difficulty, GameSpeed } from "@prisma/client";

import { prisma } from "@/lib/db/client";
import { createInitialFen } from "@/lib/chess/engine";
import { gameInclude, serializeGame } from "@/lib/game/dto";
import { ApiError, handleRouteError } from "@/lib/http/errors";

interface CreateGameRequestBody {
  whiteParticipantId?: string;
  blackParticipantId?: string;
  whiteDifficulty?: Difficulty;
  blackDifficulty?: Difficulty;
  speed?: GameSpeed;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateGameRequestBody;

    if (!body.whiteParticipantId || !body.blackParticipantId) {
      throw new ApiError("VALIDATION_ERROR", "Debe indicarse un participante para cada bando.");
    }

    const [whiteParticipant, blackParticipant] = await Promise.all([
      prisma.participant.findUnique({ where: { id: body.whiteParticipantId } }),
      prisma.participant.findUnique({ where: { id: body.blackParticipantId } }),
    ]);

    if (!whiteParticipant || !blackParticipant) {
      throw new ApiError("VALIDATION_ERROR", "Uno o ambos participantes no existen.");
    }

    if (whiteParticipant.type === "ai" && !body.whiteDifficulty) {
      throw new ApiError("VALIDATION_ERROR", "El participante IA de blancas requiere nivel de dificultad.");
    }

    if (blackParticipant.type === "ai" && !body.blackDifficulty) {
      throw new ApiError("VALIDATION_ERROR", "El participante IA de negras requiere nivel de dificultad.");
    }

    // Permitimos el mismo modelo en niveles distintos (ver docs/05-DECISIONES.md,
    // 2026-10-01) — solo bloqueamos si modelo Y nivel son idénticos.
    if (
      whiteParticipant.type === "ai" &&
      blackParticipant.type === "ai" &&
      whiteParticipant.id === blackParticipant.id &&
      body.whiteDifficulty === body.blackDifficulty
    ) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Selecciona un modelo distinto o un nivel de dificultad distinto para cada bando.",
      );
    }

    const game = await prisma.game.create({
      data: {
        whiteParticipantId: whiteParticipant.id,
        whiteDifficulty: whiteParticipant.type === "ai" ? body.whiteDifficulty : null,
        blackParticipantId: blackParticipant.id,
        blackDifficulty: blackParticipant.type === "ai" ? body.blackDifficulty : null,
        status: "active",
        fen: createInitialFen(),
        turn: "white",
        speed: body.speed ?? "normal",
        startedAt: new Date(),
      },
      include: gameInclude,
    });

    return NextResponse.json(serializeGame(game), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
