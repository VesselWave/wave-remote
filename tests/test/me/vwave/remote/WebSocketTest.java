package me.vwave.remote;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.Socket;
import java.net.SocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import javax.net.SocketFactory;

/** Exercises the real reader against server bytes without a device or network. */
public final class WebSocketTest {
    private static final int LIMIT = 16 * 1024 * 1024;

    private static final class Result implements WebSocket.Listener {
        final List<String> messages = new ArrayList<>();
        final CountDownLatch closed = new CountDownLatch(1);
        Exception cause;
        public void onOpen() {}
        public void onMessage(String text) { messages.add(text); }
        public void onClose(Exception error) { cause = error; closed.countDown(); }
    }

    private static Result read(byte[] frames) throws Exception {
        ByteArrayOutputStream response = new ByteArrayOutputStream();
        response.write("HTTP/1.1 101 Switching Protocols\r\n\r\n".getBytes(StandardCharsets.US_ASCII));
        response.write(frames);
        InputStream input = new ByteArrayInputStream(response.toByteArray());
        Socket socket = new Socket() {
            @Override public void connect(SocketAddress address, int timeout) {}
            @Override public void setTcpNoDelay(boolean enabled) {}
            @Override public void setSoTimeout(int timeout) {}
            @Override public InputStream getInputStream() { return input; }
            @Override public OutputStream getOutputStream() { return new ByteArrayOutputStream(); }
        };
        SocketFactory factory = new SocketFactory() {
            public Socket createSocket() { return socket; }
            public Socket createSocket(String host, int port) { throw new UnsupportedOperationException(); }
            public Socket createSocket(String host, int port, java.net.InetAddress local, int localPort) { throw new UnsupportedOperationException(); }
            public Socket createSocket(java.net.InetAddress host, int port) { throw new UnsupportedOperationException(); }
            public Socket createSocket(java.net.InetAddress host, int port, java.net.InetAddress local, int localPort) { throw new UnsupportedOperationException(); }
        };
        Result result = new Result();
        WebSocket ws = new WebSocket("127.0.0.1", 3000, "/", factory, result);
        ws.connect();
        if (!result.closed.await(10, TimeUnit.SECONDS)) {
            ws.close();
            throw new AssertionError("Reader did not finish");
        }
        return result;
    }

    private static void frame(ByteArrayOutputStream out, int opcode, boolean fin, byte[] payload) {
        out.write((fin ? 0x80 : 0) | opcode);
        int length = payload.length;
        if (length < 126) out.write(length);
        else {
            out.write(127);
            for (int i = 7; i >= 0; i--) out.write((int) ((long) length >>> (i * 8)) & 255);
        }
        out.write(payload, 0, length);
    }

    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }

    public static void main(String[] args) throws Exception {
        ByteArrayOutputStream frames = new ByteArrayOutputStream();
        frame(frames, 1, false, "hel".getBytes(StandardCharsets.UTF_8));
        frame(frames, 9, true, new byte[0]); // Control frames may interrupt a fragmented message.
        frame(frames, 0, true, "lo".getBytes(StandardCharsets.UTF_8));
        frame(frames, 1, true, "next".getBytes(StandardCharsets.UTF_8));
        frame(frames, 8, true, new byte[0]);
        Result ordinary = read(frames.toByteArray());
        check(ordinary.cause == null, "Valid fragmented messages should close cleanly");
        check(ordinary.messages.equals(List.of("hello", "next")), "Fragments must assemble and reset between messages");

        frames.reset();
        byte[] half = new byte[LIMIT / 2];
        frame(frames, 1, false, half);
        frame(frames, 0, true, half);
        frame(frames, 8, true, new byte[0]);
        Result boundary = read(frames.toByteArray());
        check(boundary.cause == null && boundary.messages.size() == 1
                && boundary.messages.get(0).length() == LIMIT, "Exactly 16 MiB must remain accepted");

        frames.reset();
        frame(frames, 1, false, half);
        frame(frames, 0, false, half);
        frame(frames, 0, true, new byte[1]);
        frame(frames, 8, true, new byte[0]);
        Result oversized = read(frames.toByteArray());
        check(oversized.messages.isEmpty(), "Oversized fragmented message must never be delivered");
        check(oversized.cause instanceof java.io.IOException
                && oversized.cause.getMessage().equals("Message too large"), "Oversized message must close with a size error");
        System.out.println("PASS: fragmented messages, interleaved ping, exact limit, oversized message rejection");
    }
}
