import { NextResponse } from "next/server";
import type { GameSpeed } from "@prisma/client";

import { prisma } from "@/lib/db/client";
import { gameInclude, serializeGame } from "@/lib/game/dto";
import { ApiError, handleRouteError } from "@/lib/http/errors";

interface GameControlRequestBody {
  action?: "pause" | "resume" | "change_speed";
  speed?: GameSpeed;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as GameControlRequestBody;

    const game = await prisma.game.findUnique({ where: { id } });

    if (!game) {
      throw new ApiError("GAME_NOT_FOUND", "La partida solicitada no existe.");
    }

    if (body.action === "pause") {
      if (game.status !== "active") {
        throw new ApiError("GAME_NOT_ACTIVE", "Solo una partida activa puede pausarse.");
      }

      const updated = await prisma.game.update({
        where: { id },
        data: { status: "paused" },
        include: gameInclude,
      });

      return NextResponse.json(serializeGame(updated));
    }

    if (body.action === "resume") {
      if (game.status !== "paused") {
        throw new ApiError("GAME_NOT_ACTIVE", "Solo una partida pausada puede reanudarse.");
      }

      const updated = await prisma.game.update({
        where: { id },
        data: { status: "active" },
        include: gameInclude,
      });

      return NextResponse.json(serializeGame(updated));
    }

    if (body.action === "change_speed") {
      if (!body.speed) {
        throw new ApiError("VALIDATION_ERROR", "Debe indicarse una velocidad.");
      }

      const updated = await prisma.game.update({
        where: { id },
        data: { speed: body.speed },
        include: gameInclude,
      });

      return NextResponse.json(serializeGame(updated));
    }

    throw new ApiError("VALIDATION_ERROR", "Acción de control no reconocida.");
  } catch (error) {
    return handleRouteError(error);
  }
}
