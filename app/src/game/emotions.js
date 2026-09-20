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
// Two primary channels per mood: face, posture (including its attached sprout),
// arms, or gaze. Mouth stays a small w; no independent theatrical mouth motion.
const pose = (changes = {}) => ({
  leftH: 1,
  rightH: 1,
  leftW: 1,
  rightW: 1,
  leftTilt: 0,
  rightTilt: 0,
  smile: 0,
  mouth: 0,
  yaw: 0,
  pitch: 0,
  roll: 0,
  bodyW: 1,
  bodyH: 1,
  cheek: 0,
  leaf: 0,
  arms: 0,
  hug: 0,
  split: 35,
  gazeX: 0,
  gazeY: 0,
  breathScale: 1,
  gazeScale: 1,
  ...changes,
});
export const EMOTION_POSES = {
  idle: pose(),
  curious: pose({ roll: -7, leaf: 0.22 }),
  happy: pose({ smile: 1, arms: 0.3 }),
  proud: pose({ smile: 0.9, bodyH: 1.05, bodyW: 0.98 }),
  celebrate: pose({ smile: 1, arms: 1 }),
  sleepy: pose({
    leftH: 0.08,
    rightH: 0.08,
    bodyW: 1.14,
    bodyH: 0.67,
    leaf: -0.85,
    breathScale: 0.5,
  }),
  sad: pose({
    leftH: 0.42,
    rightH: 0.42,
    leftTilt: -14,
    rightTilt: 14,
    leaf: -0.55,
  }),
  worried: pose({
    leftH: 0.85,
    rightH: 0.85,
    bodyW: 0.9,
    bodyH: 0.84,
    leaf: -0.45,
  }),
  shocked: pose({
    leftH: 0.29,
    rightH: 0.29,
    leftW: 0.42,
    rightW: 0.42,
    bodyW: 1.2,
    bodyH: 0.58,
  }),
  loved: pose({ smile: 1, hug: 1 }),
  excited: pose({
    leftH: 1.12,
    rightH: 1.12,
    leftW: 1.06,
    rightW: 1.06,
    leaf: 0.65,
  }),
  thinking: pose({ leftH: 0.48, rightH: 0.48, yaw: -6, pitch: -3 }),
  focused: pose({
    leftH: 0.88,
    rightH: 0.88,
    leftW: 0.87,
    rightW: 0.87,
    breathScale: 0,
    gazeScale: 0.25,
  }),
  shy: pose({
    leftH: 0.7,
    rightH: 0.85,
    leftTilt: -5,
    rightTilt: 5,
    cheek: 1,
    hug: 0.75,
  }),
};
export const EMOTION_REFERENCES = Object.freeze({
  idle: "基1 · 平静呆坐",
  curious: "扩4 · 疑惑歪头（保留两叶）",
  happy: "基2 / 扩6 · 开心眯眼",
  proud: "基8 · 得意挺胸",
  celebrate: "扩12 · 举手欢呼（不恢复蹦跳）",
  sleepy: "基4 / 基12 · 困倦融化",
  sad: "基5 / 扩11 · 低落陪伴（不附加泪贴纸）",
  worried: "扩3 · 缩小害怕（实心眼）",
  shocked: "基6 · 压扁、小点眼",
  loved: "基10 / 扩8 · 闭眼拥抱（道具不入身体）",
  excited: "基3 · 实心瞪眼、芽竖起",
  thinking: "§4 提案 · 半睁凝神、视线微偏",
  focused: "§4 提案 · 实心眼微收、身体与芽静止",
  shy: "基7 / 扩1 · 脸红、收手",
});
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

export const EXPRESSIONS = Object.fromEntries(
  Object.entries(EMOTION_POSES).map(([id, p]) => [
    id,
    [(p.leftH + p.rightH) / 2, p.smile, p.mouth, (p.roll * Math.PI) / 180, 0],
  ]),
);
