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
      (-Math.sin(Math.acos(Math.cos(a))) * width * 0.55 + Math.sin(a) * 2.6) *
        s;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function blinkAt(t) {
  const phase = t % 5300;
  if (phase < 4990) return 1;
  const u = (phase - 4990) / 310;
  return 0.05 + 0.95 * (0.5 + 0.5 * Math.cos(Math.PI * 2 * u));
}
export function paintMouth(ctx, x, y, open, smile, width) {
  const amount = Math.max(0, Math.min(1, (open - 0.2) / 0.7));
  ctx.save();
  ctx.strokeStyle = "#435039";
  ctx.fillStyle = "#66503f";
  ctx.lineWidth = Math.max(2, width * 0.17);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - width * 0.75, y);
  ctx.quadraticCurveTo(x, y + width * (smile * 0.5), x + width * 0.75, y);
  ctx.quadraticCurveTo(
    x,
    y + width * (smile * 0.5) + amount * width,
    x - width * 0.75,
    y,
  );
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
