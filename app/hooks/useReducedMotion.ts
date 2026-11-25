import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

// Asked once per app run and kept current, so a component that mounts later already has the answer on
// its first render. A per-component guess corrected after mounting flickers: Android's Modal rebuilds
// its dialog whenever animationType changes, which showed as Apps, Inputs and Keyboard opening.
let reduced = true; // Until Android answers, don't animate.
const listeners = new Set<() => void>();
const update = (next: boolean) => {
  if (next === reduced) return;
  reduced = next;
  listeners.forEach((listener) => listener());
};
void AccessibilityInfo.isReduceMotionEnabled().then(update);
AccessibilityInfo.addEventListener('reduceMotionChanged', update);
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

export function useReducedMotion() {
  return useSyncExternalStore(subscribe, () => reduced);
}
