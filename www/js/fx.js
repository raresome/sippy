// fx.js — particle + Z renderers, ported verbatim from sippy-prototype.html.
// The arrays live on the game state (G.zzz, G.particles); these just draw them.

import { clamp } from './draw.js';

export function drawZzz(ctx, G) {
  G.zzz.forEach((z) => {
    ctx.save();
    ctx.translate(z.x, z.y); ctx.rotate(z.rot);
    ctx.globalAlpha = clamp(z.life / 1.2, 0, 1) * 0.8;
    ctx.fillStyle = z.red ? '#FF4D5E' : '#BFA8FF';
    ctx.font = '900 ' + z.s + 'px "Arial Rounded MT Bold","Segoe UI",system-ui,sans-serif';
    ctx.fillText(z.red ? 'Z?!' : 'Z', 0, 0);
    ctx.restore();
  });
  ctx.globalAlpha = 1;
}

export function drawParticles(ctx, G) {
  const t = performance.now() / 1000;
  G.particles.forEach((p) => {
    ctx.save();
    let alpha = clamp(p.life, 0, 1);
    if (p.twinkle) {
      alpha *= (0.4 + 0.6 * Math.abs(Math.sin(t * 15 + p.x)));
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.c;
    
    if (p.smoke) {
      const size = p.r * (1 + (1 - p.life) * 1.5);
      ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, 7); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }
    ctx.restore();
  });
  ctx.globalAlpha = 1;
}
