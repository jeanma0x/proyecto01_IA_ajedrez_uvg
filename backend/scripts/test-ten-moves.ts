// Prueba de viabilidad de un modelo: 10 movimientos legales consecutivos,
// alternando colores, usando el adaptador real. Ver checklist en
// docs/04-MODELOS_PENDIENTE.md. Uso: npx tsx scripts/test-ten-moves.ts
import { GoogleAdapter } from "../lib/adapters/google";
import { MistralAdapter } from "../lib/adapters/mistral";
import { GroqAdapter } from "../lib/adapters/groq";
import { AdapterError } from "../lib/adapters/types";
import type { AiAdapter } from "../lib/adapters/types";
import { applyMove, createInitialFen, getLegalMovesSan, getTerminalState } from "../lib/chess/engine";

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

  for (let i = 1; i <= moveCount; i++) {
    const legalMovesSan = getLegalMovesSan(fen);
    let moveAccepted = false;
    let attempts = 0;

    while (!moveAccepted && attempts < 5) {
      attempts += 1;

      try {
        const move = await adapter.requestMove({
          fen,
          color,
          difficulty: "beginner",
          legalMovesSan,
          recentSanHistory: [],
          timeoutMs: 15000,
        });

        const applied = applyMove(fen, move);
        fen = applied.fenAfter;
        console.log(`  #${i} (${color}): ${applied.san} [ok, intento ${attempts}]`);
        accepted += 1;
        moveAccepted = true;
      } catch (error) {
        if (error instanceof AdapterError && error.code === "UNAVAILABLE" && attempts < 5) {
          transientRetries += 1;
          console.log(`  #${i} (${color}): servicio no disponible (intento ${attempts}), reintentando en 5s...`);
          await sleep(5000);
          continue;
        }

        rejectedDefinitive += 1;
        console.log(`  #${i} (${color}): FALLÓ definitivamente tras ${attempts} intento(s): ${String(error)}`);
        moveAccepted = true;
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

  if (process.env.MISTRAL_API_KEY) {
    await runTenMoves("Mistral AI", new MistralAdapter(process.env.MISTRAL_API_KEY));
  }

  if (process.env.GROQ_API_KEY) {
    await runTenMoves("Groq (OpenAI gpt-oss)", new GroqAdapter(process.env.GROQ_API_KEY));
  }
}

main();
