#!/usr/bin/env bash
# Linux-only LAN integration, after ./test.sh. Requires iproute2, openssl and passwordless sudo.
# Everything runs in temporary network namespaces; the host's LAN and routes stay untouched.
set -euo pipefail
cd "$(dirname "$0")/.."
[[ $(uname -s) == Linux ]] || { echo 'Run this test on a Linux VM.' >&2; exit 1; }
JAVA="${JAVA_HOME:+$JAVA_HOME/bin/}java"
command -v "$JAVA" >/dev/null
sudo -n true
work=$(mktemp -d)
tv_ns="wave-tv-$$"
client_ns="wave-client-$$"
cleanup() {
    for ns in "$tv_ns" "$client_ns"; do
        sudo -n ip netns pids "$ns" 2>/dev/null | xargs -r sudo -n kill || true
        sudo -n ip netns del "$ns" 2>/dev/null || true
    done
    rm -rf "$work"
}
trap cleanup EXIT
cp tools/mock_tv.py "$work/"
for prefix in mock_tv wrong; do
    openssl req -x509 -newkey rsa:2048 -nodes -days 1 -keyout "$work/$prefix.key" \
        -out "$work/$prefix.crt" -subj "/CN=$prefix" >/dev/null 2>&1
done
pin=$(openssl x509 -in "$work/mock_tv.crt" -noout -fingerprint -sha256 | cut -d= -f2 | tr -d ':' | tr '[:upper:]' '[:lower:]')
sudo -n ip netns add "$tv_ns"
sudo -n ip netns add "$client_ns"
sudo -n ip link add wave-tv-link type veth peer name wave-cli-link
sudo -n ip link set wave-tv-link netns "$tv_ns"
sudo -n ip link set wave-cli-link netns "$client_ns"
sudo -n ip -n "$tv_ns" addr add 10.211.0.2/24 dev wave-tv-link
sudo -n ip -n "$client_ns" addr add 10.211.0.1/24 dev wave-cli-link
sudo -n ip -n "$tv_ns" link set lo up
sudo -n ip -n "$client_ns" link set lo up
sudo -n ip -n "$tv_ns" link set wave-tv-link up
sudo -n ip -n "$client_ns" link set wave-cli-link up
sudo -n ip -n "$tv_ns" route add default dev wave-tv-link
sudo -n ip -n "$client_ns" route add default dev wave-cli-link
# Logs intentionally belong to the unprivileged caller.
# shellcheck disable=SC2024
sudo -n ip netns exec "$tv_ns" python3 "$work/mock_tv.py" 10.211.0.2 > "$work/tv.log" 2>&1 &
for _ in {1..50}; do
    if grep -q listening "$work/tv.log"; then break; fi
    sleep 0.1
done
grep -q listening "$work/tv.log" || { cat "$work/tv.log"; exit 1; }
classpath="$PWD/out/tests:$PWD/.cache/json-20240303.jar"
echo 'Old IP offline; rediscover the TV at its new IP:'
sudo -n ip netns exec "$client_ns" "$(command -v "$JAVA")" -cp "$classpath" me.vwave.remote.RecoveryTest 10.211.0.3 10.211.0.2 "$pin"
echo 'Old IP now belongs to a different TLS TV; recover without trusting it:'
sudo -n ip -n "$tv_ns" addr add 10.211.0.3/24 dev wave-tv-link
# Logs intentionally belong to the unprivileged caller.
# shellcheck disable=SC2024
sudo -n ip netns exec "$tv_ns" openssl s_server -accept 10.211.0.3:3001 \
    -cert "$work/wrong.crt" -key "$work/wrong.key" -quiet -ign_eof > "$work/wrong.log" 2>&1 &
# s_server starts locally; the actual identity and reconnect assertions run below.
for _ in {1..50}; do
    if sudo -n ip netns exec "$tv_ns" ss -lnt | grep -q '10.211.0.3:3001'; then break; fi
    sleep 0.1
done
sudo -n ip netns exec "$tv_ns" ss -lnt | grep -q '10.211.0.3:3001'
sudo -n ip netns exec "$client_ns" "$(command -v "$JAVA")" -cp "$classpath" me.vwave.remote.RecoveryTest 10.211.0.3 10.211.0.2 "$pin"
