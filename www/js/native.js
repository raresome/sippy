// native.js — the ONE facade over every native capability.
// No other file in www/ may touch Capacitor or a plugin. Game logic calls these methods;
// on the web (where window.Capacitor is absent) they degrade to safe no-ops / in-memory,
// so the whole game stays playable via `npx serve www`.
//
// There is no bundler here, so we cannot `import { Haptics } from '@capacitor/haptics'`.
// We don't need to: on device `window.Capacitor` is created by Capacitor's injected
// native-bridge.js, which populates `Capacitor.Plugins` with a proxy for every plugin in
// `Capacitor.PluginHeaders` — all of them, with no package import. Verified on a Galaxy S23:
//   Plugins = [PlayGames|Haptics|CapacitorCookies|WebView|FirebaseAnalytics|Preferences|
//              CapacitorHttp|AdMob]
// Note that `Capacitor.registerPlugin` is UNDEFINED there (it lives in @capacitor/core, which
// only a bundled app would load), so it cannot be the primary lookup — it is a web/dev-shim
// fallback only. Reach every plugin through plugin() below.

import { ADMOB_APP_ID, AD_UNITS, AD_FORCE_TEST_MODE, LEADERBOARDS, ACHIEVEMENTS, hasRealId } from './gameids.js';

const Cap = (typeof window !== 'undefined' && window.Capacitor) || null;

export const isNative = !!(Cap && typeof Cap.isNativePlatform === 'function' && Cap.isNativePlatform());

function log(...a) { if (!isNative) console.log('[native:web-noop]', ...a); }

// Resolve a native plugin proxy. Returns null on web so every caller can `?.` past it.
function plugin(name) {
  if (!isNative) return null;
  const fromBridge = Cap.Plugins && Cap.Plugins[name];
  if (fromBridge) return fromBridge;
  if (typeof Cap.registerPlugin === 'function') {
    try { return Cap.registerPlugin(name); } catch { return null; }
  }
  return null;
}

// --- Haptics (real on device, no-op on web) ---
const Haptics = plugin('Haptics');
export const haptics = {
  async heavy() { try { await Haptics?.impact({ style: 'HEAVY' }); } catch {} if (!Haptics) log('haptic heavy'); },
  async light() { try { await Haptics?.impact({ style: 'LIGHT' }); } catch {} },
  async tick()  { try { await Haptics?.selectionStart?.(); await Haptics?.selectionEnd?.(); } catch {} },
};

// --- Key/value persistence (Capacitor Preferences on device; in-memory on web). ---
// save.js builds typed accessors on top of this. localStorage is forbidden by spec.
const Preferences = plugin('Preferences');
const memStore = new Map();
export const kv = {
  async get(key) {
    if (Preferences) { try { const { value } = await Preferences.get({ key }); return value ?? null; } catch { return null; } }
    return memStore.has(key) ? memStore.get(key) : null;
  },
  async set(key, value) {
    if (Preferences) { try { await Preferences.set({ key, value: String(value) }); return; } catch {} }
    memStore.set(key, String(value));
  },
};

// --- Analytics (Firebase) ---------------------------------------------------
// Emit EXACTLY the spec §5 taxonomy: sip_end, splat, night_end, second_wind, iap_purchase,
// hat_equipped. Firebase silently drops params that aren't string/number, so coerce here:
// booleans become 1/0, null/undefined are dropped, strings are clamped to 100 chars.
const FirebaseAnalytics = plugin('FirebaseAnalytics');

function sanitize(params) {
  const out = {};
  for (const [k, v] of Object.entries(params || {})) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'boolean') out[k] = v ? 1 : 0;
    else if (typeof v === 'number') { if (Number.isFinite(v)) out[k] = v; }
    else out[k] = String(v).slice(0, 100);
  }
  return out;
}

