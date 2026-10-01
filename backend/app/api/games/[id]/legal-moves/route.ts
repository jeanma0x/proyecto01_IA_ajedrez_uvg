import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/client";
import { getLegalTargets } from "@/lib/chess/engine";
import { ApiError, handleRouteError } from "@/lib/http/errors";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const from = new URL(request.url).searchParams.get("from");

    if (!from) {
      throw new ApiError("VALIDATION_ERROR", "Debe indicarse una casilla de origen.");
    }

    const game = await prisma.game.findUnique({ where: { id }, select: { fen: true, status: true } });

    if (!game) {
      throw new ApiError("GAME_NOT_FOUND", "La partida solicitada no existe.");
    }

    if (game.status !== "active") {
      throw new ApiError("GAME_NOT_ACTIVE", "La partida no está activa.");
    }

    return NextResponse.json({ from, targets: getLegalTargets(game.fen, from) });
  } catch (error) {
    return handleRouteError(error);
  }
}
