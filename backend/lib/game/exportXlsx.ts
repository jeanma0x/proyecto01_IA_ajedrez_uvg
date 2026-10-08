import ExcelJS from "exceljs";

// Genera un Excel real (.xlsx) con formato visual — CSV no puede llevar
// colores ni estilos, es solo texto plano. Esto es lo que se usa cuando se
// pide "formato profesional, con colores" para exportar una partida.

// Paleta — misma identidad visual que el resto de la app (dorado/marrón).
const COLOR_HEADER_BG = "FFB8860B"; // dorado oscuro
const COLOR_HEADER_TEXT = "FFFFFFFF";
const COLOR_ROW_ALT = "FFF5EFE0"; // crema claro
const COLOR_TITLE_BG = "FF2B1E17"; // marrón oscuro (fondo del tablero)
const COLOR_TITLE_TEXT = "FFE8B84B";

const COLOR_OUTCOME_OK = "FFD4EDDA"; // verde claro
const COLOR_OUTCOME_WARN = "FFFFF3CD"; // amarillo claro
const COLOR_OUTCOME_BAD = "FFF8D7DA"; // rojo claro

const OUTCOME_FILL: Record<string, string> = {
  accepted: COLOR_OUTCOME_OK,
  illegal_move: COLOR_OUTCOME_WARN,
  invalid_format: COLOR_OUTCOME_WARN,
  timeout: COLOR_OUTCOME_BAD,
  unavailable: COLOR_OUTCOME_BAD,
  rate_limit: COLOR_OUTCOME_BAD,
  auth_error: COLOR_OUTCOME_BAD,
};

interface GameParticipantInfo {
  displayName: string;
  company?: string | null;
  modelId?: string | null;
}

export interface ExportGameInfo {
  id: string;
  whiteParticipant: GameParticipantInfo;
  blackParticipant: GameParticipantInfo;
  whiteDifficulty: string | null;
  blackDifficulty: string | null;
  status: string;
  result: string | null;
  reason: string | null;
  speed: string;
  moveCount: number;
  startedAt: Date | null;
  endedAt: Date | null;
}

export interface ExportMoveRow {
  ply: number;
  color: string;
  piece: string;
  from: string;
  to: string;
  san: string;
  fenAfter: string;
  latencyMs: number | null;
}

export interface ExportAttemptRow {
  ply: number;
  provider: string;
  modelId: string;
  difficulty: string;
  retryNumber: number;
  outcome: string;
  latencyMs: number | null;
}

const RESULT_LABELS: Record<string, string> = {
  white_win: "Ganaron las blancas",
  black_win: "Ganaron las negras",
  draw: "Empate",
  technical_incident: "Incidencia técnica",
};

const REASON_LABELS: Record<string, string> = {
  checkmate: "Jaque mate",
  draw: "Tablas",
  stalemate: "Ahogado",
  insufficient_material: "Material insuficiente",
  threefold_repetition: "Triple repetición",
  fifty_move_rule: "Regla de los 50 movimientos",
  human_resignation: "Abandono",
  technical_incident: "Incidencia técnica",
};

function styleTitleRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_TITLE_BG } };
    cell.font = { bold: true, color: { argb: COLOR_TITLE_TEXT }, size: 13 };
    cell.alignment = { vertical: "middle" };
  });
  row.height = 24;
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_HEADER_BG } };
    cell.font = { bold: true, color: { argb: COLOR_HEADER_TEXT } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
  });
}

function autoFitColumns(sheet: ExcelJS.Worksheet, minWidth = 10) {
  sheet.columns.forEach((column) => {
    let maxLength = minWidth;

    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const length = cell.value ? String(cell.value).length : 0;
      if (length > maxLength) maxLength = length;
    });

    column.width = Math.min(maxLength + 2, 60);
  });
}

