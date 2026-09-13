// Blend eye geometry continuously; interrupted expressions start from the current spring pose.
// Independent eye tilt and openness are inspired by bloub (Jérémy Perret, MIT).
export function paintEye(ctx, x, y, width, height, smile = 0, tilt = 0) {
  const s = Math.max(0, Math.min(1, smile));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.beginPath();
  for (let i = 0; i <= 32; i++) {
    const a = (i / 32) * Math.PI * 2,
      px = Math.cos(a) * width;
    const py =
      Math.sin(a) * Math.max(0.7, height) * (1 - s) +
      (-Math.sin(Math.acos(Math.cos(a))) * width * 0.55 + Math.sin(a) * 1.4) *
        s;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
