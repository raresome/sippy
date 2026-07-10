package com.genartstudios.sippy.playgames

import android.content.pm.PackageManager
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.android.gms.games.PlayGames
import com.google.android.gms.games.PlayGamesSdk

/**
 * Play Games Services v2. No maintained community plugin exists, so this is the local one
 * (spec §2). v2 auto-signs-in when the SDK initializes; there is no explicit sign-in UI to
 * gate the game behind.
 *
 * Hard rule from spec §5: sign-in failure must NEVER block gameplay. Every method here
 * resolves successfully — the JS side reads `authenticated` and simply skips leaderboard and
 * achievement traffic when it is false. Nothing throws back into the game loop.
 *
 * The Games SDK throws at initialize() if com.google.android.gms.games.APP_ID is missing or
 * non-numeric, which is exactly the state of a fresh checkout (strings.xml ships a placeholder).
 * So we validate the id ourselves and stay dormant rather than crash the app on launch.
 */
@CapacitorPlugin(name = "PlayGames")
class PlayGamesPlugin : Plugin() {

    private var available = false
    private var authenticated = false

    companion object {
        private const val APP_ID_META = "com.google.android.gms.games.APP_ID"
        private const val RC_GAMES_UI = 9004
    }

    override fun load() {
        available = hasValidAppId()
        if (!available) return
        try {
            PlayGamesSdk.initialize(context)
            refreshAuthState()
        } catch (e: Throwable) {
            available = false
        }
    }

    /** A real Play Games APP_ID is a numeric project id. A placeholder is not. */
    private fun hasValidAppId(): Boolean {
        return try {
            val ai = context.packageManager.getApplicationInfo(context.packageName, PackageManager.GET_META_DATA)
            val raw = ai.metaData?.get(APP_ID_META)?.toString()?.trim()
            !raw.isNullOrEmpty() && raw.toLongOrNull() != null
        } catch (e: Throwable) {
            false
        }
    }

    /** v2 signs in on its own; this just caches the result so JS can branch on it. */
    private fun refreshAuthState() {
        PlayGames.getGamesSignInClient(activity).isAuthenticated
            .addOnCompleteListener { task ->
                authenticated = task.isSuccessful && task.result.isAuthenticated
            }
    }

    private fun ok(call: PluginCall) = call.resolve()

    @PluginMethod
    fun signIn(call: PluginCall) {
        if (!available) {
            call.resolve(JSObject().put("authenticated", false))
            return
        }
        val client = PlayGames.getGamesSignInClient(activity)
        client.isAuthenticated.addOnCompleteListener { task ->
            val isAuthed = task.isSuccessful && task.result.isAuthenticated
            if (isAuthed) {
                authenticated = true
                call.resolve(JSObject().put("authenticated", true))
            } else {
                // Auto sign-in declined or unavailable. Prompt once; never block on the outcome.
                client.signIn().addOnCompleteListener { signInTask ->
                    authenticated = signInTask.isSuccessful && signInTask.result.isAuthenticated
                    call.resolve(JSObject().put("authenticated", authenticated))
                }
            }
        }
    }

    @PluginMethod
    fun submitScore(call: PluginCall) {
        val id = call.getString("leaderboardId")
        val score = call.getInt("score")
        if (!available || !authenticated || id.isNullOrEmpty() || score == null) return ok(call)
        try {
            PlayGames.getLeaderboardsClient(activity).submitScore(id, score.toLong())
        } catch (e: Throwable) { /* scores are best-effort */ }
        ok(call)
    }

    @PluginMethod
    fun unlockAchievement(call: PluginCall) {
        val id = call.getString("achievementId")
        if (!available || !authenticated || id.isNullOrEmpty()) return ok(call)
        try {
            PlayGames.getAchievementsClient(activity).unlock(id)
        } catch (e: Throwable) { /* achievements are best-effort */ }
        ok(call)
    }

    @PluginMethod
    fun showLeaderboards(call: PluginCall) {
        if (!available || !authenticated) return ok(call)
        PlayGames.getLeaderboardsClient(activity).allLeaderboardsIntent
            .addOnSuccessListener { intent -> activity.startActivityForResult(intent, RC_GAMES_UI) }
            .addOnFailureListener { /* UI unavailable; nothing to show */ }
        ok(call)
    }

    @PluginMethod
    fun showAchievements(call: PluginCall) {
        if (!available || !authenticated) return ok(call)
        PlayGames.getAchievementsClient(activity).achievementsIntent
            .addOnSuccessListener { intent -> activity.startActivityForResult(intent, RC_GAMES_UI) }
            .addOnFailureListener { /* UI unavailable; nothing to show */ }
        ok(call)
    }
}
