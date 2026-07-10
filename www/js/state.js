// state.js — game state + update loop + transitions, ported verbatim from sippy-prototype.html
// (the G object, update(), and escapeNow/triggerWindup/splat/newGiant/startNight/endNight).
// Build additions layered in: best-score persistence (save.js) + haptics/analytics (native.js).

import { W, H, LAND, rnd, clamp, lerp, ease, pick } from './draw.js';
import { sipBlood, UPGRADES, TRAILS } from './balance.js';
import { makeGiant, makeStars } from './giant.js';
import { AudioSys as A } from './audio.js';
import * as save from './save.js';
import { haptics, analytics, games, ads } from './native.js';
import { ACHIEVEMENT_META } from './gameids.js';

// Spec §5: rewarded Second Wind is offered at most 3× per night. Owning remove_ads_999 makes
// the revive free (no ad shown) but limits it to once, so it can't trivialise the whole run.
const SECOND_WIND_CAP_AD = 3;
const SECOND_WIND_CAP_FREE = 1;

export const PHASE = { TITLE: 'title', FLYIN: 'flyin', LANDED: 'landed', DRINKING: 'drinking',
  WINDUP: 'windup', ESCAPE: 'escape', SPLAT: 'splat', GAMEOVER: 'gameover' };

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Game {
  constructor() {
    this.state = 'title';
    this.t = 0; this.night = 1; this.banked = 0; this.best = 0;
    this.giant = null; this.holdT = 0; this.blood = 0; this.irritation = 0; this.windupT = 0;
    this.closest = Infinity; this.giantsSurvived = 0;
    this.shake = 0; this.flash = 0;
    this.zzz = []; this.particles = []; this.stars = makeStars();
    this.sippy = { x: W / 2, y: -60, tx: 0, ty: 0, wob: 0 };
    this.snorePhase = 0; this.snoreHold = 0;
    this.twitch = { brow: 0, hand: 0, nose: 0 };
    this.handAnim = 0; this.clutch = false; this.lostBlood = 0;
    this.msg = ""; this.msgT = 0; this.heartAcc = 0; this.selfSlapped = false;
    this.pointerDown = false;
    this.hatId = save.get().equippedHat || 'none';   // equipped cosmetic, persisted via save.js
    this.combo = 0;
    this.perfectLanding = false;
    this.trailTimer = 0;

    // main.js supplies these. onSecondWindOffer resolves true when the player accepts the
    // revive prompt; onGameover fires once the night is truly over.
    this.onSecondWindOffer = null;
    this.onGameover = null;
    this.secondWindsUsed = 0;   // this night only
    this.splatResolved = false; // guards the async splat → offer → gameover handoff
  }

  setState(s) { this.state = s; this.t = 0; }

  newGiant() {
    this.giant = makeGiant(this.night);
    this.irritation = 0; this.holdT = 0; this.blood = 0; this.windupT = 0;
    this.handAnim = 0; this.clutch = false; this.perfectLanding = false;
    this.selfSlapped = false;
    this.sippy.x = rnd(60, W - 60); this.sippy.y = -50;
    this.setState('flyin');
  }

  startNight() {
    this.night = 1; this.banked = 0; this.giantsSurvived = 0; this.closest = Infinity; this.lostBlood = 0;
    this.combo = 0;
    this.selfSlapped = false;
    this.secondWindsUsed = 0;
    this.splatResolved = false;
    A._shotWhenReady('vox_onemoresip');   // squeaky brand hook; waits for decode on first night
    this.newGiant();
  }

  // --- achievements ---
  // save.unlockAchievement() is the idempotency gate: it returns true only the first time,
  // so Play Games and the toast each fire exactly once per player.
  async award(id) {
    try {
      if (!(await save.unlockAchievement(id))) return;
      games.unlockAchievement(id);
      const meta = ACHIEVEMENT_META[id];
      if (meta) this.showMsg('🏆 ' + meta.name, 2.2);
    } catch (e) { /* achievements must never break a run */ }
  }

  // --- input ---
  press() {
    A.init(); A.resume();
    this.pointerDown = true;
    if (this.state === 'title') { this.startNight(); return; }
    if (this.state === 'flyin') {
      if (this.t >= 1.20 && this.t <= 1.35) {
        this.perfectLanding = true;
        this.sippy.x = LAND.x; this.sippy.y = LAND.y;
        this.setState('landed');
        this.showMsg("PERFECT LANDING!", 1.5);
        A.jingle(false);
        this.press();
        return;
      }
    }
    if (this.state === 'landed') { this.setState('drinking'); A.startSlurp(); }
  }
  release() {
    this.pointerDown = false;
    if (this.state === 'drinking') this.escapeNow(false);
    else if (this.state === 'windup') this.escapeNow(true);
  }

  // --- transitions ---
  escapeNow(duringWindup) {
    A.stopSlurp();
    let gained = this.blood;
    const upgrades = save.get().upgrades || { straw: 0, wings: 0, reflexes: 0, magnet: 0 };
    const magnetMult = UPGRADES.magnet.mults[upgrades.magnet];

    if (duringWindup) {
      this.clutch = true;
      this.combo++;
      const margin = this.windupT / 1000;
      this.closest = Math.min(this.closest, margin);
      gained = Math.round(gained * 1.5);

      const comboBonus = 1 + (this.combo - 1) * 0.15;
      gained = Math.round(gained * comboBonus);
      // Apply Blood Magnet BEFORE building the toast so the number the player reads is the
      // number actually banked — otherwise a leveled Magnet silently under-reports.
      gained = Math.round(gained * magnetMult);

      let msg = "CLUTCH! ×1.5";
      if (this.combo > 1) msg += ` (COMBO x${this.combo} +${Math.round((comboBonus - 1) * 100)}%)`;
      msg += "  —  " + margin.toFixed(2) + "s from death";

      this.showMsg(msg, 2.4);
      this.handAnim = 0.0001;

      save.bumpStat('clutches');
      save.raiseStat('bestCombo', this.combo);
      this.award('clutch');
      if (margin <= 0.05) this.award('frame_perfect');
    } else {
      this.combo = 0;
      gained = Math.round(gained * magnetMult);
      if (this.blood > 2) {
        let msg = "Banked " + Math.round(gained) + " mL";
        if (this.perfectLanding) msg += " (+15 PERFECT!)";
        this.showMsg(msg, 1.4);
      }
    }

    this.banked += Math.round(gained);
    this.giantsSurvived++;

    save.bumpStat('giants');
    if (this.perfectLanding) save.bumpStat('perfectLandings');
    // "Playing it disgustingly safe" — 10 lifetime escapes that banked under 10 mL.
    if (!duringWindup && gained < 10) {
      save.bumpStat('timidSips');
      if (save.stats().timidSips >= 10) this.award('coward');
    }
    if (this.giantsSurvived >= 10) this.award('decathlon');
    if (save.get().lifetimeMl + this.banked >= 1000) this.award('bloodbank');

    analytics.log('sip_end', { ml: Math.round(gained), clutch: duringWindup, night: this.night, giant_type: this.giant.type.label });
    A.jingle(duringWindup);
    haptics.light();
    this.burst(this.sippy.x, this.sippy.y, '#FF4D5E', 14);
    this.setState('escape');
  }
  triggerWindup() {
    this.setState('windup');
    const upgrades = save.get().upgrades || { straw: 0, wings: 0, reflexes: 0, magnet: 0 };
    const reflexesAdd = UPGRADES.reflexes.mults[upgrades.reflexes];
    this.windupT = this.giant.windupMs + reflexesAdd;
    // Remember the effective windup length so the hand animation spans the whole telegraph.
    // Without this, drawHand normalizes against giant.windupMs and the hand stays flat on the
    // ground for the first `reflexesAdd` ms — stealing the "raise and slam" tell at high Reflexes.
    this.windupMax = this.windupT;
    A.gasp(); haptics.light();
    setTimeout(() => A._shot('vox_uhoh'), 180);   // squeaky "uh oh." right after the giant's gasp
  }
  splat() {
    this.combo = 0;
    A.stopSlurp(); A.stopBuzz(); A.slap(); haptics.heavy();
    this.lostBlood = Math.round(this.blood);
    this.shake = reducedMotion ? 4 : 16; this.flash = 1;
    this.splatResolved = false;
    analytics.log('splat', { night: this.night, lost_ml: this.lostBlood, hold_s: +this.holdT.toFixed(2) });
    this.award('first_splat');
    if (this.night === 1) this.award('amateur_hour');
    this.burst(this.sippy.x, this.sippy.y, '#FF4D5E', 30);
    this.burst(this.sippy.x, this.sippy.y, '#FFF3D6', 16);
    this.setState('splat');
    setTimeout(() => A.harp(), 700);
    if (Math.random() < 0.3) setTimeout(() => A._shot('vox_worthit'), 1150);  // squeaky "worth it." over the ghost (30%)
  }

  // --- Second Wind (spec §5) ---
  // remove_ads_999 makes the revive free but caps it at one; otherwise it costs a rewarded ad
  // and is capped at three per night.
  secondWindCap() { return ads.removed ? SECOND_WIND_CAP_FREE : SECOND_WIND_CAP_AD; }
  canOfferSecondWind() { return this.secondWindsUsed < this.secondWindCap(); }

  // Splat has finished animating. Offer the revive; if it isn't taken, end the night.
  // Every failure path here must fall through to endNight() — a broken ad SDK cannot strand
  // the player on a corpse.
  async resolveSplat() {
    try {
      if (this.canOfferSecondWind() && this.onSecondWindOffer) {
        const accepted = await this.onSecondWindOffer(this);
        if (accepted) {
          const { rewarded } = await ads.showRewarded();
          if (rewarded) { this.reviveSecondWind(); return; }
        }
      }
    } catch (e) { console.warn('[second_wind] failed', e); }
    await this.endNight();
  }

  // Keeps banked mL, forfeits the current sip, drops in on a fresh giant at the same night.
  reviveSecondWind() {
    this.secondWindsUsed++;
    const source = ads.removed ? 'iap' : 'ad';
    analytics.log('second_wind', { source, night: this.night });
    save.bumpStat('secondWinds');
    if (source === 'ad') save.bumpStat('adsWatched');

    this.lostBlood = 0;
    this.blood = 0;
    this.shake = 0; this.flash = 0;
    this.handAnim = 0;
    this.splatResolved = false;
    this.showMsg('SECOND WIND!', 2);
    A.jingle(true);
    this.newGiant();
  }
  showMsg(m, t) { this.msg = m; this.msgT = t; }
  burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, 6.283), sp = rnd(40, 220);
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, r: rnd(2, 5), c: color, life: rnd(0.5, 1.1) });
    }
  }

  async endNight() {
    this.setState('gameover');
    if (this.banked > this.best) this.best = this.banked;
    analytics.log('night_end', { banked_ml: this.banked, giants: this.giantsSurvived, closest_ms: isFinite(this.closest) ? Math.round(this.closest * 1000) : null });
    games.submitScore('best_night_ml', this.banked);
    if (isFinite(this.closest)) games.submitScore('closest_call_ms', Math.round(this.closest * 1000));
    try {
      await save.recordRun({
        bankedMl: this.banked,
        closestMs: isFinite(this.closest) ? this.closest * 1000 : null,
        giants: this.giantsSurvived,
        splatted: true,          // endNight() is only ever reached through a splat
        lostMl: this.lostBlood,
      });
      // Lifetime totals only settle after recordRun, so re-check the cumulative achievement here.
      if (save.get().lifetimeMl >= 1000) this.award('bloodbank');
      analytics.setUserProperty('lifetime_ml', save.get().lifetimeMl);
      analytics.setUserProperty('best_night_ml', save.get().bestMl);
    } catch (e) {}
    if (this.onGameover) this.onGameover(this);
  }

  // --- per-frame update (verbatim port) ---
  update(dt) {
    this.t += dt;
    if (this.msgT > 0) this.msgT -= dt;
    this.shake = Math.max(0, this.shake - dt * 40);
    this.flash = Math.max(0, this.flash - dt * 2.5);

    if (this.giant && this.state !== 'gameover') {
      const agitated = this.irritation > 60 || this.state === 'windup';
      this.snorePhase += dt / (agitated ? 1.1 : 1.9);
      if (this.snorePhase >= 1) {
        this.snorePhase = 0;
        if (this.state !== 'splat') { A.snore(true); setTimeout(() => A.snore(false), 650); }
        this.zzz.push({ x: LAND.x + 150, y: LAND.y - 60, vy: -rnd(18, 30), vx: rnd(4, 14), s: rnd(12, 22),
                        red: this.irritation > 55, life: 3, rot: rnd(-0.4, 0.4) });
      }
    }
    this.zzz.forEach((z) => { z.x += z.vx * dt; z.y += z.vy * dt; z.life -= dt; });
    this.zzz = this.zzz.filter((z) => z.life > 0);

    this.particles.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 380 * dt; p.life -= dt; });
    this.particles = this.particles.filter((p) => p.life > 0);

    this.twitch.brow = Math.max(0, this.twitch.brow - dt * 3);
    this.twitch.hand = Math.max(0, this.twitch.hand - dt * 3);
    this.twitch.nose = Math.max(0, this.twitch.nose - dt * 3);

    switch (this.state) {
      case 'flyin': {
        A.startBuzz(); A.setBuzzWeight(0);
        const p = ease(clamp(this.t / 1.3, 0, 1));
        this.sippy.x = lerp(this.sippy.x, LAND.x, dt * 4.5);
        this.sippy.y = lerp(-50, LAND.y, p) + Math.sin(this.t * 9) * 6 * (1 - p);

        this.trailTimer = (this.trailTimer || 0) + dt;
        if (this.trailTimer > 0.04) {
          this.trailTimer = 0;
          this.spawnTrailParticle();
        }

        if (this.t >= 1.35) { this.sippy.x = LAND.x; this.sippy.y = LAND.y; this.setState('landed'); }
        break;
      }
      case 'landed': {
        A.setBuzzWeight(0);
        if (this.pointerDown) { this.setState('drinking'); A.startSlurp(); }
        break;
      }
      case 'drinking': {
        this.holdT += dt;
        const upgrades = save.get().upgrades || { straw: 0, wings: 0, reflexes: 0, magnet: 0 };
        const strawMult = UPGRADES.straw.mults[upgrades.straw];
        const wingsMult = UPGRADES.wings.mults[upgrades.wings];

        this.blood = sipBlood(this.holdT * strawMult);
        if (this.perfectLanding) this.blood += 15;

        const fullness = clamp(this.holdT / 7, 0, 1);
        A.setBuzzWeight(fullness); A.setSlurp(fullness);

        const perfMult = this.perfectLanding ? 0.8 : 1.0;
        let rate = this.giant.irrRate * (1 + this.holdT * 0.5) * wingsMult * perfMult;
        this.irritation += rate * dt;
        if (Math.random() < this.giant.spikeChance * dt * 3) {
          this.irritation += rnd(4, 11);
          this.twitch[pick(['brow', 'hand', 'nose'])] = 1;
          A.blip(140, 0.08, 'sine', 0.06);
          haptics.tick();   // spec §4: a light tick on each irritation tell
        }
        if (this.irritation > 35) this.twitch.brow = Math.max(this.twitch.brow, 0.4);
        if (this.irritation > 65) this.twitch.hand = Math.max(this.twitch.hand, 0.5);
        this.heartAcc += dt;
        const beatGap = lerp(1.0, 0.28, clamp(this.irritation / 100, 0, 1));
        if (this.heartAcc > beatGap) { this.heartAcc = 0; A.heartbeat(clamp(this.irritation / 100, 0, 1)); }
        if (this.irritation >= 100) this.triggerWindup();
        break;
      }
      case 'windup': {
        this.holdT += dt;
        const upgrades = save.get().upgrades || { straw: 0, wings: 0, reflexes: 0, magnet: 0 };
        const strawMult = UPGRADES.straw.mults[upgrades.straw];
        this.blood = sipBlood(this.holdT * strawMult);
        if (this.perfectLanding) this.blood += 15;
        this.windupT -= dt * 1000;
        this.twitch.hand = 1;
        if (this.windupT <= 0) this.splat();
        break;
      }
      case 'escape': {
        const fullness = clamp(this.holdT / 7, 0, 1);
        A.setBuzzWeight(fullness);
        const spd = lerp(260, 90, fullness);
        this.sippy.y -= spd * dt;
        this.sippy.x += Math.sin(this.t * lerp(10, 4, fullness)) * lerp(1.5, 4, fullness);
        this.sippy.wob = Math.sin(this.t * 12) * fullness;

        this.trailTimer = (this.trailTimer || 0) + dt;
        if (this.trailTimer > 0.04) {
          this.trailTimer = 0;
          this.spawnTrailParticle();
        }

        if (this.clutch && this.handAnim > 0 && this.handAnim < 1) {
          this.handAnim = Math.min(1, this.handAnim + dt * 5);
          if (this.handAnim >= 1 && !this.selfSlapped) {
            this.selfSlapped = true; A.slap(); this.shake = reducedMotion ? 3 : 10;
            this.showMsg(this.giant.name + " slapped himself.", 2);
          }
        }
        if (this.sippy.y < -70) { this.selfSlapped = false; this.night++; A.stopBuzz(); this.newGiant(); }
        break;
      }
      case 'splat': {
        this.handAnim = Math.min(1, this.handAnim + dt * 7);
        // resolveSplat() is async and the RAF loop keeps ticking, so latch before calling it —
        // otherwise every subsequent frame fires another offer while the first awaits.
        if (this.t > 1.7 && !this.splatResolved) {
          this.splatResolved = true;
          this.resolveSplat();
        }
        break;
      }
    }
  }

  spawnTrailParticle() {
    const trail = save.get().selectedTrail || 'classic';
    let c = '#FF4D5E';
    let isRainbow = false;
    let isSmoke = false;

    if (trail === 'gold') {
      c = '#FFB23E';
    } else if (trail === 'rainbow') {
      isRainbow = true;
    } else if (trail === 'smoke') {
      isSmoke = true;
    }

    const x = this.sippy.x;
    const y = this.sippy.y + 10;

    if (isRainbow) {
      const hue = (performance.now() / 15) % 360;
      c = `hsl(${hue}, 100%, 60%)`;
      this.particles.push({
        x, y,
        vx: rnd(-20, 20),
        vy: rnd(10, 40),
        r: rnd(2.5, 4.5),
        c,
        life: rnd(0.4, 0.7)
      });
    } else if (isSmoke) {
      c = 'rgba(191, 168, 255, 0.4)';
      this.particles.push({
        x, y,
        vx: rnd(-30, 30),
        vy: rnd(-10, 20),
        r: rnd(4, 8),
        c,
        life: rnd(0.6, 1.0),
        smoke: true
      });
    } else {
      this.particles.push({
        x, y,
        vx: rnd(-15, 15),
        vy: rnd(10, 35),
        r: trail === 'gold' ? rnd(1.5, 3.5) : rnd(2, 4),
        c,
        life: rnd(0.4, 0.7),
        twinkle: trail === 'gold'
      });
    }
  }
}
