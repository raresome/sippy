# SIPPY — GRAPHICS FIX ORDER (canonical art spec)
**For Claude Code. Priority: blocking. Read fully before touching code.**

## The root mistake
The current build redrew the art from a verbal description. Wrong process. The file
`reference/sippy-prototype.html` contains the approved, working render code. The functions
`drawGiant()`, `drawHand()`, `drawSippy()`, `drawSplatScene()`, `drawZzz()`, `drawTitle()`,
the `rounded()` helper, the `LAND` anchor, and `makeGiant()` are **canonical**. Port them
into `giant.js` / `sippy.js` / `fx.js` / `hud.js` essentially verbatim (split, rename,
de-globalize — but do not re-interpret a single shape). Add this rule to CLAUDE.md:

> When a reference implementation exists, port its drawing/animation code verbatim first,
> then refactor structure. Never redraw visuals from a text description.

All coordinates below assume the prototype's logical canvas: **W=420, H=740**, uniformly
scaled to the device. If the port changed the coordinate system, restore this one.

## Diagnosis of the current build (from device screenshots)
1. **No scene.** Giant is a centered, front-facing egg on a white hill. Missing: pillow,
   scalloped blanket, window frame, crescent moon, star field density, breathing motion.
2. **THE HAND IS MISSING.** This is a gameplay-critical regression — the resting hand,
   the rising/trembling wind-up, and the slap sweep are the game's threat language.
3. **Broken facial geometry.** Brows float high on the forehead, detached from eyes
   (image 1: gray brows ~200px above the closed eyes). Hair renders as a disconnected
   semicircle awning (image 2). Nose is a long smear instead of a soft ellipse pair.
4. **Sippy is wrong.** Single ball + smiley. Missing: separate head, translucent belly
   with a visible rising blood fill, two fluttering wings above, three dangly bent legs,
   proboscis curving into the skin, worry-eye acting, inflation squash-and-stretch.
5. **Wrong landing spot.** Sippy sits on the forehead/hair. Canonical landing is the
   upper cheek: `LAND = (W*0.565, H*0.595)`.
6. Title screen lost the moon, the bob animation feel, and Sippy's correct anatomy.

## Canonical scene composition (drawGiant + environment)
- Sky: vertical gradient `#0E0823 → #241647 → #33205e`. 46 twinkling cream stars in the
  top 55%. Crescent moon at `(W-72, 86)` r=34 (cream circle + offset sky-colored circle).
  Faint window frame: `strokeRect(26, 40, W-52, H*0.34)` with a center mullion,
  `rgba(255,243,214,.07)`, lineWidth 10.
- Head: circle, center `(W*0.62, H*0.78)`, **R=170** — i.e. only the top of the head rises
  above the blanket; it is NOT centered and NOT fully visible. Whole head bobs vertically
  ±4px with `sin(snorePhase·2π)` (breathing — must be visible at idle).
- Pillow: pale lavender `#EDE3FF` rounded rect behind/under the head.
- Blanket: teal `#2E6E63` scalloped wave (quadratic bumps every 42px) crossing the full
  width at `H*0.86`, breathing slightly with the head.
- Ear: ellipse on the head's right edge at `(cx+R*0.78, hy-6)`, with an inner arc stroke;
  optional gold earring below it.
- Closed eyes: downward arcs `arc(x, y, 22, 0.25, π-0.25)` at `(cx-66, hy-26)` and
  `(cx+44, hy-26)`, stroke `rgba(20,10,30,.75)` width 6, round caps.
- Brows: thick strokes **34–40px above the eyes** (not on the forehead), angled inward;
  they twitch (`twitch.brow` jitter) and furrow downward as irritation climbs.
- Nose: soft ellipse `(cx-10, hy+22)` rx=30·noseScale, plus a darker under-shadow ellipse.
  It twitches with `twitch.nose`.
- Mouth: dark ellipse `(cx-10, hy+74)` whose height oscillates 6–24px with the snore.
- Hair variants anchored to the scalp (top of the head circle, `hy - R*0.82…0.94`):
  tuft = one tilted ellipse; curls = 6 overlapping circles following the crown arc;
  mohawk = 5 triangles on the crown. Hair must touch the head silhouette — never float.
- Z's: spawn near the nose each snore cycle, drift up-right, rotate slightly; render as
  bold "Z" in `#BFA8FF`, switching to red "Z?!" when irritation > 55.

