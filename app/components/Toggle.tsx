import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, useAnimatedValue } from 'react-native';
import { Icon } from 'react-native-paper';
import { palette, radius } from '../theme';

// A Material 3 switch drawn in JS. The row around it owns the press and the accessibility role, so this
// only shows `value`; unlike the native controlled Switch it never moves on its own and snaps back.
export function Toggle({ value, disabled = false }: { value: boolean; disabled?: boolean }) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const progress = useAnimatedValue(value ? 1 : 0);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => listener.remove();
  }, []);
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: value ? 1 : 0, duration: reducedMotion ? 0 : 200, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, value, reducedMotion]);
  const color = (off: string, on: string) => progress.interpolate({ inputRange: [0, 1], outputRange: [off, on] });
  return <Animated.View importantForAccessibility="no-hide-descendants" style={[styles.track, disabled && styles.disabled, { backgroundColor: color(palette.raised, palette.accent), borderColor: color(palette.faint, palette.accent) }]}>
    <Animated.View style={[styles.thumb, {
      backgroundColor: color(palette.muted, palette.onAccent),
      transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }, { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [2 / 3, 1] }) }],
    }]}>
      <Animated.View style={{ opacity: progress }}><Icon source="check" size={16} color={palette.accent} /></Animated.View>
    </Animated.View>
  </Animated.View>;
}

const styles = StyleSheet.create({
  track: { width: 52, height: 32, borderRadius: radius.pill, borderWidth: 2, alignSelf: 'center' },
  // Material's disabled switch: the same colors at 38% opacity.
  disabled: { opacity: 0.38 },
  thumb: { position: 'absolute', top: 2, left: 2, width: 24, height: 24, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
