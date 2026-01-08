import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TutorialCard from '../components/tutorial/TutorialCard';
import TutorialModal from '../components/tutorial/TutorialModal';
import { TUTORIALS } from '../data/tutorials';
import { Tutorial } from '../data/tutorials/types';
import { useCompletedTutorials } from '../hooks/useTutorial';
import { tutorialStore } from '../stores/tutorialStore';

interface HelpCenterScreenProps {
  onClose?: () => void;
}

export default function HelpCenterScreen({ onClose }: HelpCenterScreenProps) {
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { completedIds, loading: loadingCompleted, refresh, isCompleted } = useCompletedTutorials();

  // Categorías de tutoriales
  const categories = [
    {
      name: 'Primeros Pasos',
      icon: 'rocket',
      color: '#2563EB',
      tutorials: TUTORIALS.filter(t => t.category === 'Primeros Pasos'),
    },
    {
      name: 'Asistente IA',
      icon: 'chatbubbles',
      color: '#1E40AF',
      tutorials: TUTORIALS.filter(t => t.category === 'Asistente IA'),
    },
    {
      name: 'Funcionalidades',
      icon: 'apps',
      color: '#059669',
      tutorials: TUTORIALS.filter(t => t.category === 'Funcionalidades'),
    },
    {
      name: 'Herramientas',
      icon: 'calculator',
      color: '#DC2626',
      tutorials: TUTORIALS.filter(t => t.category === 'Herramientas'),
    },
  ];

  // Filtrar categorías según búsqueda
  const filteredCategories = searchQuery
    ? categories
        .map(cat => ({
          ...cat,
          tutorials: cat.tutorials.filter(t =>
            t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.tags?.some(tag => tag.includes(searchQuery.toLowerCase()))
          ),
        }))
        .filter(cat => cat.tutorials.length > 0)
    : categories;

  const handleTutorialComplete = async () => {
    if (selectedTutorial) {
      await tutorialStore.markTutorialAsCompleted(selectedTutorial.id);
      refresh(); // Actualizar lista de completados
    }
    setSelectedTutorial(null);
  };

  // Estadísticas
  const totalTutorials = TUTORIALS.length;
  const completedCount = completedIds.length;
  const completionPercentage = totalTutorials > 0
    ? Math.round((completedCount / totalTutorials) * 100)
    : 0;

  if (loadingCompleted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Cargando tutoriales...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Centro de Ayuda</Text>
          <View style={styles.headerRight}>
            <View style={styles.statsContainer}>
              <Text style={styles.statsText}>
                {completedCount}/{totalTutorials}
              </Text>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" style={{ marginLeft: 6 }} />
            </View>
            {onClose && (
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={28} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={styles.subtitle}>Aprende a usar FinZen AI</Text>

        {/* Progress bar */}
        {completedCount > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${completionPercentage}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>{completionPercentage}% completado</Text>
          </View>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar tutoriales..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Categories */}
        {filteredCategories.map((category) => (
          <View key={category.name} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <View style={[styles.categoryIconContainer, { backgroundColor: category.color }]}>
                <Ionicons name={category.icon as any} size={24} color="white" />
              </View>
              <Text style={styles.categoryTitle}>{category.name}</Text>
              <Text style={styles.categoryCount}>({category.tutorials.length})</Text>
            </View>

            <View style={styles.tutorialsGrid}>
              {category.tutorials.map((tutorial) => (
                <TutorialCard
                  key={tutorial.id}
                  tutorial={tutorial}
                  onPress={() => setSelectedTutorial(tutorial)}
                  completed={isCompleted(tutorial.id)}
                />
              ))}
            </View>
          </View>
        ))}

        {/* Empty state */}
        {filteredCategories.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No se encontraron tutoriales</Text>
            <Text style={styles.emptyText}>
              Intenta buscar con otras palabras clave
            </Text>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearButtonText}>Limpiar búsqueda</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Tips Section */}
        {searchQuery === '' && (
          <View style={styles.tipsSection}>
            <Text style={styles.sectionTitle}>💡 Tips Rápidos</Text>

            <View style={styles.tipCard}>
              <Ionicons name="bulb" size={24} color="#F59E0B" />
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Usa Zenio con voz</Text>
                <Text style={styles.tipDescription}>
                  Di "Gasté 50 en comida" y Zenio lo registra automáticamente
                </Text>
              </View>
            </View>

            <View style={styles.tipCard}>
              <Ionicons name="notifications" size={24} color="#2563EB" />
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Alertas de presupuesto</Text>
                <Text style={styles.tipDescription}>
                  Recibe notificaciones cuando te acerques al límite de gasto
                </Text>
              </View>
            </View>

            <View style={styles.tipCard}>
              <Ionicons name="speedometer" size={24} color="#059669" />
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Dashboard en tiempo real</Text>
                <Text style={styles.tipDescription}>
                  Tu resumen financiero se actualiza automáticamente
                </Text>
              </View>
            </View>

            <View style={styles.tipCard}>
              <Ionicons name="shield-checkmark" size={24} color="#1E40AF" />
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Tus datos están seguros</Text>
                <Text style={styles.tipDescription}>
                  Usamos encriptación de nivel bancario para proteger tu información
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>

    {/* Tutorial Modal - FUERA del SafeAreaView */}
    {selectedTutorial && (
      <TutorialModal
        visible={!!selectedTutorial}
        tutorial={selectedTutorial}
        onComplete={handleTutorialComplete}
        onSkip={() => setSelectedTutorial(null)}
      />
    )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 12,
  },
  closeButton: {
    padding: 4,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 12,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
  },
  progressText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  categorySection: {
    marginBottom: 32,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 12,
  },
  categoryCount: {
    fontSize: 16,
    color: '#64748b',
    marginLeft: 8,
  },
  tutorialsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  clearButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 12,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  tipsSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tipContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
});