## Canonical hand (drawHand) — non-negotiable
Always rendered, after the head, same skin color:
- **Rest:** `translate(70, H*0.93)`, rotation −0.2 — arm (rounded rect 70×150), palm
  (ellipse 46×40), four fingers (rounded rects fanned −0.55…+0.47 rad), thumb. It peeks
  from the blanket at bottom-left so the player always knows where death lives.
- **Wind-up:** over the windup timer, lerp position to `(120, H*0.62)`, rotation to −1.0,
  scale to 1.25, with a ±4px high-frequency tremble. This is the "LET GO" telegraph.
- **Slap:** eased sweep from wind-up pose to `LAND`, rotation to +0.3, then screen shake
  16 / white flash / particle bursts (red + cream).
- **Clutch gag:** after a wind-up escape, the slap completes anyway onto the giant's own
  cheek ("{name} slapped himself.").

## Canonical Sippy (drawSippy)
Draw order matters (wings behind, head on top). `fullness = clamp(holdT/7, 0, 1)`,
`bodyR = lerp(15, 42, fullness)`.
1. **Wings:** two translucent cream `rgba(255,243,214,.45)` ellipses ABOVE the body at
   `y = -bodyR-8`, counter-rotating with `sin(t·26)·0.3` (×40 speed when escaping) —
   a visible flutter blur, not gray ear-lobes behind the ball.
2. **Legs:** three `#2b1a4a` strokes (width 3, round caps) hanging from the body's
   underside, each a quadratic curve swaying with `sin(t·8+i)` — dangly, bent, alive.
3. **Body:** ellipse rx=bodyR, ry=bodyR·0.92, fill `#4a3580`. Clip the interior and draw
   the **blood fill**: `#FF4D5E` rect rising from the bottom, surface at
   `y = lerp(+bodyR, −bodyR, fullness)`, with a white slosh ellipse riding the surface
   and a soft shine highlight at upper-left. The fill level is the player's fuel gauge —
   it must be obvious in a thumbnail.
4. **Head:** a SEPARATE smaller circle r=13, fill `#5a42a0`, sitting at
   `(0, −bodyR·0.9 − 5)`. No smiley mouth — the eyes do all the acting.
5. **Eyes:** white circles r=6.5 at (±6) on the head; dark pupils that (a) drift downward
   and dilate as irritation rises, (b) wander idly on the title screen; a light-blue sweat
   drop appears beside the head when worry > 0.6.
6. **Proboscis:** `#2b1a4a` stroke from the head's underside. Landed/drinking: a quadratic
   curve plunging INTO the skin at the landing point. Flying: a short curled snoot.
7. **Squash & stretch while drinking:** `scale(1+0.04·sin(16t), 1/(1+0.04·sin(16t)))`.
8. **Heavy escape:** rotation wobble and sluggish climb scale with fullness (already in
   prototype's escape state — keep it).

## Splat & ghost (drawSplatScene)
Flattened Sippy at `LAND+10`: dark ellipse 40×7 + red smear + cream X-eyes. After 0.5s a
cream ghost (dome + scalloped hem) floats up with sine drift, amber halo ellipse, two dot
eyes, and a tiny 3-string amber harp. If a hat was equipped, the ghost keeps the hat.

## Process + acceptance gates (do these, in order)
1. Run `reference/sippy-prototype.html` in a desktop browser. Screenshot title, landed,
   mid-drink, wind-up, splat. These are the targets.
2. Port the canonical functions; wire to the existing state machine.
3. Side-by-side on device, all must pass:
   - [ ] Bedroom scene reads: moon, window, stars, pillow, scalloped blanket, breathing bob
   - [ ] Hand visible at rest, bottom-left; rises + trembles on wind-up; slap sweeps to Sippy
   - [ ] Sippy lands on the upper cheek (LAND), not the forehead
   - [ ] Brows hover just above closed eyes; hair touches the scalp; nose is two soft ellipses
   - [ ] During a sip: blood level visibly rises inside Sippy; body inflates 15→42; wings
         flutter; proboscis enters skin; pupils get progressively more "I should leave"
   - [ ] Splat shows flattened body + X-eyes + ghost with halo and harp
   - [ ] Title: bobbing 2.4× Sippy with correct anatomy, moon + stars behind
4. Only after all gates pass, re-apply build-specific additions (hats anchor to the head
   transform; sound toggle button stays; HUD layout from the build is fine to keep).
