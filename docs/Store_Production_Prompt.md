# Store Production Prompt — Gen Art Studios

> **What this is:** the standard post-production prompt Claude Code runs once an app is built and tested, to generate every Google Play Store listing asset in one pass.
> **How to use it:** when an app is finished, tell Claude Code: *"Read /docs/Store_Production_Prompt.md and generate the full store-assets package for this app."*
> **Stack context:** apps are Kotlin + Compose forks of `_TEMPLATE`, package `com.genartstudios.[slug]`. Pull app name, primary keyword, slug, and category from the app's `AppConfig` file. If anything is missing, ask before generating.

---

## What to generate

Create a folder `/store-assets/` in the project with this structure, then produce each item:

```
/store-assets/
  /graphics/
    icon-512.png
    icon-1024.png
    feature-graphic.png
  /text/
    title.txt
    short-description.txt
    full-description.txt
    whats-new.txt
  video-concept.md
  marketing-ideas.md
  listing-checklist.md
```

> **Note:** Do NOT generate screenshots. Those are captured by hand during device testing before publishing.

---

## 1. Title  →  `/store-assets/text/title.txt`

- **Hard limit: 30 characters** (Google allows 50, but 30 keeps the title readable in search results where it gets truncated; never exceed 30 unless the brand+keyword genuinely won't fit, then cap at 50).
- **Pattern (mandatory):** `Brand: Primary Keyword`
  - The brand prefix is a short Gen Art tag, NOT the full "Gen Art Studios" (too long). Use a per-app short brand like `GenArt`, or an app-specific mini-brand (e.g. `GhostVault`, `Decibel`).
  - Examples: `GenArt Level: Bubble Level`, `Decibel: Sound Meter`, `GhostVault: Photo Lock`
- The primary keyword is the single highest-intent search term from `AppConfig`. The title is the heaviest ranking field on Google Play — the exact-match primary keyword MUST appear here.
- Avoid: pure brand with no keyword (`Spectrify Pro`), or keyword-stuffed titles (`Best Level Tool Free 2026`).

## 2. Short description  →  `/store-assets/text/short-description.txt`

- **Hard limit: 80 characters.**
- Second-most-weighted text field — treat it as ad copy, not a tagline.
- One benefit-led sentence containing the primary keyword + one secondary keyword, in natural language Gemini can parse.
- Example: `Accurate bubble level & angle finder for DIY, shelves & picture hanging.`
- It should make a searcher think "yes, that's exactly the thing I need" — front-load the concrete use case.

## 3. Full description  →  `/store-assets/text/full-description.txt`

- **Limit: 4000 characters. TARGET: 3000–3800 characters every time** — use the space for ASO coverage and conversion copy. Do not leave it short.
- **Structure (Gemini reads the full text semantically, so write for humans AND the model):**
  1. **Hook paragraph (first 2–3 lines):** open with a benefit sentence that contains the **primary keyword**. This is the bit shown before "read more" — it must sell and rank. No fluff.
  2. **Feature bullets:** 6–10 bullets, each leading with an emoji, each describing one concrete feature + the benefit. Weave secondary keywords in naturally.
  3. **Use-case section:** a short "Perfect for…" block listing 4–6 specific audiences/scenarios using long-tail phrases people actually type (e.g. "checking if a hotel room has hidden cameras", "finding a wall stud before hanging a TV"). This captures long-tail search.
  4. **Why-this-app section:** 2–3 sentences on what makes it trustworthy — works offline, no sign-up, privacy-first/no tracking (where true), lightweight. These convert.
  5. **Honest-limitations line (for any detector/sensor app):** one plain sentence that the tool gives estimates based on phone sensors. This pre-empts 1-star "it doesn't work" reviews, which now sink ranking under review-quality weighting.
  6. **Call to action (final paragraph):** invite the install, and **close with the primary keyword again** (first + last placement both get crawled).
- **Rules:**
  - Natural language, clear short paragraphs and bullet lists — scannable for AI discovery.
  - Include 3–5 distinct long-tail phrases total across the body.
  - Do NOT keyword-stuff or repeat the same phrase mechanically — semantic ranking penalizes it.
  - Match tone to the app's audience (a pro AV tool reads differently than a kids' brain game). Pull the audience from `AppConfig`; if it's a pro/prosumer tool, lean competent and specific, not hypey.

## 4. "What's new"  →  `/store-assets/text/whats-new.txt`

- Limit: 500 characters. A short release-notes blurb for v1.0.
- Keep it benefit-focused ("Faster readings, cleaner interface, new dark mode"). Active developers who post real release notes get a small freshness/trust signal.

---

## 5. App icon  →  `/store-assets/graphics/icon-512.png` + `icon-1024.png`

- Generate with **Gemini** (credentials at `C:\My_Apps\_credentials\Gemini API`).
- **512×512 PNG (under 1 MB)** plus a **1024×1024** master.
- Design rules:
  - Bold, minimalist, instantly recognizable at small sizes — 2026 trend is vibrant minimalism, not busy 3D renders.
  - **No text in the icon** — a single strong visual symbol of the app's function.
  - High contrast against both light and dark store backgrounds.
  - A/B-test note: also describe (in `listing-checklist.md`) one alternate background color worth testing later, since Play lets you A/B the icon.
