
import { apiRequest } from "./apiClient";

import type {
  AiCommentaryRequest,
  AiCommentaryResponse,
  CreateGameRequest,
  Difficulty,
  GameControlRequest,
  GameState,
  LegalMovesResponse,
  MakeMoveRequest,
  Move,
  Participant,
  StatisticRow,
} from "../../types/api";

// ==========================================
// PARTICIPANTES
// ==========================================

export function getParticipants(): Promise<Participant[]> {
  return apiRequest<Participant[]>("/participants");
}

// ==========================================
// CREAR PARTIDA
// ==========================================

export function createGame(
  data: CreateGameRequest,
): Promise<GameState> {
  return apiRequest<GameState>("/games", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ==========================================
// OBTENER PARTIDA
// ==========================================

export function getGame(
  gameId: string,
): Promise<GameState> {
  return apiRequest<GameState>(
    `/games/${gameId}`,
  );
}

// ==========================================
// REALIZAR MOVIMIENTO
// ==========================================

export function makeMove(
  gameId: string,
  data: MakeMoveRequest,
): Promise<GameState> {
  return apiRequest<GameState>(
    `/games/${gameId}/moves`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

// ==========================================
// HISTORIAL DE MOVIMIENTOS
// ==========================================

export function getMoves(
  gameId: string,
): Promise<Move[]> {
  return apiRequest<Move[]>(
    `/games/${gameId}/moves`,
  );
}

// ==========================================
// MOVIMIENTOS LEGALES
// ==========================================

export function getLegalMoves(
  gameId: string,
  from: string,
): Promise<LegalMovesResponse> {
  return apiRequest<LegalMovesResponse>(
    `/games/${gameId}/legal-moves?from=${encodeURIComponent(from)}`,
  );
}

// ==========================================
// MOVIMIENTO DE INTELIGENCIA ARTIFICIAL
// ==========================================

export function requestAiMove(
  gameId: string,
): Promise<GameState> {
  return apiRequest<GameState>(
    `/games/${gameId}/ai-move`,
    {
      method: "POST",
    },
  );
}

// ==========================================
// CONTROLES DE PARTIDA
// ==========================================

export function controlGame(
  gameId: string,
  data: GameControlRequest,
): Promise<GameState> {
  return apiRequest<GameState>(
    `/games/${gameId}/control`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

// ==========================================
// COMENTARISTA CON INTELIGENCIA ARTIFICIAL
// ==========================================

/*
 * Solicita al backend un comentario generado
 * por IA sobre el último movimiento realizado.
 */
export function requestAiCommentary(
  gameId: string,
  data: AiCommentaryRequest,
): Promise<AiCommentaryResponse> {
  return apiRequest<AiCommentaryResponse>(
    `/games/${gameId}/commentary`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

// ==========================================
// ESTADÍSTICAS DE JUGADORES
// ==========================================

/*
 * Obtiene las estadísticas de los participantes.
 *
 * Permite filtrar opcionalmente por:
 * - ID del participante
 * - Nivel de dificultad
 *
 * Si no se proporcionan filtros,
 * devuelve todas las estadísticas.
 */
export function getStatistics(filter?: {
  participantId?: string;
  difficulty?: Difficulty;
}): Promise<StatisticRow[]> {
  const params = new URLSearchParams();

  if (filter?.participantId) {
    params.set("participantId", filter.participantId);
  }

  if (filter?.difficulty) {
    params.set("difficulty", filter.difficulty);
  }

  const query = params.toString();

  return apiRequest<StatisticRow[]>(
    `/statistics${query ? `?${query}` : ""}`,
  );
}
