import { describe, expect, it } from "vitest";

import { parseMoveArguments } from "./parse";
import { AdapterError } from "./types";

// RF-14: transformar la respuesta de la IA en un movimiento estructurado
// antes de validarla contra el motor de reglas — nunca confiar en la
// respuesta cruda del proveedor (ver 01-ARQUITECTURA.md).

describe("parseMoveArguments", () => {
  it("acepta un objeto ya parseado con from/to válidos", () => {
    const result = parseMoveArguments({ from: "e2", to: "e4" }, "{}");
    expect(result).toEqual({ from: "e2", to: "e4", promotion: undefined });
  });

  it("acepta un string JSON válido (caso típico de function calling)", () => {
    const result = parseMoveArguments('{"from":"g1","to":"f3"}', "raw");
    expect(result).toEqual({ from: "g1", to: "f3", promotion: undefined });
  });

  it("acepta una promoción válida", () => {
    const result = parseMoveArguments({ from: "a7", to: "a8", promotion: "q" }, "{}");
    expect(result.promotion).toBe("q");
  });

  it("rechaza un string que no es JSON válido", () => {
    expect(() => parseMoveArguments("esto no es json", "raw")).toThrow(AdapterError);
  });

  it("rechaza cuando falta la casilla de origen", () => {
    expect(() => parseMoveArguments({ to: "e4" }, "{}")).toThrow(AdapterError);
  });

  it("rechaza una casilla de origen con formato inválido (fuera del tablero)", () => {
    expect(() => parseMoveArguments({ from: "i9", to: "e4" }, "{}")).toThrow(AdapterError);
  });

  it("rechaza una promoción a una pieza que no existe (ej. rey)", () => {
    expect(() => parseMoveArguments({ from: "a7", to: "a8", promotion: "k" }, "{}")).toThrow(
      AdapterError,
    );
  });

  it("rechaza un payload que no es un objeto (ej. un arreglo o null)", () => {
    expect(() => parseMoveArguments(null, "{}")).toThrow(AdapterError);
    expect(() => parseMoveArguments([1, 2, 3], "{}")).toThrow(AdapterError);
  });

  it("el error lanzado usa el código INVALID_FORMAT (RF-15: cuenta como jugada inválida, no incidencia directa)", () => {
    try {
      parseMoveArguments({ from: "zz", to: "e4" }, "{}");
      expect.unreachable("debía lanzar AdapterError");
    } catch (error) {
      expect(error).toBeInstanceOf(AdapterError);
      expect((error as AdapterError).code).toBe("INVALID_FORMAT");
    }
  });
});
