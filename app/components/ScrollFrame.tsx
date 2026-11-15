import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, ScrollView, StyleSheet, useAnimatedValue, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewProps } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { palette, radius } from '../theme';

/** Fitting screens stay still; overflowing screens briefly explain that they scroll. */
export function useScrollCues(endPadding = 0) {
  const [paddingBottom, setPaddingBottom] = useState(endPadding);
  const metrics = useRef({ height: 0, content: 0, offset: 0 });
  const [scrollable, setScrollable] = useState(false);
  const opacity = useAnimatedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const update = () => {
    const { height, content } = metrics.current;
    setScrollable(height > 0 && content > height + 2);
    // Measure the content without our optional breathing room. Long lists get the
    // full viewport; fitting menus keep the extra gap. Excluding the current
    // padding avoids flipping between the two when content almost fits.
    if (height > 0 && content > 0) setPaddingBottom(content - paddingBottom > height + 2 ? 0 : endPadding);
  };
  useEffect(() => {
    opacity.setValue(scrollable ? 1 : 0);
    if (scrollable) timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }, 2400);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [scrollable, opacity]);
  const props = {
    onContentSizeChange: (_width: number, height: number) => { metrics.current.content = height; update(); },
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = event.nativeEvent.contentOffset.y;
      if (Math.abs(offset - metrics.current.offset) > 1) {
        if (timer.current) clearTimeout(timer.current);
        opacity.setValue(0);
      }
      metrics.current.offset = offset;
    },
    scrollEventThrottle: 32,
    scrollEnabled: scrollable,
    persistentScrollbar: scrollable,
    showsVerticalScrollIndicator: true,
  };
  // This hint never captures a tap or changes the space available to the content.
  const cues = scrollable ? <Animated.View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={[styles.cue, { opacity }]}>
    <Text style={styles.label}>More below</Text><MaterialCommunityIcons name="chevron-down" size={28} color={palette.text} />
  </Animated.View> : null;
  const frameProps = { onLayout: (event: LayoutChangeEvent) => { metrics.current.height = event.nativeEvent.layout.height; update(); } };
  return { props, frameProps, cues, contentStyle: { paddingBottom } };
}

export function ScrollFrame({ children, style, endPadding = 0, contentContainerStyle, ...props }: ScrollViewProps & { children: ReactNode; endPadding?: number }) {
  const scroll = useScrollCues(endPadding);
  return <View {...scroll.frameProps} style={[styles.frame, style]}>
    <ScrollView {...props} {...scroll.props} contentContainerStyle={[contentContainerStyle, endPadding > 0 && scroll.contentStyle]} style={styles.scroll} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    {scroll.cues}
  </View>;
}

const styles = StyleSheet.create({
  frame: { flexShrink: 1 }, scroll: { flexShrink: 1 },
  cue: { position: 'absolute', right: 12, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: palette.raised, elevation: 3 },
  label: { color: palette.text, fontSize: 14 },
});
