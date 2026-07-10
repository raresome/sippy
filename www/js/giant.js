// giant.js — giant generator + bedroom backdrop + giant + the hand. Ported verbatim from
// sippy-prototype.html (drawGiant/drawHand and the sky/stars/moon/window from render()).
// Functions take (ctx, G) instead of reading globals.

import { W, H, LAND, rnd, irnd, pick, clamp, lerp, ease, rounded } from './draw.js';
import { FIRST, NAMES, SLEEPERS, SKINS, HAIRC } from './balance.js';

export function makeGiant(night) {
  const s = pick(SLEEPERS);
  return {
    name: pick(FIRST) + " " + pick(NAMES),
    type: s,
    skin: pick(SKINS),
    hair: pick(HAIRC),
    hairstyle: irnd(0, 3),          // 0 bald, 1 tuft, 2 curls, 3 mohawk
    mustache: Math.random() < 0.45,
    blush: Math.random() < 0.5,
    noseScale: rnd(0.85, 1.35),
    earring: Math.random() < 0.25,
    irrRate: s.irrBase * (1 + (night - 1) * 0.16),
    windupMs: Math.max(240, s.windup - (night - 1) * 22),
    spikeChance: s.spike,
  };
}

export function makeStars() {
  const stars = [];
  for (let i = 0; i < 46; i++) stars.push({ x: rnd(0, W), y: rnd(0, H * 0.55), r: rnd(0.6, 1.8), tw: rnd(0, 6.28) });
  return stars;
}

