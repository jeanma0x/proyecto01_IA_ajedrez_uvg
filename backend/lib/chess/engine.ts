import { Chess } from "chess.js";
import type { Square } from "chess.js";

export type ChessColor = "white" | "black";

export interface TerminalState {
  isOver: boolean;
  result?: "white_win" | "black_win" | "draw";
  reason?:
    | "checkmate"
    | "stalemate"
    | "insufficient_material"
    | "threefold_repetition"
    | "fifty_move_rule";
}

export interface AppliedMove {
  piece: string;
  from: string;
  to: string;
  san: string;
  fenAfter: string;
}

export function createInitialFen(): string {
  return new Chess().fen();
}

export function getTurnColor(fen: string): ChessColor {
  return new Chess(fen).turn() === "w" ? "white" : "black";
}

export function applyMove(
  fen: string,
  move: { from: string; to: string; promotion?: "q" | "r" | "b" | "n" },
): AppliedMove {
  const chess = new Chess(fen);

  const result = chess.move({
    from: move.from,
    to: move.to,
    promotion: move.promotion ?? "q",
  });

  return {
    piece: result.piece,
    from: result.from,
    to: result.to,
    san: result.san,
    fenAfter: chess.fen(),
  };
}

export function isMoveLegal(
  fen: string,
  move: { from: string; to: string; promotion?: "q" | "r" | "b" | "n" },
): boolean {
  try {
    const chess = new Chess(fen);
    return chess.move({ from: move.from, to: move.to, promotion: move.promotion ?? "q" }) !== null;
  } catch {
    return false;
  }
}

export function getLegalTargets(fen: string, from: string): string[] {
  const chess = new Chess(fen);
  const moves = chess.moves({ square: from as Square, verbose: true });
  return [...new Set(moves.map((move) => move.to))];
}

export function getLegalMovesSan(fen: string): string[] {
  return new Chess(fen).moves();
}

export interface LegalMoveOption {
  from: string;
  to: string;
  san: string;
  promotion?: "q" | "r" | "b" | "n";
}

// Lista estructurada origen/destino (no solo SAN) para que el prompt de la IA
// pida y valide en el mismo formato que exige la función de jugada
// (from/to) — con solo SAN, el modelo no podía verificar su respuesta contra
// la lista y repetía la misma jugada ilegal en cada reintento (bug real,
// confirmado en producción 2026-10-09, ver docs/04-MODELOS_PENDIENTE.md).
export function getLegalMovesDetailed(fen: string): LegalMoveOption[] {
  return new Chess(fen)
    .moves({ verbose: true })
    .map((move) => ({
      from: move.from,
      to: move.to,
      san: move.san,
      ...(move.promotion ? { promotion: move.promotion as "q" | "r" | "b" | "n" } : {}),
    }));
}

export function getTerminalState(fen: string): TerminalState {
  const chess = new Chess(fen);

  if (!chess.isGameOver()) {
    return { isOver: false };
  }

  if (chess.isCheckmate()) {
    return {
      isOver: true,
      result: chess.turn() === "w" ? "black_win" : "white_win",
      reason: "checkmate",
    };
  }

  if (chess.isStalemate()) {
    return { isOver: true, result: "draw", reason: "stalemate" };
  }

  if (chess.isInsufficientMaterial()) {
    return { isOver: true, result: "draw", reason: "insufficient_material" };
  }

  if (chess.isThreefoldRepetition()) {
    return { isOver: true, result: "draw", reason: "threefold_repetition" };
  }

  return { isOver: true, result: "draw", reason: "fifty_move_rule" };
}
