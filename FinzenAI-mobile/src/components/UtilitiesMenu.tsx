import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface UtilitiesMenuProps {
  color: string;
  focused: boolean;
}

const UtilitiesMenu: React.FC<UtilitiesMenuProps> = ({ color, focused }) => {
  const [isVisible, setIsVisible] = useState(false);
  const navigation = useNavigation<any>();
  
  const utilities = [
    {
      id: 'loan-calculator',
      title: 'Calculadora de Préstamos',
      description: 'Calcula cuotas y amortización',
      icon: 'calculator' as const,
      color: '#2563EB',
      onPress: () => {
        setIsVisible(false);
        // Navegar directamente al LoanCalculator dentro del stack de Tools
        navigation.navigate('LoanCalculator');
      },
    },
    {
      id: 'investment-calculator',
      title: 'Calculadora de ROI',
      description: 'Próximamente',
      icon: 'trending-up' as const,
      color: '#059669',
      disabled: true,
      onPress: () => {},
    },
    {
      id: 'currency-converter',
      title: 'Conversor de Monedas',
      description: 'Próximamente',
      icon: 'cash' as const,
      color: '#d97706',
      disabled: true,
      onPress: () => {},
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
      <TouchableOpacity onPress={openMenu} style={styles.plusButton}>
        <Ionicons 
          name="add-circle" 
          size={28} 
          color={focused ? color : '#9CA3AF'} 
        />
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

            <View style={styles.utilitiesList}>
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
                    <Text
                      style={[
                        styles.utilityTitle,
                        utility.disabled && styles.utilityTitleDisabled,
                      ]}
                    >
                      {utility.title}
                    </Text>
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
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={utility.color}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  plusButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
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
    paddingBottom: 34, // Safe area para iPhone
    maxHeight: '60%',
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
});

export default UtilitiesMenu;