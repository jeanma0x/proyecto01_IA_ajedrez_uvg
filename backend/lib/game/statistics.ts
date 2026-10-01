import type { Difficulty } from "@prisma/client";

import { prisma } from "@/lib/db/client";

export interface StatisticRow {
  participantId: string;
  displayName: string;
  difficulty: Difficulty | null;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  avgMovesPerWin: number | null;
}

interface StatisticsFilter {
  participantId?: string;
  difficulty?: Difficulty;
}

// RN-09: las partidas por incidencia técnica no cuentan para estas
// estadísticas deportivas — solo "finished" entra aquí.
export async function computeStatistics(filter: StatisticsFilter = {}): Promise<StatisticRow[]> {
  const games = await prisma.game.findMany({
    where: {
      status: "finished",
      ...(filter.participantId
        ? { OR: [{ whiteParticipantId: filter.participantId }, { blackParticipantId: filter.participantId }] }
        : {}),
    },
    include: { whiteParticipant: true, blackParticipant: true },
  });

  interface Bucket {
    participantId: string;
    displayName: string;
    difficulty: Difficulty | null;
    played: number;
    wins: number;
    losses: number;
    draws: number;
    movesInWins: number[];
  }

  const buckets = new Map<string, Bucket>();

  function recordSide(
    participantId: string,
    displayName: string,
    difficulty: Difficulty | null,
    color: "white" | "black",
    result: string,
    moveCount: number,
  ) {
    if (filter.difficulty && difficulty !== filter.difficulty) {
      return;
    }

    const key = `${participantId}:${difficulty ?? "none"}`;
    const bucket = buckets.get(key) ?? {
      participantId,
      displayName,
      difficulty,
      played: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      movesInWins: [],
    };

    bucket.played += 1;

    if (result === "draw") {
      bucket.draws += 1;
    } else if (result === `${color}_win`) {
      bucket.wins += 1;
      bucket.movesInWins.push(moveCount);
    } else if (result === "white_win" || result === "black_win") {
      bucket.losses += 1;
    }

    buckets.set(key, bucket);
  }

  for (const game of games) {
    if (!game.result || game.result === "technical_incident") {
      continue;
    }

    recordSide(
      game.whiteParticipant.id,
      game.whiteParticipant.displayName,
      game.whiteDifficulty,
      "white",
      game.result,
      game.moveCount,
    );

    recordSide(
      game.blackParticipant.id,
      game.blackParticipant.displayName,
      game.blackDifficulty,
      "black",
      game.result,
      game.moveCount,
    );
  }

  return [...buckets.values()].map((bucket) => ({
    participantId: bucket.participantId,
    displayName: bucket.displayName,
    difficulty: bucket.difficulty,
    played: bucket.played,
    wins: bucket.wins,
    losses: bucket.losses,
    draws: bucket.draws,
    winRate: bucket.played > 0 ? (bucket.wins / bucket.played) * 100 : 0,
    avgMovesPerWin:
      bucket.movesInWins.length > 0
        ? bucket.movesInWins.reduce((sum, value) => sum + value, 0) / bucket.movesInWins.length
        : null,
  }));
}
