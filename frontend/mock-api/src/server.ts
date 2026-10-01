import cors from "cors";
import express from "express";
import { Chess } from "chess.js";
import type { Square } from "chess.js";
import { randomUUID } from "node:crypto";

import { participants } from "./data.js";

import type {
  ChessColor,
  CreateGameRequest,
  GameControlRequest,
  GameState,
  MakeMoveRequest,
  Move,
  StoredGame,
} from "./types.js";

const app = express();
const PORT = 3000;

const games = new Map<string, StoredGame>();

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

app.use(express.json());

function sendError(
  response: express.Response,
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
) {
  return response.status(status).json({
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}

function getTurnColor(chess: Chess): ChessColor {
  return chess.turn() === "w" ? "white" : "black";
}

function updateTerminalState(state: GameState, chess: Chess): void {
  if (!chess.isGameOver()) {
    return;
  }

  state.status = "finished";
  state.endedAt = new Date().toISOString();

  if (chess.isCheckmate()) {
    state.reason = "checkmate";
    state.result =
      chess.turn() === "w" ? "black_win" : "white_win";
    return;
  }

  state.result = "draw";

  if (chess.isStalemate()) {
    state.reason = "stalemate";
  } else if (chess.isInsufficientMaterial()) {
    state.reason = "insufficient_material";
  } else if (chess.isThreefoldRepetition()) {
    state.reason = "threefold_repetition";
  } else {
    state.reason = "draw";
  }
}

// ---------------------------------------------------------
// Health
// ---------------------------------------------------------

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "duelo-inteligencias-frontend-mock-api",
  });
});

// ---------------------------------------------------------
// Participantes
// ---------------------------------------------------------

app.get("/api/participants", (_request, response) => {
  response.json(participants);
});
// ---------------------------------------------------------
// Crear partida
// ---------------------------------------------------------

app.post("/api/games", (request, response) => {
  const body = request.body as CreateGameRequest;

  const whiteParticipant = participants.find(
    (participant) => participant.id === body.whiteParticipantId,
  );

  const blackParticipant = participants.find(
    (participant) => participant.id === body.blackParticipantId,
  );

  // Validar que ambos participantes existan.
  if (!whiteParticipant || !blackParticipant) {
    return sendError(
      response,
      400,
      "VALIDATION_ERROR",
      "Uno o ambos participantes no existen.",
    );
  }

  // Toda IA que juegue con blancas necesita dificultad.
  if (
    whiteParticipant.type === "ai" &&
    !body.whiteDifficulty
  ) {
    return sendError(
      response,
      400,
      "VALIDATION_ERROR",
      "El participante IA de blancas requiere nivel de dificultad.",
    );
  }

  // Toda IA que juegue con negras necesita dificultad.
  if (
    blackParticipant.type === "ai" &&
    !body.blackDifficulty
  ) {
    return sendError(
      response,
      400,
      "VALIDATION_ERROR",
      "El participante IA de negras requiere nivel de dificultad.",
    );
  }

  // Permitimos que el mismo modelo se enfrente a sí mismo en niveles
  // distintos (p. ej. Gemini Principiante vs. Gemini Maestro) — es parte
  // de las combinaciones que el modo torneo necesita cubrir. Solo
  // bloqueamos la partida si modelo Y nivel son idénticos en ambos bandos.
  if (
    whiteParticipant.type === "ai" &&
    blackParticipant.type === "ai" &&
    whiteParticipant.id === blackParticipant.id &&
    body.whiteDifficulty === body.blackDifficulty
  ) {
    return sendError(
      response,
      400,
      "VALIDATION_ERROR",
      "Selecciona un modelo distinto o un nivel de dificultad distinto para cada bando.",
    );
  }

  const chess = new Chess();
  const gameId = randomUUID();

  const gameState: GameState = {
    id: gameId,

    white: {
      participant: whiteParticipant,
      color: "white",
      difficulty:
        whiteParticipant.type === "ai"
          ? body.whiteDifficulty
          : undefined,
    },

    black: {
      participant: blackParticipant,
      color: "black",
      difficulty:
        blackParticipant.type === "ai"
          ? body.blackDifficulty
          : undefined,
    },

    status: "active",

    // Posición inicial oficial.
    fen: chess.fen(),

    turn: "white",

    result: null,
    reason: null,

    // La velocidad solo tiene efecto real en IA vs IA,
    // pero mantenemos "normal" como valor por defecto.
    speed: body.speed ?? "normal",

    startedAt: new Date().toISOString(),
    endedAt: null,

    moveCount: 0,

    // No existe última jugada al crear la partida.
    // Por eso no inicializamos lastMove.
  };

  games.set(gameId, {
    state: gameState,
    moves: [],
  });

  return response.status(201).json(gameState);
});
// ---------------------------------------------------------
// Consultar partida
// ---------------------------------------------------------

app.get("/api/games/:id", (request, response) => {
  const game = games.get(request.params.id);

  if (!game) {
    return sendError(
      response,
      404,
      "GAME_NOT_FOUND",
      "La partida solicitada no existe.",
    );
  }

  return response.json(game.state);
});

