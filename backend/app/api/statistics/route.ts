import { NextResponse } from "next/server";
import type { Difficulty } from "@prisma/client";

import { computeStatistics } from "@/lib/game/statistics";
import { handleRouteError } from "@/lib/http/errors";

const VALID_DIFFICULTIES: Difficulty[] = ["beginner", "advanced", "master"];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const participantId = url.searchParams.get("participantId") ?? undefined;
    const difficultyParam = url.searchParams.get("difficulty");

    const difficulty =
      difficultyParam && VALID_DIFFICULTIES.includes(difficultyParam as Difficulty)
        ? (difficultyParam as Difficulty)
        : undefined;

    const statistics = await computeStatistics({ participantId, difficulty });

    return NextResponse.json(statistics);
  } catch (error) {
    return handleRouteError(error);
  }
}
