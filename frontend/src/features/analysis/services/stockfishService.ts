
export interface StockfishEvaluation {
  scoreCp: number | null;
  mate: number | null;
  bestMove: string | null;
  depth: number;
}

export class StockfishService {
  private worker: Worker | null = null;

  private ready = false;

  private listeners = new Set<(line: string) => void>();

  async initialize(): Promise<void> {
    if (this.ready) return;

    if (!this.worker) {
      this.worker = new Worker(
        "/stockfish/stockfish-19-lite-single.js",
      );

      this.worker.onmessage = (event: MessageEvent) => {
        const data = event.data;

        const lines =
          typeof data === "string"
            ? data.split(/\r?\n/)
            : [];

        for (const line of lines) {
          for (const listener of this.listeners) {
            listener(line);
          }
        }
      };
    }

    this.send("uci");
    await this.waitFor("uciok");

    this.send("isready");
    await this.waitFor("readyok");

    this.ready = true;
  }

  private send(command: string): void {
    this.worker?.postMessage(command);
  }

  private waitFor(expected: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.listeners.delete(listener);
        reject(new Error(`Stockfish no respondió: ${expected}`));
      }, 15000);

      const listener = (line: string) => {
        if (line.includes(expected)) {
          window.clearTimeout(timeout);
          this.listeners.delete(listener);
          resolve();
        }
      };

      this.listeners.add(listener);
    });
  }

  async evaluate(
    fen: string,
    depth = 12,
  ): Promise<StockfishEvaluation> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      let scoreCp: number | null = null;
      let mate: number | null = null;
      let currentDepth = 0;

      const timeout = window.setTimeout(() => {
        this.listeners.delete(listener);
        this.send("stop");
        reject(new Error("El análisis tardó demasiado."));
      }, 30000);

      const listener = (line: string) => {
        if (line.startsWith("info depth")) {
          const depthMatch = line.match(/\bdepth (\d+)/);
          const cpMatch = line.match(/\bscore cp (-?\d+)/);
          const mateMatch = line.match(/\bscore mate (-?\d+)/);

          if (depthMatch) {
            const reportedDepth = Number(depthMatch[1]);

            if (reportedDepth >= currentDepth) {
              currentDepth = reportedDepth;

              if (cpMatch) {
                scoreCp = Number(cpMatch[1]);
                mate = null;
              } else if (mateMatch) {
                mate = Number(mateMatch[1]);
                scoreCp = null;
              }
            }
          }
        }

        if (line.startsWith("bestmove")) {
          window.clearTimeout(timeout);
          this.listeners.delete(listener);

          const bestMove =
            line.split(" ")[1] ?? null;

          resolve({
            scoreCp,
            mate,
            bestMove,
            depth: currentDepth,
          });
        }
      };

      this.listeners.add(listener);

      this.send(`position fen ${fen}`);
      this.send(`go depth ${depth}`);
    });
  }

  destroy(): void {
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
    this.listeners.clear();
  }
}
