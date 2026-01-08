import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import UpgradeModal from './subscriptions/UpgradeModal';

interface UtilitiesMenuProps {
  color: string;
  focused: boolean;
}

const UtilitiesMenu: React.FC<UtilitiesMenuProps> = ({ color, focused }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const navigation = useNavigation<any>();
  const { hasAdvancedCalculators, isFreePlan } = useSubscriptionStore();

  const canAccessSkipVsSave = hasAdvancedCalculators();

  const utilities = [
    {
      id: 'referrals',
      title: 'Invitar Amigos',
      description: 'Gana meses gratis por referidos 🎁',
      icon: 'gift' as const,
      color: '#10B981',
      disabled: false,
      onPress: () => {
        setIsVisible(false);
        setTimeout(() => {
          navigation.navigate('Tools', { screen: 'Referrals' });
        }, 100);
      },
    },
    {
      id: 'payment-reminders',
      title: 'Recordatorios de Pago',
      description: 'No olvides tus pagos importantes 🔔',
      icon: 'notifications' as const,
      color: '#2563EB',
      disabled: false,
      onPress: () => {
        setIsVisible(false);
        setTimeout(() => {
          navigation.navigate('Tools', { screen: 'Reminders' });
        }, 100);
      },
    },
    {
      id: 'skip-vs-save',
      title: 'Reto: ¿Gastar o Ahorrar?',
      description: 'Ve el impacto de tus gastos 💸',
      icon: 'flash' as const,
      color: '#059669',
      disabled: false,
      isPremiumFeature: true,
      onPress: () => {
        if (canAccessSkipVsSave) {
          setIsVisible(false);
          setTimeout(() => {
            navigation.navigate('Tools', { screen: 'SkipVsSave' });
          }, 100);
        } else {
          setIsVisible(false);
          setTimeout(() => {
            setShowUpgradeModal(true);
          }, 100);
        }
      },
    },
    {
      id: 'goal-calculator',
      title: 'Calculadora de Metas',
      description: 'Planifica tus objetivos 🎯',
      icon: 'flag' as const,
      color: '#059669',
      disabled: false,
      onPress: () => {
        setIsVisible(false);
        setTimeout(() => {
          navigation.navigate('Tools', { screen: 'GoalCalculator' });
        }, 100);
      },
    },
    {
      id: 'loan-calculator',
      title: 'Calculadora de Préstamos',
      description: 'Calcula cuotas y amortización',
      icon: 'calculator' as const,
      color: '#2563EB',
      onPress: () => {
        setIsVisible(false);
        setTimeout(() => {
          navigation.navigate('Tools', { screen: 'LoanCalculator' });
        }, 100);
      },
    },
    {
      id: 'investment-calculator',
      title: 'Simulador de Inversión',
      description: 'Ve tu futuro financiero 🚀',
      icon: 'trending-up' as const,
      color: '#2563EB',
      disabled: false,
      onPress: () => {
        setIsVisible(false);
        setTimeout(() => {
          navigation.navigate('Tools', { screen: 'InvestmentSimulator' });
        }, 100);
      },
    },
    {
      id: 'inflation-calculator',
      title: 'Calculadora de Inflación',
      description: 'Ve cómo se destruye tu dinero 📈',
      icon: 'trending-up' as const,
      color: '#ef4444',
      disabled: false,
      onPress: () => {
        setIsVisible(false);
        setTimeout(() => {
          navigation.navigate('Tools', { screen: 'InflationCalculator' });
        }, 100);
      },
    },
    {
      id: 'ant-expense-detective',
      title: 'Detective de Gastos Hormiga',
      description: 'Descubre a dónde se va tu dinero 🕵️',
      icon: 'search' as const,
      color: '#2563EB',
      disabled: false,
      onPress: () => {
        setIsVisible(false);
        setTimeout(() => {
          navigation.navigate('Tools', { screen: 'AntExpenseDetective' });
        }, 100);
      },
    },
  ];

  const openMenu = () => {
    setIsVisible(true);
  };

  const closeMenu = () => {
    setIsVisible(false);
  };

  return (
    <>
      <TouchableOpacity onPress={openMenu} style={styles.tabButton}>
        <Ionicons
          name="add-circle"
          size={24}
          color={focused ? color : '#9CA3AF'}
        />
        <Text style={[styles.tabLabel, { color: focused ? color : '#9CA3AF' }]}>
          Más
        </Text>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeMenu}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Utilidades</Text>
              <TouchableOpacity onPress={closeMenu} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.utilitiesList}
              contentContainerStyle={styles.utilitiesListContent}
              showsVerticalScrollIndicator={false}
            >
              {utilities.map((utility) => (
                <TouchableOpacity
                  key={utility.id}
                  style={[
                    styles.utilityItem,
                    utility.disabled && styles.utilityItemDisabled,
                  ]}
                  onPress={utility.onPress}
                  disabled={utility.disabled}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.utilityIcon,
                      { backgroundColor: utility.color },
                      utility.disabled && styles.utilityIconDisabled,
                    ]}
                  >
                    <Ionicons
                      name={utility.icon}
                      size={20}
                      color="white"
                    />
                  </View>

                  <View style={styles.utilityContent}>
                    <View style={styles.titleRow}>
                      <Text
                        style={[
                          styles.utilityTitle,
                          utility.disabled && styles.utilityTitleDisabled,
                        ]}
                      >
                        {utility.title}
                      </Text>
                      {(utility as any).isPremiumFeature && isFreePlan() && (
                        <View style={styles.plusBadge}>
                          <Text style={styles.plusBadgeText}>PLUS</Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.utilityDescription,
                        utility.disabled && styles.utilityDescriptionDisabled,
                      ]}
                    >
                      {utility.description}
                    </Text>
                  </View>

                  {!utility.disabled && (
                    (utility as any).isPremiumFeature && isFreePlan() ? (
                      <Ionicons
                        name="lock-closed"
                        size={16}
                        color="#D97706"
                      />
                    ) : (
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={utility.color}
                      />
                    )
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        limitType="advancedCalculators"
      />
    </>
  );
};

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    maxHeight: '75%',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  utilitiesList: {
    maxHeight: 350,
  },
  utilitiesListContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  utilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    gap: 12,
  },
  utilityItemDisabled: {
    opacity: 0.6,
  },
  utilityIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  utilityIconDisabled: {
    backgroundColor: '#9ca3af',
  },
  utilityContent: {
    flex: 1,
  },
  utilityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  utilityTitleDisabled: {
    color: '#64748b',
  },
  utilityDescription: {
    fontSize: 12,
    color: '#64748b',
  },
  utilityDescriptionDisabled: {
    color: '#9ca3af',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  plusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
});

export default UtilitiesMenu;
