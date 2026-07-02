import {
  CAM_BACK,
  CAM_HEIGHT,
  COURT_L,
  FOCAL,
  HALF_W,
  NET_H,
  NET_Y,
  SERVICE_LINE_FAR,
  SERVICE_LINE_NEAR,
} from "./constants";
import { Ball } from "./types";

export interface Camera {
  w: number;
  h: number;
  shakeX: number;
  shakeY: number;
}

export function project(
  cam: Camera,
  x: number,
  y: number,
  z: number
): { sx: number; sy: number; scale: number } {
  const f = FOCAL * (cam.h / 800);
  const depth = y + CAM_BACK;
  const sx = cam.w / 2 + (x * f) / depth + cam.shakeX;
  const sy = cam.h * 0.16 + ((CAM_HEIGHT - z) * f) / depth + cam.shakeY;
  return { sx, sy, scale: f / depth };
}

function line(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): void {
  const a = project(cam, x1, y1, 0);
  const b = project(cam, x2, y2, 0);
  ctx.beginPath();
  ctx.moveTo(a.sx, a.sy);
  ctx.lineTo(b.sx, b.sy);
  ctx.stroke();
}

export function drawCourt(ctx: CanvasRenderingContext2D, cam: Camera): void {
  // Sky / arena background
  const sky = ctx.createLinearGradient(0, 0, 0, cam.h);
  sky.addColorStop(0, "#0a1628");
  sky.addColorStop(0.35, "#12294a");
  sky.addColorStop(1, "#0d1f3c");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, cam.w, cam.h);

  // Outer ground (surround)
  const gTL = project(cam, -HALF_W - 6, COURT_L + 8, 0);
  const gBL = project(cam, -HALF_W - 14, -6, 0);
  const gBR = project(cam, HALF_W + 14, -6, 0);
  const gTR = project(cam, HALF_W + 6, COURT_L + 8, 0);
  ctx.fillStyle = "#1d4a38";
  ctx.beginPath();
  ctx.moveTo(gTL.sx, gTL.sy);
  ctx.lineTo(gTR.sx, gTR.sy);
  ctx.lineTo(gBR.sx, gBR.sy);
  ctx.lineTo(gBL.sx, gBL.sy);
  ctx.closePath();
  ctx.fill();

  // Court surface (hard court blue)
  const cTL = project(cam, -HALF_W, COURT_L, 0);
  const cBL = project(cam, -HALF_W, 0, 0);
  const cBR = project(cam, HALF_W, 0, 0);
  const cTR = project(cam, HALF_W, COURT_L, 0);
  ctx.fillStyle = "#2f6bb0";
  ctx.beginPath();
  ctx.moveTo(cTL.sx, cTL.sy);
  ctx.lineTo(cTR.sx, cTR.sy);
  ctx.lineTo(cBR.sx, cBR.sy);
  ctx.lineTo(cBL.sx, cBL.sy);
  ctx.closePath();
  ctx.fill();

  // Court lines
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = Math.max(1.5, cam.h / 400);
  line(ctx, cam, -HALF_W, 0, HALF_W, 0); // near baseline
  line(ctx, cam, -HALF_W, COURT_L, HALF_W, COURT_L); // far baseline
  line(ctx, cam, -HALF_W, 0, -HALF_W, COURT_L); // sidelines
  line(ctx, cam, HALF_W, 0, HALF_W, COURT_L);
  line(ctx, cam, -HALF_W, SERVICE_LINE_NEAR, HALF_W, SERVICE_LINE_NEAR);
  line(ctx, cam, -HALF_W, SERVICE_LINE_FAR, HALF_W, SERVICE_LINE_FAR);
  line(ctx, cam, 0, SERVICE_LINE_NEAR, 0, SERVICE_LINE_FAR); // center service line
  line(ctx, cam, 0, 0, 0, 0.35); // center marks
  line(ctx, cam, 0, COURT_L - 0.35, 0, COURT_L);
}

export function drawNet(ctx: CanvasRenderingContext2D, cam: Camera): void {
  const postL = project(cam, -HALF_W - 0.9, NET_Y, 0);
  const postLT = project(cam, -HALF_W - 0.9, NET_Y, NET_H + 0.12);
  const postR = project(cam, HALF_W + 0.9, NET_Y, 0);
  const postRT = project(cam, HALF_W + 0.9, NET_Y, NET_H + 0.12);
  const topL = project(cam, -HALF_W - 0.9, NET_Y, NET_H);
  const topR = project(cam, HALF_W + 0.9, NET_Y, NET_H);

  // Mesh
  ctx.fillStyle = "rgba(20, 28, 44, 0.55)";
  ctx.beginPath();
  ctx.moveTo(topL.sx, topL.sy);
  ctx.lineTo(topR.sx, topR.sy);
  ctx.lineTo(postR.sx, postR.sy);
  ctx.lineTo(postL.sx, postL.sy);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(210, 220, 235, 0.35)";
  ctx.lineWidth = 1;
  const cols = 24;
  for (let i = 0; i <= cols; i++) {
    const x = -HALF_W - 0.9 + ((HALF_W + 0.9) * 2 * i) / cols;
    const a = project(cam, x, NET_Y, 0);
    const b = project(cam, x, NET_Y, NET_H);
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.stroke();
  }
  for (let i = 0; i <= 5; i++) {
    const z = (NET_H * i) / 5;
    const a = project(cam, -HALF_W - 0.9, NET_Y, z);
    const b = project(cam, HALF_W + 0.9, NET_Y, z);
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.stroke();
  }

  // White band + posts
  ctx.strokeStyle = "#f2f5fa";
  ctx.lineWidth = Math.max(2, cam.h / 260);
  ctx.beginPath();
  ctx.moveTo(topL.sx, topL.sy);
  ctx.lineTo(topR.sx, topR.sy);
  ctx.stroke();
  ctx.strokeStyle = "#39445c";
  ctx.lineWidth = Math.max(3, cam.h / 220);
  ctx.beginPath();
  ctx.moveTo(postL.sx, postL.sy);
  ctx.lineTo(postLT.sx, postLT.sy);
  ctx.moveTo(postR.sx, postR.sy);
  ctx.lineTo(postRT.sx, postRT.sy);
  ctx.stroke();
}

