import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function ToolsScreen() {
  const navigation = useNavigation<any>();

  const tools = [
    {
      id: 'loan-calculator',
      title: 'Calculadora de Préstamos',
      description: 'Calcula cuotas, intereses y tabla de amortización',
      icon: 'calculator' as const,
      color: '#2563EB',
      backgroundColor: '#eff6ff',
      onPress: () => navigation.navigate('LoanCalculator'),
    },
    // Futuras herramientas
    {
      id: 'investment-calculator',
      title: 'Calculadora de ROI',
      description: 'Próximamente - Calcula retorno de inversiones',
      icon: 'trending-up' as const,
      color: '#059669',
      backgroundColor: '#f0fdf4',
      onPress: () => {},
      disabled: true,
    },
    {
      id: 'currency-converter',
      title: 'Conversor de Monedas',
      description: 'Próximamente - Convierte entre diferentes monedas',
      icon: 'cash' as const,
      color: '#d97706',
      backgroundColor: '#fffbeb',
      onPress: () => {},
      disabled: true,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Herramientas</Text>
          <Text style={styles.subtitle}>
            Utilidades financieras para facilitar tus cálculos
          </Text>
        </View>

        <View style={styles.toolsGrid}>
          {tools.map((tool) => (
            <TouchableOpacity
              key={tool.id}
              style={[
                styles.toolCard,
                tool.disabled && styles.toolCardDisabled,
                { backgroundColor: tool.backgroundColor },
              ]}
              onPress={tool.onPress}
              disabled={tool.disabled}
              activeOpacity={0.7}
            >
              <View style={styles.toolHeader}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: tool.color },
                  ]}
                >
                  <Ionicons
                    name={tool.icon}
                    size={24}
                    color="white"
                  />
                </View>
                {tool.disabled && (
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>Próximamente</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.toolContent}>
                <Text
                  style={[
                    styles.toolTitle,
                    tool.disabled && styles.toolTitleDisabled,
                  ]}
                >
                  {tool.title}
                </Text>
                <Text
                  style={[
                    styles.toolDescription,
                    tool.disabled && styles.toolDescriptionDisabled,
                  ]}
                >
                  {tool.description}
                </Text>
              </View>

              {!tool.disabled && (
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={tool.color}
                  style={styles.chevronIcon}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#2563EB" />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>¿Necesitas más herramientas?</Text>
              <Text style={styles.infoDescription}>
                Seguimos agregando nuevas utilidades para facilitar tu gestión financiera.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 22,
  },
  toolsGrid: {
    gap: 16,
    marginBottom: 30,
  },
  toolCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toolCardDisabled: {
    opacity: 0.6,
  },
  toolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  toolContent: {
    marginBottom: 12,
  },
  toolTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  toolTitleDisabled: {
    color: '#64748b',
  },
  toolDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  toolDescriptionDisabled: {
    color: '#94a3b8',
  },
  chevronIcon: {
    alignSelf: 'flex-end',
  },
  infoSection: {
    marginTop: 20,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
});