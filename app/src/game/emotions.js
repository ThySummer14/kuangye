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
