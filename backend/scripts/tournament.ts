// "Modo torneo" reducido (ver docs/05-DECISIONES.md, 2026-10-09): en vez del
// barrido combinatorio completo (3 modelos × 3 niveles × 3 niveles = 81
// cruces de bando), corre cada modelo IA contra cada otro modelo IA UNA VEZ
// por color, en un único nivel fijo. Con 3 modelos eso son 6 partidas reales
// — suficiente para una comparativa real de "quién gana más" (RF-23/RF-24),
// sin el costo de tiempo/cuota del barrido completo.
//
// A diferencia de test-ten-moves.ts (que llama a los adaptadores
// directamente), este script llama a la API HTTP real (POST /api/games,
// POST /api/games/:id/ai-move), así que cada partida queda persistida en
// Neon exactamente igual que si se hubiera jugado desde la UI — aparece en
// la vista de Estadísticas y es exportable.
//
// Uso: con el backend corriendo (`npm run dev` en otra terminal, con las
// API keys ya configuradas en .env.local):
//   npx tsx scripts/tournament.ts
//
// Variables opcionales:
//   BASE_URL   (default http://localhost:3000)
//   DIFFICULTY (default advanced) — beginner | advanced | master, aplica a
//              ambos bandos por igual en todas las partidas para que la
//              comparación no mezcle niveles.
//   MOVE_DELAY_MS (default 1200) — pausa entre jugadas para no saturar las
//              APIs de los 3 proveedores.

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const DIFFICULTY = process.env.DIFFICULTY ?? "advanced";
const MOVE_DELAY_MS = Number(process.env.MOVE_DELAY_MS ?? 1200);
const MAX_PLIES = 200; // red de seguridad, no debería alcanzarse nunca

const MODEL_IDS = ["gemini-flash", "claude-haiku", "gpt-5-nano"] as const;
type ModelId = (typeof MODEL_IDS)[number];

interface GameStateDto {
  id: string;
  white: { participant: { id: string; displayName: string } };
  black: { participant: { id: string; displayName: string } };
  status: "configured" | "active" | "paused" | "finished" | "incident";
  result: "white_win" | "black_win" | "draw" | "technical_incident" | null;
  reason: string | null;
  moveCount: number;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createGame(whiteId: ModelId, blackId: ModelId): Promise<GameStateDto> {
  const response = await fetch(`${BASE_URL}/api/games`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      whiteParticipantId: whiteId,
      blackParticipantId: blackId,
      whiteDifficulty: DIFFICULTY,
      blackDifficulty: DIFFICULTY,
    }),
  });

  if (!response.ok) {
    throw new Error(`No se pudo crear la partida ${whiteId} vs ${blackId}: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as GameStateDto;
}

async function playOneMove(gameId: string): Promise<GameStateDto> {
  const response = await fetch(`${BASE_URL}/api/games/${gameId}/ai-move`, { method: "POST" });

  if (!response.ok) {
    throw new Error(`Fallo en ai-move para ${gameId}: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as GameStateDto;
}

async function playGameToCompletion(game: GameStateDto): Promise<GameStateDto> {
  let current = game;
  let plies = 0;

  while (current.status === "active" && plies < MAX_PLIES) {
    current = await playOneMove(current.id);
    plies += 1;
    process.stdout.write(".");
    await sleep(MOVE_DELAY_MS);
  }

  console.log("");

  if (current.status === "active") {
    console.log(`  (!) ${current.id}: alcanzó el límite de seguridad de ${MAX_PLIES} plies sin terminar.`);
  }

  return current;
}

interface Totals {
  played: number;
  wins: number;
  losses: number;
  draws: number;
  incidents: number;
}

function emptyTotals(): Totals {
  return { played: 0, wins: 0, losses: 0, draws: 0, incidents: 0 };
}

async function main() {
  const pairings: Array<[ModelId, ModelId]> = [];
  for (const white of MODEL_IDS) {
    for (const black of MODEL_IDS) {
      if (white !== black) pairings.push([white, black]);
    }
  }

  console.log(`=== Torneo reducido: ${pairings.length} partidas, nivel fijo "${DIFFICULTY}" ===\n`);

  const totals: Record<ModelId, Totals> = {
    "gemini-flash": emptyTotals(),
    "claude-haiku": emptyTotals(),
    "gpt-5-nano": emptyTotals(),
  };

  const results: Array<{ white: ModelId; black: ModelId; game: GameStateDto }> = [];

  for (const [whiteId, blackId] of pairings) {
    console.log(`Jugando ${whiteId} (blancas) vs ${blackId} (negras)...`);

    const created = await createGame(whiteId, blackId);
    const finished = await playGameToCompletion(created);

    results.push({ white: whiteId, black: blackId, game: finished });

    totals[whiteId].played += 1;
    totals[blackId].played += 1;

    if (finished.status === "incident" || finished.result === "technical_incident") {
      totals[whiteId].incidents += 1;
      totals[blackId].incidents += 1;
      console.log(`  -> incidencia técnica (${finished.reason ?? "sin detalle"}), no cuenta como derrota deportiva\n`);
      continue;
    }

    if (finished.result === "draw") {
      totals[whiteId].draws += 1;
      totals[blackId].draws += 1;
      console.log(`  -> tablas (${finished.reason}), ${finished.moveCount} jugadas\n`);
    } else if (finished.result === "white_win") {
      totals[whiteId].wins += 1;
      totals[blackId].losses += 1;
      console.log(`  -> ganan blancas: ${whiteId} (${finished.reason}), ${finished.moveCount} jugadas\n`);
    } else if (finished.result === "black_win") {
      totals[blackId].wins += 1;
      totals[whiteId].losses += 1;
      console.log(`  -> ganan negras: ${blackId} (${finished.reason}), ${finished.moveCount} jugadas\n`);
    }
  }

  console.log("=== Resumen por modelo ===");
  for (const modelId of MODEL_IDS) {
    const t = totals[modelId];
    const decisive = t.played - t.incidents;
    const winRate = decisive > 0 ? ((t.wins / decisive) * 100).toFixed(1) : "—";
    console.log(
      `${modelId}: ${t.played} jugadas, ${t.wins}V/${t.losses}D/${t.draws}E, ${t.incidents} incidencia(s), ${winRate}% victorias (sobre partidas con resultado deportivo)`,
    );
  }

  console.log("\n=== IDs de partida (para revisar/exportar desde la UI) ===");
  for (const { white, black, game } of results) {
    console.log(`${white} vs ${black}: ${game.id}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
