# SIPPY — Deep Audit Analysis

**Date:** 2026-07-10  
**Package:** `com.genartstudios.sippy`  
**Scope:** Full codebase review (read-only). No code changes made.  
**Sources of truth:** `SIPPY-BUILD-SPEC.md`, `CLAUDE.md`, `www/`, `plugins/playgames/`, `android/` shell  

This report covers (1) defects and wiring gaps, (2) spec compliance, (3) gameplay/UX polish risks, and (4) feature ideas to make the game more fun. Severity is relative to shipping a Play Store MVP.

---

## Executive summary

The **core loop is solid**: procedural giants, hold-to-drink / release-to-live, windup clutch, splat ghost comedy, upgrades, trails, hats, Second Wind, stats, and local achievements all exist and hang together as a playable browser game. Audio samples are present and under the 100 KB budget. Android shell basics (portrait, immersive, keep-screen-on, targetSdk 36, AdMob app id) are in place.

What is **not ship-ready** is the commercial/native layer:

| Area | Status |
|------|--------|
| Core game loop (browser) | Playable and largely correct |
| Hybrid audio | Samples + synth fallback present; first-play race exists |
| AdMob (banner / interstitial / rewarded) | Wired; some placements **contradict locked spec §5** |
| IAP / RevenueCat | **Not integrated** — native purchases always fail |
| Play Games IDs | **Placeholders only** — leaderboards/achievements never hit Google |
| Store packaging | Missing `store/`, `make_assets.py`, pause-on-back |
| Balance isolation | Many magic numbers still live outside `balance.js` |

**Bottom line:** fun prototype + partial native shell. Do not treat current native IAP/Play Games paths as production-ready.

---

## 1. Architecture snapshot (what exists)

```
www/js/
  main.js      boot, RAF, DOM overlays, shop/stats/settings, Second Wind UI
  state.js     state machine + input + scoring + achievements + Second Wind resolve
  balance.js   sleeper types, sip curve, upgrades, trails
  giant.js     procedural giant + backdrop + hand
  sippy.js     mascot, splat/ghost, hat thumbnails
  hats.js      cosmetic registry + pack SKUs
  fx.js        particles / Zzz
  hud.js       HUD + title
  audio.js     WebAudio synth + .ogg one-shots
  save.js      Capacitor Preferences (via native.kv)
  native.js    single facade: haptics, kv, analytics, ads, iap, games
  gameids.js   AdMob + Play Games constants
```

**Layering rules (spec) that are respected:**

- Game code does not import Capacitor plugins directly (only `native.js`).
- No `localStorage` / `sessionStorage` usage.
- Game remains playable in a desktop browser with no-ops / in-memory KV.

**Layering rules that are soft-broken:**

- Spec: *all gameplay tuning in `balance.js`*. Clutch mult (1.5), combo (0.15), perfect landing window/bonus, fly-in duration, Second Wind caps, frame-perfect threshold, etc. still live in `state.js` / `main.js` / `native.js`.

---

## 2. Critical defects (ship blockers)

### 2.1 Native IAP is a stub — purchases cannot succeed on device

**Where:** `www/js/native.js` → `iap.purchase()` / `iap.restore()`  
**Also:** `package.json` has **no** `@revenuecat/purchases-capacitor` (or any Billing library).

**Behavior today:**

- **Web:** `window.confirm` simulator can grant SKUs into Preferences (`sippy.ownedSkus`).
- **Native:** logs and returns `{ success: false }` always.
- **Restore:** only reloads local `sippy.ownedSkus` from Preferences — never contacts Play Billing / RevenueCat.

**Impact:**

- Hat packs and Remove Ads cannot be bought on a real phone.
- Reinstall / new device → empty Preferences → “Nothing to restore” even if the user paid.
- Google Play policy expects non-consumables to restore via the billing stack.

**SKUs expected by UI/code:**

| SKU | Purpose |
|-----|---------|
| `remove_ads_999` | Free Second Wind (1/night), hide banner/interstitial |
| `hat_pack_party_199` | party, propeller, sombrero |
| `hat_pack_fancy_199` | tophat, crown, crocs |

---

### 2.2 Play Games Services is disabled and IDs are placeholders

**Where:**

