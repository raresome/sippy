package com.genartstudios.sippy;

import android.os.Bundle;
import android.view.WindowManager;

import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep the screen awake during a long push-your-luck run.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Edge-to-edge immersive: draw behind the bars and hide them (swipe to reveal).
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.hide(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);

        // Back button = pause / close overlay (spec §7). We ask the web layer to handle it first;
        // it returns "true" when it consumed the press (paused, or closed an overlay). Only when
        // the game says it did nothing (i.e. we're on the title) do we let Android background it.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() == null || getBridge().getWebView() == null) { finish(); return; }
                getBridge().getWebView().evaluateJavascript(
                        "(window.__sippyOnBack && window.__sippyOnBack()) ? 'true' : 'false'",
                        value -> {
                            // evaluateJavascript returns the result JSON-encoded, so a JS string
                            // "true" arrives here as the 6 chars \"true\" (quotes included).
                            boolean handled = value != null && value.contains("true");
                            if (!handled) {
                                // Nothing to pause/close — leave the app (to home, not a hard exit).
                                runOnUiThread(() -> moveTaskToBack(true));
                            }
                        });
            }
        });
    }
}
