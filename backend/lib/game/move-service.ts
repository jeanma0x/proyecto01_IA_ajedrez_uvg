import type { Game, Participant } from "@prisma/client";

import { prisma } from "@/lib/db/client";
import { applyMove, getTerminalState } from "@/lib/chess/engine";
import { ApiError } from "@/lib/http/errors";

import { gameInclude } from "./dto";

export type GameWithParticipants = Game & {
  whiteParticipant: Participant;
  blackParticipant: Participant;
};

export async function loadActiveGame(gameId: string): Promise<GameWithParticipants> {
  const game = await prisma.game.findUnique({ where: { id: gameId }, include: gameInclude });

  if (!game) {
    throw new ApiError("GAME_NOT_FOUND", "La partida solicitada no existe.");
  }

  if (game.status !== "active") {
    throw new ApiError("GAME_NOT_ACTIVE", "La partida no está activa.");
  }

  return game;
}

export function currentTurnParticipant(game: GameWithParticipants): Participant {
  return game.turn === "white" ? game.whiteParticipant : game.blackParticipant;
}

interface MoveInput {
  from: string;
  to: string;
  promotion?: "q" | "r" | "b" | "n";
}

// Aplica un movimiento ya aceptado por el motor de reglas y persiste todo en
// una transacción — RNF-06: la posición oficial vive solo en el backend.
export async function commitMove(
  game: GameWithParticipants,
  move: MoveInput,
  latencyMs?: number,
): Promise<GameWithParticipants> {
  let applied;

  try {
    applied = applyMove(game.fen, move);
  } catch {
    throw new ApiError("ILLEGAL_MOVE", "El movimiento no es legal para la posición actual.", {
      from: move.from,
      to: move.to,
    });
  }

  const ply = game.moveCount + 1;
  const movingColor = game.turn;
  const nextTurn = movingColor === "white" ? "black" : "white";
  const terminal = getTerminalState(applied.fenAfter);

  return prisma.$transaction(async (tx) => {
    await tx.move.create({
      data: {
        gameId: game.id,
        ply,
        color: movingColor,
        piece: applied.piece,
        from: applied.from,
        to: applied.to,
        san: applied.san,
        fenAfter: applied.fenAfter,
        latencyMs,
      },
    });

    return tx.game.update({
      where: { id: game.id },
      data: {
        fen: applied.fenAfter,
        turn: nextTurn,
        moveCount: ply,
        lastMoveFrom: applied.from,
        lastMoveTo: applied.to,
        ...(terminal.isOver
          ? {
              status: "finished" as const,
              endedAt: new Date(),
              result: terminal.result,
              reason: terminal.reason,
            }
          : {}),
      },
      include: gameInclude,
    });
  });
}

export async function markAsIncident(gameId: string): Promise<GameWithParticipants> {
  return prisma.game.update({
    where: { id: gameId },
    data: {
      status: "incident",
      result: "technical_incident",
      reason: "technical_incident",
      endedAt: new Date(),
    },
    include: gameInclude,
  });
}
