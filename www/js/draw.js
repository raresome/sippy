// draw.js — shared math + drawing helpers, ported verbatim from sippy-prototype.html.
// Logical canvas is 420×740; main.js scales it (contain) and centers it on the device.

export const W = 420, H = 740;                 // logical canvas (prototype's coordinate system)
export const LAND = { x: W * 0.565, y: H * 0.595 };   // cheek landing spot

export const rnd = (a, b) => a + Math.random() * (b - a);
export const irnd = (a, b) => Math.floor(rnd(a, b + 1));
export const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function pillText(ctx, txt, x, y, color) {
  ctx.font = '800 15px "Arial Rounded MT Bold","Segoe UI",system-ui,sans-serif';
  const w = ctx.measureText(txt).width + 26;
  ctx.fillStyle = 'rgba(20,12,40,.85)';
  rounded(ctx, x - w / 2, y - 16, w, 30, 15); ctx.fill();
  ctx.fillStyle = color; ctx.textAlign = 'center';
  ctx.fillText(txt, x, y + 5);
}
