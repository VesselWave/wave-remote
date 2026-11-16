package android.os;
import java.util.*;
import java.util.concurrent.*;
/** JVM stand-in: one shared "main" thread, including Android's callback cancellation. */
public class Handler {
    public static final ScheduledExecutorService MAIN = Executors.newSingleThreadScheduledExecutor(r -> { Thread t = new Thread(r, "main"); t.setDaemon(true); return t; });
    private final Map<Runnable, List<ScheduledFuture<?>>> tasks = new HashMap<>();
    public Handler(Looper l) {}
    public boolean post(Runnable r) { return postDelayed(r, 0); }
    public synchronized boolean postDelayed(Runnable r, long ms) {
        tasks.computeIfAbsent(r, key -> new ArrayList<>()).add(MAIN.schedule(r, ms, TimeUnit.MILLISECONDS));
        return true;
    }
    public synchronized void removeCallbacks(Runnable r) {
        List<ScheduledFuture<?>> scheduled = tasks.remove(r);
        if (scheduled != null) for (ScheduledFuture<?> task : scheduled) task.cancel(false);
    }
    public synchronized void removeCallbacksAndMessages(Object o) {
        for (Runnable r : new ArrayList<>(tasks.keySet())) removeCallbacks(r);
    }
}