- `www/js/gameids.js` — all leaderboard/achievement IDs are `REPLACE_WITH_…`
- `android/.../strings.xml` — `game_app_id` placeholder
- `AndroidManifest.xml` — Games `APP_ID` meta-data **commented out** (correct until a real numeric id exists)
- `plugins/playgames` — plugin implementation is reasonable and fail-safe

**Behavior:** `hasRealId()` skips all submits/unlocks. Local achievement list still works via `save.js`. Leaderboard / Play Games buttons stay disabled unless `games.authenticated` (will stay false without a real APP_ID).

**Impact:** Milestone 6 gate not met. No cloud leaderboards or Play achievements until owner fills Console IDs and uncomments the manifest meta-data.

---

### 2.3 Global `touchmove` preventDefault breaks overlay scrolling

**Where:** `www/js/main.js` (input wiring)

```js
addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
```

**Impact:** On real phones, scrollable regions inside overlays cannot scroll:

- Stats list (`.stats-scroll`)
- Upgrades / trails list (`.upgrades-list`)

Players with long sessions or many upgrades will be **unable to reach lower shop rows or full stats** on touch devices. Desktop mouse-wheel may still work.

**Suggested direction (not implemented):** only prevent default on the canvas / game surface, or skip when the event target is inside a scrollable overlay.

---

### 2.4 Spec vs ads: banners and interstitials are live

**Locked spec §5:**

> No banners, no interstitials — protect the suspense.  
> Rewarded “Second Wind” only (max 3/night).

**Code (`native.js`):**

```js
export const AD_PLACEMENTS = {
  banner: true,        // title + game-over
  interstitial: true,  // before game-over card (rate-limited)
  appOpen: false,
};
```

`main.js` shows banner on title/gameover and runs an interstitial after Second Wind decline/fail before the scoreboard.

**Impact:** Intentional product expansion, but it **violates the locked build spec**. Also increases AdMob policy surface area (placement near CTAs, frequency). Interstitial is rate-limited (min 3 gameovers, 120s gap) — good mitigation if kept, but still a spec conflict that should be an explicit product decision, not an accident.

---

## 3. High-severity bugs and wiring issues

### 3.1 First-night voice line often silent (audio race)

**Where:** `AudioSys.init()` → `loadSamples()` is async and not awaited; `startNight()` immediately calls `A._shot('vox_onemoresip')`.

**Impact:** First press after cold start frequently misses `vox_onemoresip` (the brand hook). Later nights are fine once samples decode. Same pattern for early snores/gasp if the player is very fast.

**Note:** Synth fallbacks cover most SFX; voice lines have **no** synth fallback — they simply fail open as silence.

---

### 3.2 Splat sample only plays if slap sample succeeds

**Where:** `audio.js` → `slap()`:

```js
if (this._shot('slap')) { this._shot('splat'); return; }
// else pure synth slap — never plays splat.ogg
```

**Impact:** If `slap.ogg` is missing/failed but `splat.ogg` is fine, the wet splat never plays. Fallback path should attempt splat (or always try both independently).

---

### 3.3 Ninja Reflexes desyncs hand windup animation

**Where:**

- `state.js` sets `windupT = giant.windupMs + reflexesAdd`
- `giant.js` `drawHand` uses `p = 1 - clamp(windupT / giant.windupMs, 0, 1)`

**Impact:** For the first `reflexesAdd` ms of windup, `windupT > windupMs`, so progress clamps to 0 — the hand **stays down** while the real danger timer is already running. At higher Reflexes levels this steals a visible fraction of the “raise and slam” telegraph. Players get more time but less readable animation.

**Fix direction:** normalize against the *effective* windup (`giant.windupMs + reflexes`) or store `windupMax` when windup starts.

---

### 3.4 Magnet upgrade amount not reflected in escape toast

**Where:** `escapeNow()` builds “Banked X mL” / clutch messages **before** `gained *= magnetMult`.

**Impact:** UI under-reports blood actually added to `banked` when Blood Magnet is leveled. Erodes trust in the economy (“I bought Magnet and the toast didn’t change”).

---

### 3.5 Equipped paid hat can render without ownership

**Where:**

- Ownership for IAP hats is `isOwned(id, iap.ownedSkus)` (SKU-based).
- `save.equipHat` does not re-validate ownership on load.
- `save.ownHat()` exists but is **never called** from purchase flow.

