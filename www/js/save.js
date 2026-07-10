// save.js — the ONLY persistence module. Typed accessors over native.kv (Capacitor
// Preferences on device, in-memory on web). Never use localStorage/sessionStorage.

import { kv } from './native.js';

const KEYS = {
  bestMl: 'sippy.bestMl',
  closestMs: 'sippy.closestMs',
  lifetimeMl: 'sippy.lifetimeMl',
  ownedHats: 'sippy.ownedHats',
  equippedHat: 'sippy.equippedHat',
  muted: 'sippy.muted',
  consent: 'sippy.consent',
  upgrades: 'sippy.upgrades',
  selectedTrail: 'sippy.selectedTrail',
  bloodPool: 'sippy.bloodPool',
  ownedTrails: 'sippy.ownedTrails',
  stats: 'sippy.stats',
  achievements: 'sippy.achievements',
};

// Lifetime counters behind the stats screen. One JSON blob so new counters don't each cost
// a Preferences round-trip. Achievement conditions read from here too, so it must be durable.
const ZERO_STATS = {
  nights: 0,          // runs started and finished
  giants: 0,          // giants successfully escaped, lifetime
  splats: 0,          // deaths
  clutches: 0,        // windup escapes
  bestCombo: 0,       // longest clutch chain
  bestGiants: 0,      // most giants survived in a single night
  perfectLandings: 0,
  secondWinds: 0,     // revives taken (ad or free)
  adsWatched: 0,      // rewarded ads actually completed
  timidSips: 0,       // escapes banking <10 mL — the `coward` achievement counter
  lostMl: 0,          // blood lost to slaps, lifetime
};

// Cached snapshot so render code can read synchronously after load().
const data = {
  bestMl: 0,
  closestMs: null,
  lifetimeMl: 0,
  ownedHats: ['none'],
  equippedHat: 'none',
  muted: false,
  consent: null,
  upgrades: {
    straw: 0,
    wings: 0,
    reflexes: 0,
    magnet: 0,
  },
  selectedTrail: 'classic',
  bloodPool: 0,
  ownedTrails: ['classic'],
  stats: { ...ZERO_STATS },
  achievements: [],
};

function parseList(s, fallback) {
  if (!s) return fallback;
  try { const a = JSON.parse(s); return Array.isArray(a) ? a : fallback; } catch { return fallback; }
}

export async function load() {
  const [best, closest, lifetime, owned, equipped, muted, upgrades, selectedTrail, bloodPool, ownedTrails, stats, achievements] = await Promise.all([
    kv.get(KEYS.bestMl), kv.get(KEYS.closestMs), kv.get(KEYS.lifetimeMl),
    kv.get(KEYS.ownedHats), kv.get(KEYS.equippedHat), kv.get(KEYS.muted),
    kv.get(KEYS.upgrades), kv.get(KEYS.selectedTrail), kv.get(KEYS.bloodPool),
    kv.get(KEYS.ownedTrails), kv.get(KEYS.stats), kv.get(KEYS.achievements),
  ]);
  data.bestMl = Number(best) || 0;
  data.closestMs = closest != null ? Number(closest) : null;
  data.lifetimeMl = Number(lifetime) || 0;
  data.ownedHats = parseList(owned, ['none']);
  if (!data.ownedHats.includes('none')) data.ownedHats.unshift('none');
  data.equippedHat = equipped || 'none';
  data.muted = muted === 'true';

  try { if (upgrades) data.upgrades = { ...data.upgrades, ...JSON.parse(upgrades) }; } catch (e) {}
  data.selectedTrail = selectedTrail || 'classic';
  data.bloodPool = Number(bloodPool) || 0;
  data.ownedTrails = parseList(ownedTrails, ['classic']);
  if (!data.ownedTrails.includes('classic')) data.ownedTrails.unshift('classic');

  // Merge onto ZERO_STATS so a counter added in a later build defaults to 0 for existing players.
  try { if (stats) data.stats = { ...ZERO_STATS, ...JSON.parse(stats) }; } catch { data.stats = { ...ZERO_STATS }; }
  data.achievements = parseList(achievements, []);

  return data;
}

export function get() { return data; }

async function flushStats() { await kv.set(KEYS.stats, JSON.stringify(data.stats)); }

// Increment a lifetime counter in memory. Cheap; call freely mid-run. Persisted by flushStats(),
// which recordRun() does at the end of every night.
export function bumpStat(key, n = 1) {
  if (!(key in data.stats)) return;
  data.stats[key] += n;
}

// Raise a "best ever" counter. Same persistence contract as bumpStat.
export function raiseStat(key, value) {
  if (!(key in data.stats)) return;
  if (value > data.stats[key]) data.stats[key] = value;
}

export function stats() { return data.stats; }

export async function recordRun({ bankedMl, closestMs, giants, splatted, lostMl }) {
  let newBest = false;
  if (bankedMl > data.bestMl) { data.bestMl = Math.floor(bankedMl); await kv.set(KEYS.bestMl, data.bestMl); newBest = true; }
  if (closestMs != null && (data.closestMs == null || closestMs < data.closestMs)) {
    data.closestMs = Math.round(closestMs); await kv.set(KEYS.closestMs, data.closestMs);
  }
  data.lifetimeMl = Math.floor(data.lifetimeMl + bankedMl);
  data.bloodPool = Math.floor(data.bloodPool + bankedMl);

  data.stats.nights += 1;
  if (giants) raiseStat('bestGiants', giants);
  if (splatted) data.stats.splats += 1;
  if (lostMl) data.stats.lostMl += Math.round(lostMl);

  await Promise.all([
    kv.set(KEYS.lifetimeMl, data.lifetimeMl),
    kv.set(KEYS.bloodPool, data.bloodPool),
    flushStats(),
  ]);
  return { newBest };
}

// Records the unlock locally and reports whether this call was the first one (so the caller
// only pushes to Play Games / fires analytics once).
export async function unlockAchievement(id) {
  if (data.achievements.includes(id)) return false;
  data.achievements.push(id);
  await kv.set(KEYS.achievements, JSON.stringify(data.achievements));
  return true;
}

export function hasAchievement(id) { return data.achievements.includes(id); }

export async function ownHat(id) {
  if (!data.ownedHats.includes(id)) { data.ownedHats.push(id); await kv.set(KEYS.ownedHats, JSON.stringify(data.ownedHats)); }
}

export async function equipHat(id) {
  data.equippedHat = id;
  await kv.set(KEYS.equippedHat, id);
}

export async function setMuted(m) {
  data.muted = !!m;
  await kv.set(KEYS.muted, data.muted);
}

export async function buyUpgrade(type, cost) {
  if (data.bloodPool >= cost && data.upgrades[type] < 4) {
    data.bloodPool -= cost;
    data.upgrades[type]++;
    await Promise.all([
      kv.set(KEYS.bloodPool, data.bloodPool),
      kv.set(KEYS.upgrades, JSON.stringify(data.upgrades))
    ]);
    return true;
  }
  return false;
}

export async function buyTrail(id, cost) {
  if (data.bloodPool >= cost && !data.ownedTrails.includes(id)) {
    data.bloodPool -= cost;
    data.ownedTrails.push(id);
    await Promise.all([
      kv.set(KEYS.bloodPool, data.bloodPool),
      kv.set(KEYS.ownedTrails, JSON.stringify(data.ownedTrails))
    ]);
    return true;
  }
  return false;
}

export async function selectTrail(id) {
  if (data.ownedTrails.includes(id)) {
    data.selectedTrail = id;
    await kv.set(KEYS.selectedTrail, id);
    return true;
  }
  return false;
}
