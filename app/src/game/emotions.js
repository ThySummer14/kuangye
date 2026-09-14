export const EXPRESSIONS = {
  idle: [1, 0, 0.2, 0, 0],
  curious: [1.22, 0.08, 0.15, -0.15, 0],
  happy: [0.55, 1, 0.75, 0.05, 0.15],
  proud: [0.65, 0.65, 0.35, -0.08, 0],
  celebrate: [0.35, 1, 1, 0, 0.5],
  sleepy: [0.12, -0.1, 0.05, 0.1, 0],
  sad: [0.55, -0.4, 0, -0.1, 0],
  worried: [0.7, -0.25, 0.1, 0.15, 0],
  shocked: [1.4, 0.1, 0.9, 0, 0.1],
  loved: [0.55, 1, 0.6, 0.08, 0.2],
  excited: [0.4, 1, 0.9, 0, 0.4],
};
// Critical damping has an exact solution: stable even when the tab resumes after suspension.
export function springStep(position, velocity, target, dt, omega = 25) {
  const offset = position - target,
    c = velocity + omega * offset,
    e = Math.exp(-omega * dt);
  return {
    position: target + (offset + c * dt) * e,
    velocity: (velocity - omega * c * dt) * e,
  };
}

// Experimental lab only; not connected to the main-site character.
// One source for the lab, portrait and 3D skin. Every field morphs continuously.
export const EMOTION_NAMES = {
  idle: "自在",
  curious: "好奇",
  happy: "开心",
  proud: "骄傲",
  celebrate: "欢呼",
  sleepy: "困困",
  sad: "陪伴",
  worried: "疑惑",
  shocked: "惊喜",
  loved: "被喜欢",
  excited: "期待",
  thinking: "思考",
  focused: "专注",
  shy: "害羞",
};
const pose = (
  leftH,
  rightH,
  width,
  tilt,
  smile,
  mouth,
  yaw,
  pitch,
  roll,
  bodyW,
  bodyH,
  cheek,
  leaf,
) => ({
  leftH,
  rightH,
  leftW: width,
  rightW: width,
  leftTilt: tilt,
  rightTilt: -tilt,
  smile,
  mouth,
  yaw,
  pitch,
  roll,
  bodyW,
  bodyH,
  cheek,
  leaf,
  split: 18,
  gazeX: 0,
  gazeY: 0,
});
export const EMOTION_POSES = {
  idle: pose(1, 1, 1, 0, 0.18, 0.08, 0, 0, 0, 1, 1, 0.2, 0),
  curious: pose(
    1.16,
    0.84,
    1.05,
    -12,
    0.15,
    0.14,
    7,
    3,
    -6,
    0.97,
    1.03,
    0.2,
    0.08,
  ),
  happy: pose(0.65, 0.65, 1.3, 8, 1, 0.32, 0, 4, 2, 1.04, 0.98, 0.65, 0.16),
  proud: pose(
    0.78,
    0.72,
    1.12,
    9,
    0.6,
    0.12,
    -5,
    9,
    -5,
    1.01,
    1.03,
    0.35,
    0.06,
  ),
  celebrate: pose(0.5, 0.5, 1.4, 12, 1, 0.7, 0, 7, 0, 1.06, 1.02, 0.8, 0.28),
  sleepy: pose(
    0.18,
    0.22,
    1.04,
    -4,
    0.02,
    0.04,
    -3,
    -5,
    7,
    1.04,
    0.96,
    0.18,
    -0.15,
  ),
  sad: pose(
    0.84,
    0.78,
    0.95,
    -20,
    -0.5,
    0.05,
    0,
    -9,
    -4,
    0.98,
    0.97,
    0.1,
    -0.18,
  ),
  worried: pose(
    0.7,
    1.05,
    1.02,
    -15,
    -0.23,
    0.17,
    5,
    -3,
    7,
    0.98,
    1.02,
    0.16,
    -0.05,
  ),
  shocked: pose(
    1.35,
    1.35,
    1.45,
    0,
    0.02,
    0.9,
    0,
    -2,
    0,
    0.96,
    1.07,
    0.25,
    0.24,
  ),
  loved: pose(0.6, 0.6, 1.2, 12, 0.95, 0.28, -3, 5, -4, 1.03, 0.99, 1, 0.1),
  excited: pose(1.08, 1.15, 1.25, -6, 0.8, 0.5, 4, 6, 3, 1.02, 1.04, 0.7, 0.22),
  thinking: pose(0.88, 0.5, 1, -14, 0.02, 0.07, 12, 5, 8, 0.99, 1.02, 0.1, 0),
  focused: pose(0.58, 0.58, 1.1, 18, 0.1, 0.04, 0, 5, 0, 0.97, 1.02, 0.1, 0.03),
  shy: pose(0.6, 0.72, 1, -8, 0.55, 0.12, -9, -4, -7, 1.02, 0.98, 0.9, -0.05),
};
export const EMOTION_SPRING = Object.freeze({ frequency: 12, damping: 0.86 });
// Exact damped oscillator; carry velocity through interruptions and parameter changes.
export function morphSpring(x, v, target, dt, frequency = 12, damping = 0.86) {
  const w = Math.max(2, Math.min(30, frequency)),
    z = Math.max(0.65, Math.min(1, damping));
  dt = Math.max(0, Math.min(1, dt));
  if (z >= 0.999) return springStep(x, v, target, dt, w);
  const a = x - target,
    wd = w * Math.sqrt(1 - z * z),
    b = (v + z * w * a) / wd,
    c = Math.cos(wd * dt),
    s = Math.sin(wd * dt),
    e = Math.exp(-z * w * dt);
  return {
    position: target + e * (a * c + b * s),
    velocity: e * (-a * wd * s + b * wd * c - z * w * (a * c + b * s)),
  };
}
export function createEmotionMotion(initial = "idle") {
  let mood = EMOTION_POSES[initial] ? initial : "idle";
  const values = { ...EMOTION_POSES[mood] },
    velocity = Object.fromEntries(Object.keys(values).map((k) => [k, 0]));
  return {
    values,
    setMood(next) {
      mood = EMOTION_POSES[next] ? next : "idle";
    },
    reset(next = "idle") {
      mood = EMOTION_POSES[next] ? next : "idle";
      Object.assign(values, EMOTION_POSES[mood]);
      Object.keys(velocity).forEach((k) => (velocity[k] = 0));
    },
    step(dt, options = {}, gaze = { x: 0, y: 0 }) {
      const target = {
        ...EMOTION_POSES[mood],
        gazeX: gaze.x || 0,
        gazeY: gaze.y || 0,
      };
      for (const k of Object.keys(values)) {
        const r = morphSpring(
          values[k],
          velocity[k],
          target[k],
          dt,
          options.frequency ?? EMOTION_SPRING.frequency,
          options.damping ?? EMOTION_SPRING.damping,
        );
        values[k] = r.position;
        velocity[k] = r.velocity;
      }
      return values;
    },
    snapshot() {
      return { mood, parameters: { ...values }, velocity: { ...velocity } };
    },
  };
}
