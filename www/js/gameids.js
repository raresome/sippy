// gameids.js — external service IDs. Constants only: no logic, no plugin imports.
// AdMob unit ids come from the AdMob console; Play Games ids come from
// Play Console → Grow → Play Games Services and must also match strings.xml.

// --- AdMob ------------------------------------------------------------------
// The app id is ALSO declared in AndroidManifest.xml as com.google.android.gms.ads.APPLICATION_ID.
// Both must agree or the Mobile Ads SDK crashes the app on init.
export const ADMOB_APP_ID = 'ca-app-pub-6764599135936645~5598324496';

export const AD_UNITS = {
  rewarded:     'ca-app-pub-6764599135936645/3509584296',
  interstitial: 'ca-app-pub-6764599135936645/4822665966',
  banner:       'ca-app-pub-6764599135936645/6135747631',
  // Declared for completeness. @capacitor-community/admob v7 exposes no app-open API
  // (banner / interstitial / rewarded / reward-interstitial only), so nothing consumes this yet.
  appOpen:      'ca-app-pub-6764599135936645/9303589617',
};

// The owner's own handsets are registered as test devices in the AdMob console, so live unit ids
// serve test fill to them. Set to true to force Google's emulator/test fill for everyone instead.
export const AD_FORCE_TEST_MODE = false;

// --- Play Games Services v2 -------------------------------------------------
// PLACEHOLDERS. Replace with the real ids from Play Console before shipping; until then
// submitScore/unlockAchievement calls are skipped (see native.js `hasRealId`) rather than
// firing errors at the SDK. APP_ID additionally lives in strings.xml as game_app_id.
export const PLAY_GAMES_APP_ID = 'REPLACE_WITH_PLAY_GAMES_APP_ID';

export const LEADERBOARDS = {
  best_night_ml:   'REPLACE_WITH_LEADERBOARD_ID_BEST_NIGHT_ML',   // higher is better
  closest_call_ms: 'REPLACE_WITH_LEADERBOARD_ID_CLOSEST_CALL_MS', // lower is better
};

export const ACHIEVEMENTS = {
  first_splat:   'REPLACE_WITH_ACHIEVEMENT_ID_FIRST_SPLAT',   // get slapped once
  clutch:        'REPLACE_WITH_ACHIEVEMENT_ID_CLUTCH',        // first windup escape
  frame_perfect: 'REPLACE_WITH_ACHIEVEMENT_ID_FRAME_PERFECT', // escape with ≤0.05s margin
  decathlon:     'REPLACE_WITH_ACHIEVEMENT_ID_DECATHLON',     // 10 giants in one night
  bloodbank:     'REPLACE_WITH_ACHIEVEMENT_ID_BLOODBANK',     // 1,000 mL lifetime
  amateur_hour:  'REPLACE_WITH_ACHIEVEMENT_ID_AMATEUR_HOUR',  // splat on night 1
  coward:        'REPLACE_WITH_ACHIEVEMENT_ID_COWARD',        // escape 10 sips under 10 mL
};

// Display copy for the in-game achievements list. Keyed by the same logical ids as ACHIEVEMENTS
// so the stats screen never needs to know a Play Console id.
export const ACHIEVEMENT_META = {
  first_splat:   { name: 'First Blood',    desc: 'Get slapped.' },
  clutch:        { name: 'Clutch',         desc: 'Escape during a windup.' },
  frame_perfect: { name: 'Frame Perfect',  desc: 'Escape with 0.05s to spare.' },
  decathlon:     { name: 'Decathlon',      desc: 'Survive 10 giants in one night.' },
  bloodbank:     { name: 'Blood Bank',     desc: 'Drink 1,000 mL lifetime.' },
  amateur_hour:  { name: 'Amateur Hour',   desc: 'Splat on Night 1.' },
  coward:        { name: 'Coward',         desc: 'Escape 10 sips under 10 mL.' },
};

// An id that still carries the placeholder prefix is not safe to send to a Google SDK.
export function hasRealId(id) { return !!id && !id.startsWith('REPLACE_WITH_'); }
