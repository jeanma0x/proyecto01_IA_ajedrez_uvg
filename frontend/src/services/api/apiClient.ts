import type { ApiErrorResponse } from "../../types/api";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api";

export class ApiClientError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);

    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorBody: ApiErrorResponse | null = null;

    try {
      errorBody = (await response.json()) as ApiErrorResponse;
    } catch {
      // El backend no devolvió un error JSON válido.
    }

    throw new ApiClientError(
      response.status,
      errorBody?.error.code ?? "INTERNAL_ERROR",
      errorBody?.error.message ?? "Ocurrió un error al comunicarse con el servidor.",
      errorBody?.error.details,
    );
  }

  return (await response.json()) as T;
}