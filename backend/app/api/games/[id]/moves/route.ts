import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/client";
import { serializeGame } from "@/lib/game/dto";
import { commitMove, currentTurnParticipant, loadActiveGame } from "@/lib/game/move-service";
import { ApiError, handleRouteError } from "@/lib/http/errors";

interface MakeMoveRequestBody {
  from?: string;
  to?: string;
  promotion?: "q" | "r" | "b" | "n";
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const moves = await prisma.move.findMany({ where: { gameId: id }, orderBy: { ply: "asc" } });

    return NextResponse.json(
      moves.map((move) => ({
        id: move.id,
        gameId: move.gameId,
        ply: move.ply,
        color: move.color,
        piece: move.piece,
        from: move.from,
        to: move.to,
        san: move.san,
        fenAfter: move.fenAfter,
        latencyMs: move.latencyMs ?? undefined,
      })),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as MakeMoveRequestBody;

    if (!body.from || !body.to) {
      throw new ApiError("VALIDATION_ERROR", "El movimiento requiere casilla de origen y destino.");
    }

    const game = await loadActiveGame(id);

    // Defensa adicional además del bloqueo del frontend (RF-09): el backend
    // no confía en que el cliente respete el turno (RN-05).
    if (currentTurnParticipant(game).type !== "human") {
      throw new ApiError("NOT_YOUR_TURN", "No es el turno de un participante humano.");
    }

    const updated = await commitMove(game, {
      from: body.from,
      to: body.to,
      promotion: body.promotion,
    });

    return NextResponse.json(serializeGame(updated));
  } catch (error) {
    return handleRouteError(error);
  }
}