export const analytics = {
  async init() {
    if (!FirebaseAnalytics) { log('analytics.init'); return; }
    try { await FirebaseAnalytics.setEnabled({ enabled: true }); } catch {}
  },
  log(event, params = {}) {
    const p = sanitize(params);
    if (!FirebaseAnalytics) { log('[analytics]', event, p); return; }
    FirebaseAnalytics.logEvent({ name: event, params: p }).catch(() => {});
  },
  // Lifetime totals surfaced as user properties so they can segment audiences in the console.
  setUserProperty(key, value) {
    if (!FirebaseAnalytics) { log('[analytics:prop]', key, value); return; }
    FirebaseAnalytics.setUserProperty({ key, value: String(value).slice(0, 36) }).catch(() => {});
  },
  setScreen(name) {
    if (!FirebaseAnalytics) return;
    FirebaseAnalytics.setCurrentScreen({ screenName: name }).catch(() => {});
  },
};

// --- Ads (AdMob + UMP consent) ----------------------------------------------
// Spec §5 locks the rewarded "Second Wind" unit as the only *interruptive* ad. Banner,
// interstitial and app-open are wired but gated behind AD_PLACEMENTS so the suspense loop
// can be protected by flipping one flag. Frequency capping lives in game code, not here.
const AdMob = plugin('AdMob');

// Which extra placements are live. Rewarded is always on — it's the Second Wind currency.
export const AD_PLACEMENTS = {
  banner: true,        // title + game-over only, never mid-run
  interstitial: true,  // after Second Wind is declined/unavailable, before the game-over card
  appOpen: false,      // @capacitor-community/admob v7 has no app-open API — see gameids.js
};

// A SIPPY night can end in well under a minute, so an interstitial on every game over would
// be ad flooding — bad for retention and against AdMob's own placement policy. Rate-limit it,
// and never show one before the player has had a couple of nights.
const INTERSTITIAL_MIN_INTERVAL_MS = 120000;
const INTERSTITIAL_MIN_GAMEOVERS = 3;

let adsInitialized = false;
let consent = { canRequestAds: false, status: 'UNKNOWN', privacyOptionsRequirementStatus: 'UNKNOWN' };
let rewardedReady = false;
let interstitialReady = false;
let bannerVisible = false;
let bannerPending = false;
let adsRemoved = false; // flipped by the remove_ads_999 IAP
let lastInterstitialAt = 0;
let gameoverCount = 0;

// Non-personalized ads when the user hasn't affirmatively consented.
const npa = () => consent.status !== 'OBTAINED';
const baseOpts = (adId) => ({ adId, isTesting: AD_FORCE_TEST_MODE, npa: npa() });