- Match the icon's accent color to the app's `primaryColor` in `AppConfig` so the icon, app theme, and feature graphic feel like one brand.

## 6. Feature graphic  →  `/store-assets/graphics/feature-graphic.png`

- Generate with **Gemini**.
- **1024×500 PNG (under 15 MB).**
- A dramatic, on-theme banner that represents the app's function and audience.
- **Include the app title text overlaid**, legible on small screens, with the focal subject kept away from the center-bottom (Play overlays a play button there when a video is present).
- Keep it consistent with the icon's color/brand so the listing looks cohesive.

---

## 7. Video concept  →  `/store-assets/video-concept.md`

I shoot the video myself — generate a **concept brief**, not the video. Include:
- A suggested 15–30 second structure, shot by shot (hook in first 3 seconds → core feature demo → benefit payoff → end card with icon + "Download free").
- The single most impressive moment of the app to lead with.
- On-screen text captions to use (many watch muted).
- A suggested background-music vibe (and note ElevenLabs MCP can generate any needed SFX).
- A reminder to keep it under the focal-area overlap with Play's UI.

---

## 8. Marketing ideas  →  `/store-assets/marketing-ideas.md`

A reference doc I'll use later when I decide to market this specific app. Generate it tailored to THIS app's audience (don't write generic advice). Include:

- **Target audience profile:** who specifically searches for / needs this app, and where they spend time online.
- **Relevant subreddits:** 5–10 specific subreddits where this app's audience hangs out, with a one-line note on each subreddit's self-promo rules (most ban direct promo — suggest the "be genuinely helpful, mention the app only when relevant" angle, or posting a free/no-ads build).
- **Facebook groups / forums:** 3–6 community types or named groups/forums for this niche.
- **Other channels:** any niche-specific spots (Discord servers, hobby forums, YouTube comment niches, TikTok/Shorts hashtag clusters, Quora topics).
- **Content angles:** 3–5 concrete post or short-video ideas that lead with value (a tip, a demo, a "did you know your phone can do this") rather than an ad.
- **Seasonal hooks:** any time of year this app spikes (e.g. back-to-school for GPA tools, travel season for hidden-cam detectors) so I time promo well.
- **Cross-promo note:** which of my other Gen Art apps share this audience and should link to each other via the in-app cross-promo screen.
- **One honest caveat:** remind me not to spam or astroturf — it backfires and risks the brand. Lead with genuine usefulness.

## 9. Listing checklist  →  `/store-assets/listing-checklist.md`

A short pre-publish checklist tailored to this app so nothing gets missed in Play Console:
- Confirm title ≤30 chars and contains primary keyword.
- Confirm short description ≤80 chars.
- Confirm full description 3000–3800 chars, primary keyword in first AND last paragraph.
- Category + tags to select in Play Console (suggest the best primary category for this app).
- Content rating questionnaire answers likely needed (flag anything sensitive — e.g. health, safety claims).
- Data safety form: list exactly what data the app does/doesn't collect (most of these are "no data collected" — that's a selling point).
- Confirm real AdMob ad unit IDs are swapped in (not test IDs) and the UMP consent flow is active.
- Confirm privacy-policy URL resolves: `https://genartstudios.com/apps/[slug]`.
- One alternate icon background color to A/B test later.
- Note 3–4 target countries/locales worth a translated listing if the app gains traction (Spanish, Portuguese, Indonesian, Hindi are the cheap-reach defaults).

---

## Localization

Listing localization is **traction-gated** — do NOT translate the store listing on first publish. Generate the English listing now. Once the app shows organic impressions in a region, follow **`/docs/Localization_Guide.md`** to produce keyword-ADAPTED localized listings (not literal translations) into `/store-assets/text/[locale]/`. The app's UI strings are localized separately at build time per that same guide. Health/safety apps require the conservative-phrasing + human-review rules in the guide before any localized publish.

---

## Audience presets

Default to the audience in `AppConfig`. For reference, common Gen Art audiences and how to pitch them:

- **Pro / prosumer AV & live-event** (RTA, dB Meter, tone tools): conference/expo techs, AV installers, live-sound engineers, exhibition-hall and trade-show booth crews. Pitch competent, precise, jargon-correct. Emphasize accuracy, calibration, field use, no-internet-needed reliability on a show floor. These users respect specificity and will pay for "pro" versions.
- **Safety / privacy** (SpectraScan, vault, tracker finder): travelers, renters, privacy-conscious. Pitch reassurance + honesty about limitations.
- **DIY / maker / home** (level, stud finder, EMF, light meter): homeowners, hobbyists, electricians. Pitch practical, "your phone can already do this."
- **Everyday / evergreen** (converters, calculators): pitch simple, fast, no-nonsense, works offline.
- **Casual / entertainment** (brain games, soundboards, wallpapers): pitch fun, shareable, quick.

---

## Output discipline

- Generate every file listed above. If you can't complete one (e.g. Gemini unavailable), create the file with a clear `TODO` note rather than skipping it silently.
- After generating, print a one-line summary of each asset and flag any that hit a character limit so I can review.
- Never invent facts about the app's features — read them from the code / `AppConfig` / project docs. If a feature claim isn't verifiable in the build, leave it out.
