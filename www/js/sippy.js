// sippy.js — the mascot + splat/ghost scene, ported verbatim from sippy-prototype.html.
// drawSippy also paints the big blood counter / greed multiplier / LET GO + landed hint.

import { W, H, LAND, clamp, lerp, pillText } from './draw.js';
import { multOf } from './balance.js';
import { HATS } from './hats.js';

// Draw the equipped hat anchored to a head crown at (x,y) with scale unit s.
function drawHatAt(ctx, hatId, x, y, s) {
  const hat = HATS[hatId];
  if (!hat || hatId === 'none' || hat.onFeet) return;
  ctx.save(); ctx.translate(x, y); hat.draw(ctx, s); ctx.restore();
}

export function drawSippy(ctx, G) {
  const s = G.sippy;
  const fullness = clamp(G.holdT / 7, 0, 1);
  const bodyR = lerp(15, 42, fullness);
  const t = performance.now() / 1000;
  const drinking = (G.state === 'drinking' || G.state === 'windup');
  const squash = drinking ? 1 + Math.sin(t * 16) * 0.04 : 1;

  ctx.save();
  ctx.translate(s.x, s.y);
  if (G.state === 'escape') ctx.rotate(G.sippy.wob * 0.3);

  // wings
  const wingSpeed = G.state === 'escape' ? 40 : 26;
  const wA = Math.sin(t * wingSpeed) * 0.9;
  ctx.fillStyle = 'rgba(255,243,214,.45)';
  ctx.save(); ctx.rotate(-0.5 + wA * 0.3);
  ctx.beginPath(); ctx.ellipse(-6, -bodyR - 8, bodyR * 0.85, bodyR * 0.4, 0, 0, 7); ctx.fill(); ctx.restore();
  ctx.save(); ctx.rotate(0.2 - wA * 0.3);
  ctx.beginPath(); ctx.ellipse(8, -bodyR - 8, bodyR * 0.85, bodyR * 0.4, 0, 0, 7); ctx.fill(); ctx.restore();

  // dangly legs
  ctx.strokeStyle = '#2b1a4a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const lx = -bodyR * 0.5 + i * bodyR * 0.5;
    const sway = Math.sin(t * 8 + i) * 4;
    ctx.beginPath(); ctx.moveTo(lx, bodyR * 0.7);
    ctx.quadraticCurveTo(lx + sway, bodyR * 1.3, lx + sway * 1.5, bodyR * 1.6);
    ctx.stroke();
  }

  // body — translucent belly filling with blood
  ctx.save(); ctx.scale(squash, 1 / squash);
  ctx.fillStyle = '#4a3580';
  ctx.beginPath(); ctx.ellipse(0, 0, bodyR, bodyR * 0.92, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 0, bodyR - 4, bodyR * 0.92 - 4, 0, 0, 7); ctx.clip();
  ctx.fillStyle = '#FF4D5E';
  const fillH = lerp(bodyR, -bodyR, fullness);
  ctx.fillRect(-bodyR, fillH, bodyR * 2, bodyR * 2);
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.beginPath(); ctx.ellipse(Math.sin(t * 5) * 5, fillH, bodyR, 4, 0, 0, 7); ctx.fill();
  ctx.restore();

  // shine
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.beginPath(); ctx.ellipse(-bodyR * 0.35, -bodyR * 0.4, bodyR * 0.25, bodyR * 0.16, -0.5, 0, 7); ctx.fill();

  // head
  const hr = 13;
  ctx.fillStyle = '#5a42a0';
  ctx.beginPath(); ctx.arc(0, -bodyR * 0.9 - hr * 0.4, hr, 0, 7); ctx.fill();

  // eyes
  const worry = drinking ? clamp(G.irritation / 100, 0, 1) : 0;
  const ex = 0, eyy = -bodyR * 0.9 - hr * 0.4;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(ex - 6, eyy - 2, 6.5, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(ex + 6, eyy - 2, 6.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#1a1033';
  const pd = drinking ? 1.2 + worry * 2 : Math.sin(t * 2) * 1.5;
  ctx.beginPath(); ctx.arc(ex - 6 + pd, eyy - 2 + worry * 2, 2.6 + worry * 1.2, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(ex + 6 + pd, eyy - 2 + worry * 2, 2.6 + worry * 1.2, 0, 7); ctx.fill();
  if (worry > 0.6) {
    ctx.fillStyle = '#9fd8ff';
    ctx.beginPath(); ctx.arc(ex + 12, eyy - 10 + Math.sin(t * 10) * 2, 3.4, 0, 7); ctx.fill();
  }

  // equipped hat (rides the head; crocs ride the legs)
  const hat = HATS[G.hatId];
  if (hat && G.hatId !== 'none') {
    if (hat.onFeet) {
      for (const lx of [-bodyR * 0.7, bodyR * 0.7]) { ctx.save(); ctx.translate(lx, bodyR * 1.55); hat.draw(ctx, hr * 0.9); ctx.restore(); }
    } else {
      drawHatAt(ctx, G.hatId, 0, eyy - hr * 0.7, hr * 1.05);
    }
  }

  // proboscis
  ctx.strokeStyle = '#2b1a4a'; ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(0, -bodyR * 0.9 - hr * 0.1);
  if (drinking || G.state === 'landed') {
    ctx.quadraticCurveTo(2, -bodyR * 0.4, 4, bodyR * 1.05);
  } else {
    ctx.quadraticCurveTo(10, -bodyR * 0.9 - hr * 0.5, 16, -bodyR * 0.9 - hr * 0.2);
  }
  ctx.stroke();
  ctx.restore();

  // hint + counters
  if (G.state === 'landed') pillText(ctx, "HOLD TO DRINK", s.x, s.y - 70, '#FFB23E');
  if (drinking) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFF3D6';
    ctx.font = '800 44px "Arial Rounded MT Bold","Segoe UI",system-ui,sans-serif';
    ctx.fillText(Math.round(G.blood) + ' mL', W / 2, 150);
    ctx.fillStyle = '#FFB23E';
    ctx.font = '800 20px "Arial Rounded MT Bold","Segoe UI",system-ui,sans-serif';
    ctx.fillText('×' + multOf(G.holdT) + ' greed', W / 2, 178);
    if (G.state === 'windup') {
      ctx.fillStyle = Math.sin(performance.now() / 45) > 0 ? '#FF4D5E' : '#FFF3D6';
      ctx.font = '900 30px "Arial Rounded MT Bold","Segoe UI",system-ui,sans-serif';
      ctx.fillText('LET GO!!', W / 2, 218);
    }
  }
}

export function drawSplatScene(ctx, G) {
  const p = clamp(G.t / 0.25, 0, 1);
  if (p < 1) return;
  ctx.save();
  ctx.translate(LAND.x, LAND.y + 10);
  ctx.fillStyle = '#4a3580';
  ctx.beginPath(); ctx.ellipse(0, 0, 40, 7, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#FF4D5E';
  ctx.beginPath(); ctx.ellipse(6, 2, 26, 4, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#FFF3D6'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  [[-14, -4], [-4, -4]].forEach(([x, y]) => {
    ctx.beginPath(); ctx.moveTo(x - 3, y - 3); ctx.lineTo(x + 3, y + 3);
    ctx.moveTo(x + 3, y - 3); ctx.lineTo(x - 3, y + 3); ctx.stroke();
  });
  ctx.restore();

  const gt = Math.max(0, G.t - 0.5);
  if (gt > 0) {
    const gy = LAND.y - 30 - gt * 55;
    ctx.save(); ctx.globalAlpha = clamp(1.2 - gt * 0.45, 0, 1);
    ctx.translate(LAND.x + Math.sin(gt * 3) * 12, gy);
    ctx.fillStyle = 'rgba(255,243,214,.9)';
    ctx.beginPath();
    ctx.arc(0, 0, 14, Math.PI, 0);
    ctx.lineTo(14, 16);
    for (let i = 0; i < 3; i++) ctx.quadraticCurveTo(14 - 9 - i * 9, 22, 14 - 14 - i * 9.3, 16);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#FFB23E'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, -22, 12, 4, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = '#1a1033';
    ctx.beginPath(); ctx.arc(-5, -3, 2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(3, -3, 2, 0, 7); ctx.fill();
    ctx.strokeStyle = '#FFB23E'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(18, 4, 8, -1.2, 1.6); ctx.stroke();
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(13 + i * 4, -2); ctx.lineTo(13 + i * 4, 10); ctx.stroke(); }
    // the ghost keeps the hat — important for comedy. onFeet cosmetics (crocs) ride the legs.
    const ghostHat = HATS[G.hatId];
    if (ghostHat && G.hatId !== 'none' && ghostHat.onFeet) {
      for (const lx of [13, 21]) { ctx.save(); ctx.translate(lx, 11); ghostHat.draw(ctx, 7); ctx.restore(); }
    } else {
      drawHatAt(ctx, G.hatId, 0, -14, 9);
    }
    ctx.restore();
  }
}

// A small standing Sippy wearing `hatId`, for the hat-shop thumbnails.
export function drawSippyThumb(ctx, x, y, scale, hatId) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  const bodyR = 18, hr = 13, eyy = -bodyR * 0.9 - hr * 0.4;
  ctx.fillStyle = 'rgba(255,243,214,.45)';
  ctx.beginPath(); ctx.ellipse(-bodyR * 0.7, -bodyR - 6, bodyR * 0.8, bodyR * 0.4, -0.5, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(bodyR * 0.7, -bodyR - 6, bodyR * 0.8, bodyR * 0.4, 0.5, 0, 7); ctx.fill();
  ctx.strokeStyle = '#2b1a4a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) { const lx = -bodyR * 0.5 + i * bodyR * 0.5; ctx.beginPath(); ctx.moveTo(lx, bodyR * 0.7); ctx.lineTo(lx, bodyR * 1.5); ctx.stroke(); }
  ctx.fillStyle = '#4a3580'; ctx.beginPath(); ctx.ellipse(0, 0, bodyR, bodyR * 0.92, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, bodyR - 3, bodyR * 0.92 - 3, 0, 0, 7); ctx.clip();
  ctx.fillStyle = '#FF4D5E'; ctx.fillRect(-bodyR, bodyR * 0.3, bodyR * 2, bodyR); ctx.restore();
  ctx.fillStyle = '#5a42a0'; ctx.beginPath(); ctx.arc(0, eyy, hr, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-5, eyy - 2, 5, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(5, eyy - 2, 5, 0, 7); ctx.fill();
  ctx.fillStyle = '#1a1033'; ctx.beginPath(); ctx.arc(-5, eyy - 1, 2.2, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(5, eyy - 1, 2.2, 0, 7); ctx.fill();
  const hat = HATS[hatId];
  if (hat && hatId !== 'none') {
    if (hat.onFeet) { for (const lx of [-bodyR * 0.7, bodyR * 0.7]) { ctx.save(); ctx.translate(lx, bodyR * 1.5); hat.draw(ctx, hr * 0.9); ctx.restore(); } }
    else drawHatAt(ctx, hatId, 0, eyy - hr * 0.7, hr * 1.05);
  }
  ctx.restore();
}
