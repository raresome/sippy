// main.js — boot, resize (contain-scale + centered, like the prototype), RAF loop, render
// orchestration (ported from the prototype's render()), input, and the game-over DOM card.
// Native access stays behind native.js; persistence behind save.js.

import { Game } from './state.js';
import { W, H, clamp, lerp } from './draw.js';
import { drawBackdrop, drawGiant } from './giant.js';
import { drawSippy, drawSplatScene, drawSippyThumb } from './sippy.js';
import { HATS, hatList, isOwned, PACKS } from './hats.js';
import { UPGRADES, TRAILS } from './balance.js';
import { drawZzz, drawParticles } from './fx.js';
import { drawHUD, drawTitle } from './hud.js';
import { AudioSys } from './audio.js';
import * as save from './save.js';
import { games, iap, ads, analytics } from './native.js';
import { ACHIEVEMENT_META } from './gameids.js';

// Published via GitHub Pages from the raresome/sippy repo (store-assets/privacy-policy.html).
// If the repo is later moved to a `genartstudios` org, update this to that Pages URL.
const PRIVACY_POLICY_URL = 'https://genartstudios.com/apps/sippy/privacy-policy';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let game, dpr = 1, scale = 1, tx = 0, ty = 0, devW = 0, devH = 0, last = 0;

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  devW = window.innerWidth; devH = window.innerHeight;
  scale = Math.min(devW / W, devH / H);            // contain
  tx = (devW - W * scale) / 2; ty = (devH - H * scale) / 2;
  canvas.width = Math.round(devW * dpr); canvas.height = Math.round(devH * dpr);
  canvas.style.width = devW + 'px'; canvas.style.height = devH + 'px';
}

let paused = false;

function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000 || 0);
  last = now;
  if (!paused) game.update(dt);   // frozen while the pause overlay is up; still renders
  render();
  syncGameover();
  syncBanner();
  requestAnimationFrame(frame);
}

function render() {
  // letterbox fill
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#191033'; ctx.fillRect(0, 0, devW, devH);

  // logical 420×740 space, with screen shake folded into the offset
  const sx = (Math.random() - 0.5) * game.shake, sy = (Math.random() - 0.5) * game.shake;
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, (tx + sx) * dpr, (ty + sy) * dpr);

  drawBackdrop(ctx, game);
  if (game.giant) drawGiant(ctx, game);
  drawZzz(ctx, game);
  if (game.state !== 'splat' && game.state !== 'gameover' && game.state !== 'title') drawSippy(ctx, game);
  if (game.state === 'splat') drawSplatScene(ctx, game);
  drawParticles(ctx, game);
  drawHUD(ctx, game);
  if (game.state === 'title') drawTitle(ctx, game);

  const danger = (game.state === 'drinking' || game.state === 'windup') ? clamp(game.irritation / 100, 0, 1) : 0;
  if (danger > 0.35) {
    const tNow = performance.now() / 1000;
    const pulseFreq = lerp(1, 4, danger);
    const pulse = 0.6 + 0.4 * Math.sin(tNow * Math.PI * 2 * pulseFreq);
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.62);
    v.addColorStop(0, 'rgba(255,77,94,0)');
    v.addColorStop(1, 'rgba(255,77,94,' + (0.34 * (danger - 0.35) / 0.65 * pulse) + ')');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
  if (game.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + game.flash + ')'; ctx.fillRect(0, 0, W, H); }
}

// ---- game-over DOM card ----
const el = (id) => document.getElementById(id);
let gameoverShown = false;

function showGameoverCard() {
  el('goBank').textContent = game.banked + ' mL';
  el('goLost').textContent = game.lostBlood + ' mL';
  el('goGiants').textContent = game.giantsSurvived;
  el('goClose').textContent = isFinite(game.closest) ? game.closest.toFixed(2) + 's from death' : 'played it safe';
  el('goBest').textContent = game.best + ' mL';
  el('goSub').textContent = ['Greed got you.', 'One sip too many.', 'He felt that.', 'You knew. You stayed.', 'The hand always wins eventually.'][Math.floor(Math.random() * 5)];
  el('overGameover').classList.add('show');
  gameoverShown = true;
}

// The card is raised by the onGameover hook (so the interstitial lands first); this only tears
// it down once the player leaves the gameover state, and keeps the title-only buttons honest.
function syncGameover() {
  if (game.state !== 'gameover' && gameoverShown) {
    el('overGameover').classList.remove('show');
    gameoverShown = false;
  }
  const onTitle = game.state === 'title';
  el('hats').hidden = !onTitle;
  el('stats').hidden = !onTitle;
  el('settings').hidden = !onTitle;
}

