import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/client";
import { generateCommentary } from "@/lib/commentary";
import { AdapterError } from "@/lib/adapters/types";
import { ApiError, handleRouteError } from "@/lib/http/errors";

interface CommentaryRequestBody {
  fen?: string;
  moveNumber?: number;
  lastMove?: { from: string; to: string };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as CommentaryRequestBody;

    if (!body.fen || typeof body.moveNumber !== "number" || !body.lastMove) {
      throw new ApiError("VALIDATION_ERROR", "Faltan datos para generar el comentario.");
    }

    const game = await prisma.game.findUnique({ where: { id }, select: { id: true } });

    if (!game) {
      throw new ApiError("GAME_NOT_FOUND", "La partida solicitada no existe.");
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      throw new ApiError("AI_NOT_CONFIGURED", "El modo comentarista no está disponible todavía.");
    }

    let commentary: string;

    try {
      commentary = await generateCommentary(apiKey, {
        fen: body.fen,
        moveNumber: body.moveNumber,
        lastMove: body.lastMove,
      });
    } catch (error) {
      if (error instanceof AdapterError) {
        throw new ApiError("UNAVAILABLE", "No fue posible generar el comentario en este momento.");
      }

      throw error;
    }

    await prisma.commentary.create({
      data: {
        gameId: id,
        ply: body.moveNumber,
        provider: "OpenAI (vía Groq)",
        text: commentary,
      },
    });

    return NextResponse.json({ commentary });
  } catch (error) {
    return handleRouteError(error);
  }
}