**Impact:** After a failed restore / cleared `ownedSkus` / web-sim grant that didn’t re-equip logic, `equippedHat` can still be `crown` while the shop shows locked. In-game Sippy still draws the hat. Cosmetic entitlement desync.

---

### 3.6 Banner + immersive edge-to-edge with `margin: 0`

**Where:** `MainActivity` hides system bars; `ads.showBanner` uses `BOTTOM_CENTER` and `margin: 0`.

**Impact:** Risk of banner sitting under gesture nav / home indicator and overlapping game-over buttons (`Retry`, `Shop`, `Stats`, `Brag`). AdMob has placement policies around accidental clicks and system UI. Worth device QA on gesture-nav phones and adding safe-area margin.

---

### 3.7 Second Wind on web is a trap path

**Where:** `ads.showRewarded()` without AdMob → `{ rewarded: false }` (unless Remove Ads was simulated).

**Impact:** Browser play: accept Second Wind → always fails → game over. Fine for “no SDK,” but the offer copy still says “Watch an ad.” Dev/test UX is confusing; consider free revive on web or hide the offer when AdMob is absent.

---

## 4. Medium / lower bugs and polish gaps

### 4.1 Title screen skips feet cosmetics (Tiny Crocs)

**Where:** `hud.js` `drawTitle`:

```js
if (hat && G.hatId !== 'none' && !hat.onFeet) { ... }
```

**Impact:** Equipped Crocs invisible on title. In-run `drawSippy` and shop thumbs handle `onFeet` correctly. Ghost scene also only draws head hats via `drawHatAt` (skips `onFeet`) — crocs vanish on the angel ghost, weakening the “ghost keeps the hat” comedy for that SKU.

---

### 4.2 Irritation “tell” haptics never fire

**Spec:** light tick per irritation tell.  
**Code:** `haptics.tick()` exists; drinking spikes only play `A.blip(...)`.  
`haptics.light()` on clutch windup/escape and `heavy()` on slap **are** wired.

---

### 4.3 No pause / back-button overlay

**Spec §7:** back button = pause overlay.  
**Code:** no pause state, no App back handler in `MainActivity` or JS. System back typically backgrounds the app.

**Related risk:** mid-run kill/background with no mid-run persist — stats bumped in memory (`bumpStat`) only flush in `recordRun` at true game over. OS process death mid-night loses that night’s banked blood and partial lifetime counters.

---

### 4.4 Dead / incomplete save surface

| Item | Issue |
|------|--------|
| `KEYS.consent` / `data.consent` | Declared, never load/save |
| `save.ownHat()` | Exported, never called |
| Web KV | In-memory only — refresh wipes progress (expected, but document for testers) |

---

### 4.5 Tuning not centralized in `balance.js`

Scattered examples (non-exhaustive):

| Constant | Location | Role |
|----------|----------|------|
| Clutch ×1.5 | `state.js` | Escape multiplier |
| Combo +15%/step | `state.js` | Chain bonus |
| Perfect window 1.20–1.35s | `state.js` | Fly-in timing |
| Perfect +15 mL / −20% irr | `state.js` | Landing reward |
| Frame-perfect ≤0.05s | `state.js` | Achievement |
| Second Wind caps 3 / 1 | `state.js` | Ad vs IAP |
| Interstitial gates | `native.js` | Ad frequency |
| Greed display `multOf` | `balance.js` | **Display only** — not true sip formula share with straw |

Straw upgrade multiplies **time input** into quadratic `sipBlood(t)`, so effective gain is steeper than the “+15% mL/sec” shop copy implies. Not necessarily a bug, but the UI desc is misleading.

---

### 4.6 Typography split

- DOM overlays: Google Fonts **Fredoka** (network dependency; offline → fallback).
- Canvas: hard-coded `"Arial Rounded MT Bold"` stack (often missing on Android → system default).

Result: shop/game-over look different from the canvas mascot world; offline first paint may flash unstyled text.

---

### 4.7 Brag / share is clipboard-only

`btnBrag` copies a text blurb. No share sheet (`navigator.share` / Capacitor Share), no image card of the ghost + score (spec comedy “share card” is not a real image export). Clipboard can fail silently (`.catch(() => {})`).

---

