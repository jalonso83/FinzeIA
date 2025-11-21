import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

export interface UserStreak {
  currentStreak: number;
  longestStreak: number;
  isActive: boolean;
  lastActivityDate?: string;
}

interface StreakCounterProps {
  streak?: UserStreak | null;
  size?: number;
  animate?: boolean;
  className?: string;
}

const StreakCounterFinZen: React.FC<StreakCounterProps> = ({ 
  streak, 
  size = 120, 
  animate = true 
}) => {
  
  // Si no hay racha o está inactiva
  if (!streak || !streak.isActive || streak.currentStreak === 0) {
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Svg
          width={size}
          height={size}
          style={styles.svgContainer}
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Fondo verde del círculo */}
          <Circle
            cx={center}
            cy={center}
            r={radius + strokeWidth/2 + 8}
            fill="#10B981"
          />

          {/* Círculo de fondo para el aro */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            fill="none"
            opacity={0.4}
          />

          {/* Círculo de progreso azul (sin progreso para 0) */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#2563EB"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
          />
        </Svg>

        {/* Contenido central */}
        <View style={styles.centerContent}>
          <View style={styles.textContainer}>
            <Text style={styles.streakNumber}>0</Text>
            <Text style={styles.streakLabel}>DÍAS</Text>
            <Text style={styles.metaText}>Meta: 3</Text>
          </View>
        </View>
      </View>
    );
  }

  // Cálculos para el anillo de progreso basado en próxima meta
  const milestones = [3, 7, 14, 30, 60, 100];
  const nextMilestone = milestones.find(m => m > streak.currentStreak) || 100;
  const previousMilestone = milestones.find(m => m <= streak.currentStreak) || 0;
  const progress = previousMilestone === 0 
    ? (streak.currentStreak / nextMilestone) * 100
    : ((streak.currentStreak - previousMilestone) / (nextMilestone - previousMilestone)) * 100;

  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg
        width={size}
        height={size}
        style={styles.svgContainer}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Fondo verde del círculo */}
        <Circle
          cx={center}
          cy={center}
          r={radius + strokeWidth/2 + 8}
          fill="#10B981"
        />

        {/* Círculo de fondo para el aro */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="none"
          opacity={0.4}
        />

        {/* Círculo de progreso azul */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#2563EB"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
        />

        {/* Punto brillante al final del progreso */}
        {progress > 5 && (
          <Circle
            cx={center + radius * Math.cos((progress / 100) * 2 * Math.PI - Math.PI / 2)}
            cy={center + radius * Math.sin((progress / 100) * 2 * Math.PI - Math.PI / 2)}
            r={strokeWidth / 2.5}
            fill="#FFFFFF"
          />
        )}
      </Svg>

      {/* Contenido central */}
      <View style={styles.centerContent}>
        <View style={styles.textContainer}>
          <Text style={styles.streakNumber}>
            {streak.currentStreak}
          </Text>
          <Text style={styles.streakLabel}>
            {streak.currentStreak === 1 ? 'DÍA' : 'DÍAS'}
          </Text>
          <Text style={styles.metaText}>
            Meta: {nextMilestone}
          </Text>
        </View>
      </View>
    </View>
  );
};

// Versión compacta para uso en listas
export const StreakCompact: React.FC<{
  streak?: UserStreak | null;
}> = ({ streak }) => {
  if (!streak || !streak.isActive || streak.currentStreak === 0) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactInactive}>
          <Text style={styles.compactInactiveText}>Sin racha activa</Text>
        </View>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#4ade80', '#16a34a']}
      style={styles.compactActive}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <View style={styles.compactContent}>
        <Text style={styles.compactNumber}>{streak.currentStreak}</Text>
        <Text style={styles.compactLabel}>
          {streak.currentStreak === 1 ? 'día' : 'días'}
        </Text>
      </View>
      
      {streak.longestStreak > streak.currentStreak && (
        <Text style={styles.compactBest}>
          Mejor: {streak.longestStreak}
        </Text>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgContainer: {
    position: 'absolute',
    transform: [{ rotate: '-90deg' }],
  },
  centerContent: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    lineHeight: 28,
  },
  streakLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  metaText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  compactInactiveText: {
    fontSize: 12,
    color: '#6b7280',
  },
  compactActive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  compactContent: {
    alignItems: 'center',
    marginRight: 12,
  },
  compactNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  compactLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  compactBest: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 'auto',
  },
});

export default StreakCounterFinZen;