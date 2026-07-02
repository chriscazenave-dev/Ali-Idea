/** Tiny synthesized sound engine — no audio assets needed. */
export class SoundEngine {
  private ctx: AudioContext | null = null;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  unlock(): void {
    this.ensure();
  }

  private blip(
    freq: number,
    duration: number,
    type: OscillatorType,
    gainValue: number,
    freqEnd?: number
  ): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        freqEnd,
        ctx.currentTime + duration
      );
    }
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  private noise(duration: number, gainValue: number): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const frames = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = gainValue;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1400;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
  }

  racketHit(power: number): void {
    this.blip(180 + power * 220, 0.09, "triangle", 0.5, 90);
    this.noise(0.05, 0.25 + power * 0.3);
  }

  bounce(): void {
    this.noise(0.06, 0.18);
    this.blip(140, 0.06, "sine", 0.25, 80);
  }

  netHit(): void {
    this.blip(90, 0.25, "sawtooth", 0.3, 40);
    this.noise(0.15, 0.3);
  }

  pointWon(): void {
    this.blip(523, 0.12, "square", 0.15);
    setTimeout(() => this.blip(659, 0.12, "square", 0.15), 110);
    setTimeout(() => this.blip(784, 0.2, "square", 0.15), 220);
  }

  pointLost(): void {
    this.blip(330, 0.15, "square", 0.12);
    setTimeout(() => this.blip(247, 0.25, "square", 0.12), 140);
  }

  serve(): void {
    this.blip(300, 0.08, "triangle", 0.35, 150);
    this.noise(0.04, 0.2);
  }
}
