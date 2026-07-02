import { aiChooseShot, AiState, createAi, updateAi } from "./ai";
import {
  CAM_HEIGHT,
  COURT_L,
  FOCAL,
  HALF_W,
  NET_Y,
  PLAYER_REACH_X,
  SERVICE_LINE_FAR,
} from "./constants";
import { GestureTracker } from "./gesture";
import { createBall, isLandingIn, solveShot, stepBall } from "./physics";
import { ParticleSystem } from "./particles";
import {
  Camera,
  drawAiPlayer,
  drawBall,
  drawCourt,
  drawNet,
  drawPlayerRacket,
  project,
} from "./render";
import { awardPoint, GAMES_TO_WIN, pointCall } from "./scoring";
import { SoundEngine } from "./audio";
import { Ball, Phase, Score, StrokeType, Swipe } from "./types";

const RACKET_Y = 1.1;

const STROKE_LABELS: Record<StrokeType, string> = {
  topspin: "TOPSPIN",
  slice: "SLICE",
  flat: "FLAT DRIVE",
  lob: "LOB",
  block: "BLOCK",
};

const STROKE_COLORS: Record<StrokeType, string> = {
  topspin: "#ff9d45",
  slice: "#5ec8ff",
  flat: "#f2f5fa",
  lob: "#c58fff",
  block: "#9aa7bd",
};

function other(side: "player" | "ai"): "player" | "ai" {
  return side === "player" ? "ai" : "player";
}

