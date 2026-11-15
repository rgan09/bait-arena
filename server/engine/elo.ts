// Standard Elo, K = 32 (plan section 3).
export const K = 32;

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/** outcome: 1 = A won, 0.5 = tie, 0 = B won. Returns new ratings (rounded). */
export function updateElo(ratingA: number, ratingB: number, outcome: 1 | 0.5 | 0): { a: number; b: number } {
  const ea = expectedScore(ratingA, ratingB);
  const delta = K * (outcome - ea);
  return { a: Math.round(ratingA + delta), b: Math.round(ratingB - delta) };
}
