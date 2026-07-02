import {
  GESTURE_WINDOW_MS,
  SWIPE_MAX_SPEED,
  SWIPE_MIN_SPEED,
} from "./constants";
import { PointerSample, StrokeType, Swipe } from "./types";

const MAX_SAMPLES = 32;

export class GestureTracker {
  private samples: PointerSample[] = [];

  addSample(x: number, y: number, t: number): void {
    this.samples.push({ x, y, t });
    if (this.samples.length > MAX_SAMPLES) this.samples.shift();
  }

  clear(): void {
    this.samples = [];
  }

  /**
   * Compute the swipe over the recent gesture window and classify it.
   *
   * Screen space: +x right, +y down. Mappings (mouse swipes starting high
   * and moving through the ball):
   *  - down-left  => slice (backspin)
   *  - down-right => forehand topspin
   *  - mostly horizontal, fast => flat drive
   *  - upward => lob
   *  - too slow => defensive block
   */
  readSwipe(now: number): Swipe {
    const windowStart = now - GESTURE_WINDOW_MS;
    const recent = this.samples.filter((s) => s.t >= windowStart);
    if (recent.length < 2) {
      return { dx: 0, dy: 0, speed: 0, stroke: "block", power: 0.25 };
    }
    const first = recent[0];
    const last = recent[recent.length - 1];
    const dt = Math.max((last.t - first.t) / 1000, 1 / 240);
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const dist = Math.hypot(dx, dy);
    const speed = dist / dt;

    const power = Math.min(
      1,
      Math.max(0, (speed - SWIPE_MIN_SPEED) / (SWIPE_MAX_SPEED - SWIPE_MIN_SPEED))
    );

    let stroke: StrokeType;
    if (speed < SWIPE_MIN_SPEED) {
      stroke = "block";
    } else {
      const angle = Math.atan2(dy, dx); // -PI..PI, +y is down
      const deg = (angle * 180) / Math.PI;
      if (deg < -30 && deg > -150) {
        stroke = "lob"; // swiping upward
      } else if (Math.abs(deg) <= 30 || Math.abs(deg) >= 150) {
        stroke = "flat"; // near-horizontal, fast
      } else if (dx >= 0) {
        stroke = "topspin"; // downward-right
      } else {
        stroke = "slice"; // downward-left
      }
    }
    return { dx, dy, speed, stroke, power };
  }
}
