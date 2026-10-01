import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/client";
import { gameInclude, serializeGame } from "@/lib/game/dto";
import { ApiError, handleRouteError } from "@/lib/http/errors";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const game = await prisma.game.findUnique({ where: { id }, include: gameInclude });

    if (!game) {
      throw new ApiError("GAME_NOT_FOUND", "La partida solicitada no existe.");
    }

    return NextResponse.json(serializeGame(game));
  } catch (error) {
    return handleRouteError(error);
  }
}
