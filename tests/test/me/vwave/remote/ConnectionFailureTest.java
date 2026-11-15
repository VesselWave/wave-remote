package me.vwave.remote;

import android.content.Context;
import java.util.concurrent.TimeUnit;
import static me.vwave.remote.ProtocolTest.*;

/** Run after the mock exits: sequential fixtures need only the standard localhost address. */
public final class ConnectionFailureTest {
    public static void main(String[] args) throws Exception {
        String host = "127.0.0.1";
        Prefs prefs = new Prefs(new Context());
        Tv tv = new Tv(prefs, new Tv.Listener() {
            public void onState(Tv.State state, String detail) {
                events.add("state:" + state + (detail != null ? ":" + detail : ""));
            }
            public void onVolume(int value, boolean muted) {}
            public void onName(String name) {}
        });
        String ev;
        check("probe reports a closed port", !Net.reachable(host, Tv.SECURE_PORT, 1500));

        // 8. A refused 3001 falls back to plain 3000 only for a TV that never pinned a certificate.
        String legacyHost = host;
        try (java.net.ServerSocket legacy = listen(Tv.LEGACY_PORT, legacyHost)) {
            legacy.setSoTimeout(3000);
            prefs.setTv(legacyHost, "Legacy");
            prefs.setClientKey("legacy-key");
            prefs.setCertPin("11".repeat(32));
            ProtocolTest.main(tv::connect);
            expect("state:CONNECTING");
            ev = events.poll(5, TimeUnit.SECONDS);
            boolean refused = ev != null && ev.startsWith("state:DISCONNECTED");
            try (java.net.Socket s = legacy.accept()) {
                refused = false;
            } catch (java.net.SocketTimeoutException e) {
                // Nothing reached port 3000.
            }
            check("pinned TV never downgrades to plain ws (" + ev + ")", refused);

            prefs.setCertPin(null);
            ProtocolTest.main(tv::connect);
            expect("state:CONNECTING");
            boolean fellBack;
            try (java.net.Socket s = legacy.accept()) {
                fellBack = true;
            } catch (java.net.SocketTimeoutException e) {
                fellBack = false;
            }
            check("unpinned TV still falls back to plain ws://:3000", fellBack);
            ProtocolTest.main(tv::disconnect);
        }

        // 9. A TV that accepts the connection but never answers gives up instead of "Connecting…" forever.
        try (java.net.ServerSocket silent = listen(Tv.SECURE_PORT, host)) {
            prefs.setTv(host, "Silent");
            long started = System.currentTimeMillis();
            ProtocolTest.main(tv::connect);
            expect("state:CONNECTING");
            ev = events.poll(WebSocket.HANDSHAKE_TIMEOUT_MS + 3000, TimeUnit.MILLISECONDS);
            check("silent TV times out (" + ev + ")", ev != null && ev.startsWith("state:DISCONNECTED")
                    && ev.contains("didn't respond") && System.currentTimeMillis() - started >= WebSocket.HANDSHAKE_TIMEOUT_MS - 500);
        }

        // 10. A TV that closes the connection mid-handshake isn't reported as a changed certificate.
        try (java.net.ServerSocket closing = listen(Tv.SECURE_PORT, host)) {
            prefs.setTv(host, "Booting");
            prefs.setClientKey("booting-key");
            prefs.setCertPin("22".repeat(32));
            ProtocolTest.main(tv::connect);
            expect("state:CONNECTING");
            closing.setSoTimeout(3000);
            try (java.net.Socket s = closing.accept()) {
                // Consume the complete ClientHello before a graceful EOF. Closing with
                // unread bytes sends a platform-dependent TCP reset instead of a TLS EOF.
                byte[] header = s.getInputStream().readNBytes(5);
                if (header.length != 5) throw new AssertionError("Missing TLS record header");
                int length = ((header[3] & 0xff) << 8) | (header[4] & 0xff);
                if (s.getInputStream().readNBytes(length).length != length)
                    throw new AssertionError("Incomplete ClientHello");
                s.shutdownOutput();
            }
            ev = events.poll(5, TimeUnit.SECONDS);
            check("handshake dropped by the TV is not a certificate change (" + ev + ")",
                    ev != null && ev.equals("state:DISCONNECTED:The TV closed the connection. Try again."));
        }

        System.out.println(failures == 0 ? "ALL PASSED" : failures + " FAILED");
        System.exit(failures == 0 ? 0 : 1);
    }

    static java.net.ServerSocket listen(int port, String host) throws java.io.IOException {
        java.net.ServerSocket socket = new java.net.ServerSocket();
        socket.setReuseAddress(true);
        socket.bind(new java.net.InetSocketAddress(host, port), 1);
        return socket;
    }
}
