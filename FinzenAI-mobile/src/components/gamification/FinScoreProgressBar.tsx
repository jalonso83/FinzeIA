import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';

interface UserStreak {
  currentStreak: number;
  longestStreak: number;
  isActive: boolean;
  lastActivityDate?: string;
}

interface FinScoreProgressBarProps {
  currentScore: number;
  level: number;
  levelName?: string;
  pointsToNextLevel: number;
  animate?: boolean;
  streak?: UserStreak | null;
}

// Función para calcular rangos de niveles basados en Índice FinZen
const getLevelRange = (level: number): { min: number; max: number } => {
  switch (level) {
    case 1: return { min: 0, max: 54 };
    case 2: return { min: 55, max: 69 };
    case 3: return { min: 70, max: 81 };
    case 4: return { min: 82, max: 91 };
    case 5: return { min: 92, max: 100 };
    default: return { min: 0, max: 54 };
  }
};

const FinScoreProgressBar: React.FC<FinScoreProgressBarProps> = ({
  currentScore,
  level,
  levelName,
  pointsToNextLevel,
  streak,
}) => {
  // Calcular progreso del nivel actual con nueva escala
  const currentLevelRange = getLevelRange(level);
  const progressInLevel = currentScore - currentLevelRange.min;
  const totalNeededInLevel = currentLevelRange.max - currentLevelRange.min + 1;
  const progressPercentage = (progressInLevel / totalNeededInLevel) * 100;

  // Render del círculo de streak compacto (replicando StreakCounter completo)
  const renderStreakCircle = () => {
    const size = 70;
    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;
    const streakValue = streak?.isActive ? streak.currentStreak : 0;

    // Si no hay racha o está inactiva
    if (!streak || !streak.isActive || streak.currentStreak === 0) {
      const circumference = 2 * Math.PI * radius;
      return (
        <View style={[styles.streakContainer, { width: size, height: size }]}>
          <Svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
          >
            {/* Fondo verde del círculo */}
            <Circle
              cx={center}
              cy={center}
              r={radius + strokeWidth/2 + 3}
              fill="#10B981"
            />
            {/* Círculo de fondo para el aro */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth={strokeWidth}
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
          <View style={styles.streakText}>
            <Text style={styles.streakNumber}>0</Text>
            <Text style={styles.streakLabel}>DÍAS</Text>
            <Text style={styles.metaText}>Meta: 3</Text>
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

    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <View style={[styles.streakContainer, { width: size, height: size }]}>
        <Svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
        >
          {/* Fondo verde del círculo */}
          <Circle
            cx={center}
            cy={center}
            r={radius + strokeWidth/2 + 3}
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
        <View style={styles.streakText}>
          <Text style={styles.streakNumber}>{streak.currentStreak}</Text>
          <Text style={styles.streakLabel}>
            {streak.currentStreak === 1 ? 'DÍA' : 'DÍAS'}
          </Text>
          <Text style={styles.metaText}>
            Meta: {nextMilestone}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.cardContent}>
        {/* Columna izquierda - Información del nivel */}
        <View style={styles.leftColumn}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.levelTitle}>NIVEL {level}</Text>
            <Text style={styles.levelSubtitle}>
              Índice FinZen - {levelName || 'Principiante'}
            </Text>
          </View>

          {/* Barra de progreso principal */}
          <View style={styles.progressContainer}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>{currentScore}/100</Text>
              <Text style={styles.progressLabel}>Siguiente nivel</Text>
            </View>
            
            {/* Contenedor de la barra */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <LinearGradient
                  colors={['#4ade80', '#16a34a']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(progressPercentage, 100)}%` }
                  ]}
                />
              </View>
            </View>

            {/* Información adicional */}
            <View style={styles.additionalInfo}>
              <Text style={styles.infoText}>
                Para siguiente nivel: {pointsToNextLevel === 0 ? 'Nivel máximo' : `+${pointsToNextLevel} puntos`}
              </Text>
            </View>
          </View>
        </View>

        {/* Columna derecha - Círculo de streak */}
        <View style={styles.rightColumn}>
          {renderStreakCircle()}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'visible',
  },
  header: {
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  levelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  levelSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6b7280',
  },
  progressBarContainer: {
    marginBottom: 6,
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  percentageContainer: {
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  additionalInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#16a34a',
  },
  // Nuevos estilos para diseño de dos columnas
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'visible',
  },
  leftColumn: {
    flex: 1,
    marginRight: 16,
  },
  rightColumn: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'left',
  },
  // Estilos para el círculo de streak (replicando StreakCounter)
  streakContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  streakText: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    lineHeight: 20,
  },
  streakLabel: {
    fontSize: 7,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: -1,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  metaText: {
    fontSize: 7,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 1,
    fontWeight: '400',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});

export default FinScoreProgressBar;