export function drawShadow(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  x: number,
  y: number,
  z: number,
  radius: number
): void {
  const p = project(cam, x, y, 0);
  const r = radius * p.scale * Math.max(0.35, 1 - z * 0.12);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(p.sx, p.sy, r, r * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawBall(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  ball: Ball
): void {
  drawShadow(ctx, cam, ball.pos.x, ball.pos.y, ball.pos.z, 0.13);
  const p = project(cam, ball.pos.x, ball.pos.y, ball.pos.z);
  const r = Math.max(2.5, 0.11 * p.scale * 2.2);
  const grad = ctx.createRadialGradient(
    p.sx - r * 0.3,
    p.sy - r * 0.3,
    r * 0.2,
    p.sx,
    p.sy,
    r
  );
  grad.addColorStop(0, "#f4ff6e");
  grad.addColorStop(1, "#b8cc1a");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(p.sx, p.sy, r * 0.75, Math.PI * 0.2, Math.PI * 0.9);
  ctx.stroke();
}

export function drawAiPlayer(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  x: number,
  y: number
): void {
  drawShadow(ctx, cam, x, y, 0, 0.5);
  const base = project(cam, x, y, 0);
  const head = project(cam, x, y, 1.75);
  const s = base.scale;
  // Body
  ctx.strokeStyle = "#e8604c";
  ctx.lineWidth = Math.max(3, s * 0.28);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(base.sx, base.sy);
  ctx.lineTo(head.sx, head.sy + s * 0.35);
  ctx.stroke();
  // Head
  ctx.fillStyle = "#f0b58f";
  ctx.beginPath();
  ctx.arc(head.sx, head.sy, Math.max(3, s * 0.16), 0, Math.PI * 2);
  ctx.fill();
  // Racket
  const rk = project(cam, x + 0.6, y, 1.1);
  ctx.strokeStyle = "#cfd6e4";
  ctx.lineWidth = Math.max(2, s * 0.08);
  ctx.beginPath();
  ctx.ellipse(
    rk.sx,
    rk.sy,
    Math.max(3, s * 0.2),
    Math.max(4, s * 0.26),
    0.4,
    0,
    Math.PI * 2
  );
  ctx.stroke();
}

export function drawPlayerRacket(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  x: number,
  y: number,
  z: number,
  swingGlow: number
): void {
  drawShadow(ctx, cam, x, y, 0, 0.4);
  const p = project(cam, x, y, z);
  const s = p.scale;
  const rw = Math.max(14, s * 0.42);
  const rh = Math.max(18, s * 0.55);

  if (swingGlow > 0) {
    ctx.save();
    ctx.shadowColor = "rgba(120, 220, 255, 0.9)";
    ctx.shadowBlur = 30 * swingGlow;
    ctx.strokeStyle = `rgba(140, 225, 255, ${0.5 + swingGlow * 0.5})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy, rw, rh, -0.25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Handle
  ctx.strokeStyle = "#8a5a2b";
  ctx.lineWidth = Math.max(4, s * 0.09);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(p.sx + rw * 0.5, p.sy + rh * 0.9);
  ctx.lineTo(p.sx + rw * 1.1, p.sy + rh * 1.9);
  ctx.stroke();

  // Frame
  ctx.strokeStyle = "#e8ecf4";
  ctx.lineWidth = Math.max(3, s * 0.07);
  ctx.beginPath();
  ctx.ellipse(p.sx, p.sy, rw, rh, -0.25, 0, Math.PI * 2);
  ctx.stroke();

  // Strings
  ctx.strokeStyle = "rgba(230, 236, 246, 0.45)";
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(p.sx + (i * rw) / 3, p.sy - rh * 0.85);
    ctx.lineTo(p.sx + (i * rw) / 3, p.sy + rh * 0.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.sx - rw * 0.85, p.sy + (i * rh) / 3);
    ctx.lineTo(p.sx + rw * 0.85, p.sy + (i * rh) / 3);
    ctx.stroke();
  }
}
