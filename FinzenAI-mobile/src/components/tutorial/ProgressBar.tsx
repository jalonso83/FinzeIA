import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface Props {
  active: boolean;
  completed: boolean;
  autoAdvance?: boolean;
  duration?: number; // milliseconds
}

export default function ProgressBar({ active, completed, autoAdvance = false, duration = 5000 }: Props) {
  const progressAnim = useRef(new Animated.Value(completed ? 1 : 0)).current;

  useEffect(() => {
    if (completed) {
      // Si ya está completado, mostrar lleno inmediatamente
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 0,
        useNativeDriver: false,
      }).start();
    } else if (active && autoAdvance) {
      // Si está activo y tiene auto-avance, animar el progreso
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: duration,
        useNativeDriver: false,
      }).start();
    } else if (active) {
      // Si está activo pero sin auto-avance, mostrar vacío
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: false,
      }).start();
    } else {
      // Si no está activo ni completado, vacío
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: false,
      }).start();
    }
  }, [active, completed, autoAdvance]);

  const width = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.background} />
      <Animated.View
        style={[
          styles.fill,
          {
            width,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  background: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  fill: {
    position: 'absolute',
    height: '100%',
    backgroundColor: 'white',
    shadowColor: '#fff',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});