### 4.8 Missing repo artifacts from the build map

| Spec path | Status |
|-----------|--------|
| `reference/sippy-prototype.html` | Prototype is at repo root `sippy-prototype.html` instead |
| `tools/make_assets.py` | **Missing** (only `normalize_audio.sh`) |
| `store/listing.md`, privacy, data-safety, release-checklist | **`store/` absent** |
| Privacy policy URL in `main.js` | Points at GitHub Pages URL — may 404 until published |

Icons/splash currently look like Capacitor defaults / partial assets rather than a documented procedural Sippy pipeline.

---

### 4.9 Analytics taxonomy mostly correct; extras exist

Spec events wired: `sip_end`, `splat`, `night_end`, `second_wind`, `iap_purchase`, `hat_equipped`.

Also present (not in the locked list): `setUserProperty` for lifetime/best, `setScreen` API unused. Not harmful, but stricter “exactly these events” reading would avoid extra properties or document them as allowed.

`AD_FORCE_TEST_MODE = false` — relies on AdMob console test devices. Easy to accidentally serve live ads to non-registered handsets during QA.

---

### 4.10 Minor logic / UX notes

- **Perfect landing auto-drinks** via recursive `press()` — good juice; easy to miss if you only held from title (single pointerdown won’t hit the 150ms window).
- **`bloodbank` mid-run check** uses `lifetimeMl + banked` before `recordRun`; end-of-night recheck is fine (idempotent unlock).
- **`coward` / timid sips** count post-magnet gains &lt; 10 mL — higher Magnet/Straw makes the achievement harder (maybe intentional irony).
- **Combo** only advances on clutch; safe sips reset it — clear but undocumented in UI beyond the HUD flame.
- **Night index** means “giant number this run,” not calendar night; stats use `nights` for completed runs — naming is fine in UI but easy to confuse when debugging.
- **Remove Ads mid-run** shrinks Second Wind cap from 3→1; if player already used 2 ad revives, further offers stop. Edge case only.
- **`google-services.json`** is gitignored (good) but present locally — Firebase analytics can work when the file is valid.

---

## 5. What is wired correctly (strengths)

Call these out so the audit is not only negative:

1. **State machine** covers full loop: `title → flyin → landed → drinking → windup → escape → splat → gameover` with Second Wind branch.
2. **Native isolation** via `native.js` and **persistence isolation** via `save.js` match the architecture rules.
3. **Second Wind flow** is carefully async-latched (`splatResolved`) so RAF does not spam offers; failures fall through to `endNight`.
4. **Rewarded free path** for Remove Ads (1 free revive/night) matches expanded product design.
5. **Upgrade economy** (straw / wings / reflexes / magnet) and **trails** apply in gameplay and persist.
6. **Hats** draw procedurally; free beanie/halo; packs mapped to SKUs; ghost keeps head hats.
7. **Local achievements** unlock with toasts and persist; Play Games unlock is best-effort when IDs exist.
8. **Audio pack** complete per manifest (+ snore variants); all samples ≪ 100 KB.
9. **Android shell:** portrait, `isGame`, keep screen on, immersive bars, minSdk 23 / targetSdk 36, AdMob APPLICATION_ID aligned with `gameids.js`.
10. **PlayGamesPlugin.kt** refuses to init without a numeric APP_ID — avoids hard crash on placeholder checkouts.
11. **UMP consent** path with degraded NPA fallback on SDK misconfiguration is thoughtful.
12. **Interstitial rate limit** (if banners/interstitials stay) is a responsible implementation.

---

## 6. Milestone gate scorecard (spec §10)

| Milestone | Intent | Assessment |
|-----------|--------|------------|
| M1 Port | Full loop in browser | **Pass** — playable via `npx serve www` |
| M2 Shell | Android install, haptics, immersive | **Mostly pass** — shell present; back=pause missing; icons pipeline incomplete |
| M3 Sound | Samples + synth fallback | **Pass with caveats** — files OK; first-play race; slap/splat coupling |
| M4 Ads | UMP + Second Wind cap | **Partial** — rewarded wired; banners/interstitials exceed locked spec; need device consent QA |
| M5 IAP | RevenueCat + restore | **Fail** — no plugin; native purchase always fails; restore is local-only |
| M6 Play Games | Sign-in, boards, 7 achievements | **Fail for cloud** — local achievements work; Console IDs / APP_ID not real |
| M7 Ship prep | Analytics, AAB, store docs | **Incomplete** — analytics hooks exist; `store/` missing; signing/release process not evidenced in repo |