// Banner is allowed on the title and the game-over card only — never over a live run.
// Spec §5 protects the suspense; a banner mid-sip would also cover the irritation meter.
// Don't latch on "what we wanted last frame": ads.init() (and its consent round-trip) settles
// long after the title's first frame, so a latch would mean the banner never appears at all.
// ads.showBanner() is idempotent and guards its own in-flight call, so polling it is safe.
function syncBanner() {
  const want = game.state === 'title' || game.state === 'gameover';
  if (want) { if (!ads.bannerShown) ads.showBanner(); }
  else if (ads.bannerShown) ads.hideBanner();
}

function showToast(msg) {
  const t = el('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1500);
}

// ---- Second Wind offer (spec §5) ----
// Resolves true if the player wants the revive. state.js then asks native.js for the ad and
// only actually revives on a real reward. Declining resolves false → straight to game over.
function offerSecondWind(g) {
  return new Promise((resolve) => {
    const free = ads.removed;
    el('swBank').textContent = g.banked + ' mL';
    el('swLost').textContent = g.lostBlood + ' mL';
    el('swSub').textContent = free
      ? "Sippy's ghost refuses to leave. Un-splat, on the house."
      : "Sippy's ghost refuses to leave. Watch an ad to un-splat.";
    el('swCap').textContent = `Revive ${g.secondWindsUsed + 1} of ${g.secondWindCap()} tonight.`;
    el('btnSecondWind').textContent = free ? 'Un-splat 🦟' : 'Watch ad · un-splat 🦟';

    const over = el('overSecondWind');
    const yes = el('btnSecondWind');
    const no = el('btnLetHimGo');

    const done = (accepted) => {
      yes.removeEventListener('click', onYes);
      no.removeEventListener('click', onNo);
      over.classList.remove('show');
      resolve(accepted);
    };
    const onYes = () => done(true);
    const onNo = () => done(false);

    yes.addEventListener('click', onYes);
    no.addEventListener('click', onNo);
    over.classList.add('show');
  });
}

// ---- stats + achievements ----
function buildStats() {
  const d = save.get();
  const s = save.stats();

  el('stBest').textContent = d.bestMl + ' mL';
  el('stLifetime').textContent = d.lifetimeMl + ' mL';
  el('stPool').textContent = d.bloodPool + ' mL';
  el('stClosest').textContent = d.closestMs != null ? (d.closestMs / 1000).toFixed(2) + 's' : '—';
  el('stNights').textContent = s.nights;
  el('stGiants').textContent = s.giants;
  el('stBestGiants').textContent = s.bestGiants;
  el('stSplats').textContent = s.splats;
  el('stLost').textContent = s.lostMl + ' mL';
  el('stClutches').textContent = s.clutches;
  el('stCombo').textContent = s.bestCombo;
  el('stPerfect').textContent = s.perfectLandings;
  el('stSecondWinds').textContent = s.secondWinds;

  const ids = Object.keys(ACHIEVEMENT_META);
  const unlocked = ids.filter((id) => save.hasAchievement(id));
  el('stAchCount').textContent = `${unlocked.length}/${ids.length}`;

  const list = el('ach-list');
  list.innerHTML = '';
  ids.forEach((id) => {
    const meta = ACHIEVEMENT_META[id];
    const got = save.hasAchievement(id);
    const item = document.createElement('div');
    item.className = 'ach-item' + (got ? ' unlocked' : '');
    item.innerHTML = `
      <div class="ach-icon">${got ? '🏆' : '🔒'}</div>
      <div class="ach-text">
        <div class="ach-name">${meta.name}</div>
        <div class="ach-desc">${meta.desc}</div>
      </div>`;
    list.appendChild(item);
  });

  // Play Games UI is only reachable once v2 has actually signed the player in.
  el('btnLeaderboards').disabled = !games.authenticated;
  el('btnAchievements').disabled = !games.authenticated;
}

function openStats() { buildStats(); el('overStats').classList.add('show'); }
function closeStats() {
  el('overStats').classList.remove('show');
  if (game.state === 'gameover') el('overGameover').classList.add('show');
}

// ---- settings ----
function buildSettings() {
  el('setMuteState').textContent = save.get().muted ? 'Off' : 'On';
  // Non-consumable: once bought, the offer disappears. Restore brings it back on a new device.
  el('btnRemoveAds').hidden = ads.removed;
  // UMP requires a persistent re-consent entry point, but only where a form exists.
  el('btnPrivacy').hidden = !ads.canShowPrivacyOptions();
}
function openSettings() { buildSettings(); el('overSettings').classList.add('show'); }
function closeSettings() { el('overSettings').classList.remove('show'); }

// ---- pause (Android back button) ----
const MID_RUN = ['flyin', 'landed', 'drinking', 'windup', 'escape'];
function pauseGame() {
  if (paused) return;
  paused = true;
  game.release();                 // drop any held press so nothing fires on resume
  AudioSys.suspend();             // silence buzz/slurp/heartbeat while frozen
  el('overPause').classList.add('show');
}
function resumeGame() {
  if (!paused) return;
  paused = false;
  AudioSys.resume();
  el('overPause').classList.remove('show');
}
function quitToTitle() {
  resumeGame();
  game.state = 'title';
}

// Called by the Android back button (see MainActivity). Returns true when the app should stay
// open (we handled it), false to let Android background/exit the game from the title.
function handleBack() {
  // 1) close whatever overlay is open
  const overlays = ['overShop', 'overStats', 'overSettings', 'overSecondWind', 'overGameover'];
  for (const id of overlays) {
    if (el(id).classList.contains('show')) {
      if (id === 'overShop') closeShop();
      else if (id === 'overStats') closeStats();
      else if (id === 'overSettings') closeSettings();
      else el(id).classList.remove('show');
      return true;
    }
  }
  // 2) toggle pause during active play
  if (paused) { resumeGame(); return true; }
  if (MID_RUN.includes(game.state)) { pauseGame(); return true; }
  // 3) on the title, let the OS background the app
  return false;
}
window.__sippyOnBack = handleBack;

// ---- hat shop ----
function buildShop() {
  const grid = el('shop-grid'); grid.innerHTML = '';
  hatList().forEach((id) => {
    const hat = HATS[id];
    const owned = isOwned(id, iap.ownedSkus);
    const cell = document.createElement('div');
    cell.className = 'hat-cell' + (game.hatId === id ? ' equipped' : '') + (!owned ? ' locked' : '');
    cell.innerHTML = `<canvas width="128" height="128"></canvas><div class="hn">${hat.name}</div>`;
    const c = cell.querySelector('canvas');
    const tc = c.getContext('2d');
    tc.clearRect(0, 0, 128, 128);
    drawSippyThumb(tc, 64, 82, 1.25, id);
    
    cell.addEventListener('click', async () => {
      if (!owned) {
        const packSku = hat.sku;
        const pack = PACKS[packSku];
        if (pack) {
          const buy = window.confirm(`Unlock "${pack.name}" (${pack.hats.map(h => HATS[h].name).join(', ')}) for ${pack.price}?`);
          if (buy) {
            const res = await iap.purchase(packSku);
            if (res.success) {
              analytics.log('iap_purchase', { sku: packSku });
              showToast(`${pack.name} unlocked!`);
              buildShop();
            }
          }
        }
      } else {
        await save.equipHat(id);
        game.hatId = id;
        analytics.log('hat_equipped', { hat_id: id });
        buildShop();
      }
    });
    grid.appendChild(cell);
  });
}

function buildUpgrades() {
  const list = el('upgrades-list'); list.innerHTML = '';
  const sData = save.get();
  el('shopBlood').textContent = sData.bloodPool + ' mL';

  // --- upgrades list ---
  Object.keys(UPGRADES).forEach((key) => {
    const up = UPGRADES[key];
    const lvl = sData.upgrades[key] || 0;
    const maxed = lvl >= 4;
    const cost = maxed ? 0 : up.costs[lvl];

    const item = document.createElement('div');
    item.className = 'upgrade-item';

    let dotsHtml = '';
    for (let i = 1; i <= 4; i++) {
      dotsHtml += `<div class="up-dot${i <= lvl ? ' fill' : ''}"></div>`;
    }

    item.innerHTML = `
      <div class="up-info">
        <div class="up-name">${up.name}</div>
        <div class="up-desc">${up.desc}</div>
        <div class="up-level">${dotsHtml}</div>
      </div>
      <button class="up-buy${maxed ? ' maxed' : ''}">${maxed ? 'MAX' : cost + ' mL'}</button>
    `;

    if (!maxed) {
      item.querySelector('.up-buy').addEventListener('click', async () => {
        if (sData.bloodPool < cost) {
          showToast('Not enough blood!');
          AudioSys.blip(180, 0.1, 'sawtooth', 0.1);
          return;
        }
        const success = await save.buyUpgrade(key, cost);
        if (success) {
          showToast('Upgrade purchased!');
          AudioSys.blip(600, 0.15, 'triangle', 0.1);
          buildUpgrades();
        }
      });
    }

    list.appendChild(item);
  });

  // --- particle trails header ---
  const trailHeader = document.createElement('div');
  trailHeader.style.marginTop = '16px';
  trailHeader.style.marginBottom = '8px';
  trailHeader.style.fontWeight = 'bold';
  trailHeader.style.fontSize = '14px';
  trailHeader.style.color = 'var(--amber)';
  trailHeader.textContent = 'Particle Trails';
  list.appendChild(trailHeader);

  // --- trails list ---
  Object.keys(TRAILS).forEach((key) => {
    const tr = TRAILS[key];
    const owned = sData.ownedTrails.includes(key);
    const selected = sData.selectedTrail === key;

    const item = document.createElement('div');
    item.className = 'upgrade-item';
    item.innerHTML = `
      <div class="up-info">
        <div class="up-name">${tr.name}</div>
        <div class="up-desc">${selected ? 'Equipped' : owned ? 'Unlocked' : 'Buy with banked blood'}</div>
      </div>
      <button class="up-buy${selected ? ' maxed' : ''}">
        ${selected ? 'EQUIPPED' : owned ? 'EQUIP' : tr.cost + ' mL'}
      </button>
    `;

    const btn = item.querySelector('.up-buy');
    if (!selected) {
      btn.addEventListener('click', async () => {
        if (!owned) {
          if (sData.bloodPool < tr.cost) {
            showToast('Not enough blood!');
            AudioSys.blip(180, 0.1, 'sawtooth', 0.1);
            return;
          }
          const success = await save.buyTrail(key, tr.cost);
          if (success) {
            showToast(`${tr.name} purchased!`);
            AudioSys.blip(600, 0.15, 'triangle', 0.1);
            buildUpgrades();
          }
        } else {
          await save.selectTrail(key);
          showToast('Trail equipped!');
          AudioSys.blip(523, 0.1, 'sine', 0.1);
          buildUpgrades();
        }
      });
    }

    list.appendChild(item);
  });
}

// ---- shop open/close (reachable from the title 🎩 button AND the game-over card) ----
function setShopTab(tab) {
  const hats = tab !== 'upgrades';
  el('tabHats').classList.toggle('active', hats);
  el('tabUpgrades').classList.toggle('active', !hats);
  el('paneHats').classList.toggle('active', hats);
  el('paneUpgrades').classList.toggle('active', !hats);
  if (hats) buildShop(); else buildUpgrades();
}
function openShop(tab) { setShopTab(tab || 'hats'); el('overShop').classList.add('show'); }
function closeShop() {
  el('overShop').classList.remove('show');
  // If we opened the shop from the death screen, bring the game-over card back.
  if (game.state === 'gameover') el('overGameover').classList.add('show');
}

function wire() {
  addEventListener('resize', resize);
  addEventListener('pointerdown', (e) => {
    if (paused) return;
    if (e.target.closest && e.target.closest('.overlay,button,.icon-btn')) return;
    game.press();
  });
  addEventListener('pointerup', () => { if (!paused) game.release(); });
  addEventListener('pointercancel', () => { if (!paused) game.release(); });
  // Block the browser from reinterpreting a held drink-press as a scroll/refresh gesture —
  // BUT let real scrollable overlays (stats list, shop/upgrades list) scroll. Without this
  // exception the lower shop rows and full stats are unreachable by touch on a phone.
  addEventListener('touchmove', (e) => {
    if (e.target.closest && e.target.closest('.stats-scroll, .upgrades-list, .shop-grid')) return;
    e.preventDefault();
  }, { passive: false });
  addEventListener('keydown', (e) => {
    if (e.code === 'Escape') { handleBack(); return; }   // desktop parity with Android back
    if (paused) return;
    if (e.code === 'Space' && !e.repeat) game.press();
  });
  addEventListener('keyup', (e) => { if (e.code === 'Space' && !paused) game.release(); });

  el('btnRetry').addEventListener('click', () => {
    el('overGameover').classList.remove('show'); gameoverShown = false;
    AudioSys.init(); AudioSys.resume(); game.startNight();
  });
  el('btnShop').addEventListener('click', () => {
    // Hide the game-over card but keep gameoverShown=true so syncGameover won't re-trigger it;
    // closeShop() restores it. Default to Upgrades — that's where banked blood gets spent.
    el('overGameover').classList.remove('show');
    openShop('upgrades');
  });
  el('btnBrag').addEventListener('click', () => {
    const close = isFinite(game.closest) ? ' Escaped ' + game.closest.toFixed(2) + 's before the slap.' : '';
    const txt = '🦟 SIPPY — drank ' + game.banked + ' mL from ' + game.giantsSurvived + ' sleeping giants.' + close + ' One more sip?';
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => {
      showToast('Copied!');
    }).catch(() => {});
  });

  const mute = el('mute');
  if (mute) mute.addEventListener('click', async () => {
    const m = !save.get().muted; await save.setMuted(m); AudioSys.setMuted(m);
    mute.textContent = m ? '🔇' : '🔊';
  });

  el('tabHats').addEventListener('click', () => setShopTab('hats'));
  el('tabUpgrades').addEventListener('click', () => setShopTab('upgrades'));

  el('hats').addEventListener('click', () => openShop('hats'));
  el('shopClose').addEventListener('click', closeShop);
  el('overShop').addEventListener('click', (e) => { if (e.target === el('overShop')) closeShop(); });

  // ---- stats ----
  el('stats').addEventListener('click', openStats);
  el('btnGoStats').addEventListener('click', () => {
    el('overGameover').classList.remove('show');   // closeStats() puts it back
    openStats();
  });
  el('statsClose').addEventListener('click', closeStats);
  el('overStats').addEventListener('click', (e) => { if (e.target === el('overStats')) closeStats(); });
  el('btnLeaderboards').addEventListener('click', () => games.showLeaderboards());
  el('btnAchievements').addEventListener('click', () => games.showAchievements());

  // ---- settings ----
  el('settings').addEventListener('click', openSettings);
  el('settingsClose').addEventListener('click', closeSettings);
  el('overSettings').addEventListener('click', (e) => { if (e.target === el('overSettings')) closeSettings(); });
  el('btnToggleMute').addEventListener('click', async () => {
    const m = !save.get().muted;
    await save.setMuted(m); AudioSys.setMuted(m);
    el('mute').textContent = m ? '🔇' : '🔊';
    buildSettings();
  });
  el('btnRemoveAds').addEventListener('click', async () => {
    const res = await iap.purchase('remove_ads_999');
    if (res.success) {
      analytics.log('iap_purchase', { sku: 'remove_ads_999' });
      showToast('Ads removed. Second Wind is on the house.');
      buildSettings();       // ads.setRemoved() already tore the banner down
    }
  });
  el('btnRestore').addEventListener('click', async () => {
    const { skus } = await iap.restore();
    showToast(skus.length ? `Restored ${skus.length} purchase${skus.length > 1 ? 's' : ''}` : 'Nothing to restore');
  });
  el('btnPrivacy').addEventListener('click', () => ads.showPrivacyOptions());
  el('btnPolicy').addEventListener('click', () => window.open(PRIVACY_POLICY_URL, '_blank', 'noopener'));

  // ---- pause ----
  el('btnResume').addEventListener('click', resumeGame);
  el('btnQuit').addEventListener('click', quitToTitle);
}

