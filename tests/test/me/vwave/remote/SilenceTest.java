package me.vwave.remote;

import android.content.Context;
import org.json.JSONObject;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import static me.vwave.remote.ProtocolTest.*;

/** A live TCP socket that stops answering must not stay READY through repeated app resumes. */
public final class SilenceTest {
    public static void main(String[] args) throws Exception {
        Prefs prefs = new Prefs(new Context());
        prefs.setTv(args[0], "Mock LG TV");
        prefs.setClientKey("mock-client-key-0001");
        Tv tv = new Tv(prefs, new Tv.Listener() {
            public void onState(Tv.State state, String detail) {
                events.add("state:" + state + (detail != null ? ":" + detail : ""));
            }
            public void onVolume(int value, boolean muted) {}
            public void onName(String name) {}
        });
        ProtocolTest.main(tv::connect);
        expect("state:READY");
        CompletableFuture<JSONObject> silent = new CompletableFuture<>();
        ProtocolTest.main(() -> tv.request("ssap://mock/silent", null, (p, e) -> silent.complete(p)));
        check("mock stops answering after acknowledgement", silent.get(3, TimeUnit.SECONDS) != null);
        CompletableFuture<String> pending = new CompletableFuture<>();
        ProtocolTest.main(() -> tv.request("ssap://audio/getVolume", null, (p, e) -> pending.complete(e)));
        long started = System.nanoTime();
        long deadline = started + TimeUnit.MILLISECONDS.toNanos(Tv.SILENCE_MS + 2L * Tv.PING_MS);
        String disconnected = null;
        while (System.nanoTime() < deadline) {
            ProtocolTest.main(tv::checkConnection);
            String event = events.poll(1, TimeUnit.SECONDS);
            if (event != null && event.startsWith("state:DISCONNECTED")) {
                disconnected = event;
                break;
            }
        }
        check("repeated resumes cannot postpone a silent socket forever",
                "state:DISCONNECTED:TV stopped responding".equals(disconnected));
        check("silence detection allows the normal response window",
                System.nanoTime() - started >= TimeUnit.MILLISECONDS.toNanos(Tv.SILENCE_MS - 1000));
        check("silence fails pending work", "Disconnected".equals(pending.get(1, TimeUnit.SECONDS)));
        ProtocolTest.main(tv::disconnect);
        System.out.println(failures == 0 ? "ALL PASSED" : failures + " FAILED");
        System.exit(failures == 0 ? 0 : 1);
    }
}