---

## 7. Priority fix list (recommended order)

If engineering time is limited, fix in this order:

1. **RevenueCat + real purchase/restore** (or remove store UI until ready).
2. **Fix touch scrolling** on shop/stats overlays.
3. **Audio:** await/gate samples before first vox; decouple slap/splat playback.
4. **Hand windup** normalization with Reflexes.
5. **Magnet toast** uses post-multiplier mL.
6. **Product decision:** kill or keep banners/interstitials vs locked spec; if keep, add banner safe margin and document the change in the spec.
7. **Play Games** IDs + uncomment APP_ID when Console is ready.
8. **Pause on back** + optional mid-run bank snapshot on `appStateChange`.
9. **Title/ghost crocs** + equip ownership validation on load.
10. **`store/` docs** + privacy URL verification + `make_assets.py` or documented icon source.

---

## 8. Feature & fun suggestions

These are **not** bugs. Ordered roughly by impact vs effort for a comedy push-your-luck mosquito game.

### 8.1 High impact on the core fantasy

1. **Voluntary “Bank it / Retire for the night”**  
   Force-splat-only endings make risk asymmetric: you can only lose. A “I’m full, go home” action on `landed` (or between giants) would make the greed fantasy classic roguelike push-your-luck and give short-session players a win state.

2. **Readable danger escalation**  
   - Scale screen shake / vignette earlier as irritation climbs.  
   - Pitch or stereo-pan buzz with Sippy position.  
   - Stronger face tells (eye crack open at 90%+) before windup.  
   Anxiety is the product; make “I should let go” scream without text.

3. **Visual upgrade feedback**  
   Thicker straw stroke by Straw level; wing tint/opacity by Stealth Wings; slight afterimage on Ninja Reflexes. Numbers alone feel like a spreadsheet; the mascot should look juiced.

4. **Near-miss theater**  
   On clutch &lt; 0.15s: extra freeze-frame, slow-mo hand, unique one-liner (“WHOA.”). Frame-perfect already exists as achievement — celebrate it on-screen every time.

5. **Giant personality payloads**  
   Beyond Deep/Light/Chaotic: rare “Sleepwalker” (landing spot drifts), “Night Guard” (fake windups), “Heavy Snore” (screen bob interferes with perfect landing). One new sleeper type goes further than three new hats.

### 8.2 Session & retention

6. **Daily “One more sip” challenge**  
   Seeded giant of the day + leaderboard score for closest call. TikTok-native daily clip bait.

7. **Combo / streak meta**  
   Night streak (survive N nights without dying on giant 1), or “no safe sips” hard mode for a cosmetic.

8. **Milestone soft currency alternatives**  
   Optional free unlocks (e.g. first clutch → free propeller) so non-payers still parade cosmetics. Reduces IAP friction without killing packs.

9. **Second Wind presentation**  
   Ghost dialogue variants, short “possess the next giant” animation, clearer “current sip lost / bank kept” beat. The mechanic is good; the theater can be bigger.

10. **Pause + “continue night”**  
    Even a simple pause is quality-of-life; optional resume token if the OS kills the WebView mid-run.

### 8.3 Social / viral (matches the brainrot hook)

11. **Share image card**  
    Render canvas snapshot: ghost + hat + banked mL + closest call + “one more sip.” System share sheet &gt; clipboard-only.

12. **Hook replay GIF/video**  
    Last 3 seconds before splat (or clutch) auto-buffered for share. The intended TikTok loop is already audio-designed (`vox_onemoresip` + slap + harp).

13. **Brag templates**  
    Randomized savage captions (“Greed paid. Then it collected.”) for group chats.

### 8.4 Cosmetics & collection

14. **More free hats with unlock conditions**  
    Band-Aid (after first splat), Paper bag (amateur hour), Angel halo already free — lean into death comedy unlocks.

15. **Giant-reactive cosmetics**  
    Earring glint steals 1 mL; mustache tickles irritation; mohawk giants snore louder. Cosmetics that change play slightly stay interesting after purchase.

