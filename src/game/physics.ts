import {
  BALL_RADIUS,
  BOUNCE_RESTITUTION,
  GRAVITY,
  HALF_W,
  MAGNUS_K,
  NET_H,
  NET_Y,
} from "./constants";
import { Ball } from "./types";

export function createBall(): Ball {
  return {
    pos: { x: 0, y: 2, z: 1 },
    vel: { x: 0, y: 0, z: 0 },
    spin: 0,
    sideSpin: 0,
    bouncesSinceHit: 0,
    lastHitBy: null,
    active: false,
  };
}

export interface StepEvents {
  bounced: boolean;
  bounceX: number;
  bounceY: number;
  hitNet: boolean;
}

export function stepBall(ball: Ball, dt: number): StepEvents {
  const events: StepEvents = {
    bounced: false,
    bounceX: 0,
    bounceY: 0,
    hitNet: false,
  };
  if (!ball.active) return events;

  const prevY = ball.pos.y;

  const horizSpeed = Math.hypot(ball.vel.x, ball.vel.y);
  // Magnus effect: topspin dips the ball, backspin floats it; side spin curves it.
  const az = GRAVITY - ball.spin * MAGNUS_K * horizSpeed;
  const dirY = Math.sign(ball.vel.y) || 1;
  const ax = ball.sideSpin * MAGNUS_K * horizSpeed * dirY;

  ball.vel.x += ax * dt;
  ball.vel.z += az * dt;

  ball.pos.x += ball.vel.x * dt;
  ball.pos.y += ball.vel.y * dt;
  ball.pos.z += ball.vel.z * dt;

  // Net collision: check crossing of the net plane during this step.
  const crossedNet =
    (prevY - NET_Y) * (ball.pos.y - NET_Y) < 0 && prevY !== ball.pos.y;
  if (crossedNet) {
    const t = (NET_Y - prevY) / (ball.pos.y - prevY);
    const zAtNet = ball.pos.z - ball.vel.z * dt * (1 - t);
    if (zAtNet <= NET_H + BALL_RADIUS) {
      events.hitNet = true;
      ball.pos.y = NET_Y - Math.sign(ball.vel.y) * 0.05;
      ball.vel.y *= -0.12;
      ball.vel.x *= 0.3;
      ball.vel.z = Math.min(ball.vel.z, 0.5);
      ball.spin = 0;
      ball.sideSpin = 0;
    }
  }

  // Ground bounce
  if (ball.pos.z <= BALL_RADIUS && ball.vel.z < 0) {
    events.bounced = true;
    events.bounceX = ball.pos.x;
    events.bounceY = ball.pos.y;
    ball.pos.z = BALL_RADIUS;
    ball.vel.z = -ball.vel.z * BOUNCE_RESTITUTION;
    // Topspin kicks the ball forward on the bounce, slice checks up.
    const kick = 1 + ball.spin * 0.06;
    ball.vel.y *= 0.82 * Math.max(0.5, Math.min(1.35, kick));
    ball.vel.x *= 0.85;
    ball.spin *= 0.5;
    ball.sideSpin *= 0.5;
    ball.bouncesSinceHit++;
  }

  return events;
}

export function isLandingIn(x: number, y: number, side: "player" | "ai"): boolean {
  if (Math.abs(x) > HALF_W + BALL_RADIUS) return false;
  if (side === "ai") return y > NET_Y && y <= 23.77 + BALL_RADIUS;
  return y < NET_Y && y >= -BALL_RADIUS;
}

/**
 * Solve a launch velocity that carries the ball from `from` to land at
 * `target` (z=0) with the given flight time, under gravity only.
 * Spin-induced curve is treated as flavor on top of this solution.
 */
export function solveShot(
  from: { x: number; y: number; z: number },
  target: { x: number; y: number },
  flightTime: number
): { x: number; y: number; z: number } {
  const T = Math.max(0.35, flightTime);
  return {
    x: (target.x - from.x) / T,
    y: (target.y - from.y) / T,
    z: (0 - from.z - 0.5 * GRAVITY * T * T) / T,
  };
}

/** Predict where the ball will next touch the ground (gravity only). */
export function predictLanding(ball: Ball): { x: number; y: number; t: number } {
  const { pos, vel } = ball;
  const a = 0.5 * GRAVITY;
  const b = vel.z;
  const c = pos.z - BALL_RADIUS;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return { x: pos.x, y: pos.y, t: 0 };
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  const tt = Math.max(0, t);
  return { x: pos.x + vel.x * tt, y: pos.y + vel.y * tt, t: tt };
}
