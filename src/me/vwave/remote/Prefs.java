package me.vwave.remote;

import android.content.Context;
import android.content.SharedPreferences;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * Saved TVs and UI settings. Each TV (name, client-key, pinned certificate, wake addresses) is stored
 * under "tv.<host>.*"; "host" is the selected one, and the per-TV getters and setters act on it.
 */
final class Prefs {
    private static final String[] TV_FIELDS = {"udn", "name", "label", "key", "pin", "macs", "btMac", "wakeRegistered", "favorites", "hidden"};
    private final SharedPreferences sp;

    Prefs(Context ctx) {
        sp = ctx.getSharedPreferences("tv", Context.MODE_PRIVATE);
        migrate();
    }

    /** Before 0.4 the one TV lived in flat keys ("key", "pin", ...); move it under its host. */
    private void migrate() {
        if (sp.getString("hosts", null) != null) return;
        SharedPreferences.Editor e = sp.edit();
        String host = sp.getString("host", null);
        if (host != null) {
            for (String f : new String[] {"name", "key", "pin", "macs", "btMac"}) {
                String v = sp.getString(f, null);
                if (v != null) e.putString(field(host, f), v);
            }
            if (sp.getBoolean("wakeRegistered", false)) e.putBoolean(field(host, "wakeRegistered"), true);
        }
        for (String f : TV_FIELDS) e.remove(f);
        e.putString("hosts", host != null ? host : "").apply();
    }

    private static String field(String host, String name) { return "tv." + host + "." + name; }
    private String current(String name) { String h = host(); return h != null ? field(h, name) : null; }
    private String get(String name) { String k = current(name); return k != null ? sp.getString(k, null) : null; }
    private void put(String name, String value) {
        String k = current(name);
        if (k != null) sp.edit().putString(k, value).apply();
    }

    String host() { return sp.getString("host", null); }
    String udn() { return get("udn"); }
    void setUdn(String udn) { put("udn", udn); }
    String name() { return get("name"); }
    String clientKey() { return get("key"); }
    String certPin() { return get("pin"); }
    /** The TV's Bluetooth MAC, from its SSDP device description; the BLE wake-up target. */
    String btMac() { return get("btMac"); }
    boolean wakeRegistered() { String k = current("wakeRegistered"); return k != null && sp.getBoolean(k, false); }
    boolean touchpad() { return sp.getBoolean("touchpad", false); }
    /**
     * New keys, not the old shared "naturalScrolling": switching to the touchpad saved that key's
     * natural default, so it doesn't show a real choice, and both now start traditional.
     */
    boolean naturalEdge() { return sp.getBoolean("naturalEdge", false); }
    boolean naturalTwoFinger() { return sp.getBoolean("naturalTwoFinger", false); }
    /** Keep the connection, with notification controls, while the app is in the background. */
    boolean background() { return sp.getBoolean("background", true); }
    /** Android's battery optimization prompt was offered once automatically; later it's on request. */
    boolean batteryPrompted() { return sp.getBoolean("batteryPrompted", false); }

    /** Saved TVs in the order they were added. */
    List<String> hosts() {
        String h = sp.getString("hosts", "");
        return h.isEmpty() ? Collections.<String>emptyList() : Arrays.asList(h.split(","));
    }
    String name(String host) { return sp.getString(field(host, "name"), null); }
    /** A name the user gave this TV, to tell apart several of the same model; kept when the TV's own name is relearned. */
    String label(String host) { return sp.getString(field(host, "label"), null); }
    boolean paired(String host) { return sp.getString(field(host, "key"), null) != null; }
    /** The selected TV's favourite app ids, in the order the user arranged them. */
    List<String> favorites() { return ids("favorites"); }
    /** App ids the user hid from the selected TV's launcher. */
    List<String> hidden() { return ids("hidden"); }
    private List<String> ids(String field) {
        String f = get(field);
        return f == null || f.isEmpty() ? Collections.<String>emptyList() : Arrays.asList(f.split("\n"));
    }

    /**
     * The address this phone presents for BLE wake-up. Like ThinQ (NetworkUtil.getOrCreateRandomizedMacAddress)
     * it is random and persistent, not the real Bluetooth MAC, which Android hides from apps.
     */
    String wakeAddress() {
        String a = sp.getString("wakeAddress", null);
        if (a != null) return a;
        byte[] b = new byte[6];
        new java.security.SecureRandom().nextBytes(b);
        b[0] = (byte) ((b[0] & 0xFC) | 0x02); // locally administered, unicast
        StringBuilder sb = new StringBuilder();
        for (byte x : b) sb.append(sb.length() > 0 ? ":" : "").append(String.format("%02x", x));
        a = sb.toString();
        sp.edit().putString("wakeAddress", a).apply();
        return a;
    }

    List<String> macs() {
        String m = get("macs");
        return m == null || m.isEmpty() ? Collections.<String>emptyList() : Arrays.asList(m.split(","));
    }

