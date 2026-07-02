import { COURT_L, HALF_W, NET_Y } from "./constants";
import { predictLanding, solveShot } from "./physics";
import { Ball, StrokeType, Vec3 } from "./types";

export interface AiState {
  x: number;
  y: number;
  targetX: number;
  reactionTimer: number;
  difficulty: number; // 0..1
}

export function createAi(difficulty = 0.62): AiState {
  return {
    x: 0,
    y: COURT_L - 1.5,
    targetX: 0,
    reactionTimer: 0,
    difficulty,
  };
}

const AI_SPEED = 7.5;

export function updateAi(ai: AiState, ball: Ball, dt: number): void {
  if (ball.active && ball.vel.y > 0 && ball.lastHitBy === "player") {
    ai.reactionTimer -= dt;
    if (ai.reactionTimer <= 0) {
      const landing = predictLanding(ball);
      // AI runs to where the ball will be, with an error that shrinks
      // with difficulty and grows with incoming ball speed.
      const speedFactor = Math.min(1, Math.hypot(ball.vel.x, ball.vel.y) / 30);
      const error =
        (1 - ai.difficulty) * (0.5 + speedFactor * 1.6) * (Math.random() * 2 - 1);
      ai.targetX = Math.max(-HALF_W - 1, Math.min(HALF_W + 1, landing.x + error));
      ai.reactionTimer = 0.18 + (1 - ai.difficulty) * 0.15;
    }
  } else if (!ball.active || ball.lastHitBy === "ai") {
    ai.targetX = ai.x * 0.9; // drift back toward the middle
  }

  const dx = ai.targetX - ai.x;
  const maxMove = AI_SPEED * dt;
  ai.x += Math.abs(dx) <= maxMove ? dx : Math.sign(dx) * maxMove;
  ai.x = Math.max(-HALF_W - 1.5, Math.min(HALF_W + 1.5, ai.x));
}

export interface AiShot {
  vel: Vec3;
  spin: number;
  sideSpin: number;
  stroke: StrokeType;
  power: number;
}

export function aiChooseShot(ai: AiState, ball: Ball): AiShot {
  const roll = Math.random();
  let stroke: StrokeType;
  if (roll < 0.45) stroke = "topspin";
  else if (roll < 0.65) stroke = "flat";
  else if (roll < 0.85) stroke = "slice";
  else stroke = "lob";

  // Aim into the player's court with randomized placement + error.
  const err = (1 - ai.difficulty) * 1.6;
  const targetX =
    (Math.random() * 2 - 1) * (HALF_W - 0.7) + (Math.random() * 2 - 1) * err;
  let targetY: number;
  let flightTime: number;
  let spin = 0;
  const power = 0.4 + Math.random() * 0.5 * ai.difficulty;

  switch (stroke) {
    case "topspin":
      targetY = 2.5 + Math.random() * 4;
      flightTime = 1.25 - power * 0.35;
      spin = 1.4;
      break;
    case "flat":
      targetY = 2 + Math.random() * 4;
      flightTime = 1.1 - power * 0.3;
      spin = 0;
      break;
    case "slice":
      targetY = NET_Y - 4 + Math.random() * 5;
      flightTime = 1.5;
      spin = -1.1;
      break;
    default: // lob
      targetY = 1.5 + Math.random() * 3;
      flightTime = 2.1;
      spin = 0.4;
      break;
  }

  const vel = solveShot(ball.pos, { x: targetX, y: targetY }, flightTime);
  return {
    vel,
    spin,
    sideSpin: (Math.random() * 2 - 1) * 0.4,
    stroke,
    power,
  };
}
