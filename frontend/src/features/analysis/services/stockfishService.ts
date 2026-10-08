
export interface StockfishEvaluation {
  scoreCp: number | null;
  mate: number | null;
  bestMove: string | null;
  depth: number;
}

type StockfishListener = (line: string) => void;

export class StockfishService {
  private worker: Worker | null = null;

  private ready = false;
  private destroyed = false;

  private initializationPromise: Promise<void> | null = null;
  private analysisPromise: Promise<StockfishEvaluation> | null = null;

  private listeners = new Set<StockfishListener>();

  private workerError: Error | null = null;

  private readonly WORKER_URL =
    "/stockfish/stockfish-19-lite-single.js";

  private readonly INITIALIZATION_TIMEOUT = 20000;
  private readonly ANALYSIS_TIMEOUT = 30000;

  // ==========================================
  // INICIAR MOTOR
  // ==========================================

  async initialize(): Promise<void> {
    if (this.destroyed) {
      throw new Error("El servicio de Stockfish fue cerrado.");
    }

    if (this.ready) return;

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.startEngine();

    try {
      await this.initializationPromise;
    } catch (error) {
      this.resetEngine();
      throw error;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async startEngine(): Promise<void> {
    if (!this.worker) {
      this.createWorker();
    }

    console.log("[Stockfish] Iniciando motor...");

    // Registrar listener antes de enviar el comando.
    const uciReady = this.waitFor(
      "uciok",
      this.INITIALIZATION_TIMEOUT,
    );

    this.send("uci");

    await uciReady;

    console.log("[Stockfish] Protocolo UCI inicializado.");

    const engineReady = this.waitFor(
      "readyok",
      this.INITIALIZATION_TIMEOUT,
    );

    this.send("isready");

    await engineReady;

    this.ready = true;

    console.log("[Stockfish] Motor listo para analizar.");
  }

  // ==========================================
  // CREAR WEB WORKER
  // ==========================================

  private createWorker(): void {
    try {
      this.worker = new Worker(this.WORKER_URL);

      this.workerError = null;

      this.worker.onmessage = (event: MessageEvent) => {
        const data = event.data;

        const lines =
          typeof data === "string"
            ? data.split(/\r?\n/)
            : [];

        for (const line of lines) {
          const trimmed = line.trim();

          if (!trimmed) continue;

          for (const listener of [...this.listeners]) {
            listener(trimmed);
          }
        }
      };

      this.worker.onerror = (event: ErrorEvent) => {
        console.error(
          "[Stockfish] Error del Web Worker:",
          event.message,
        );

        this.workerError = new Error(
          event.message ||
            "No fue posible cargar el motor Stockfish.",
        );

        this.dispatchError(this.workerError);
      };

      this.worker.onmessageerror = () => {
        this.workerError = new Error(
          "Stockfish devolvió un mensaje no válido.",
        );

        this.dispatchError(this.workerError);
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? `No se pudo iniciar Stockfish: ${error.message}`
          : "No se pudo crear el Web Worker de Stockfish.",
      );
    }
  }

  // ==========================================
  // ENVIAR COMANDOS UCI
  // ==========================================

  private send(command: string): void {
    if (this.destroyed) {
      throw new Error("Stockfish ya fue cerrado.");
    }

    if (!this.worker) {
      throw new Error("El motor Stockfish no está inicializado.");
    }

    if (this.workerError) {
      throw this.workerError;
    }

    this.worker.postMessage(command);
  }

  // ==========================================
  // ESPERAR RESPUESTA DEL MOTOR
  // ==========================================

  private waitFor(
    expected: string,
    timeoutMs: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let completed = false;

      const cleanup = () => {
        window.clearTimeout(timeout);
        this.listeners.delete(listener);
      };

      const listener: StockfishListener = (line) => {
        if (completed) return;

        if (line.startsWith("__WORKER_ERROR__:")) {
          completed = true;
          cleanup();

          reject(
            new Error(
              line.replace("__WORKER_ERROR__:", ""),
            ),
          );

          return;
        }

        if (line.includes(expected)) {
          completed = true;
          cleanup();
          resolve();
        }
      };

      const timeout = window.setTimeout(() => {
        if (completed) return;

        completed = true;
        cleanup();

        reject(
          new Error(
            `Stockfish no respondió: ${expected}. Comprueba que los archivos JS y WASM estén disponibles.`,
          ),
        );
      }, timeoutMs);

      this.listeners.add(listener);
    });
  }

