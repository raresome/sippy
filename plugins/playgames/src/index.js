// JS interface for the local Play Games Services v2 plugin.
//
// NOTE: www/ has no bundler and never imports this file. www/js/native.js reaches the same
// native plugin through `Capacitor.registerPlugin('PlayGames')`, which produces an identical
// proxy from the bridge's plugin header. This module exists so the package is a well-formed
// Capacitor plugin (the CLI reads package.json + android/) and so the surface is documented
// in one place.
//
//   signIn()                        -> { authenticated: boolean }
//   submitScore(leaderboardId, ...) -> void
//   unlockAchievement(achievementId)-> void
//   showLeaderboards()              -> void
//   showAchievements()              -> void

import { registerPlugin } from '@capacitor/core';

const PlayGames = registerPlugin('PlayGames');

export { PlayGames };
