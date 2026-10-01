import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/client";
import { gameInclude, serializeGame } from "@/lib/game/dto";
import { ApiError, handleRouteError } from "@/lib/http/errors";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const format = new URL(request.url).searchParams.get("format") ?? "json";

    const game = await prisma.game.findUnique({ where: { id }, include: gameInclude });

    if (!game) {
      throw new ApiError("GAME_NOT_FOUND", "La partida solicitada no existe.");
    }

    const moves = await prisma.move.findMany({ where: { gameId: id }, orderBy: { ply: "asc" } });

    if (format === "csv") {
      const header = "ply,color,piece,from,to,san,fenAfter";
      const rows = moves.map(
        (move) => `${move.ply},${move.color},${move.piece},${move.from},${move.to},${move.san},${move.fenAfter}`,
      );

      return new NextResponse([header, ...rows].join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="game-${id}.csv"`,
        },
      });
    }

    if (format === "pgn") {
      return new NextResponse(buildPgn(game, moves), {
        headers: {
          "Content-Type": "application/x-chess-pgn; charset=utf-8",
          "Content-Disposition": `attachment; filename="game-${id}.pgn"`,
        },
      });
    }

    return NextResponse.json({
      game: serializeGame(game),
      moves: moves.map((move) => ({
        ply: move.ply,
        color: move.color,
        piece: move.piece,
        from: move.from,
        to: move.to,
        san: move.san,
        fenAfter: move.fenAfter,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

function buildPgn(
  game: { whiteParticipant: { displayName: string }; blackParticipant: { displayName: string }; result: string | null; startedAt: Date | null },
  moves: { ply: number; san: string; color: string }[],
): string {
  const pgnResult =
    game.result === "white_win" ? "1-0" : game.result === "black_win" ? "0-1" : game.result === "draw" ? "1/2-1/2" : "*";

  const headers = [
    `[Event "Duelo de Inteligencias"]`,
    `[Date "${game.startedAt ? game.startedAt.toISOString().slice(0, 10).replace(/-/g, ".") : "????.??.??"}"]`,
    `[White "${game.whiteParticipant.displayName}"]`,
    `[Black "${game.blackParticipant.displayName}"]`,
    `[Result "${pgnResult}"]`,
  ].join("\n");

  const body = moves
    .reduce<string[]>((lines, move) => {
      if (move.color === "white" || lines.length === 0) {
        lines.push(`${Math.ceil(move.ply / 2)}. ${move.san}`);
      } else {
        lines[lines.length - 1] += ` ${move.san}`;
      }

      return lines;
    }, [])
    .join(" ");

  return `${headers}\n\n${body} ${pgnResult}\n`;
}
