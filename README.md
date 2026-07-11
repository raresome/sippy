# SIPPY — *one more sip.*

A push-your-luck comedy arcade game. You're a mosquito: land on a sleeping giant, **hold to
drink**, and **let go the instant before the slap**. Every extra drop is worth more — and wakes the
giant faster. Bank your blood, buy upgrades and hats, and chase the frame-perfect clutch escape.

**Package:** `com.genartstudios.sippy` · **Privacy policy:** https://raresome.github.io/sippy/privacy-policy.html

## Tech

A single self-contained HTML5 canvas / Web Audio game (`www/`, vanilla JS, **no bundler**) wrapped
by **Capacitor 7** into an Android app. All visuals are drawn procedurally — no image assets in the
running game. Two hard architecture rules, each enforced by one chokepoint file:

- **`www/js/native.js`** is the *only* file that touches Capacitor plugins (haptics, ads, analytics,
  IAP, Play Games). Everything else calls the facade, which no-ops on web — so the game stays fully
  playable in a desktop browser.
- **`www/js/save.js`** is the *only* file that persists data (Capacitor Preferences). No
  `localStorage`/`sessionStorage`.

Game flow is a state machine in `state.js`: `title → flyin → landed → drinking → windup → escape →
splat → gameover` (with a Second Wind revive branch).

## Layout

```
www/                 the game (static, no build step)
  js/                main, state, balance, giant, sippy, fx, hud, audio, hats, save, native, gameids
  audio/             one-shot .ogg SFX (synth fallback if absent)
plugins/playgames/   local Capacitor plugin — Play Games Services v2 (Kotlin)
android/             Capacitor Android shell (portrait, immersive, keep-screen-on)
store-assets/        Play listing text, graphics, privacy policy source, data-safety, checklist
docs/                build spec companion + external audit
SIPPY-BUILD-SPEC.md  the authoritative build spec
CLAUDE.md            working agreement / conventions
```

## Develop

```bash
npx serve www                       # run in a desktop browser (native calls no-op)
npx cap sync android                # copy web assets + sync native plugins
cd android && ./gradlew installDebug   # build & install on a connected device
cd android && ./gradlew bundleRelease  # signed release .aab (needs upload keystore)
```

Requires JDK 21 for Gradle (Android Studio's bundled JBR works; `android/gradle.properties` pins it).
`google-services.json` (Firebase) goes in `android/app/` and is gitignored.

## Status

Playable end-to-end and verified on device. Wired: AdMob (rewarded/interstitial/banner + UMP
consent), Firebase Analytics, local Play Games plugin, hat shop, upgrades, trails, stats,
achievements, pause. **Release-ready:** a signed release `.aab` builds via `gradlew bundleRelease`,
and the full Play listing package (text, icon, feature graphic, 8 screenshots, data-safety answers)
is in `store-assets/`.

**Pending owner setup** before Play submission: RevenueCat in-app purchases, real Play Games Console
IDs, the AdMob consent form, and a real support email — the step-by-step list is in
`store-assets/listing-checklist.md`.
