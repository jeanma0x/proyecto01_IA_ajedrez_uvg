// chess.js devuelve SAN en inglés (K/Q/R/B/N). La convención en español usa
// otras letras para las piezas — se traduce solo para mostrar en la UI,
// nunca se toca el SAN guardado ni el que se exporta (PGN usa el estándar
// en inglés).
const PIECE_LETTERS_EN_TO_ES: Record<string, string> = {
  K: "R", // Rey
  Q: "D", // Dama
  R: "T", // Torre
  B: "A", // Alfil
  N: "C", // Caballo
};

export function toSpanishSan(san: string): string {
  if (san.startsWith("O-O")) {
    return san; // enroque, misma notación en español
  }

  let result = san;
  const firstChar = result.charAt(0);

  if (firstChar in PIECE_LETTERS_EN_TO_ES) {
    result = PIECE_LETTERS_EN_TO_ES[firstChar] + result.slice(1);
  }

  return result.replace(
    /=([KQRBN])/,
    (_match, piece: string) => `=${PIECE_LETTERS_EN_TO_ES[piece]}`,
  );
}