export const ads = {
  get removed() { return adsRemoved; },
  setRemoved(v) { adsRemoved = !!v; if (adsRemoved) this.hideBanner(); },

  get consent() { return consent; },

  // Called once at boot, before any ad request. Consent must resolve first (EEA/UK).
  async init() {
    if (!AdMob) { log('ads.init → no ad sdk on web'); return; }
    if (adsInitialized) return;
    adsInitialized = true;
    try {
      await AdMob.initialize({
        initializeForTesting: AD_FORCE_TEST_MODE,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
        maxAdContentRating: 'Teen',   // matches the Everyone 10+ / PEGI 7 target in spec §8
      });
      await this.requestConsent();
      this.preload();
    } catch (e) { console.warn('[ads] init failed', e); }
  },

  // UMP. Never throws — an ad SDK failure must not block the game from booting.
  //
  // requestConsentInfo() REJECTS outright when the AdMob account has no consent form published
  // for this app id ("Publisher misconfiguration: ... no form(s) configured"). Treating that as
  // canRequestAds=false would silently kill every ad in the app forever, so on an outright
  // failure we fall back to requesting NON-PERSONALIZED ads, which is Google's documented
  // degraded mode. npa() already returns true whenever status !== 'OBTAINED'.
  //
  // This fallback only covers UMP *errors*. A successful response that says consent is REQUIRED
  // but no form is available still yields canRequestAds=false from the SDK, and we honour it —
  // so an EEA user is never served an ad without a consent path.
  async requestConsent() {
    if (!AdMob) return consent;
    try {
      consent = await AdMob.requestConsentInfo();
      if (consent.isConsentFormAvailable && consent.status === 'REQUIRED') {
        try { consent = await AdMob.showConsentForm(); }
        catch (e) { console.warn('[ads] consent form failed to show', e); }
      }
    } catch (e) {
      console.warn('[ads] UMP unavailable — falling back to non-personalized ads:', (e && e.message) || e);
      consent = {
        status: 'UNKNOWN',
        canRequestAds: true,
        isConsentFormAvailable: false,
        privacyOptionsRequirementStatus: 'UNKNOWN',
      };
    }
    return consent;
  },

  // Settings overlay "Privacy options" button — required by UMP once a form exists.
  canShowPrivacyOptions() {
    return !!AdMob && consent.privacyOptionsRequirementStatus === 'REQUIRED';
  },
  async showPrivacyOptions() {
    if (!AdMob) { log('ads.showPrivacyOptions'); return; }
    try { await AdMob.showPrivacyOptionsForm(); } catch (e) { console.warn('[ads] privacy form', e); }
  },

  // Warm the rewarded + interstitial units so the Second Wind offer isn't a loading spinner.
  preload() {
    if (!AdMob || !consent.canRequestAds) return;
    this._preloadRewarded();
    if (AD_PLACEMENTS.interstitial && !adsRemoved) this._preloadInterstitial();
  },
  async _preloadRewarded() {
    if (!AdMob || rewardedReady || !consent.canRequestAds) return;
    try { await AdMob.prepareRewardVideoAd(baseOpts(AD_UNITS.rewarded)); rewardedReady = true; }
    catch { rewardedReady = false; }
  },
  async _preloadInterstitial() {
    if (!AdMob || interstitialReady || !consent.canRequestAds) return;
    try { await AdMob.prepareInterstitial(baseOpts(AD_UNITS.interstitial)); interstitialReady = true; }
    catch { interstitialReady = false; }
  },

  // Second Wind. Resolves { rewarded:boolean }. Any failure — no fill, dismissal, SDK error —
  // resolves not-rewarded so the caller falls through to game over. It never rejects.
  async showRewarded() {
    // remove_ads_999 turns Second Wind into a free revive: grant without showing anything.
    if (adsRemoved) { log('showRewarded → ads removed, granting free revive'); return { rewarded: true }; }
    if (!AdMob) { log('showRewarded → (no ad sdk on web)'); return { rewarded: false }; }
    if (!consent.canRequestAds) return { rewarded: false };

    if (!rewardedReady) await this._preloadRewarded();
    if (!rewardedReady) return { rewarded: false };

    try {
      const item = await AdMob.showRewardVideoAd();
      rewardedReady = false;
      this._preloadRewarded();                 // warm the next one
      return { rewarded: !!item && typeof item.amount === 'number' };
    } catch {
      rewardedReady = false;
      this._preloadRewarded();
      return { rewarded: false };              // dismissed early or failed to show
    }
  },

  async showInterstitial() {
    gameoverCount++;
    if (!AdMob || adsRemoved || !AD_PLACEMENTS.interstitial || !consent.canRequestAds) return false;
    if (gameoverCount < INTERSTITIAL_MIN_GAMEOVERS) return false;
    if (Date.now() - lastInterstitialAt < INTERSTITIAL_MIN_INTERVAL_MS) return false;
    if (!interstitialReady) await this._preloadInterstitial();
    if (!interstitialReady) return false;
    try {
      await AdMob.showInterstitial();
      lastInterstitialAt = Date.now();
      interstitialReady = false;
      this._preloadInterstitial();
      return true;
    } catch { interstitialReady = false; this._preloadInterstitial(); return false; }
  },

  // Banner is only ever shown on title / game over — never during a run.
  // Callers poll this from the RAF loop, so it must be cheap, idempotent and re-entrant-safe:
  // ads.init() resolves asynchronously, long after the title screen's first frame, and the
  // caller has to be able to keep asking until consent finally permits a request.
  get bannerShown() { return bannerVisible; },

  async showBanner() {
    if (!AdMob || adsRemoved || !AD_PLACEMENTS.banner) return;
    if (bannerVisible || bannerPending || !consent.canRequestAds) return;
    bannerPending = true;
    try {
      await AdMob.showBanner({
        ...baseOpts(AD_UNITS.banner),
        adSize: 'ADAPTIVE_BANNER',
        position: 'BOTTOM_CENTER',
        margin: 0,
      });
      bannerVisible = true;
    } catch (e) { console.warn('[ads] banner', e); }
    finally { bannerPending = false; }
  },
  async hideBanner() {
    if (!AdMob || !bannerVisible) return;
    bannerVisible = false;
    try { await AdMob.hideBanner(); } catch {}
  },
};

