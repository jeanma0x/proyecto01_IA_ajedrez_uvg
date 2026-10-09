import { describe, expect, it } from "vitest";

import {
  applyMove,
  createInitialFen,
  getCheckState,
  getLegalMovesDetailed,
  getLegalTargets,
  getTerminalState,
  getTurnColor,
  isMoveLegal,
} from "./engine";

// RF-10/RF-12: el motor de reglas (chess.js) es la única autoridad de la
// posición — estas pruebas cubren exactamente lo que el enunciado pide
// verificar: enroque, promoción, al paso, jaque, jaque mate, tablas, y el
// rechazo de movimientos ilegales (RN-05, RN-06).

describe("createInitialFen / getTurnColor", () => {
  it("empieza con las blancas en turno", () => {
    const fen = createInitialFen();
    expect(getTurnColor(fen)).toBe("white");
  });
});

describe("isMoveLegal", () => {
  const initialFen = createInitialFen();

  it("acepta un movimiento legal (peón de rey dos casillas)", () => {
    expect(isMoveLegal(initialFen, { from: "e2", to: "e4" })).toBe(true);
  });

  it("rechaza mover una pieza que no existe en el origen", () => {
    expect(isMoveLegal(initialFen, { from: "e4", to: "e5" })).toBe(false);
  });

  it("rechaza saltar sobre piezas propias con la torre", () => {
    expect(isMoveLegal(initialFen, { from: "a1", to: "a4" })).toBe(false);
  });

  it("no lanza excepción con casillas basura y simplemente responde false", () => {
    // Un movimiento mal formado nunca debe tumbar el proceso (RF-11/RN-06) —
    // isMoveLegal debe degradar a "false", no propagar la excepción interna
    // de chess.js.
    expect(isMoveLegal(initialFen, { from: "z9" as never, to: "z8" as never })).toBe(false);
  });
});

describe("applyMove", () => {
  it("aplica un movimiento legal y devuelve el FEN resultante actualizado", () => {
    const result = applyMove(createInitialFen(), { from: "e2", to: "e4" });

    expect(result.san).toBe("e4");
    expect(result.piece).toBe("p");
    expect(result.fenAfter).toContain(" b "); // le toca a negras después
  });

  it("lanza una excepción al aplicar un movimiento ilegal (no corrompe la posición)", () => {
    expect(() => applyMove(createInitialFen(), { from: "e2", to: "e5" })).toThrow();
  });

  it("aplica un enroque corto correctamente", () => {
    // Posición con el camino para el enroque corto blanco ya despejado.
    const fen = "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4";
    const result = applyMove(fen, { from: "e1", to: "g1" });

    expect(result.san).toBe("O-O");
  });

  it("aplica una promoción de peón a dama", () => {
    const fen = "8/P7/8/8/8/8/8/k6K w - - 0 1";
    const result = applyMove(fen, { from: "a7", to: "a8", promotion: "q" });

    // La nueva dama en a8 queda dando jaque al rey negro en a1 (columna 'a'
    // despejada) — chess.js anota el "+" de jaque en la SAN.
    expect(result.san).toBe("a8=Q+");
  });

  it("aplica una captura al paso", () => {
    // Peón blanco en e5, peón negro acaba de avanzar d7-d5 (al paso disponible en d6).
    const fen = "rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3";
    const result = applyMove(fen, { from: "e5", to: "d6" });

    expect(result.san).toBe("exd6");
  });
});

describe("getLegalTargets", () => {
  it("devuelve los destinos legales del caballo de rey en la posición inicial", () => {
    const targets = getLegalTargets(createInitialFen(), "g1");
    expect(targets.sort()).toEqual(["f3", "h3"]);
  });
});

describe("getLegalMovesDetailed", () => {
  it("devuelve movimientos en formato origen-destino que coinciden con la SAN", () => {
    const moves = getLegalMovesDetailed(createInitialFen());

    expect(moves.length).toBeGreaterThan(0);

    const e4 = moves.find((move) => move.from === "e2" && move.to === "e4");
    expect(e4?.san).toBe("e4");
  });

  it("incluye las 4 variantes de promoción cuando un peón corona", () => {
    const fen = "8/P7/8/8/8/8/8/k6K w - - 0 1";
    const moves = getLegalMovesDetailed(fen);
    const promotions = moves.filter((move) => move.from === "a7" && move.to === "a8");

    expect(promotions.map((move) => move.promotion).sort()).toEqual(["b", "n", "q", "r"]);
  });
});

describe("getCheckState", () => {
  it("detecta jaque y ubica la casilla del rey amenazado", () => {
    // Jaque mate pastor: Qxf7# — el rey negro en e8 queda en jaque.
    const fen = "r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4";
    const state = getCheckState(fen);

    expect(state.inCheck).toBe(true);
    expect(state.checkedSquare).toBe("e8");
  });

  it("no reporta jaque en la posición inicial", () => {
    const state = getCheckState(createInitialFen());
    expect(state.inCheck).toBe(false);
    expect(state.checkedSquare).toBeNull();
  });
});

describe("getTerminalState", () => {
  it("detecta jaque mate (mate pastor) y asigna el resultado al bando correcto", () => {
    const fen = "r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4";
    const state = getTerminalState(fen);

    expect(state.isOver).toBe(true);
    expect(state.reason).toBe("checkmate");
    expect(state.result).toBe("white_win");
  });

  it("detecta ahogado (stalemate) como tablas", () => {
    const fen = "k7/8/1Q6/8/8/8/8/7K b - - 0 1";
    const state = getTerminalState(fen);

    expect(state.isOver).toBe(true);
    expect(state.reason).toBe("stalemate");
    expect(state.result).toBe("draw");
  });

  it("detecta material insuficiente como tablas", () => {
    const fen = "8/8/8/4k3/8/8/4K3/8 w - - 0 1";
    const state = getTerminalState(fen);

    expect(state.isOver).toBe(true);
    expect(state.reason).toBe("insufficient_material");
  });

  it("no marca como terminada una posición normal en curso", () => {
    const state = getTerminalState(createInitialFen());
    expect(state.isOver).toBe(false);
  });
});