  // ==========================================
  // NOTIFICAR ERRORES
  // ==========================================

  private dispatchError(error: Error): void {
    const message = `__WORKER_ERROR__:${error.message}`;

    for (const listener of [...this.listeners]) {
      listener(message);
    }
  }

  // ==========================================
  // ANALIZAR POSICIÓN
  // ==========================================

  async evaluate(
    fen: string,
    depth = 12,
  ): Promise<StockfishEvaluation> {
    if (this.destroyed) {
      throw new Error("Stockfish ya fue cerrado.");
    }

    if (this.analysisPromise) {
      throw new Error(
        "Stockfish ya está analizando otra posición.",
      );
    }

    // Reservar la operación antes de cualquier await,
    // para evitar dos análisis simultáneos.
    const operation = this.performEvaluation(fen, depth);
    this.analysisPromise = operation;

    try {
      return await operation;
    } finally {
      if (this.analysisPromise === operation) {
        this.analysisPromise = null;
      }
    }
  }

  private async performEvaluation(
    fen: string,
    depth: number,
  ): Promise<StockfishEvaluation> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      let scoreCp: number | null = null;
      let mate: number | null = null;
      let currentDepth = 0;
      let completed = false;

      const cleanup = () => {
        window.clearTimeout(timeout);
        this.listeners.delete(listener);
      };

      const fail = (error: Error) => {
        if (completed) return;

        completed = true;
        cleanup();

        this.resetEngine();
        reject(error);
      };

      const listener: StockfishListener = (line) => {
        if (completed) return;

        if (line.startsWith("__WORKER_ERROR__:")) {
          fail(
            new Error(
              line.replace("__WORKER_ERROR__:", ""),
            ),
          );
          return;
        }

        if (line.startsWith("info ")) {
          const depthMatch = line.match(/\bdepth (\d+)/);
          const cpMatch = line.match(/\bscore cp (-?\d+)/);
          const mateMatch = line.match(/\bscore mate (-?\d+)/);

          if (depthMatch) {
            const reportedDepth = Number(depthMatch[1]);

            if (reportedDepth >= currentDepth) {
              if (cpMatch || mateMatch) {
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
        }

        if (line.startsWith("bestmove")) {
          completed = true;
          cleanup();

          const bestMoveRaw = line.split(/\s+/)[1];

          const bestMove =
            bestMoveRaw &&
            bestMoveRaw !== "(none)" &&
            bestMoveRaw !== "0000"
              ? bestMoveRaw
              : null;

          resolve({
            scoreCp,
            mate,
            bestMove,
            depth: currentDepth,
          });
        }
      };

      const timeout = window.setTimeout(() => {
        fail(
          new Error(
            "El análisis de Stockfish tardó demasiado.",
          ),
        );
      }, this.ANALYSIS_TIMEOUT);

      // Escuchar ANTES de enviar comandos.
      this.listeners.add(listener);

      try {
        this.send(`position fen ${fen}`);
        this.send(`go depth ${depth}`);
      } catch (error) {
        fail(
          error instanceof Error
            ? error
            : new Error("No se pudo iniciar el análisis."),
        );
      }
    });
  }

  // ==========================================
  // REINICIAR MOTOR
  // ==========================================

  private resetEngine(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    this.ready = false;
    this.workerError = null;
    this.listeners.clear();
  }

  // ==========================================
  // CERRAR MOTOR
  // ==========================================

  destroy(): void {
    this.destroyed = true;

    this.resetEngine();
  }
}
