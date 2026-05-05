import { colors, radii } from '@/constants/theme';
import { useEffect, useRef } from 'react';
import { Animated, DimensionValue, Platform, StyleSheet } from 'react-native';

type SkeletonLoaderProps = {
  width: DimensionValue;
  height: number;
  borderRadius?: number;
};

export function SkeletonLoader({
  width,
  height,
  borderRadius = radii.sm,
}: SkeletonLoaderProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius, opacity },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.surface,
  },
});
