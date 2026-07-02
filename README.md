# Swipe Tennis 🎾

A browser-based tennis game where **mouse swipe gestures shape your strokes**. Move your racket with the mouse and swipe through the ball at the moment of contact — the direction and speed of your swipe determine the stroke type, spin, and power.

Built with Next.js (App Router, TypeScript) and rendered on an HTML5 canvas with a pseudo-3D perspective court. Runs entirely client-side.

## Play

- **Move the mouse** to position your racket (left/right and up/down).
- **Click** to serve when it's your serve.
- **Swipe through the ball** at the moment of contact to hit a stroke.

### Stroke mappings

| Gesture | Stroke | Effect |
| --- | --- | --- |
| ↘ swipe down-right | **Forehand topspin** | Ball dips sharply (Magnus effect) and kicks forward off the bounce |
| ↙ swipe down-left | **Slice** | Backspin — the ball floats, lands short, and checks up |
| → / ← fast horizontal swipe | **Flat drive** | Fast, low, penetrating shot |
| ↑ swipe upward | **Lob** | High arc deep toward the opponent's baseline |
| Slow or no swipe | **Soft block** | Safe defensive return |

- **Swipe speed = shot power.** Faster swipes hit harder (and shake the screen on big hits).
- The horizontal component of your swipe also **aims** the ball left or right.

### Rules

Real tennis point scoring (love / 15 / 30 / 40 / deuce / advantage). First to **4 games** wins the match. Serve alternates each game. (Service boxes are simplified — any serve landing in the opponent's court is good.)

## Features

- Full ball physics: gravity, spin (Magnus effect for topspin dip / slice float / sidespin curve), realistic arcs and bounces, net collisions.
- AI opponent that predicts the ball's landing point and returns with randomized shot selection and error — beatable but challenging.
- Synthesized sound effects (racket hits, bounces, net cords, point jingles) via the Web Audio API — no audio assets.
- Particle trails on spin shots (orange = topspin, blue = slice), impact bursts, and screen shake on power hits.
- Menu screen with stroke guide, live score HUD, and stroke/power callouts.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm start
```

## Deployment

The game is client-side only and deploys to Vercel with zero configuration.