    /**
     * Selects {@code host}, adding it if new; other saved TVs keep their pairing. A TV that never
     * paired is dropped when another one is selected. {@code name} only fills in a missing name.
     */
    void setTv(String host, String name) {
        String previous = host();
        if (previous != null && !previous.equals(host) && !paired(previous)) remove(previous);
        List<String> hosts = new ArrayList<>(hosts());
        SharedPreferences.Editor e = sp.edit();
        if (!hosts.contains(host)) {
            hosts.add(host);
            e.putString("hosts", android.text.TextUtils.join(",", hosts));
        }
        if (name != null && name(host) == null) e.putString(field(host, "name"), name);
        e.putString("host", host).apply();
    }

    /** Move the selected TV's entire record after its certificate was verified at a new IP.
     * If DHCP swapped two saved TVs, retain the displaced record at the old IP so it too can recover.
     * Snapshot both records before editing, and publish the move in one preferences transaction.
     */
    void relocate(String newHost) {
        String oldHost = host();
        if (oldHost == null || oldHost.equals(newHost)) return;
        List<String> hosts = new ArrayList<>(hosts());
        boolean occupied = hosts.contains(newHost);
        java.util.Map<String, String> source = record(oldHost);
        java.util.Map<String, String> destination = record(newHost);
        SharedPreferences.Editor e = sp.edit();
        for (String f : TV_FIELDS) {
            e.remove(field(oldHost, f));
            e.remove(field(newHost, f));
            write(e, newHost, f, source.get(f));
            if (occupied) write(e, oldHost, f, destination.get(f));
        }
        if (!occupied) hosts.set(hosts.indexOf(oldHost), newHost);
        e.putString("hosts", android.text.TextUtils.join(",", hosts));
        e.putString("host", newHost).apply();
    }

    private java.util.Map<String, String> record(String host) {
        java.util.Map<String, String> values = new java.util.HashMap<>();
        for (String f : TV_FIELDS) {
            values.put(f, f.equals("wakeRegistered") ? String.valueOf(sp.getBoolean(field(host, f), false))
                    : sp.getString(field(host, f), null));
        }
        return values;
    }

    private static void write(SharedPreferences.Editor e, String host, String f, String value) {
        if (f.equals("wakeRegistered")) e.putBoolean(field(host, f), Boolean.parseBoolean(value));
        else if (value != null) e.putString(field(host, f), value);
    }

    void setClientKey(String key) { put("key", key); }
    void setCertPin(String pin) { put("pin", pin); }
    void setMacs(List<String> macs) { put("macs", android.text.TextUtils.join(",", macs)); }
    void setName(String name) { put("name", name); }
    /** An empty or null label goes back to the TV's own name. */
    void setLabel(String host, String label) {
        if (!hosts().contains(host)) return;
        String l = label != null ? label.trim() : "";
        sp.edit().putString(field(host, "label"), l.isEmpty() ? null : l).apply();
    }
    void setBtMac(String mac) { put("btMac", mac); }
    /** Blank and repeated ids are dropped; app ids never contain a newline. */
    void setFavorites(List<String> ids) { put("favorites", join(clean(ids))); }
    /** Hidden apps leave the favourites too, so a hidden app is gone from the whole launcher. */
    void setHidden(List<String> ids) {
        List<String> hidden = clean(ids);
        List<String> favorites = new ArrayList<>(favorites());
        favorites.removeAll(hidden);
        put("hidden", join(hidden));
        put("favorites", join(favorites));
    }
    /** Blank and repeated ids are dropped; app ids never contain a newline. */
    private static List<String> clean(List<String> ids) {
        List<String> clean = new ArrayList<>();
        for (String id : ids) if (id != null && !id.trim().isEmpty() && id.indexOf('\n') < 0 && !clean.contains(id)) clean.add(id);
        return clean;
    }
    private static String join(List<String> ids) { return android.text.TextUtils.join("\n", ids); }
    void setWakeRegistered(boolean on) {
        String k = current("wakeRegistered");
        if (k != null) sp.edit().putBoolean(k, on).apply();
    }
    void setTouchpad(boolean on) { sp.edit().putBoolean("touchpad", on).apply(); }
    void setNaturalEdge(boolean on) { sp.edit().putBoolean("naturalEdge", on).apply(); }
    void setNaturalTwoFinger(boolean on) { sp.edit().putBoolean("naturalTwoFinger", on).apply(); }
    void setBackground(boolean on) { sp.edit().putBoolean("background", on).apply(); }
    void setBatteryPrompted() { sp.edit().putBoolean("batteryPrompted", true).apply(); }

    /** Forgets the selected TV, leaving none selected; other TVs, the wake address and UI settings stay. */
    void forget() {
        String h = host();
        if (h != null) remove(h);
    }

    private void remove(String host) {
        List<String> hosts = new ArrayList<>(hosts());
        hosts.remove(host);
        SharedPreferences.Editor e = sp.edit();
        for (String f : TV_FIELDS) e.remove(field(host, f));
        e.putString("hosts", android.text.TextUtils.join(",", hosts));
        if (host.equals(host())) e.remove("host");
        e.apply();
    }
}
