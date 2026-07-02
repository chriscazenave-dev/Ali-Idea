import { Score } from "./types";

export const GAMES_TO_WIN = 4;

const CALLS = ["0", "15", "30", "40"];

export function pointCall(score: Score): string {
  const { playerPoints: p, aiPoints: a } = score;
  if (p >= 3 && a >= 3) {
    if (p === a) return "Deuce";
    return p > a ? "Ad. You" : "Ad. CPU";
  }
  return `${CALLS[Math.min(p, 3)]} - ${CALLS[Math.min(a, 3)]}`;
}

export interface PointResult {
  gameWon: "player" | "ai" | null;
  matchWon: "player" | "ai" | null;
}

export function awardPoint(score: Score, winner: "player" | "ai"): PointResult {
  if (winner === "player") score.playerPoints++;
  else score.aiPoints++;

  const p = score.playerPoints;
  const a = score.aiPoints;
  let gameWon: "player" | "ai" | null = null;
  if (p >= 4 && p - a >= 2) gameWon = "player";
  else if (a >= 4 && a - p >= 2) gameWon = "ai";

  let matchWon: "player" | "ai" | null = null;
  if (gameWon) {
    score.playerPoints = 0;
    score.aiPoints = 0;
    if (gameWon === "player") score.playerGames++;
    else score.aiGames++;
    if (score.playerGames >= GAMES_TO_WIN) matchWon = "player";
    else if (score.aiGames >= GAMES_TO_WIN) matchWon = "ai";
  }
  return { gameWon, matchWon };
}
