// World units are meters. Court is a real singles tennis court.
export const COURT_W = 8.23; // singles width
export const HALF_W = COURT_W / 2;
export const COURT_L = 23.77;
export const NET_Y = COURT_L / 2;
export const NET_H = 0.95;
export const SERVICE_LINE_NEAR = NET_Y - 6.4;
export const SERVICE_LINE_FAR = NET_Y + 6.4;

export const GRAVITY = -12.5; // slightly stronger than real for snappy arcs
export const BALL_RADIUS = 0.11;
export const BOUNCE_RESTITUTION = 0.72;
export const MAGNUS_K = 0.045;

export const PLAYER_REACH_X = 1.7;
export const PLAYER_REACH_Z = 3.2;
export const AI_REACH_X = 1.5;

export const CAM_BACK = 9.5; // camera distance behind the near baseline
export const CAM_HEIGHT = 5.2;
export const FOCAL = 900; // focal length in px (scaled to canvas height)

export const GESTURE_WINDOW_MS = 130;
export const SWIPE_MIN_SPEED = 350; // px/s below this = flat block
export const SWIPE_MAX_SPEED = 4000;
