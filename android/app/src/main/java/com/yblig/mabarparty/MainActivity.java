package com.yblig.mabarparty;

import android.app.UiModeManager;
import android.content.Context;
import android.content.res.Configuration;
import android.hardware.input.InputManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import java.util.HashMap;
import java.util.Map;

/**
 * Capacitor activity + a tiny gamepad bridge. Physical controllers (PS3/PS4/Xbox/generic)
 * are read natively and pushed to JavaScript as window.__padEvent({...}), because the
 * WebView's own Gamepad API is unreliable on Android TV boxes. Button indexes follow the
 * W3C "standard gamepad" layout (0 = cross/A, 1 = circle/B, 2 = square/X, 3 = triangle/Y …).
 */
public class MainActivity extends BridgeActivity implements InputManager.InputDeviceListener {
    private static final boolean IMMERSIVE = true;
    private static final boolean KEEP_AWAKE = true;

    private static class Pad { int buttons; float lx, ly, rx, ry, lt, rt; String name; }
    private final Map<Integer, Pad> pads = new HashMap<>();
    private final Handler ui = new Handler(Looper.getMainLooper());
    private InputManager inputManager;
    private boolean isTv;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (KEEP_AWAKE) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (IMMERSIVE) hideSystemBars();
        UiModeManager um = (UiModeManager) getSystemService(Context.UI_MODE_SERVICE);
        isTv = um != null && um.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION;
        inputManager = (InputManager) getSystemService(Context.INPUT_SERVICE);
        if (inputManager != null) inputManager.registerInputDeviceListener(this, ui);
        // tell the page about the device + connected controllers (repeats so a fresh page load gets it)
        ui.postDelayed(heartbeat, 1200);
    }

    private final Runnable heartbeat = new Runnable() {
        @Override public void run() { sendList(); ui.postDelayed(this, 2500); }
    };

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus && IMMERSIVE) hideSystemBars();
    }

    @Override
    public void onDestroy() {
        ui.removeCallbacks(heartbeat);
        if (inputManager != null) inputManager.unregisterInputDeviceListener(this);
        super.onDestroy();
    }

    private void hideSystemBars() {
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.hide(WindowInsetsCompat.Type.systemBars());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }

    // ---------------------------------------------------------------- device detection
    private static boolean isPadDevice(InputDevice d) {
        if (d == null || d.isVirtual()) return false;
        int s = d.getSources();
        return (s & InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK
            || (s & InputDevice.SOURCE_GAMEPAD) == InputDevice.SOURCE_GAMEPAD && hasFaceButtons(d);
    }

    private static boolean hasFaceButtons(InputDevice d) {
        boolean[] r = d.hasKeys(KeyEvent.KEYCODE_BUTTON_A, KeyEvent.KEYCODE_BUTTON_B, KeyEvent.KEYCODE_BUTTON_X);
        return r[0] && r[1] && r[2];
    }

    private static boolean fromPad(int source) {
        return (source & InputDevice.SOURCE_GAMEPAD) == InputDevice.SOURCE_GAMEPAD
            || (source & InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK;
    }

    private Pad pad(InputDevice d) {
        Pad p = pads.get(d.getId());
        if (p == null) { p = new Pad(); p.name = d.getName(); pads.put(d.getId(), p); }
        return p;
    }

    @Override public void onInputDeviceAdded(int id) { sendList(); }
    @Override public void onInputDeviceRemoved(int id) { pads.remove(id); sendList(); }
    @Override public void onInputDeviceChanged(int id) { sendList(); }

    private void sendList() {
        StringBuilder sb = new StringBuilder("{\"type\":\"list\",\"tv\":").append(isTv).append(",\"pads\":[");
        boolean first = true;
        for (int id : InputDevice.getDeviceIds()) {
            InputDevice d = InputDevice.getDevice(id);
            if (!isPadDevice(d)) continue;
            if (!first) sb.append(',');
            first = false;
            sb.append("{\"id\":").append(id).append(",\"name\":").append(quote(d.getName())).append('}');
        }
        sb.append("]}");
        js(sb.toString());
    }

    // ---------------------------------------------------------------- events
    private static int bit(int keyCode) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_BUTTON_A: return 0;
            case KeyEvent.KEYCODE_BUTTON_B: return 1;
            case KeyEvent.KEYCODE_BUTTON_X: return 2;
            case KeyEvent.KEYCODE_BUTTON_Y: return 3;
            case KeyEvent.KEYCODE_BUTTON_L1: return 4;
            case KeyEvent.KEYCODE_BUTTON_R1: return 5;
            case KeyEvent.KEYCODE_BUTTON_L2: return 6;
            case KeyEvent.KEYCODE_BUTTON_R2: return 7;
            case KeyEvent.KEYCODE_BUTTON_SELECT: return 8;
            case KeyEvent.KEYCODE_BUTTON_START: return 9;
            case KeyEvent.KEYCODE_BUTTON_THUMBL: return 10;
            case KeyEvent.KEYCODE_BUTTON_THUMBR: return 11;
            case KeyEvent.KEYCODE_DPAD_UP: return 12;
            case KeyEvent.KEYCODE_DPAD_DOWN: return 13;
            case KeyEvent.KEYCODE_DPAD_LEFT: return 14;
            case KeyEvent.KEYCODE_DPAD_RIGHT: return 15;
            case KeyEvent.KEYCODE_BUTTON_MODE: return 16;
            case KeyEvent.KEYCODE_BUTTON_C: return 2;
            case KeyEvent.KEYCODE_BUTTON_Z: return 3;
            default: return -1;
        }
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        InputDevice d = e.getDevice();
        if (fromPad(e.getSource()) && d != null && !d.isVirtual()) {
            int b = bit(e.getKeyCode());
            if (b >= 0) {
                if (e.getAction() == KeyEvent.ACTION_DOWN && e.getRepeatCount() == 0) {
                    Pad p = pad(d); p.buttons |= (1 << b); send(d.getId(), p);
                } else if (e.getAction() == KeyEvent.ACTION_UP) {
                    Pad p = pad(d); p.buttons &= ~(1 << b); send(d.getId(), p);
                }
                return true; // the game handles it (incl. circle = back in menus)
            }
        }
        return super.dispatchKeyEvent(e);
    }

    @Override
    public boolean dispatchGenericMotionEvent(MotionEvent e) {
        InputDevice d = e.getDevice();
        if ((e.getSource() & InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK && e.getAction() == MotionEvent.ACTION_MOVE && d != null) {
            Pad p = pad(d);
            p.lx = axis(e, d, MotionEvent.AXIS_X); p.ly = axis(e, d, MotionEvent.AXIS_Y);
            p.rx = axis(e, d, MotionEvent.AXIS_Z); p.ry = axis(e, d, MotionEvent.AXIS_RZ);
            p.lt = Math.max(axis(e, d, MotionEvent.AXIS_LTRIGGER), axis(e, d, MotionEvent.AXIS_BRAKE));
            p.rt = Math.max(axis(e, d, MotionEvent.AXIS_RTRIGGER), axis(e, d, MotionEvent.AXIS_GAS));
            float hx = e.getAxisValue(MotionEvent.AXIS_HAT_X), hy = e.getAxisValue(MotionEvent.AXIS_HAT_Y);
            int dpad = 0;
            if (hy < -0.5f) dpad |= 1 << 12; if (hy > 0.5f) dpad |= 1 << 13;
            if (hx < -0.5f) dpad |= 1 << 14; if (hx > 0.5f) dpad |= 1 << 15;
            if (d.getMotionRange(MotionEvent.AXIS_HAT_X) != null) p.buttons = (p.buttons & ~(0xF << 12)) | dpad;
            send(d.getId(), p);
            return true;
        }
        return super.dispatchGenericMotionEvent(e);
    }

    private static float axis(MotionEvent e, InputDevice d, int a) {
        InputDevice.MotionRange r = d.getMotionRange(a, e.getSource());
        if (r == null) return 0f;
        float v = e.getAxisValue(a), flat = Math.max(r.getFlat(), 0.12f);
        return Math.abs(v) > flat ? v : 0f;
    }

    private void send(int id, Pad p) {
        js("{\"type\":\"state\",\"id\":" + id + ",\"name\":" + quote(p.name) + ",\"b\":" + p.buttons
            + ",\"a\":[" + f(p.lx) + "," + f(p.ly) + "," + f(p.rx) + "," + f(p.ry) + "," + f(p.lt) + "," + f(p.rt) + "]}");
    }

    private void js(String json) {
        if (getBridge() == null) return;
        WebView w = getBridge().getWebView();
        if (w == null) return;
        String code = "window.__padEvent&&window.__padEvent(" + json + ")";
        if (Looper.myLooper() == Looper.getMainLooper()) w.evaluateJavascript(code, null);
        else ui.post(() -> w.evaluateJavascript(code, null));
    }

    private static String f(float v) { return String.valueOf(Math.round(v * 100) / 100f); }

    private static String quote(String s) {
        if (s == null) return "\"\"";
        return "\"" + s.replace("\\", "\\\\").replace("\"", "'") + "\"";
    }
}
