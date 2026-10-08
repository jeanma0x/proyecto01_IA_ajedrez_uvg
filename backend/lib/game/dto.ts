import type { Game, Participant } from "@prisma/client";

import { getCheckState } from "@/lib/chess/engine";

// Mismo contrato que frontend/src/types/api.ts GameState — mantener en sync.
export interface GameParticipantDto {
  participant: {
    id: string;
    type: "human" | "ai";
    displayName: string;
    company?: string;
    modelId?: string;
  };
  color: "white" | "black";
  difficulty?: "beginner" | "advanced" | "master";
}

export interface GameStateDto {
  id: string;
  white: GameParticipantDto;
  black: GameParticipantDto;
  status: "configured" | "active" | "paused" | "finished" | "incident";
  fen: string;
  turn: "white" | "black";
  result: "white_win" | "black_win" | "draw" | "technical_incident" | null;
  reason:
    | "checkmate"
    | "draw"
    | "stalemate"
    | "insufficient_material"
    | "threefold_repetition"
    | "fifty_move_rule"
    | "human_resignation"
    | "technical_incident"
    | null;
  speed: "normal" | "fast" | "maximum";
  startedAt: string | null;
  endedAt: string | null;
  moveCount: number;
  lastMove?: { from: string; to: string };
  isCheck: boolean;
  checkedSquare: string | null;
}

type GameWithParticipants = Game & {
  whiteParticipant: Participant;
  blackParticipant: Participant;
};

function serializeParticipant(participant: Participant): GameParticipantDto["participant"] {
  return {
    id: participant.id,
    type: participant.type,
    displayName: participant.displayName,
    company: participant.company ?? undefined,
    modelId: participant.modelId ?? undefined,
  };
}

export function serializeGame(game: GameWithParticipants): GameStateDto {
  const checkState = getCheckState(game.fen);

  return {
    id: game.id,
    white: {
      participant: serializeParticipant(game.whiteParticipant),
      color: "white",
      difficulty: game.whiteDifficulty ?? undefined,
    },
    black: {
      participant: serializeParticipant(game.blackParticipant),
      color: "black",
      difficulty: game.blackDifficulty ?? undefined,
    },
    status: game.status,
    fen: game.fen,
    turn: game.turn,
    result: game.result,
    reason: game.reason,
    speed: game.speed,
    startedAt: game.startedAt?.toISOString() ?? null,
    endedAt: game.endedAt?.toISOString() ?? null,
    moveCount: game.moveCount,
    lastMove:
      game.lastMoveFrom && game.lastMoveTo
        ? { from: game.lastMoveFrom, to: game.lastMoveTo }
        : undefined,
    isCheck: checkState.inCheck,
    checkedSquare: checkState.checkedSquare,
  };
}

export const gameInclude = {
  whiteParticipant: true,
  blackParticipant: true,
} as const;