// --- In-app purchases. Web simulator + Native stub. -------------------------
// Still awaiting a RevenueCat project + Play Console products (spec §11 items 6).
export const iap = {
  ownedSkus: [],
  async purchase(sku) {
    if (!isNative) {
      const confirm = window.confirm(`[IAP SIMULATOR]\nWould you like to simulate purchasing "${sku === 'remove_ads_999' ? 'Remove Ads' : sku === 'hat_pack_party_199' ? 'Party Hat Pack' : 'Fancy Hat Pack'}"?`);
      if (confirm) {
        if (!this.ownedSkus.includes(sku)) {
          this.ownedSkus.push(sku);
          await kv.set('sippy.ownedSkus', JSON.stringify(this.ownedSkus));
        }
        this._applyEntitlements();
        return { success: true };
      }
      return { success: false };
    }
    log('purchase', sku, '→ (native platform, needs real billing config)');
    return { success: false };
  },
  async restore() {
    try {
      const saved = await kv.get('sippy.ownedSkus');
      if (saved) this.ownedSkus = JSON.parse(saved) || [];
    } catch {}
    this._applyEntitlements();
    return { skus: this.ownedSkus };
  },
  _applyEntitlements() {
    ads.setRemoved(this.ownedSkus.includes('remove_ads_999'));
  },
};

// --- Play Games Services v2 (local plugin at plugins/playgames) --------------
// v2 auto-signs-in on Activity start. Sign-in failure must NEVER block gameplay, so every
// method swallows its error. Calls with placeholder ids are skipped rather than sent to the SDK.
const PlayGames = plugin('PlayGames');
let gamesAuthed = false;

export const games = {
  get authenticated() { return gamesAuthed; },

  async signIn() {
    if (!PlayGames) { log('games.signIn'); return { authenticated: false }; }
    try {
      const r = await PlayGames.signIn();
      gamesAuthed = !!r?.authenticated;
    } catch { gamesAuthed = false; }
    return { authenticated: gamesAuthed };
  },

  // `id` is a logical key ('best_night_ml'), resolved to the Play Console id here.
  async submitScore(id, value) {
    const real = LEADERBOARDS[id];
    if (!PlayGames || !gamesAuthed || !hasRealId(real)) { log('submitScore', id, value); return; }
    try { await PlayGames.submitScore({ leaderboardId: real, score: Math.round(value) }); } catch {}
  },

  async unlockAchievement(id) {
    const real = ACHIEVEMENTS[id];
    if (!PlayGames || !gamesAuthed || !hasRealId(real)) { log('unlockAchievement', id); return; }
    try { await PlayGames.unlockAchievement({ achievementId: real }); } catch {}
  },

  async showLeaderboards() {
    if (!PlayGames || !gamesAuthed) { log('showLeaderboards'); return; }
    try { await PlayGames.showLeaderboards(); } catch {}
  },

  async showAchievements() {
    if (!PlayGames || !gamesAuthed) { log('showAchievements'); return; }
    try { await PlayGames.showAchievements(); } catch {}
  },
};

// Exported for the settings overlay / debug readouts.
export const ADMOB_APP_ID_FOR_DEBUG = ADMOB_APP_ID;
