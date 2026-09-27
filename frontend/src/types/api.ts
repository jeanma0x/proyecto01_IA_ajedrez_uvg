export type ParticipantType = "human" | "ai";

export type Difficulty = "beginner" | "advanced" | "master";

export type ChessColor = "white" | "black";

export type GameStatus =
  | "configured"
  | "active"
  | "paused"
  | "finished"
  | "incident";

export type GameResult =
  | "white_win"
  | "black_win"
  | "draw"
  | "technical_incident"
  | null;

export type GameEndReason =
  | "checkmate"
  | "draw"
  | "stalemate"
  | "insufficient_material"
  | "threefold_repetition"
  | "fifty_move_rule"
  | "human_resignation"
  | "technical_incident"
  | null;

export type GameSpeed = "normal" | "fast" | "maximum";

export interface Participant {
  id: string;
  type: ParticipantType;
  displayName: string;
  company?: string;
  modelId?: string;
}

export interface GameParticipant {
  participant: Participant;
  color: ChessColor;
  difficulty?: Difficulty;
}

export interface Move {
  id: string;
  gameId: string;
  ply: number;
  color: ChessColor;
  piece: string;
  from: string;
  to: string;
  san: string;
  fenAfter: string;
  latencyMs?: number;
}

export interface GameState {
  id: string;
  white: GameParticipant;
  black: GameParticipant;
  status: GameStatus;
  fen: string;
  turn: ChessColor;
  result: GameResult;
  reason: GameEndReason;
  speed: GameSpeed;
  startedAt: string | null;
  endedAt: string | null;
  moveCount: number;
}

export interface CreateGameRequest {
  whiteParticipantId: string;
  blackParticipantId: string;
  whiteDifficulty?: Difficulty;
  blackDifficulty?: Difficulty;
  speed?: GameSpeed;
}

export interface MakeMoveRequest {
  from: string;
  to: string;
  promotion?: "q" | "r" | "b" | "n";
}

export interface GameControlRequest {
  action: "pause" | "resume" | "change_speed";
  speed?: GameSpeed;
}

export interface ApiError {
  code:
    | "VALIDATION_ERROR"
    | "GAME_NOT_FOUND"
    | "GAME_NOT_ACTIVE"
    | "NOT_YOUR_TURN"
    | "ILLEGAL_MOVE"
    | "AI_NOT_CONFIGURED"
    | "AUTH"
    | "RATE_LIMIT"
    | "TIMEOUT"
    | "UNAVAILABLE"
    | "INVALID_FORMAT"
    | "INTERNAL_ERROR";
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  error: ApiError;
}