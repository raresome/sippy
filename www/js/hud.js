// hud.js — in-game HUD + title screen, ported verbatim from sippy-prototype.html.
// Drawn in the logical 420×740 space (after the world), so coords match the prototype.

import { W, H, pillText } from './draw.js';
import { HATS } from './hats.js';

export function drawHUD(ctx, G) {
  if (G.state === 'title') return;
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,243,214,.55)';
  ctx.font = '800 12px "Arial Rounded MT Bold","Segoe UI",system-ui,sans-serif';
  ctx.fillText('TONIGHT', 18, 30);
  ctx.fillText('BEST', W - 70, 30);
  ctx.fillStyle = '#FFF3D6';
  ctx.font = '900 24px "Arial Rounded MT Bold","Segoe UI",system-ui,sans-serif';
  ctx.fillText(G.banked + ' mL', 18, 56);
  ctx.textAlign = 'right';
  ctx.fillText(G.best + '', W - 18, 56);

  if (G.combo > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFB23E';
    ctx.font = '800 13px "Arial Rounded MT Bold","Segoe UI",system-ui,sans-serif';
    ctx.fillText(`🔥 COMBO x${G.combo}`, 18, 78);
  }
  if (G.perfectLanding) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#06d6a0';
    ctx.font = '800 13px "Arial Rounded MT Bold","Segoe UI",system-ui,sans-serif';
    ctx.fillText(`✨ PERFECT`, 18, G.combo > 0 ? 94 : 78);
  }

  ctx.textAlign = 'center';

  if (G.giant && G.state !== 'gameover') {
    ctx.fillStyle = '#FFF3D6';
    ctx.font = '900 17px "Arial Rounded MT Bold","Segoe UI",system-ui,sans-serif';
    ctx.fillText('NIGHT ' + G.night + ' — ' + G.giant.name, W / 2, 96);
    ctx.fillStyle = '#FFB23E';
    ctx.font = '800 13px "Arial Rounded MT Bold","Segoe UI",system-ui,sans-serif';
    ctx.fillText(G.giant.type.label + '  ·  ' + G.giant.type.hint, W / 2, 116);
  }
  if (G.msgT > 0) pillText(ctx, G.msg, W / 2, H * 0.31, '#FFB23E');
}

export function drawTitle(ctx, G) {
  const t = performance.now() / 1000;
  ctx.fillStyle = 'rgba(14,8,35,.45)'; ctx.fillRect(0, 0, W, H);

  // big bobbing sippy
  ctx.save();
  ctx.translate(W / 2 + Math.sin(t * 1.2) * 10, H * 0.30 + Math.sin(t * 2.2) * 8);
  ctx.scale(2.4, 2.4);
  const bodyR = 18;
  const wA = Math.sin(t * 26) * 0.9;
  ctx.fillStyle = 'rgba(255,243,214,.45)';
  ctx.save(); ctx.rotate(-0.5 + wA * 0.3); ctx.beginPath(); ctx.ellipse(-6, -bodyR - 8, bodyR * 0.9, bodyR * 0.42, 0, 0, 7); ctx.fill(); ctx.restore();
  ctx.save(); ctx.rotate(0.2 - wA * 0.3); ctx.beginPath(); ctx.ellipse(8, -bodyR - 8, bodyR * 0.9, bodyR * 0.42, 0, 0, 7); ctx.fill(); ctx.restore();
  ctx.strokeStyle = '#2b1a4a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const lx = -bodyR * 0.5 + i * bodyR * 0.5, sway = Math.sin(t * 8 + i) * 3;
    ctx.beginPath(); ctx.moveTo(lx, bodyR * 0.7); ctx.quadraticCurveTo(lx + sway, bodyR * 1.3, lx + sway * 1.5, bodyR * 1.6); ctx.stroke();
  }
  ctx.fillStyle = '#4a3580'; ctx.beginPath(); ctx.ellipse(0, 0, bodyR, bodyR * 0.92, 0, 0, 7); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.ellipse(0, 0, bodyR - 3, bodyR * 0.92 - 3, 0, 0, 7); ctx.clip();
  ctx.fillStyle = '#FF4D5E'; ctx.fillRect(-bodyR, bodyR * 0.3, bodyR * 2, bodyR);
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.beginPath(); ctx.ellipse(-7, -8, 5, 3, -0.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#5a42a0'; ctx.beginPath(); ctx.arc(0, -bodyR * 1.1, 9, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-4, -bodyR * 1.15, 4.5, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(4, -bodyR * 1.15, 4.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#1a1033';
  const px = Math.sin(t * 1.5) * 1.5;
  ctx.beginPath(); ctx.arc(-4 + px, -bodyR * 1.13, 1.9, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(4 + px, -bodyR * 1.13, 1.9, 0, 7); ctx.fill();
  ctx.strokeStyle = '#2b1a4a'; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(2, -bodyR * 1.0); ctx.quadraticCurveTo(12, -bodyR * 0.8, 16, -bodyR * 0.55); ctx.stroke();
  const hat = HATS[G.hatId];
  if (hat && G.hatId !== 'none') {
    if (hat.onFeet) {
      // crocs ride the outer legs so the cosmetic is visible on the title mascot too
      for (const lx of [-bodyR * 0.5, bodyR * 0.5]) { ctx.save(); ctx.translate(lx, bodyR * 1.6); hat.draw(ctx, 9 * 0.9); ctx.restore(); }
    } else {
      ctx.save(); ctx.translate(0, -bodyR * 1.1 - 9 * 0.7); hat.draw(ctx, 9 * 1.05); ctx.restore();
    }
  }
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FF4D5E';
  ctx.font = '900 72px "Arial Rounded MT Bold","Segoe UI",system-ui,sans-serif';
  ctx.fillText('SIPPY', W / 2, H * 0.52);
  ctx.fillStyle = '#FFF3D6';
  ctx.font = '800 18px "Arial Rounded MT Bold","Segoe UI",system-ui,sans-serif';
  ctx.fillText('HOLD to drink. RELEASE to live.', W / 2, H * 0.575);
  ctx.fillStyle = '#FFB23E';
  ctx.font = '800 14px "Arial Rounded MT Bold","Segoe UI",system-ui,sans-serif';
  ctx.fillText('Greed kills. Greed also pays. Choose.', W / 2, H * 0.61);

  const pulse = 0.7 + 0.3 * Math.sin(t * 3.5);
  ctx.globalAlpha = pulse;
  pillText(ctx, 'TAP TO START', W / 2, H * 0.72, '#FFF3D6');
  ctx.globalAlpha = 1;

  if (G.best > 0) {
    ctx.fillStyle = 'rgba(255,243,214,.5)';
    ctx.font = '800 13px "Arial Rounded MT Bold","Segoe UI",system-ui,sans-serif';
    ctx.fillText('best night: ' + G.best + ' mL', W / 2, H * 0.78);
  }
}