16. **Trail + hat loadout presets**  
    “Funeral fit,” “Party fit” one-tap equip for share screenshots.

### 8.5 Onboarding & clarity

17. **First-run ghost coach**  
    One silent comic strip: HOLD / meter / LET GO. Many players still learn via death; a 5-second coach reduces rage-quits.

18. **Sleeper type tutorial toast** the first time you meet Light Sleeper / Chaotic.  
19. **Shop economy preview**  
    “Next upgrade costs X · you have Y · ~Z more giants at your average.” Reduces opaque grind.

### 8.6 Technical quality-of-life (feels like features to players)

20. **Haptic language**  
    Tick on spike, double-tick near 90 irritation, heavy on slap (partially there).  
21. **Settings: reduced motion** already dampens shake — surface a toggle even when OS preference is off.  
22. **Mute that persists** already works — add separate Music/SFX if you ever add a bed track (soft bedroom pad under snores).

### 8.7 Things to avoid (scope discipline)

- Competitive multiplayer or accounts beyond Play Games.
- Banner mid-sip or interstitial mid-drink (even current post-death interstitial is controversial).
- Pay-to-win beyond mild convenience (Remove Ads free revive is already on the line; don’t sell irritation reduction for cash).
- Real human blood gore — keep stylized fill; content rating path depends on it.

---

## 9. Testing notes for humans

No automated test runner (by design). Suggested manual gates:

| Gate | How |
|------|-----|
| M1 loop | `npx serve www` — full night, clutch, splat, shop buy on web simulator |
| Audio fallback | Rename `www/audio` temporarily — synth still plays; no crash |
| Touch scroll | Device: open Stats + Upgrades — confirm whether list scrolls (expect fail today) |
| Second Wind | Device with test ads — accept / decline / no-fill |
| IAP | Device — expect failure until RevenueCat |
| Play Games | Buttons disabled until real IDs |
| Overlay input | Confirm canvas ignores presses while shop open |
| Remove Ads sim | Web confirm purchase → banner path off, free revive once |

---

## 10. File-level defect index

| File | Issues |
|------|--------|
| `www/js/native.js` | IAP stub; banners/interstitials vs spec; banner margin 0 |
| `www/js/main.js` | Global touchmove block; interstitial orchestration; audio init not awaited before night |
| `www/js/state.js` | Magic numbers; magnet toast order; mid-run stats only memory-flushed at end |
| `www/js/audio.js` | slap gates splat; loadSamples race; vox no synth fallback |
| `www/js/giant.js` | Windup hand uses base `windupMs` only |
| `www/js/hud.js` | Title skips `onFeet` hats |
| `www/js/sippy.js` | Ghost skips crocs (`drawHatAt`) |
| `www/js/hats.js` | OK structurally; depends on working IAP skus |
| `www/js/save.js` | Dead consent key; `ownHat` unused; no ownership revalidate |
| `www/js/gameids.js` | Placeholder Play Games IDs; live ads unless test devices |
| `www/js/balance.js` | Upgrade copy vs quadratic straw math mismatch |
| `package.json` | No RevenueCat |
| `MainActivity.java` | No back→pause |
| `AndroidManifest.xml` | Games APP_ID correctly disabled until real id |
| `tools/` | No `make_assets.py` |
| `store/` | Missing entirely |

---

## 11. Conclusion

SIPPY’s **comedy core and loop pacing are in good shape** for a browser-first Capacitor game. The art/audio direction (procedural Sippy, snore variants, clutch fanfare, ghost + harp) is coherent and shippable as an experience.

The project is currently **blocked as a commercial Play release** by incomplete IAP, unfinished Play Games identity wiring, missing store packaging, and a few high-impact device bugs (especially **overlay touch scrolling** and **native purchase**). Spec drift on ads should be resolved deliberately: either update `SIPPY-BUILD-SPEC.md` to allow title/game-over banners + rate-limited interstitials, or turn those placements off.

**Recommended near-term focus:** fix device UX bugs that punish real players (scroll, audio race, windup telegraph), then finish IAP + restore, then Play Games IDs, then store listing package. Parallel track: one or two fantasy features (retire/bank-out, stronger danger tells, share card) to raise retention without expanding architecture.

---

*End of audit. No application source files were modified for this report; findings only.*