// Night sky + stars + moon + window frame (we're inside the bedroom).
export function drawBackdrop(ctx, G) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0E0823'); grad.addColorStop(0.55, '#241647'); grad.addColorStop(1, '#33205e');
  ctx.fillStyle = grad; ctx.fillRect(-20, -20, W + 40, H + 40);

  const tNow = performance.now() / 1000;
  G.stars.forEach((s) => {
    ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(tNow + s.tw));
    ctx.fillStyle = '#FFF3D6';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
  });
  ctx.globalAlpha = 1;

  // --- shooting star ---
  const cycle = 14;
  const cycleNum = Math.floor(tNow / cycle);
  const tCycle = tNow % cycle;
  if (tCycle < 0.7) {
    const progress = tCycle / 0.7;
    const randY = (cycleNum * 73) % 220 + 30;
    const startX = -100, startY = randY;
    const endX = W + 100, endY = randY + 140;
    const sx = lerp(startX, endX, progress);
    const sy = lerp(startY, endY, progress);
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 243, 214, ' + (0.85 * Math.sin(progress * Math.PI)) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 35, sy - 15); ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = '#FFF3D6';
  ctx.beginPath(); ctx.arc(W - 72, 86, 34, 0, 7); ctx.fill();
  ctx.fillStyle = '#0E0823'; ctx.globalAlpha = 0.92;
  ctx.beginPath(); ctx.arc(W - 84, 78, 30, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = 'rgba(255,243,214,.07)'; ctx.lineWidth = 10;
  ctx.strokeRect(26, 40, W - 52, H * 0.34);
  ctx.beginPath(); ctx.moveTo(W / 2, 40); ctx.lineTo(W / 2, 40 + H * 0.34); ctx.stroke();

  // --- dust motes ---
  ctx.save();
  for (let i = 0; i < 15; i++) {
    const tOffset = i * 13.7;
    const speedX = 0.06 + (i % 3) * 0.02;
    const speedY = 0.04 + (i % 2) * 0.02;
    const mx = (W * 0.1 + (i * 29.3) % (W * 0.8)) + Math.sin(tNow * speedX + tOffset) * 20;
    const my = (H * 0.25 + (i * 39.7) % (H * 0.55)) + Math.cos(tNow * speedY + tOffset) * 25;
    const r = 1.1 + (i % 3) * 0.7;
    const alpha = 0.06 + 0.14 * Math.abs(Math.sin(tNow * 0.25 + tOffset));
    ctx.fillStyle = 'rgba(255, 243, 214, ' + alpha + ')';
    ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function drawGiant(ctx, G) {
  const g = G.giant;
  const cx = W * 0.62, cy = H * 0.78, R = 170;
  const browTw = G.twitch.brow * Math.sin(performance.now() / 30) * 3;
  const noseTw = G.twitch.nose * Math.sin(performance.now() / 25) * 2;
  const breathe = Math.sin(G.snorePhase * Math.PI * 2) * 4;

  // blanket
  ctx.fillStyle = '#2E6E63';
  ctx.beginPath();
  ctx.moveTo(-10, H * 0.86 + breathe * 0.4);
  for (let x = 0; x <= W + 20; x += 42) ctx.quadraticCurveTo(x + 21, H * 0.83 + breathe * 0.4, x + 42, H * 0.86 + breathe * 0.4);
  ctx.lineTo(W + 10, H + 10); ctx.lineTo(-10, H + 10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.fillRect(-10, H * 0.92, W + 20, 4);

  // pillow
  ctx.fillStyle = '#EDE3FF';
  rounded(ctx, cx - R - 40, cy - 40 + breathe * 0.3, R * 1.9, 110, 38); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  rounded(ctx, cx - R - 40, cy + 30 + breathe * 0.3, R * 1.9, 40, 20); ctx.fill();

  // head
  const hy = cy - 30 + breathe;
  ctx.fillStyle = g.skin;
  ctx.beginPath(); ctx.arc(cx, hy, R, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.07)';
  ctx.beginPath(); ctx.arc(cx + 24, hy + 26, R * 0.92, 0, 7); ctx.fill();
  ctx.fillStyle = g.skin;
  ctx.beginPath(); ctx.arc(cx - 10, hy - 8, R * 0.93, 0, 7); ctx.fill();

  // ear
  ctx.fillStyle = g.skin;
  ctx.beginPath(); ctx.ellipse(cx + R * 0.78, hy - 6, 26, 38, -0.15, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(cx + R * 0.78, hy - 4, 12, -0.6, 2.2); ctx.stroke();
  if (g.earring) { ctx.fillStyle = '#FFB23E'; ctx.beginPath(); ctx.arc(cx + R * 0.78, hy + 32, 7, 0, 7); ctx.fill(); }

  // hair
  ctx.fillStyle = g.hair;
  if (g.hairstyle === 1) {
    ctx.beginPath(); ctx.ellipse(cx - 20, hy - R * 0.94, 46, 26, -0.3, 0, 7); ctx.fill();
  } else if (g.hairstyle === 2) {
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(cx - R * 0.7 + i * 46, hy - R * 0.82 + Math.sin(i) * 10, 26, 0, 7); ctx.fill(); }
  } else if (g.hairstyle === 3) {
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - 60 + i * 30, hy - R * 0.84);
      ctx.lineTo(cx - 45 + i * 30, hy - R * 1.18);
      ctx.lineTo(cx - 30 + i * 30, hy - R * 0.84);
      ctx.closePath(); ctx.fill();
    }
  }

  // closed eyes
  ctx.strokeStyle = 'rgba(20,10,30,.75)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  const ey = hy - 26;
  ctx.beginPath(); ctx.arc(cx - 66, ey, 22, 0.25, Math.PI - 0.25); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + 44, ey, 22, 0.25, Math.PI - 0.25); ctx.stroke();
  // brows
  ctx.lineWidth = 9;
  const furrow = clamp((G.irritation - 30) / 70, 0, 1) * 10;
  ctx.beginPath(); ctx.moveTo(cx - 92, ey - 34 + browTw + furrow); ctx.lineTo(cx - 42, ey - 40 + browTw + furrow * 1.4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 20, ey - 40 - browTw + furrow * 1.4); ctx.lineTo(cx + 70, ey - 34 - browTw + furrow); ctx.stroke();

  // nose
  ctx.fillStyle = g.skin;
  ctx.beginPath(); ctx.ellipse(cx - 10 + noseTw, hy + 22, 30 * g.noseScale, 24 * g.noseScale, 0, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.12)';
  ctx.beginPath(); ctx.ellipse(cx - 10 + noseTw, hy + 30, 26 * g.noseScale, 12 * g.noseScale, 0, 0, 7); ctx.fill();

  // blush
  if (g.blush) {
    ctx.fillStyle = 'rgba(255,120,120,.25)';
    ctx.beginPath(); ctx.ellipse(cx - 92, hy + 34, 24, 14, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 72, hy + 34, 24, 14, 0, 0, 7); ctx.fill();
  }

  // mustache
  if (g.mustache) {
    ctx.fillStyle = g.hair;
    ctx.beginPath(); ctx.ellipse(cx - 34, hy + 52, 28, 11, 0.25, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 14, hy + 52, 28, 11, -0.25, 0, 7); ctx.fill();
  }

  // mouth — open & snoring
  const mw = 16 + Math.sin(G.snorePhase * Math.PI * 2) * 8;
  ctx.fillStyle = 'rgba(60,20,30,.9)';
  ctx.beginPath(); ctx.ellipse(cx - 10, hy + 74, 18, Math.max(6, mw), 0, 0, 7); ctx.fill();

  drawHand(ctx, G);
}

// The HAND of fate — rest bottom-left, raised on windup, slams to LAND on splat.
export function drawHand(ctx, G) {
  let hx = 70, hy = H * 0.93, rot = -0.2, scaleH = 1;
  const handTw = G.twitch.hand * Math.sin(performance.now() / 22) * 5;
  hy += handTw;

  if (G.state === 'windup') {
    const p = 1 - clamp(G.windupT / (G.windupMax || G.giant.windupMs), 0, 1);
    hx = lerp(70, 120, p); hy = lerp(H * 0.93, H * 0.62, p) + Math.sin(performance.now() / 18) * 4;
    rot = lerp(-0.2, -1.0, p); scaleH = lerp(1, 1.25, p);
  } else if (G.state === 'splat' || (G.clutch && G.handAnim > 0)) {
    const p = ease(clamp(G.handAnim, 0, 1));
    hx = lerp(120, LAND.x, p); hy = lerp(H * 0.62, LAND.y + 6, p);
    rot = lerp(-1.0, 0.3, p); scaleH = 1.25;
  }

  ctx.save();
  ctx.translate(hx, hy); ctx.rotate(rot); ctx.scale(scaleH, scaleH);
  ctx.fillStyle = G.giant.skin;
  rounded(ctx, -34, -10, 70, 150, 30); ctx.fill();              // arm
  ctx.beginPath(); ctx.ellipse(0, -30, 46, 40, 0, 0, 7); ctx.fill(); // palm
  for (let i = 0; i < 4; i++) {                                  // fingers
    ctx.save(); ctx.rotate(-0.55 + i * 0.34);
    rounded(ctx, -11, -92, 22, 56, 11); ctx.fill();
    ctx.restore();
  }
  ctx.save(); ctx.rotate(1.1); rounded(ctx, -12, -74, 24, 46, 12); ctx.fill(); ctx.restore(); // thumb
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  ctx.beginPath(); ctx.ellipse(4, -22, 38, 30, 0, 0, 7); ctx.fill();
  ctx.restore();
}