export async function buildGameWorkbook(
  game: ExportGameInfo,
  moves: ExportMoveRow[],
  aiAttempts: ExportAttemptRow[],
): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Duelo de Inteligencias";
  workbook.created = new Date();

  // --- Hoja 1: Resumen ---
  const summary = workbook.addWorksheet("Resumen");
  summary.mergeCells("A1:B1");
  summary.getCell("A1").value = "♛ Duelo de Inteligencias — Resumen de partida";
  styleTitleRow(summary.getRow(1));

  const summaryRows: [string, string][] = [
    ["Blancas", game.whiteParticipant.displayName],
    ["Empresa (blancas)", game.whiteParticipant.company ?? "—"],
    ["Dificultad (blancas)", game.whiteDifficulty ?? "—"],
    ["Negras", game.blackParticipant.displayName],
    ["Empresa (negras)", game.blackParticipant.company ?? "—"],
    ["Dificultad (negras)", game.blackDifficulty ?? "—"],
    ["Estado", game.status],
    ["Resultado", game.result ? (RESULT_LABELS[game.result] ?? game.result) : "En curso"],
    ["Razón de finalización", game.reason ? (REASON_LABELS[game.reason] ?? game.reason) : "—"],
    ["Velocidad", game.speed],
    ["Movimientos totales", String(game.moveCount)],
    ["Inicio", game.startedAt ? game.startedAt.toLocaleString("es-GT") : "—"],
    ["Fin", game.endedAt ? game.endedAt.toLocaleString("es-GT") : "—"],
  ];

  summaryRows.forEach(([label, value], index) => {
    const row = summary.addRow([label, value]);
    const rowNumber = index + 3;
    row.getCell(1).font = { bold: true };
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_HEADER_BG } };
    row.getCell(1).font = { bold: true, color: { argb: COLOR_HEADER_TEXT } };

    if (rowNumber % 2 === 0) {
      row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_ROW_ALT } };
    }
  });

  summary.getColumn(1).width = 24;
  summary.getColumn(2).width = 36;

  // --- Hoja 2: Movimientos ---
  const movesSheet = workbook.addWorksheet("Movimientos");
  const movesHeader = movesSheet.addRow([
    "Jugada",
    "Color",
    "Pieza",
    "Origen",
    "Destino",
    "SAN",
    "FEN resultante",
    "Latencia (ms)",
  ]);
  styleHeaderRow(movesHeader);
  movesSheet.views = [{ state: "frozen", ySplit: 1 }];

  moves.forEach((move, index) => {
    const row = movesSheet.addRow([
      move.ply,
      move.color === "white" ? "Blancas" : "Negras",
      move.piece,
      move.from,
      move.to,
      move.san,
      move.fenAfter,
      move.latencyMs ?? "",
    ]);

    if (index % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_ROW_ALT } };
      });
    }

    row.getCell(7).font = { name: "Courier New", size: 9 };
  });

  autoFitColumns(movesSheet);
  movesSheet.getColumn(7).width = 50;

  // --- Hoja 3: Intentos de IA ---
  if (aiAttempts.length > 0) {
    const attemptsSheet = workbook.addWorksheet("Intentos de IA");
    const attemptsHeader = attemptsSheet.addRow([
      "Jugada",
      "Proveedor",
      "Modelo",
      "Dificultad",
      "Reintento",
      "Resultado",
      "Latencia (ms)",
    ]);
    styleHeaderRow(attemptsHeader);
    attemptsSheet.views = [{ state: "frozen", ySplit: 1 }];

    aiAttempts.forEach((attempt) => {
      const row = attemptsSheet.addRow([
        attempt.ply,
        attempt.provider,
        attempt.modelId,
        attempt.difficulty,
        attempt.retryNumber,
        attempt.outcome,
        attempt.latencyMs ?? "",
      ]);

      const fillColor = OUTCOME_FILL[attempt.outcome];
      if (fillColor) {
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
        });
      }
    });

    autoFitColumns(attemptsSheet);
  }

  return workbook.xlsx.writeBuffer();
}
