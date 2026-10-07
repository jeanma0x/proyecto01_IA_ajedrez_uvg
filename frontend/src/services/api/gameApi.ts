import { apiRequest } from "./apiClient";

import type {
  AiCommentaryRequest,
  AiCommentaryResponse,
  CreateGameRequest,
  GameControlRequest,
  GameState,
  LegalMovesResponse,
  MakeMoveRequest,
  Move,
  Participant,
} from "../../types/api";

export function getParticipants(): Promise<Participant[]> {
  return apiRequest<Participant[]>("/participants");
}

export function createGame(
  data: CreateGameRequest,
): Promise<GameState> {
  return apiRequest<GameState>("/games", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getGame(
  gameId: string,
): Promise<GameState> {
  return apiRequest<GameState>(
    `/games/${gameId}`,
  );
}

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

export function getMoves(
  gameId: string,
): Promise<Move[]> {
  return apiRequest<Move[]>(
    `/games/${gameId}/moves`,
  );
}

export function getLegalMoves(
  gameId: string,
  from: string,
): Promise<LegalMovesResponse> {
  return apiRequest<LegalMovesResponse>(
    `/games/${gameId}/legal-moves?from=${encodeURIComponent(from)}`,
  );
}

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

/*
 * Solicita al backend un comentario generado por IA
 * sobre el último movimiento realizado.
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