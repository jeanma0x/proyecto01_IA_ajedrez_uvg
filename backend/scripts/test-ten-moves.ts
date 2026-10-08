// Prueba de viabilidad de un modelo: 10 movimientos legales consecutivos,
// alternando colores, usando el adaptador real. Ver checklist en
// docs/04-MODELOS_PENDIENTE.md. Uso: npx tsx scripts/test-ten-moves.ts
import { GoogleAdapter } from "../lib/adapters/google";
import { AnthropicAdapter } from "../lib/adapters/anthropic";
import { OpenAiAdapter } from "../lib/adapters/openai";
import { AdapterError } from "../lib/adapters/types";
import type { AiAdapter } from "../lib/adapters/types";
import { applyMove, createInitialFen, getLegalMovesDetailed, getTerminalState } from "../lib/chess/engine";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTenMoves(name: string, adapter: AiAdapter, moveCount = 10) {
  console.log(`\n=== ${name} (${adapter.modelId}) — ${moveCount} movimientos, alternando colores ===`);

  let fen = createInitialFen();
  let color: "white" | "black" = "white";
  let accepted = 0;
  let rejectedDefinitive = 0;
  let transientRetries = 0;

  // Mismo criterio que el backend real (app/api/games/[id]/ai-move/route.ts):
  // una jugada ilegal/mal formada reintenta con el MISMO jugador y la misma
  // posición hasta MAX_INVALID_RETRIES veces; un fallo de servicio
  // (UNAVAILABLE) también reintenta, con una pausa. Si se agotan los
  // reintentos sin éxito, la partida terminaría como incidencia — igual que
  // en producción, no seguimos probando con un tablero desincronizado.
  const MAX_INVALID_RETRIES = 2;

  for (let i = 1; i <= moveCount; i++) {
    const legalMoves = getLegalMovesDetailed(fen);
    let moveAccepted = false;
    let invalidRetries = 0;
    let attempts = 0;

    while (!moveAccepted) {
      attempts += 1;

      try {
        const move = await adapter.requestMove({
          fen,
          color,
          difficulty: "beginner",
          legalMoves,
          recentSanHistory: [],
          timeoutMs: 15000,
        });

        const applied = applyMove(fen, move);
        fen = applied.fenAfter;
        console.log(`  #${i} (${color}): ${applied.san} [ok, intento ${attempts}]`);
        accepted += 1;
        moveAccepted = true;
      } catch (error) {
        if (error instanceof AdapterError && error.code === "UNAVAILABLE") {
          transientRetries += 1;
          console.log(`  #${i} (${color}): servicio no disponible (intento ${attempts}), reintentando en 5s...`);
          await sleep(5000);
          continue;
        }

        if (invalidRetries < MAX_INVALID_RETRIES) {
          invalidRetries += 1;
          console.log(
            `  #${i} (${color}): jugada inválida (reintento ${invalidRetries}/${MAX_INVALID_RETRIES}): ${String(error)}`,
          );
          continue;
        }

        rejectedDefinitive += 1;
        console.log(
          `  #${i} (${color}): FALLÓ definitivamente tras agotar reintentos: ${String(error)} — se habría marcado como incidencia técnica`,
        );
        console.log(`  Resumen: ${accepted}/${moveCount} aceptados, ${rejectedDefinitive} fallo(s) definitivo(s), ${transientRetries} reintentos por servicio no disponible.`);
        return;
      }
    }

    color = color === "white" ? "black" : "white";

    const terminal = getTerminalState(fen);
    if (terminal.isOver) {
      console.log(`  Partida terminada antes de los ${moveCount}: ${terminal.reason}`);
      break;
    }

    await sleep(2000);
  }

  console.log(
    `  Resumen: ${accepted}/${moveCount} aceptados, ${rejectedDefinitive} fallos definitivos, ${transientRetries} reintentos por servicio no disponible.`,
  );
}

async function main() {
  if (process.env.GEMINI_API_KEY) {
    await runTenMoves("Google Gemini", new GoogleAdapter(process.env.GEMINI_API_KEY));
  }

  if (process.env.ANTHROPIC_API_KEY) {
    await runTenMoves("Anthropic", new AnthropicAdapter(process.env.ANTHROPIC_API_KEY));
  }

  if (process.env.OPENAI_API_KEY) {
    await runTenMoves("OpenAI", new OpenAiAdapter(process.env.OPENAI_API_KEY));
  }
}

main();