export class TennisEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cam: Camera = { w: 0, h: 0, shakeX: 0, shakeY: 0 };
  private dpr = 1;

  private ball: Ball = createBall();
  private ai: AiState = createAi();
  private score: Score = {
    playerPoints: 0,
    aiPoints: 0,
    playerGames: 0,
    aiGames: 0,
  };
  private phase: Phase = "menu";
  private server: "player" | "ai" = "player";
  private winner: "player" | "ai" | null = null;

  private gesture = new GestureTracker();
  private sound = new SoundEngine();
  private particles = new ParticleSystem();

  private racket = { x: 0, z: 1.2 };
  private mouse = { sx: 0, sy: 0 };
  private hitCooldown = 0;
  private swingGlow = 0;
  private shake = 0;
  private banner = { text: "", sub: "", timer: 0 };
  private lastStroke: { type: StrokeType; power: number; timer: number } | null =
    null;
  private phaseTimer = 0;

  private raf = 0;
  private lastTime = 0;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.ctx = ctx;
    this.resize();

    window.addEventListener("resize", this.resize);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerdown", this.onPointerDown);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
  }

  start(): void {
    this.lastTime = performance.now();
    const loop = (t: number) => {
      if (this.disposed) return;
      const dt = Math.min(0.033, (t - this.lastTime) / 1000);
      this.lastTime = t;
      this.update(dt, t);
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private resize = (): void => {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cam.w = window.innerWidth;
    this.cam.h = window.innerHeight;
    this.canvas.width = this.cam.w * this.dpr;
    this.canvas.height = this.cam.h * this.dpr;
    this.canvas.style.width = `${this.cam.w}px`;
    this.canvas.style.height = `${this.cam.h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  private onPointerMove = (e: PointerEvent): void => {
    this.mouse.sx = e.clientX;
    this.mouse.sy = e.clientY;
    this.gesture.addSample(e.clientX, e.clientY, performance.now());

    // Invert the projection at the racket plane to position the racket.
    const f = FOCAL * (this.cam.h / 800);
    const depth = RACKET_Y + 9.5;
    const x = ((e.clientX - this.cam.w / 2) * depth) / f;
    const z = CAM_HEIGHT - ((e.clientY - this.cam.h * 0.16) * depth) / f;
    this.racket.x = Math.max(-HALF_W - 2.5, Math.min(HALF_W + 2.5, x));
    this.racket.z = Math.max(0.25, Math.min(3.1, z));
  };

  private onPointerDown = (): void => {
    this.sound.unlock();
    if (this.phase === "menu") {
      this.resetMatch();
      this.startPoint();
    } else if (this.phase === "serve-player") {
      this.servePlayer();
    } else if (this.phase === "game-over") {
      this.phase = "menu";
    }
  };

  private resetMatch(): void {
    this.score = { playerPoints: 0, aiPoints: 0, playerGames: 0, aiGames: 0 };
    this.server = "player";
    this.winner = null;
    this.ai = createAi();
  }

  private startPoint(): void {
    this.ball = createBall();
    this.hitCooldown = 0;
    if (this.server === "player") {
      this.phase = "serve-player";
      this.banner = { text: "", sub: "", timer: 0 };
    } else {
      this.phase = "serve-ai";
      this.phaseTimer = 1.1;
    }
  }

  private servePlayer(): void {
    const b = this.ball;
    b.pos = { x: this.racket.x, y: RACKET_Y, z: Math.max(1.6, this.racket.z) };
    const swipe = this.gesture.readSwipe(performance.now());
    const aim = Math.max(-1, Math.min(1, swipe.dx * 0.01));
    const target = {
      x: aim * (HALF_W - 1),
      y: SERVICE_LINE_FAR - 1.2 - Math.random(),
    };
    const vel = solveShot(b.pos, target, 1.05 - swipe.power * 0.25);
    b.vel = vel;
    b.spin = 0.7;
    b.sideSpin = aim * 0.3;
    b.lastHitBy = "player";
    b.bouncesSinceHit = 0;
    b.active = true;
    this.phase = "rally";
    this.hitCooldown = 0.4;
    this.sound.serve();
  }

  private serveAi(): void {
    const b = this.ball;
    b.pos = { x: this.ai.x, y: COURT_L - 1.5, z: 2.4 };
    const target = {
      x: (Math.random() * 2 - 1) * (HALF_W - 1.2),
      y: NET_Y - 6.4 + 1 + Math.random() * 2,
    };
    b.vel = solveShot(b.pos, target, 1.1);
    b.spin = 0.7;
    b.sideSpin = (Math.random() * 2 - 1) * 0.3;
    b.lastHitBy = "ai";
    b.bouncesSinceHit = 0;
    b.active = true;
    this.phase = "rally";
    this.sound.serve();
  }

  private playerStroke(swipe: Swipe): void {
    const b = this.ball;
    const aim = Math.max(-1, Math.min(1, swipe.dx * 0.008 + this.racket.x * 0.06));
    const tx = aim * (HALF_W - 0.6);
    let ty: number;
    let flight: number;
    let spin: number;

    switch (swipe.stroke) {
      case "topspin":
        ty = SERVICE_LINE_FAR + 1.5 + swipe.power * 3.5;
        flight = 1.2 - swipe.power * 0.4;
        spin = 1.3 + swipe.power * 0.9;
        break;
      case "slice":
        ty = NET_Y + 3.5 + swipe.power * 3;
        flight = 1.45;
        spin = -1.0 - swipe.power * 0.6;
        break;
      case "flat":
        ty = SERVICE_LINE_FAR + 2 + swipe.power * 3.5;
        flight = 1.05 - swipe.power * 0.35;
        spin = 0.15;
        break;
      case "lob":
        ty = COURT_L - 2.5 + swipe.power;
        flight = 2.0 + swipe.power * 0.3;
        spin = 0.3;
        break;
      default: // block
        ty = NET_Y + 4;
        flight = 1.5;
        spin = 0;
        break;
    }

    b.vel = solveShot(b.pos, { x: tx, y: ty }, flight);
    b.spin = spin;
    b.sideSpin = aim * 0.55;
    b.lastHitBy = "player";
    b.bouncesSinceHit = 0;
    this.hitCooldown = 0.5;
    this.swingGlow = 1;
    this.lastStroke = { type: swipe.stroke, power: swipe.power, timer: 1.4 };
    this.sound.racketHit(swipe.power);

    const p = project(this.cam, b.pos.x, b.pos.y, b.pos.z);
    this.particles.spawn(
      p.sx,
      p.sy,
      10 + Math.floor(swipe.power * 18),
      STROKE_COLORS[swipe.stroke],
      120 + swipe.power * 160,
      3.5
    );
    if (swipe.power > 0.55) {
      this.shake = Math.max(this.shake, 4 + swipe.power * 10);
    }
  }

  private aiStroke(): void {
    const shot = aiChooseShot(this.ai, this.ball);
    const b = this.ball;
    b.vel = shot.vel;
    b.spin = shot.spin;
    b.sideSpin = shot.sideSpin;
    b.lastHitBy = "ai";
    b.bouncesSinceHit = 0;
    this.sound.racketHit(shot.power * 0.7);
    const p = project(this.cam, b.pos.x, b.pos.y, b.pos.z);
    this.particles.spawn(p.sx, p.sy, 8, STROKE_COLORS[shot.stroke], 90, 2.5);
  }

  private endPoint(winner: "player" | "ai", reason: string): void {
    if (this.phase !== "rally") return;
    this.phase = "point-over";
    this.phaseTimer = 1.7;
    this.ball.active = false;

    const result = awardPoint(this.score, winner);
    if (winner === "player") this.sound.pointWon();
    else this.sound.pointLost();

    let text = winner === "player" ? "Your point!" : "CPU point";
    if (result.matchWon) {
      this.winner = result.matchWon;
      text = result.matchWon === "player" ? "YOU WIN THE MATCH!" : "CPU WINS THE MATCH";
    } else if (result.gameWon) {
      text =
        result.gameWon === "player" ? "Game — You!" : "Game — CPU";
      this.server = other(this.server);
    }
    this.banner = { text, sub: reason, timer: 1.7 };
  }

  private update(dt: number, now: number): void {
    this.swingGlow = Math.max(0, this.swingGlow - dt * 3);
    this.shake = Math.max(0, this.shake - dt * 30);
    this.cam.shakeX = (Math.random() - 0.5) * this.shake;
    this.cam.shakeY = (Math.random() - 0.5) * this.shake;
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    if (this.banner.timer > 0) this.banner.timer -= dt;
    if (this.lastStroke) {
      this.lastStroke.timer -= dt;
      if (this.lastStroke.timer <= 0) this.lastStroke = null;
    }
    this.particles.update(dt);

    if (this.phase === "serve-ai") {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) this.serveAi();
    } else if (this.phase === "point-over") {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        if (this.winner) this.phase = "game-over";
        else this.startPoint();
      }
    }

    updateAi(this.ai, this.ball, dt);

    if (!this.ball.active) return;

    // Sub-step physics for stable collisions at high ball speeds.
    const steps = 3;
    for (let i = 0; i < steps; i++) {
      const ev = stepBall(this.ball, dt / steps);
      if (ev.hitNet && this.phase === "rally") {
        this.sound.netHit();
        const hitter = this.ball.lastHitBy ?? "player";
        this.endPoint(other(hitter), "Into the net");
        return;
      }
      if (ev.bounced) {
        this.sound.bounce();
        const p = project(this.cam, ev.bounceX, ev.bounceY, 0);
        this.particles.spawn(p.sx, p.sy, 6, "#cfe0a8", 60, 2);
        if (this.phase === "rally") this.resolveBounce(ev.bounceX, ev.bounceY);
        if (this.phase !== "rally") return;
      }
    }

    if (this.phase !== "rally") return;

    // Spin trail
    if (Math.abs(this.ball.spin) > 0.6) {
      const p = project(
        this.cam,
        this.ball.pos.x,
        this.ball.pos.y,
        this.ball.pos.z
      );
      this.particles.trail(
        p.sx,
        p.sy,
        this.ball.spin > 0 ? "rgba(255,157,69,0.8)" : "rgba(94,200,255,0.8)"
      );
    }

    // Player contact
    const b = this.ball;
    if (
      this.hitCooldown <= 0 &&
      b.vel.y < 0 &&
      b.pos.y <= RACKET_Y + 0.9 &&
      b.pos.y >= RACKET_Y - 1.2 &&
      Math.abs(b.pos.x - this.racket.x) < PLAYER_REACH_X &&
      Math.abs(b.pos.z - this.racket.z) < 1.35
    ) {
      const swipe = this.gesture.readSwipe(now);
      this.playerStroke(swipe);
    }

    // AI contact
    if (
      b.lastHitBy === "player" &&
      b.vel.y > 0 &&
      b.pos.y >= this.ai.y - 0.8 &&
      b.pos.y <= this.ai.y + 1.2 &&
      Math.abs(b.pos.x - this.ai.x) < 1.5 &&
      b.pos.z < 3.2
    ) {
      this.aiStroke();
    }

    // Ball escaped the play area without resolution.
    if (
      b.pos.y < -7 ||
      b.pos.y > COURT_L + 10 ||
      Math.abs(b.pos.x) > 20 ||
      b.pos.z > 60
    ) {
      const hitter = b.lastHitBy ?? "player";
      if (b.bouncesSinceHit === 0) {
        this.endPoint(other(hitter), "Out!");
      } else {
        this.endPoint(hitter, "Winner — no return");
      }
    }
  }

  private resolveBounce(x: number, y: number): void {
    const b = this.ball;
    const hitter = b.lastHitBy ?? "player";
    if (b.bouncesSinceHit === 1) {
      const side: "player" | "ai" = y > NET_Y ? "ai" : "player";
      const mustLandOn = other(hitter);
      if (side !== mustLandOn || !isLandingIn(x, y, side)) {
        this.endPoint(other(hitter), "Out!");
      }
    } else if (b.bouncesSinceHit >= 2) {
      this.endPoint(hitter, "Double bounce");
    }
  }

  // ---------------------------------------------------------------- render

  private render(): void {
    const { ctx, cam } = this;
    drawCourt(ctx, cam);
    drawAiPlayer(ctx, cam, this.ai.x, this.ai.y);
    drawNet(ctx, cam);
    if (this.ball.active) drawBall(ctx, cam, this.ball);
    drawPlayerRacket(
      ctx,
      cam,
      this.racket.x,
      RACKET_Y,
      this.racket.z,
      this.swingGlow
    );
    this.particles.draw(ctx);
    this.drawHud();

    if (this.phase === "menu") this.drawMenu();
    if (this.phase === "game-over") this.drawGameOver();
    if (this.phase === "serve-player") {
      this.centerText("Click to serve", cam.h * 0.62, 22, "#dfe8f5");
    }
  }

  private centerText(
    text: string,
    y: number,
    size: number,
    color: string,
    weight = "600"
  ): void {
    const { ctx, cam } = this;
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px -apple-system, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, cam.w / 2, y);
  }

  private drawHud(): void {
    const { ctx, cam } = this;
    if (this.phase === "menu") return;

    // Score panel
    ctx.fillStyle = "rgba(8, 15, 30, 0.72)";
    ctx.beginPath();
    ctx.roundRect(cam.w / 2 - 150, 14, 300, 64, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(120, 160, 220, 0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();

    this.centerText(
      `You ${this.score.playerGames} — ${this.score.aiGames} CPU`,
      36,
      15,
      "#9fb4d4",
      "500"
    );
    this.centerText(pointCall(this.score), 60, 21, "#f2f5fa", "700");

    // Server indicator
    ctx.fillStyle = "#ffd75e";
    ctx.font = "500 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      this.server === "player" ? "● your serve" : "● CPU serve",
      cam.w / 2,
      90
    );

    // Last stroke callout
    if (this.lastStroke) {
      const alpha = Math.min(1, this.lastStroke.timer);
      ctx.globalAlpha = alpha;
      const label = STROKE_LABELS[this.lastStroke.type];
      const pct = Math.round(this.lastStroke.power * 100);
      ctx.fillStyle = STROKE_COLORS[this.lastStroke.type];
      ctx.font = "800 30px -apple-system, 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(label, 24, cam.h - 56);
      ctx.fillStyle = "#9fb4d4";
      ctx.font = "600 15px sans-serif";
      ctx.fillText(`power ${pct}%`, 24, cam.h - 30);
      ctx.globalAlpha = 1;
    }

    // Point banner
    if (this.banner.timer > 0 && this.banner.text) {
      const alpha = Math.min(1, this.banner.timer * 2);
      ctx.globalAlpha = alpha;
      this.centerText(this.banner.text, cam.h * 0.4, 42, "#ffffff", "800");
      if (this.banner.sub) {
        this.centerText(this.banner.sub, cam.h * 0.4 + 40, 18, "#9fb4d4");
      }
      ctx.globalAlpha = 1;
    }
  }

  private drawMenu(): void {
    const { ctx, cam } = this;
    ctx.fillStyle = "rgba(5, 10, 22, 0.78)";
    ctx.fillRect(0, 0, cam.w, cam.h);

    this.centerText("SWIPE TENNIS", cam.h * 0.24, 58, "#f2f5fa", "900");
    this.centerText(
      "Move your racket with the mouse. Swipe through the ball to shape your shot.",
      cam.h * 0.33,
      17,
      "#9fb4d4"
    );

    const rows: Array<[string, string, string]> = [
      ["↘  swipe down-right", "FOREHAND TOPSPIN", STROKE_COLORS.topspin],
      ["↙  swipe down-left", "SLICE (backspin)", STROKE_COLORS.slice],
      ["→ / ←  fast horizontal", "FLAT DRIVE", STROKE_COLORS.flat],
      ["↑  swipe upward", "LOB", STROKE_COLORS.lob],
      ["slow / no swipe", "SOFT BLOCK", STROKE_COLORS.block],
    ];
    const startY = cam.h * 0.42;
    ctx.textBaseline = "middle";
    rows.forEach(([gestureLabel, strokeLabel, color], i) => {
      const y = startY + i * 36;
      ctx.font = "500 17px sans-serif";
      ctx.fillStyle = "#c6d2e6";
      ctx.textAlign = "right";
      ctx.fillText(gestureLabel, cam.w / 2 - 18, y);
      ctx.font = "800 17px sans-serif";
      ctx.fillStyle = color;
      ctx.textAlign = "left";
      ctx.fillText(strokeLabel, cam.w / 2 + 18, y);
    });

    this.centerText(
      `Swipe speed = shot power  ·  First to ${GAMES_TO_WIN} games wins`,
      startY + rows.length * 36 + 24,
      15,
      "#8094b4"
    );

    const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 350);
    ctx.globalAlpha = pulse;
    this.centerText("CLICK TO PLAY", cam.h * 0.87, 28, "#ffd75e", "800");
    ctx.globalAlpha = 1;
  }

  private drawGameOver(): void {
    const { ctx, cam } = this;
    ctx.fillStyle = "rgba(5, 10, 22, 0.72)";
    ctx.fillRect(0, 0, cam.w, cam.h);
    const won = this.winner === "player";
    this.centerText(
      won ? "🏆 YOU WIN!" : "CPU WINS",
      cam.h * 0.38,
      54,
      won ? "#ffd75e" : "#e8604c",
      "900"
    );
    this.centerText(
      `Final: You ${this.score.playerGames} — ${this.score.aiGames} CPU`,
      cam.h * 0.48,
      22,
      "#dfe8f5"
    );
    this.centerText("Click to return to menu", cam.h * 0.6, 18, "#9fb4d4");
  }
}