async function boot() {
  resize();
  await save.load();
  game = new Game();
  game.best = Math.floor(save.get().bestMl) || 0;
  AudioSys.setMuted(save.get().muted);
  const mute = el('mute'); if (mute) mute.textContent = save.get().muted ? '🔇' : '🔊';

  // Screen hooks. state.js drives both; main.js owns everything DOM.
  game.onSecondWindOffer = offerSecondWind;
  game.onGameover = async () => {
    // Interstitial fills the beat between the ghost and the scoreboard, and only after the
    // player has already turned down (or failed to get) a Second Wind.
    await ads.showInterstitial();
    showGameoverCard();
  };

  wire();

  // Entitlements must land before ads.init() so remove_ads_999 owners never see a banner.
  await iap.restore();

  // Revalidate the equipped hat against actual ownership: if a paid hat's SKU isn't owned
  // (e.g. purchases cleared, or restore came back empty), fall back to no hat so we never
  // render a cosmetic the player doesn't own.
  if (!isOwned(game.hatId, iap.ownedSkus)) {
    game.hatId = 'none';
    await save.equipHat('none');
  }

  // Fire-and-forget: neither may delay the first frame, and neither may break the game if the
  // network, the ad SDK, or Play Games is unavailable.
  analytics.init();
  ads.init();
  games.signIn();

  requestAnimationFrame((now) => { last = now; requestAnimationFrame(frame); });
}

boot();
