# SIPPY — Pre-Publish Listing Checklist

Tailored to SIPPY. Work top to bottom in Play Console before hitting publish.

## Store text
- [ ] **Title** ≤30 chars, contains the hook: `SIPPY: One More Sip` (19 chars). ✔ in `text/title.txt`
- [ ] **Short description** ≤80 chars (79). ✔ in `text/short-description.txt`
- [ ] **Full description** 3000–3800 chars (3004), keyword "push-your-luck arcade game" in first AND
      last paragraph. ✔ in `text/full-description.txt`
- [ ] **What's new** ≤500 chars. ✔ in `text/whats-new.txt`

## Category & tags
- [ ] **Category:** Games → **Arcade** (primary). Alt: Casual.
- [ ] **Tags:** arcade, casual, action, high score, one-handed, offline.
- [ ] Best keyword-forward title alternative to A/B later: `SIPPY: Arcade Reflex Game` (25 chars) —
      only if the brand-led title underperforms on impressions.

## Graphics
- [ ] **App icon** 512×512 (<1 MB). ✔ `graphics/icon-512.png` (master `graphics/icon-1024.png`).
- [ ] **Feature graphic** 1024×500 (<15 MB). ✔ `graphics/feature-graphic.png`.
- [ ] **Screenshots** (2–8, captured by hand on device — NOT generated). Money shots: the SPLAT frame,
      a CLUTCH escape with the ×1.5 popup, the hat shop, a big banked-mL game-over card, the ghost
      keeping its hat.
- [ ] Promo video (optional): shoot per `video-concept.md`, portrait 9:16.
- [ ] **A/B icon test later:** try a **blood-red `#FF4D5E`** background against the default
      night-purple `#241647` — red pops harder on a crowded arcade shelf.

## Content rating (IARC questionnaire)
- [ ] Category: Game.
- [ ] Violence: **mild cartoon/fantasy violence** (a comedic slap; stylized "fill", no realistic
      gore). Answer the violence questions as cartoon violence — expect **Everyone 10+ / PEGI 7**.
- [ ] No sex, no gambling (the "push-your-luck" is not real-money gambling), no user-generated content.
- [ ] Ads present: **Yes**. In-app purchases: **Yes**.

## Data safety
- [ ] Fill to match `data-safety-answers.md` exactly (Advertising ID shared for ads; app interactions
      for analytics, not shared; purchase history for app function; nothing else collected).
- [ ] Encryption in transit: Yes. Data deletion path: Yes.

## Ads & consent
- [ ] Real AdMob ad unit IDs in `www/js/gameids.js` (not test IDs) — already the live units.
- [ ] **Publish the UMP consent form / GDPR message in the AdMob console** (Privacy & messaging →
      European regulations → create + publish). Until then `requestConsentInfo` errors and the app
      falls back to non-personalized ads.
- [ ] `AD_FORCE_TEST_MODE = false` — confirm your test handsets are registered as AdMob test devices
      so you don't click live ads during QA.
- [ ] Ad placements declared honestly: this build uses rewarded (Second Wind) + a title/game-over
      banner + a rate-limited interstitial. This EXCEEDS the original spec §5 "rewarded only" rule —
      an intentional owner decision; make sure it matches what you tell Play about ads.

## Monetization (blocked until set up)
- [ ] RevenueCat project + Play Console products for `remove_ads_999`, `hat_pack_party_199`,
      `hat_pack_fancy_199`. Native IAP is a stub until this exists — either finish it or hide the
      store's paid rows before production.

## Play Games (blocked until IDs exist)
- [ ] Create the game in Play Console → Play Games Services; paste the numeric APP_ID into
      `strings.xml` (`game_app_id`) and the leaderboard/achievement IDs into `www/js/gameids.js`.
- [ ] **Uncomment** the `com.google.android.gms.games.APP_ID` meta-data in `AndroidManifest.xml` only
      after the id is real (a placeholder makes Play Services error on every launch).

## Privacy policy
- [ ] Publish `store-assets/privacy-policy.html` to a public URL.
- [ ] Confirm the URL in Play Console **and** in `www/js/main.js` (`PRIVACY_POLICY_URL`) match.
      Current app value: `https://genartstudios.github.io/sippy/privacy-policy.html`. Decide between
      that and `genartstudios.com/apps/sippy`, then make both places agree.
- [ ] Replace the placeholder contact email `support@genartstudios.com` with a real, monitored inbox.

## Build & release
- [ ] `versionCode` / `versionName` set (currently 1 / "1.0" in `android/app/build.gradle`).
- [ ] Signed **.aab** via `gradlew bundleRelease` with the upload keystore (kept out of the repo).
- [ ] `bundletool` installs the AAB locally as a final smoke test.
- [ ] Target countries at launch: start with **US/worldwide English**. Cheap-reach localized listings
      to consider once you see organic impressions: Spanish, Portuguese (BR), Indonesian, Hindi.
