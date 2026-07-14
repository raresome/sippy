# SIPPY — *one more sip.*

A push-your-luck comedy arcade game. You're a mosquito: land on a sleeping giant, **hold to
drink**, and **let go the instant before the slap**. Every extra drop is worth more — and wakes the
giant faster. Bank your blood, buy upgrades and hats, and chase the frame-perfect clutch escape.

**Package:** `com.genartstudios.sippy` · **Privacy policy:** https://genartstudios.com/apps/sippy/privacy-policy

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
tools/               play_publish.py (push listing + AAB to Play), asset + audio generators
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

python tools/play_publish.py            # dry run: build the Play edit, validate, discard
python tools/play_publish.py --commit   # push listing + graphics + AAB to the closed track
```

Requires JDK 21 for Gradle (Android Studio's bundled JBR works; `android/gradle.properties` pins it).
`google-services.json` (Firebase) goes in `android/app/` and is gitignored.

`play_publish.py` needs `pip install google-auth` and a Play service-account JSON (path is in the
script, overridable with `$PLAY_SA_JSON`; the key itself lives outside the repo). **Bump
`versionCode` in `android/app/build.gradle` before re-running it** — Play rejects a version code it
has already seen.

## Status

Playable end-to-end and verified on device. Wired: AdMob (rewarded/interstitial/banner + UMP
consent), Firebase Analytics, local Play Games plugin, hat shop, upgrades, trails, stats,
achievements, pause.

**On Google Play as a draft closed test.** `tools/play_publish.py` has pushed versionCode 1, the
full en-US listing, the icon, the feature graphic and all 8 screenshots to Play Console, and put a
**draft** release on the closed-testing (alpha) track. Draft means *nothing has been sent to Google
for review yet* — the Play Developer API has no endpoint for the **App content** section, so data
safety, content rating, target audience, the ads declaration and the privacy-policy URL field can
only be filled in the Play Console web UI, as can tester lists and country selection.

**Remaining owner setup**, in the order that unblocks a review submission — the step-by-step list
lives in `store-assets/listing-checklist.md`:

1. Fill **App content** in the Console (answers are pre-written in `store-assets/data-safety-answers.md`),
   set the category/tags, add closed-track testers and countries, then promote the draft release and
   send it for review.
2. A new *personal* Play account must run a **14-day, 12-tester** closed test before it can apply for
   production access.
3. Still stubbed and **advertised in the store description but not shipping**: RevenueCat in-app
   purchases and real Play Games Console IDs (leaderboards/achievements). Fine for a closed test;
   reconcile the copy with the build before production.
4. Publish the **AdMob UMP consent form** — until it exists, `requestConsentInfo` errors and the app
   falls back to non-personalized ads.