// ---------------------------------------------------------
// Historial de movimientos
// ---------------------------------------------------------

app.get("/api/games/:id/moves", (request, response) => {
  const game = games.get(request.params.id);

  if (!game) {
    return sendError(
      response,
      404,
      "GAME_NOT_FOUND",
      "La partida solicitada no existe.",
    );
  }

  return response.json(game.moves);
});

// ---------------------------------------------------------
// Movimiento
// ---------------------------------------------------------

app.post("/api/games/:id/moves", (request, response) => {
  const game = games.get(request.params.id);

  if (!game) {
    return sendError(
      response,
      404,
      "GAME_NOT_FOUND",
      "La partida solicitada no existe.",
    );
  }

  if (game.state.status !== "active") {
    return sendError(
      response,
      409,
      "GAME_NOT_ACTIVE",
      "La partida no está activa.",
    );
  }

  const body = request.body as MakeMoveRequest;

  if (!body.from || !body.to) {
    return sendError(
      response,
      400,
      "VALIDATION_ERROR",
      "El movimiento requiere casilla de origen y destino.",
    );
  }

  const chess = new Chess(game.state.fen);
  const movingColor = getTurnColor(chess);

  try {
    const result = chess.move({
      from: body.from,
      to: body.to,
      promotion: body.promotion ?? "q",
    });

    const move: Move = {
      id: randomUUID(),
      gameId: game.state.id,
      ply: game.moves.length + 1,
      color: movingColor,
      piece: result.piece,
      from: result.from,
      to: result.to,
      san: result.san,
      fenAfter: chess.fen(),
    };

    game.moves.push(move);

    game.state.fen = chess.fen();
    game.state.turn = getTurnColor(chess);
    game.state.moveCount = game.moves.length;
    game.state.lastMove = {
  from: result.from,
  to: result.to,
};

    updateTerminalState(game.state, chess);

    return response.json(game.state);
  } catch {
    return sendError(
      response,
      422,
      "ILLEGAL_MOVE",
      "El movimiento no es legal para la posición actual.",
      {
        from: body.from,
        to: body.to,
      },
    );
  }
});

// ---------------------------------------------------------
// Controles
// ---------------------------------------------------------

app.patch("/api/games/:id/control", (request, response) => {
  const game = games.get(request.params.id);

  if (!game) {
    return sendError(
      response,
      404,
      "GAME_NOT_FOUND",
      "La partida solicitada no existe.",
    );
  }

  const body = request.body as GameControlRequest;

  if (body.action === "pause") {
    if (game.state.status !== "active") {
      return sendError(
        response,
        409,
        "GAME_NOT_ACTIVE",
        "Solo una partida activa puede pausarse.",
      );
    }

    game.state.status = "paused";
    return response.json(game.state);
  }

  if (body.action === "resume") {
    if (game.state.status !== "paused") {
      return sendError(
        response,
        409,
        "GAME_NOT_ACTIVE",
        "Solo una partida pausada puede reanudarse.",
      );
    }

    game.state.status = "active";
    return response.json(game.state);
  }

  if (body.action === "change_speed") {
    if (!body.speed) {
      return sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "Debe indicarse una velocidad.",
      );
    }

    game.state.speed = body.speed;
    return response.json(game.state);
  }

  return sendError(
    response,
    400,
    "VALIDATION_ERROR",
    "Acción de control no reconocida.",
  );
});



// ---------------------------------------------------------
// Movimientos legales desde una casilla
// ---------------------------------------------------------

app.get("/api/games/:id/legal-moves", (request, response) => {
  const game = games.get(request.params.id);

  if (!game) {
    return sendError(
      response,
      404,
      "GAME_NOT_FOUND",
      "La partida solicitada no existe.",
    );
  }

  if (game.state.status !== "active") {
    return sendError(
      response,
      409,
      "GAME_NOT_ACTIVE",
      "La partida no está activa.",
    );
  }

  const from = request.query.from;

  if (typeof from !== "string" || !from) {
    return sendError(
      response,
      400,
      "VALIDATION_ERROR",
      "Debe indicarse una casilla de origen.",
    );
  }

  const chess = new Chess(game.state.fen);

  try {
    const moves = chess.moves({
      square: from as Square,
      verbose: true,
    });

    return response.json({
      from,
      targets: [
        ...new Set(
          moves.map((move) => move.to),
        ),
      ],
    });
  } catch {
    return sendError(
      response,
      400,
      "VALIDATION_ERROR",
      "La casilla indicada no es válida.",
    );
  }
});

// ---------------------------------------------------------
// IA — intencionalmente no implementada
// ---------------------------------------------------------

app.post("/api/games/:id/ai-move", (request, response) => {
  const game = games.get(request.params.id);

  if (!game) {
    return sendError(
      response,
      404,
      "GAME_NOT_FOUND",
      "La partida solicitada no existe.",
    );
  }

  return sendError(
    response,
    503,
    "AI_NOT_CONFIGURED",
    "El mock del Frente 1 no implementa proveedores de IA.",
  );
});

app.listen(PORT, () => {
  console.log(
    `Frontend Mock API disponible en http://localhost:${PORT}`,
  );
});