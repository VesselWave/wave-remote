package me.vwave.remote;

import android.content.Context;
import org.json.JSONObject;

import java.util.concurrent.*;

/** Drives the app's real Tv/WebSocket/Prefs classes against scripts/mock_tv.py. */
public final class ProtocolTest {
    static final BlockingQueue<String> events = new LinkedBlockingQueue<>();
    static int failures;

    public static void main(String[] a) throws Exception {
        String host = a.length > 0 ? a[0] : "127.0.0.1";
        Context ctx = new Context();
        Prefs prefs = new Prefs(ctx);
        Tv tv = new Tv(prefs, new Tv.Listener() {
            public void onState(Tv.State s, String d) { events.add("state:" + s + (d != null ? ":" + d : "")); }
            public void onVolume(int v, boolean m) { events.add("volume:" + v + ":" + m); }
            public void onName(String n) { events.add("name:" + n); }
        });
        java.nio.file.Path log = java.nio.file.Paths.get(a.length > 1 ? a[1] : "../mock_tv.log");
        long logStart = java.nio.file.Files.size(log);
        prefs.setTv(host, "Mock");

        // 1. First pairing: prompt, then registered with a client-key; cert pinned.
        main(tv::connect);
        expect("state:CONNECTING");
        expect("state:PAIRING:PROMPT");
        expect("state:READY");
        expect("volume:12:false");
        Thread.sleep(300);
        check("client-key stored", "mock-client-key-0001".equals(prefs.clientKey()));
        check("cert pinned", prefs.certPin() != null && prefs.certPin().length() == 64);
        check("MACs stored", prefs.macs().size() == 2);
        expect("name:Mock LG TV");
        check("TV name stored without [LG] prefix", "Mock LG TV".equals(prefs.name()));
        check("BLE wake registered", prefs.wakeRegistered());
        check("wake address is a locally administered unicast MAC",
                prefs.wakeAddress().matches("[0-9a-f][26ae](:[0-9a-f]{2}){5}") && prefs.wakeAddress().equals(prefs.wakeAddress()));

        // 2. Requests with callbacks + subscription updates.
        main(() -> tv.request("ssap://audio/volumeUp"));
        expect("volume:13:false");
        CompletableFuture<JSONObject> inputs = new CompletableFuture<>();
        main(() -> tv.request("ssap://tv/getExternalInputList", null, (p, e) -> inputs.complete(p)));
        check("input list", inputs.get(3, TimeUnit.SECONDS).getJSONArray("devices").length() == 3);

        // 2b. App icons come from the TV's self-signed resource server, trusted through the pin only.
        String icon = "https://" + host + ":3001/resources/0123456789abcdef/netflix.png";
        byte[] png = Tv.fetchResource(icon, host, prefs.certPin());
        check("icon fetched through the pinned certificate", png.length > 8 && (png[0] & 0xff) == 0x89 && png[1] == 'P');
        check("icon refused under another pin", refusesResource(icon, host, "00".repeat(32)));
        check("icon refused for an unpinned TV", refusesResource(icon, host, null));
        check("icon refused from another host", refusesResource("https://127.0.0.9:3001/resources/0/x.png", host, prefs.certPin()));
        check("icon refused outside /resources", refusesResource("https://" + host + ":3001/secret.png", host, prefs.certPin()));
        check("icon refused on another port", refusesResource("https://" + host + ":1990/resources/0/x.png", host, prefs.certPin()));
        check("icon refused over plain http", refusesResource("http://" + host + ":3001/resources/0/x.png", host, prefs.certPin()));
        check("missing icon is an error", refusesResource("https://" + host + ":3001/resources/0/missing.png", host, prefs.certPin()));
        CompletableFuture<JSONObject> points = new CompletableFuture<>();
        main(() -> tv.request("ssap://com.webos.applicationManager/listLaunchPoints", null, (p, e) -> points.complete(p)));
        check("launch points carry resource icons", points.get(3, TimeUnit.SECONDS).getJSONArray("launchPoints")
                .getJSONObject(0).optString("icon").startsWith("https://" + host + ":3001/resources/"));

        // 3. Pointer socket: first button queues until the socket opens, later ones go direct.
        main(() -> { tv.button("UP"); tv.button("ENTER"); });
        Thread.sleep(1500);
        main(() -> tv.button("BACK"));
        main(() -> { tv.move(40, -25); tv.click(); tv.scroll(0, 12); });
        Thread.sleep(800);
        String mock = new String(java.nio.file.Files.readAllBytes(log)).substring((int) logStart);
        for (String f : new String[] {"type:button\\nname:UP", "type:button\\nname:ENTER", "type:button\\nname:BACK",
                "type:move\\ndx:40\\ndy:-25\\ndown:0", "type:click", "type:scroll\\ndx:0\\ndy:12"}) {
            check("pointer frame " + f.replace("\\n", " "), mock.contains(f));
        }
        check("registerDevice sent {type:ThinQ, address}", mock.contains("asc/registerDevice")
                && mock.contains("\"address\": \"" + prefs.wakeAddress() + "\"") && mock.contains("\"type\": \"ThinQ\""));

        // Power-state messages recorded from a webOS 24 TV during turnOff.
        check("power off detected early", Tv.isPoweringOff("Active", "Request Power Off")
                && Tv.isPoweringOff("Active", "Request Power Off Logo") && Tv.isPoweringOff("Suspend", "")
                && !Tv.isPoweringOff("Active", "") && !Tv.isPoweringOff("Screen Off", ""));

        // 4. Power off closes the socket.
        main(tv::powerOff);
        expect("state:DISCONNECTED:TV is off");

        // 5. Reconnect with stored key: no prompt this time.
        main(tv::connect);
        expect("state:CONNECTING");
        expect("state:READY");

        // 5a. A TV that never offers a pointer socket doesn't strand presses: the request is
        // abandoned, its queued press dropped, and the next press asks again.
        CompletableFuture<JSONObject> ignore = new CompletableFuture<>();
        main(() -> tv.request("ssap://mock/pointerSocket", new JSONObject().put("mode", "ignore"), (p, e) -> ignore.complete(p)));
        ignore.get(3, TimeUnit.SECONDS);
        long mark = java.nio.file.Files.size(log);
        main(() -> tv.button("EXIT"));
        Thread.sleep(Tv.POINTER_REQUEST_MS + 500);
        CompletableFuture<JSONObject> answer = new CompletableFuture<>();
        main(() -> tv.request("ssap://mock/pointerSocket", new JSONObject().put("mode", "answer"), (p, e) -> answer.complete(p)));
        answer.get(3, TimeUnit.SECONDS);
        main(() -> tv.button("HOME"));
        Thread.sleep(1500);
        mock = new String(java.nio.file.Files.readAllBytes(log)).substring((int) mark);
        check("press after an unanswered pointer request goes through", mock.contains("type:button\\nname:HOME"));
        check("press queued for the unanswered request is dropped", !mock.contains("type:button\\nname:EXIT"));

        // Returning to the app checks the existing session instead of registering again.
        mark = java.nio.file.Files.size(log);
        main(tv::checkConnection);
        CompletableFuture<JSONObject> resumed = new CompletableFuture<>();
        main(() -> tv.request("ssap://audio/getVolume", null, (p, e) -> resumed.complete(p)));
        check("existing connection works after resume", resumed.get(3, TimeUnit.SECONDS) != null);
        mock = new String(java.nio.file.Files.readAllBytes(log)).substring((int) mark);
        check("resume does not register again", !mock.contains("register"));

        // The OS or peer can still close a retained connection. Fail pending work and reconnect
        // with the saved pairing, rather than pretending commands reached the old socket.
        CompletableFuture<String> closed = new CompletableFuture<>();
        main(() -> tv.request("ssap://mock/disconnect", null, (p, e) -> closed.complete(e)));
        check("peer closure fails the pending request", "Disconnected".equals(closed.get(3, TimeUnit.SECONDS)));
        expect("state:DISCONNECTED:Connection closed by TV");
        main(tv::checkConnection); // Must not resurrect a closed socket.
        main(tv::connect);
        expect("state:CONNECTING");
        expect("state:READY");
        CompletableFuture<JSONObject> recovered = new CompletableFuture<>();
        main(() -> tv.request("ssap://audio/getVolume", null, (p, e) -> recovered.complete(p)));
        check("commands work after reconnecting the retained session", recovered.get(3, TimeUnit.SECONDS) != null);

        // 5b. A pointer socket that opens late doesn't deliver a press made seconds earlier.
        main(tv::disconnect);
        expect("state:DISCONNECTED");
        main(tv::connect);
        expect("state:READY");
        CompletableFuture<JSONObject> slow = new CompletableFuture<>();
        main(() -> tv.request("ssap://mock/pointerSocket", new JSONObject().put("mode", 3), (p, e) -> slow.complete(p)));
        slow.get(3, TimeUnit.SECONDS);
        mark = java.nio.file.Files.size(log);
        main(() -> tv.button("RED"));
        Thread.sleep(4500);
        main(() -> tv.button("GREEN"));
        Thread.sleep(800);
        mock = new String(java.nio.file.Files.readAllBytes(log)).substring((int) mark);
        check("press after a late pointer socket goes through", mock.contains("type:button\\nname:GREEN"));
        check("stale press is not replayed when the socket opens late", !mock.contains("type:button\\nname:RED"));
        CompletableFuture<JSONObject> reset = new CompletableFuture<>();
        main(() -> tv.request("ssap://mock/pointerSocket", new JSONObject().put("mode", "answer"), (p, e) -> reset.complete(p)));
        reset.get(3, TimeUnit.SECONDS);
        main(tv::disconnect);
        expect("state:DISCONNECTED");

        // Identity probes authenticate a candidate without sending any SSAP credentials.
        long beforeProbe = java.nio.file.Files.size(log);
        check("identity probe accepts saved pin", Tv.matchesPin(host, prefs.certPin(), 1500));
        check("identity probe rejects a different TV", !Tv.matchesPin(host, "00".repeat(32), 1500));
        check("identity probe requires a saved pin", !Tv.matchesPin(host, null, 1500));
        Thread.sleep(200);
        String probes = new String(java.nio.file.Files.readAllBytes(log)).substring((int) beforeProbe);
        check("identity probes send no client key", !probes.contains("client-key") && !probes.contains("register"));

        long cachedStart = System.nanoTime();
        check("cached IP resolves by direct stable identity", host.equals(Net.findPaired(new Context(),
                host, prefs.certPin(), "uuid:mock-tv", null, "Mock LG TV", 1500)));
        check("cached IP skips the full discovery wait", TimeUnit.NANOSECONDS.toMillis(
                System.nanoTime() - cachedStart) < 2400);

        check("cached address with another identity is rejected", Net.findPaired(new Context(),
                host, prefs.certPin(), "uuid:another-tv", null, "Mock LG TV", 1500) == null);

        // Two real TV endpoints can share LG's factory certificate. A stale address must not
        // win just because its TLS handshake succeeds. Both aliases below serve the same pin.
        java.util.Map<String, Net.Found> candidates = new java.util.LinkedHashMap<>();
        candidates.put("localhost", new Net.Found("Other TV", "00:11:22:33:44:55", "uuid:other"));
        candidates.put(host, new Net.Found("Mock LG TV", "aa:bb:cc:dd:ee:ff", "uuid:ours"));
        check("shared certificate: migrate by unique saved TV name", host.equals(Net.findPaired(
                "localhost", prefs.certPin(), null, null, "Mock LG TV", 1500, candidates)));
        check("shared certificate: stable UUID survives a changed TV name", host.equals(Net.findPaired(
                "localhost", prefs.certPin(), "uuid:ours", null, "Old name", 1500, candidates)));
        check("older installs recover by Bluetooth identity", host.equals(Net.findPaired(
                "localhost", prefs.certPin(), null, "AA:BB:CC:DD:EE:FF", "Old name", 1500, candidates)));
        check("identity match still requires saved certificate", Net.findPaired(
                "localhost", "00".repeat(32), "uuid:ours", null, "Mock LG TV", 1500, candidates) == null);
        check("do not fall back to another TV with the same certificate", Net.findPaired(
                "localhost", prefs.certPin(), "uuid:missing", null, "Other TV", 1500, candidates) == null);
        candidates.put("localhost", new Net.Found("Mock LG TV", null, "uuid:other"));
        check("ambiguous names do not move credentials", Net.findPaired(
                "localhost", prefs.certPin(), null, null, "Mock LG TV", 1500, candidates) == null);

        // 6. Wrong pinned certificate must be refused.
        prefs.setCertPin("00".repeat(32));
        main(tv::connect);
        expect("state:CONNECTING");
        String ev = events.poll(5, TimeUnit.SECONDS);
        check("pin mismatch refused (" + ev + ")", ev != null && ev.startsWith("state:DISCONNECTED") && ev.contains("certificate"));

        // 7. The reconnect probe sees the mock's TLS port and a closed one.
        check("probe finds a listening TV", Net.reachable(host, Tv.SECURE_PORT, 1500));
        System.out.println(failures == 0 ? "ALL PASSED" : failures + " FAILED");
        System.exit(failures == 0 ? 0 : 1);
    }

    static void main(Runnable r) { new android.os.Handler(null).post(r); }

    static boolean refusesResource(String url, String host, String pin) {
        try { Tv.fetchResource(url, host, pin); return false; } catch (java.io.IOException e) { return true; }
    }

    static void expect(String want) throws InterruptedException {
        long end = System.currentTimeMillis() + 8000;
        while (System.currentTimeMillis() < end) {
            String ev = events.poll(end - System.currentTimeMillis(), TimeUnit.MILLISECONDS);
            if (ev == null) break;
            if (ev.equals(want)) { System.out.println("ok   " + want); return; }
            System.out.println("     (saw " + ev + ")");
        }
        check("event " + want, false);
    }

    static void check(String what, boolean ok) {
        System.out.println((ok ? "ok   " : "FAIL ") + what);
        if (!ok) failures++;
    }
}
