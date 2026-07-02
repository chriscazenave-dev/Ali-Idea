export type StrokeType = "topspin" | "slice" | "flat" | "lob" | "block";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Ball {
  pos: Vec3;
  vel: Vec3;
  spin: number; // >0 topspin, <0 slice/backspin (relative to travel)
  sideSpin: number; // curves the ball laterally
  bouncesSinceHit: number;
  lastHitBy: "player" | "ai" | null;
  active: boolean;
}

export interface PointerSample {
  x: number;
  y: number;
  t: number;
}

export interface Swipe {
  dx: number;
  dy: number;
  speed: number; // px/s
  stroke: StrokeType;
  power: number; // 0..1
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export type Phase =
  | "menu"
  | "serve-player"
  | "serve-ai"
  | "rally"
  | "point-over"
  | "game-over";

export interface Score {
  playerPoints: number; // 0,1,2,3 => love,15,30,40 (+advantage logic)
  aiPoints: number;
  playerGames: number;
  aiGames: number;
}
