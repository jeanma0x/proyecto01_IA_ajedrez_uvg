import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/client";
import { gameInclude, serializeGame } from "@/lib/game/dto";
import { buildGameWorkbook } from "@/lib/game/exportXlsx";
import { ApiError, handleRouteError } from "@/lib/http/errors";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const format = new URL(request.url).searchParams.get("format") ?? "json";

    const game = await prisma.game.findUnique({ where: { id }, include: gameInclude });

    if (!game) {
      throw new ApiError("GAME_NOT_FOUND", "La partida solicitada no existe.");
    }

    const [moves, aiAttempts] = await Promise.all([
      prisma.move.findMany({ where: { gameId: id }, orderBy: { ply: "asc" } }),
      prisma.aiAttempt.findMany({
        where: { gameId: id },
        orderBy: [{ ply: "asc" }, { retryNumber: "asc" }],
      }),
    ]);

    if (format === "csv") {
      // Comillas en fenAfter por defensa (RFC 4180): aunque el FEN actual no
      // trae comas, cualquier campo de texto libre debería ir entrecomillado
      // para abrir limpio en Excel/pandas sin depender de su contenido.
      const header = "ply,color,piece,from,to,san,fenAfter,latencyMs";
      const rows = moves.map(
        (move) =>
          `${move.ply},${move.color},${move.piece},${move.from},${move.to},${move.san},"${move.fenAfter}",${move.latencyMs ?? ""}`,
      );

      // "sep=," como primera línea: sin esto, Excel usa el separador de
      // listas de la configuración regional de Windows/macOS (en varias
      // configuraciones en español es ";", no ","), y todo el archivo se ve
      // aplastado en una sola columna al abrirlo con doble clic. Esta
      // directiva la reconoce Excel explícitamente sin importar la región —
      // solo hay que indicarle a quien procese el CSV por código (pandas,
      // scripts) que ignore la primera línea.
      const csv = ["sep=,", header, ...rows].join("\r\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="game-${id}.csv"`,
        },
      });
    }

    if (format === "xlsx") {
      const buffer = await buildGameWorkbook(
        {
          id: game.id,
          whiteParticipant: game.whiteParticipant,
          blackParticipant: game.blackParticipant,
          whiteDifficulty: game.whiteDifficulty,
          blackDifficulty: game.blackDifficulty,
          status: game.status,
          result: game.result,
          reason: game.reason,
          speed: game.speed,
          moveCount: game.moveCount,
          startedAt: game.startedAt,
          endedAt: game.endedAt,
        },
        moves.map((move) => ({
          ply: move.ply,
          color: move.color,
          piece: move.piece,
          from: move.from,
          to: move.to,
          san: move.san,
          fenAfter: move.fenAfter,
          latencyMs: move.latencyMs,
        })),
        aiAttempts.map((attempt) => ({
          ply: attempt.ply,
          provider: attempt.provider,
          modelId: attempt.modelId,
          difficulty: attempt.difficulty,
          retryNumber: attempt.retryNumber,
          outcome: attempt.outcome,
          latencyMs: attempt.latencyMs,
        })),
      );

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="game-${id}.xlsx"`,
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

    // JSON: incluye también los intentos de IA (reintentos, errores,
    // latencia) — es la misma información que ya se le muestra a Jorge para
    // el análisis de resultados (rúbrica ítem 10), así no tiene que volver a
    // consultar la base de datos aparte para esos datos. Se omite
    // rawResponse a propósito (son payloads crudos de proveedor, no aportan
    // al análisis y pueden tener texto sensible/ruidoso).
    return NextResponse.json(
      {
        game: serializeGame(game),
        moves: moves.map((move) => ({
          ply: move.ply,
          color: move.color,
          piece: move.piece,
          from: move.from,
          to: move.to,
          san: move.san,
          fenAfter: move.fenAfter,
          latencyMs: move.latencyMs,
        })),
        aiAttempts: aiAttempts.map((attempt) => ({
          ply: attempt.ply,
          provider: attempt.provider,
          modelId: attempt.modelId,
          difficulty: attempt.difficulty,
          retryNumber: attempt.retryNumber,
          outcome: attempt.outcome,
          latencyMs: attempt.latencyMs,
        })),
      },
      {
        headers: {
          "Content-Disposition": `attachment; filename="game-${id}.json"`,
        },
      },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

interface PgnParticipant {
  displayName: string;
  company?: string | null;
  modelId?: string | null;
}

function buildPgn(
  game: {
    whiteParticipant: PgnParticipant;
    blackParticipant: PgnParticipant;
    whiteDifficulty: string | null;
    blackDifficulty: string | null;
    result: string | null;
    reason: string | null;
    startedAt: Date | null;
  },
  moves: { ply: number; san: string; color: string }[],
): string {
  const pgnResult =
    game.result === "white_win" ? "1-0" : game.result === "black_win" ? "0-1" : game.result === "draw" ? "1/2-1/2" : "*";

  // Etiquetas no estándar (Company/Difficulty) son válidas en PGN — los
  // lectores que no las reconocen simplemente las ignoran — y dejan la
  // partida autodocumentada sin tener que cruzarla con la base de datos.
  const headers = [
    `[Event "Duelo de Inteligencias"]`,
    `[Date "${game.startedAt ? game.startedAt.toISOString().slice(0, 10).replace(/-/g, ".") : "????.??.??"}"]`,
    `[White "${game.whiteParticipant.displayName}"]`,
    `[Black "${game.blackParticipant.displayName}"]`,
    `[Result "${pgnResult}"]`,
    ...(game.whiteParticipant.company ? [`[WhiteCompany "${game.whiteParticipant.company}"]`] : []),
    ...(game.blackParticipant.company ? [`[BlackCompany "${game.blackParticipant.company}"]`] : []),
    ...(game.whiteDifficulty ? [`[WhiteDifficulty "${game.whiteDifficulty}"]`] : []),
    ...(game.blackDifficulty ? [`[BlackDifficulty "${game.blackDifficulty}"]`] : []),
    `[Termination "${game.reason === "technical_incident" ? "abandoned" : "normal"}"]`,
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

  return `${headers}\n\n${body}${body ? " " : ""}${pgnResult}\n`;
}
