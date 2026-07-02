"use client";

import { useEffect, useRef } from "react";
import { TennisEngine } from "@/game/engine";

export default function TennisGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new TennisEngine(canvas);
    engine.start();
    return () => engine.dispose();
  }, []);

  return <canvas ref={canvasRef} />;
}
