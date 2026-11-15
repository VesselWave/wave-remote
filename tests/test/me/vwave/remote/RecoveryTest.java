package me.vwave.remote;

import android.content.Context;
import java.util.Arrays;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

/** Optional LAN integration: java ... RecoveryTest OLD_IP NEW_IP PIN.
 * Run a mock at NEW_IP using the formerly paired TV's certificate and key.
 * OLD_IP may be offline or run a second mock with a different certificate.
 */
public final class RecoveryTest {
    public static void main(String[] args) throws Exception {
        Context context = new Context();
        Prefs prefs = new Prefs(context);
        prefs.setTv(args[0], "Mock LG TV");
        prefs.setClientKey("mock-client-key-0001");
        prefs.setCertPin(args[2]);
        prefs.setLabel(args[0], "Lounge");
        prefs.setFavorites(Arrays.asList("netflix"));
        if (Tv.matchesPin(args[0], args[2], 1000)) throw new AssertionError("Old address still has our TV");
        String found = Net.findPaired(context, prefs.host(), prefs.certPin(), prefs.udn(), prefs.btMac(), prefs.name(), 1000);
        if (!args[1].equals(found)) throw new AssertionError("Expected " + args[1] + ", discovered " + found);
        prefs.relocate(found);
        Prefs restored = new Prefs(context);
        if (!args[1].equals(restored.host()) || !"Lounge".equals(restored.label(found))
                || !restored.favorites().equals(Arrays.asList("netflix"))) throw new AssertionError("Lost settings");
        BlockingQueue<Tv.State> states = new LinkedBlockingQueue<>();
        Tv tv = new Tv(restored, new Tv.Listener() {
            public void onState(Tv.State state, String detail) { states.add(state); }
            public void onVolume(int volume, boolean muted) {}
            public void onName(String name) {}
        });
        new android.os.Handler(android.os.Looper.getMainLooper()).post(tv::connect);
        long deadline = System.currentTimeMillis() + 6000;
        boolean ready = false;
        while (System.currentTimeMillis() < deadline) {
            Tv.State state = states.poll(1, TimeUnit.SECONDS);
            if (state == Tv.State.PAIRING) throw new AssertionError("Unexpected pairing prompt");
            if (state == Tv.State.READY) { ready = true; break; }
        }
        if (!ready) throw new AssertionError("Did not reconnect");
        System.out.println("PASS: rediscovered " + found + ", preserved settings, READY without pairing");
        System.exit(0);
    }
}
