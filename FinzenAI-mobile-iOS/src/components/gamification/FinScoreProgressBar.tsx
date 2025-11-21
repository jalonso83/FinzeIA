import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
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
  const [showInfoModal, setShowInfoModal] = useState(false);
  
  // Calcular progreso del nivel actual con nueva escala
  const currentLevelRange = getLevelRange(level);
  const progressInLevel = currentScore - currentLevelRange.min;
  const totalNeededInLevel = currentLevelRange.max - currentLevelRange.min + 1;
  const progressPercentage = (progressInLevel / totalNeededInLevel) * 100;

  // Render del badge de streak rectangular (más compatible multiplataforma)
  const renderStreakBadge = () => {
    const streakValue = streak?.isActive ? streak.currentStreak : 0;
    
    // Cálculo de la próxima meta
    const milestones = [3, 7, 14, 30, 60, 100];
    const nextMilestone = milestones.find(m => m > streakValue) || 100;
    const previousMilestone = milestones.find(m => m <= streakValue) || 0;
    const progress = previousMilestone === 0 
      ? (streakValue / nextMilestone) * 100
      : ((streakValue - previousMilestone) / (nextMilestone - previousMilestone)) * 100;

    return (
      <View style={styles.streakBadge}>
        {/* Header con ícono */}
        <View style={styles.streakHeader}>
          <Text style={styles.streakIcon}>🔥</Text>
        </View>
        
        {/* Número principal */}
        <Text style={styles.streakMainNumber}>{streakValue}</Text>
        
        {/* Label */}
        <Text style={styles.streakMainLabel}>
          {streakValue === 1 ? 'DÍA' : 'DÍAS'}
        </Text>
        
        {/* Barra de progreso mini */}
        <View style={styles.miniProgressContainer}>
          <View style={styles.miniProgressBar}>
            <View 
              style={[
                styles.miniProgressFill, 
                { width: `${Math.min(progress, 100)}%` }
              ]} 
            />
          </View>
        </View>
        
        {/* Meta */}
        <Text style={styles.streakMeta}>Meta: {nextMilestone}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Ícono de información en esquina superior derecha */}
      <TouchableOpacity
        onPress={() => setShowInfoModal(true)}
        style={styles.infoButton}
      >
        <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
      </TouchableOpacity>

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

        {/* Columna derecha - Badge de streak */}
        <View style={styles.rightColumn}>
          {renderStreakBadge()}
        </View>
      </View>

      {/* Modal de información */}
      <Modal
        visible={showInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowInfoModal(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowInfoModal(false)}
            >
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>¿Qué es tu Índice FinZen?</Text>
            
            <View style={styles.metricExplanation}>
              <Text style={styles.metricName}>📊 Índice de Salud Financiera</Text>
              <Text style={styles.metricDescription}>
                Tu Índice FinZen es una medida integral de tu salud financiera que va de 0 a 100, calculado en base a tus hábitos y comportamiento financiero.
              </Text>
            </View>

            <View style={styles.metricExplanation}>
              <Text style={styles.metricName}>🎯 Niveles</Text>
              <Text style={styles.metricDescription}>
                • 0-54: Principiante{'\n'}
                • 55-69: Intermedio{'\n'}
                • 70-81: Avanzado{'\n'}
                • 82-91: Experto{'\n'}
                • 92-100: Maestro
              </Text>
            </View>

            <View style={styles.metricExplanation}>
              <Text style={styles.metricName}>📈 Progreso</Text>
              <Text style={styles.metricDescription}>
                La barra verde muestra qué tan cerca estás del siguiente nivel. Los puntos se obtienen manteniendo presupuestos, registrando transacciones y alcanzando metas.
              </Text>
            </View>

            <View style={styles.metricExplanation}>
              <Text style={styles.metricName}>🔥 Racha de días</Text>
              <Text style={styles.metricDescription}>
                Cuenta los días consecutivos que has interactuado con la app. Mantener una racha te ayuda a desarrollar hábitos financieros consistentes.
              </Text>
            </View>

            <View style={styles.metricExplanation}>
              <Text style={styles.metricName}>💡 Tips para mejorar tu Índice</Text>
              <Text style={styles.metricDescription}>
                • Registra transacciones regularmente{'\n'}
                • Mantén tus presupuestos activos{'\n'}
                • Completa tus metas de ahorro{'\n'}
                • Desarrolla hábitos financieros consistentes{'\n'}
                • Interactúa con la app diariamente para mantener tu racha
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    paddingTop: 28,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'visible',
    minHeight: 130,
  },
  header: {
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
    zIndex: 2,
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
    width: 75,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 20,
    paddingTop: 8,
  },
  infoText: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'left',
  },
  // Estilos para el badge de streak rectangular
  streakBadge: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
    width: 65,
    minHeight: 78,
  },
  streakHeader: {
    marginBottom: 2,
  },
  streakIcon: {
    fontSize: 12,
    textAlign: 'center',
  },
  streakMainNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    lineHeight: 26,
  },
  streakMainLabel: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 6,
  },
  miniProgressContainer: {
    width: '100%',
    marginBottom: 4,
  },
  miniProgressBar: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 1.5,
  },
  streakMeta: {
    fontSize: 7,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '400',
  },
  // Estilos del modal de información
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    paddingBottom: 32,
    width: '100%',
    maxWidth: 440,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    paddingRight: 40,
  },
  metricExplanation: {
    marginBottom: 18,
  },
  metricName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  metricDescription: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
});

export default FinScoreProgressBar;