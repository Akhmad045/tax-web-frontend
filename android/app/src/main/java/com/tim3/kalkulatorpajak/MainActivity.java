package com.tim3.kalkulatorpajak;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

/**
 * Security hardening: WebView debugging dimatikan secara eksplisit di
 * SEMUA build (debug maupun release). Capacitor mengaktifkan debugging
 * WebView pada build debug; tanpa baris ini, APK debug bisa di-inspect
 * lewat chrome://inspect dan token JWT di localStorage bisa dibaca dari
 * perangkat yang terhubung USB. Untuk build release (assembleRelease +
 * signing), debugging juga mati secara default — baris ini adalah lapis
 * kedua yang menjaminnya.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView.setWebContentsDebuggingEnabled(false);
    }
}
