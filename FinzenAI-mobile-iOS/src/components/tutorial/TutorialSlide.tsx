import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TutorialSlide as TutorialSlideType } from '../../data/tutorials/types';

const { width, height } = Dimensions.get('window');

interface Props {
  slide: TutorialSlideType;
}

export default function TutorialSlide({ slide }: Props) {
  // Animaciones
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animación de entrada
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Animación de rotación continua para elementos decorativos
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    ).start();

    // Animación de pulso para el icono
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, { width }]}>
      <LinearGradient
        colors={[slide.backgroundColor, slide.gradientEnd]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Elementos decorativos de fondo */}
        <Animated.View
          style={[
            styles.decorativeCircle1,
            {
              transform: [{ rotate: spin }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.decorativeCircle2,
            {
              transform: [{ rotate: spin }],
            },
          ]}
        />

        {/* Puntos decorativos */}
        <View style={styles.dotsContainer}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>

        {/* Contenido principal */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Icono principal con efecto glow */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <View style={styles.iconCircle}>
              <View style={styles.iconGlow} />
              <Ionicons name={slide.icon as any} size={80} color="white" />
            </View>
          </Animated.View>

          {/* Texto */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.description}>{slide.description}</Text>
          </View>
        </Animated.View>

        {/* Líneas decorativas onduladas */}
        <View style={styles.wavesContainer}>
          <View style={styles.wave} />
          <View style={[styles.wave, styles.wave2]} />
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: height - 180,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    zIndex: 10,
  },

  // Icono principal
  iconContainer: {
    marginBottom: 50,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  // Texto
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  description: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    lineHeight: 28,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Elementos decorativos - Círculos giratorios
  decorativeCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -120,
    left: -120,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },

  // Puntos decorativos
  dotsContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  dot1: {
    top: '15%',
    left: '20%',
  },
  dot2: {
    top: '70%',
    right: '25%',
  },
  dot3: {
    bottom: '25%',
    left: '15%',
  },

  // Ondas decorativas
  wavesContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  wave: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
  },
  wave2: {
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: 10,
  },
});
