// Adapted from bloub, Copyright (c) 2026 Jérémy Perret, MIT. See /licenses/bloub-MIT.txt.
const r2 = (n) => Math.round(n * 1000) / 1000;
export function closedPath(pts, tension = 1 / 6) {
  const n = pts.length;
  if (n < 3) return "";
  const first = pts[0];
  let d = `M${r2(first.x)} ${r2(first.y)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1.x + (p2.x - p0.x) * tension;
    const c1y = p1.y + (p2.y - p0.y) * tension;
    const c2x = p2.x - (p3.x - p1.x) * tension;
    const c2y = p2.y - (p3.y - p1.y) * tension;
    d += `C${r2(c1x)} ${r2(c1y)} ${r2(c2x)} ${r2(c2y)} ${r2(p2.x)} ${r2(p2.y)}`;
  }
  return `${d}Z`;
}

const deg = (d) => (d * Math.PI) / 180;

/** Fait tourner deux vecteurs d'un repere orthonorme dans leur plan commun. */
function spin(u, v, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    [u[0] * c + v[0] * s, u[1] * c + v[1] * s, u[2] * c + v[2] * s],
    [v[0] * c - u[0] * s, v[1] * c - u[1] * s, v[2] * c - u[2] * s],
  ];
}

/**
 * Repere de la tete puis des deux yeux.
 * Repere ecran : x a droite, y vers le bas, z vers le spectateur.
 * L'indice 0 est l'oeil interieur, l'indice 1 l'oeil exterieur.
 */
export function eyePoses(gaze, scale, split = 15.46) {
  let f = [0, 0, 1];
  let right = [1, 0, 0];
  let down = [0, 1, 0];

  // lacet : forward bascule vers right
  [f, right] = spin(f, right, deg(gaze.yaw));
  // tangage : forward bascule vers le haut (donc a l'oppose de down)
  [down, f] = spin(down, f, deg(gaze.pitch));
  // roulis : la tete penche dans son propre plan
  [right, down] = spin(right, down, deg(gaze.roll));

  const build = (side) => {
    const [ef, er] = spin(f, right, deg(split * side));
    return {
      x: ef[0] * scale,
      y: ef[1] * scale,
      a: er[0],
      b: er[1],
      c: down[0],
      d: down[1],
      depth: ef[2],
    };
  };

  return [build(-1), build(1)];
}
