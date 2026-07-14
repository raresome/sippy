# SIPPY — Pre-Publish Listing Checklist

Tailored to SIPPY. Work top to bottom in Play Console before hitting publish.

> ## STATUS 2026-07-13 — first closed build is STAGED AS A DRAFT
> Pushed to Play Console via the Android Publisher API (service account
> `play-publisher@graceful-karma-502020-u1`, creds in `C:\My_Apps\_credentials\Google_Play_Android_Developer_API\`):
> **AAB versionCode 1** (sha1 `100a8a6395695eaf…`, the first bundle ever uploaded), the full en-US
> listing, the icon + feature graphic + all 8 screenshots, and a **draft** release
> "1.0 (1) - Closed test" on the **alpha** track (= Play's "Closed testing").
>
> **Draft means nothing has been sent to Google for review.** The Play Developer API has **no
> endpoint for the "App content" section** — verified against the v3 discovery doc, `edits` exposes
> only apks/bundles/countryavailability/deobfuscationfiles/details/expansionfiles/images/listings/
> testers/tracks. So content rating, data safety, target audience, ads declaration, app access and
> the privacy-policy URL field are **web-UI only**, as are country selection and tester email lists.
> Everything still marked `[ ]` below has to be done by hand in the Console.
>
> Re-run the push with `store-assets/../tools`-style scripting if the listing changes; always
> `POST edits/{id}:validate` before `:commit` (edits are atomic, so a failed run changes nothing).
> Gotcha: listing images live at `edits/{id}/listings/{lang}/{imageType}` — there is no `/images/` path.

## Store text
- [x] **Title** ≤30 chars, contains the hook: `SIPPY: One More Sip` (19 chars). ✔ in `text/title.txt`
      — **live in the Console listing.**
- [x] **Short description** ≤80 chars (79). ✔ `text/short-description.txt` — **live.**
- [x] **Full description** 3000–3800 chars (2944), keyword "push-your-luck arcade game" in first AND
      last paragraph. ✔ `text/full-description.txt` — **live.**
- [x] **What's new** ≤500 chars (396). ✔ `text/whats-new.txt` — **attached to the draft release.**
- [ ] NOTE: the description advertises leaderboards, achievements and hat purchases, which the build
      does not actually ship yet (Play Games IDs are placeholders, IAP is a stub). Accepted for the
      closed test; revisit before production so the copy matches the build.

## Category & tags
- [ ] **Category:** Games → **Arcade** (primary). Alt: Casual.
- [ ] **Tags:** arcade, casual, action, high score, one-handed, offline.
- [ ] Best keyword-forward title alternative to A/B later: `SIPPY: Arcade Reflex Game` (25 chars) —
      only if the brand-led title underperforms on impressions.

## Graphics — all uploaded to the Console listing
- [x] **App icon** 512×512 (<1 MB). ✔ `graphics/icon-512.png` (master `graphics/icon-1024.png`).
- [x] **Feature graphic** 1024×500 (<15 MB). ✔ `graphics/feature-graphic.png`.
- [x] **Screenshots** (8) in `graphics/../screenshots/` (720×1280 portrait): title, drinking,
      windup "LET GO!!", splat+ghost, Second Wind, game-over, hat shop, stats. Captured from the
      web build at phone res (identical renderer, no ads). Re-shoot on-device if you want the status
      bar; see `store-assets/screenshots/README.md`.
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
- [x] **Published on the owner's own domain** (2026-07-13). Canonical live URL:
      **https://genartstudios.com/apps/sippy/privacy-policy** — note there is NO `.html` suffix
      (the `.html` variant 404s). This matches `PRIVACY_POLICY_URL` in `www/js/main.js`.
      Source-of-record markdown stays at `store-assets/privacy-policy.md`; the GitHub-Pages copy at
      `raresome.github.io/sippy/privacy-policy.html` is now a stale mirror, not the canonical URL.
- [ ] Paste that URL into Play Console → App content → Privacy policy.
- [x] Contact email resolved to the real inbox **hello@genartstudios.com** (matches the published
      policy and the Play Console contact email). The old `support@` placeholder is gone.

## Build & release
- [x] `versionCode` / `versionName` = 1 / "1.0" (`android/app/build.gradle`). Bump versionCode for
      every subsequent Play upload.
- [x] **Upload keystore created** — `sippy-upload-keystore.jks` in `C:\My_Apps\_credentials\Sippy\`
      (alias `sippy-upload`, RSA 2048, ~year 2053). Passwords + SHA-1/SHA-256 fingerprints are in
      `sippy-keystore-info.txt` beside it. **Back this folder up offline — do not lose it.**
- [x] **Release signing wired** — `android/key.properties` (gitignored) points Gradle at the
      keystore; `app/build.gradle` has a `signingConfigs.release`.
- [x] **Signed .aab built** — `gradlew bundleRelease` → `app-release.aab`, verified signed by
      "CN=Gen Art Studios". The copy at `C:\My_Apps\_credentials\Sippy\sippy-v1-vc1-release.aab` was
      REBUILT 2026-07-13 and is byte-identical to the bundle Play accepted (sha1 `100a8a6395695eaf…`).
      The previous 07-11 copy was stale — it had the old GitHub-Pages privacy URL baked in.
- [x] **Uploaded** to the **alpha / Closed testing** track as a **draft** release (see STATUS block).
- [ ] Promote the draft: Testing → Closed testing → Edit release → Review release → Start rollout.
      Cannot happen until App content below is complete.
- [ ] Add closed-track **testers** (email list or Google Group) and select **countries** — UI only.
- [ ] A new *personal* Play account must run a **14-day, 12-tester** closed test before it can apply
      for production access. Line the testers up now if that applies.
- [ ] Enroll in **Play App Signing** when prompted (recommended; Google holds the app-signing key,
      this keystore stays your *upload* key).
- [ ] After the first upload, register the keystore SHA-1 in the **Firebase console** (Project
      settings → your Android app → Add fingerprint) so Analytics/Play Games auth works, and add
      the Play App Signing SHA-1 too once Play generates it.
- [ ] Target countries at launch: start with **US/worldwide English**. Cheap-reach localized listings
      to consider once you see organic impressions: Spanish, Portuguese (BR), Indonesian, Hindi.
