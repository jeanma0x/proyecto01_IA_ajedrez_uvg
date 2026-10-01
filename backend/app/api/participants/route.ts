import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/client";
import { handleRouteError } from "@/lib/http/errors";

export async function GET() {
  try {
    const participants = await prisma.participant.findMany({ orderBy: { createdAt: "asc" } });

    return NextResponse.json(
      participants.map((participant) => ({
        id: participant.id,
        type: participant.type,
        displayName: participant.displayName,
        company: participant.company ?? undefined,
        modelId: participant.modelId ?? undefined,
      })),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
