import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { goalsAPI } from '../../utils/api';

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  category: {
    icon: string;
    name: string;
  };
}

interface ContributionFormProps {
  visible: boolean;
  goal: Goal;
  onClose: () => void;
  onSuccess: () => void;
}

const ContributionForm: React.FC<ContributionFormProps> = ({
  visible,
  goal,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const formatCurrency = (amount: number): string => {
    return `$${amount.toLocaleString('es-ES')}`;
  };

  const calculateRemaining = () => {
    return goal.targetAmount - goal.currentAmount;
  };

  const formatAmount = (value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, '');
    return numericValue;
  };

  const handleSubmit = async () => {
    const contributionAmount = parseFloat(amount);
    
    if (!contributionAmount || contributionAmount <= 0) {
      Alert.alert('Error', 'El monto debe ser mayor a 0');
      return;
    }

    if (contributionAmount > calculateRemaining()) {
      Alert.alert('Error', 'La contribución excedería el monto objetivo de la meta');
      return;
    }

    try {
      setLoading(true);
      
      await goalsAPI.contribute(goal.id, {
        amount: contributionAmount
      });
      
      Alert.alert('Éxito', 'Contribución añadida correctamente');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error al añadir contribución:', error);
      const errorMessage = error.response?.data?.message || 'Error al añadir la contribución';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const remaining = calculateRemaining();
  const progress = ((goal.currentAmount / goal.targetAmount) * 100);
  const progressColor = progress >= 80 ? '#10B981' : progress >= 50 ? '#F59E0B' : '#3B82F6';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
          <Text style={styles.title}>Añadir Contribución</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          {/* Goal Info */}
          <View style={styles.goalInfo}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalIcon}>{goal.category.icon}</Text>
              <View style={styles.goalDetails}>
                <Text style={styles.goalName}>{goal.name}</Text>
                <Text style={styles.goalCategory}>{goal.category.name}</Text>
              </View>
            </View>
          </View>

          {/* Progress Current */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progreso actual</Text>
              <Text style={styles.progressPercentage}>{progress.toFixed(1)}%</Text>
            </View>
            
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress}%`, backgroundColor: progressColor },
                  ]}
                />
              </View>
            </View>
            
            <View style={styles.progressAmounts}>
              <Text style={styles.progressAmount}>{formatCurrency(goal.currentAmount)} ahorrado</Text>
              <Text style={styles.progressTarget}>{formatCurrency(goal.targetAmount)} meta</Text>
            </View>
          </View>

          {/* Contribution Form */}
          <View style={styles.formSection}>
            <Text style={styles.label}>Monto de contribución</Text>
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={(text) => setAmount(formatAmount(text))}
                placeholder="0"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
            </View>
            <Text style={styles.maxAmount}>
              Máximo disponible: {formatCurrency(remaining)}
            </Text>
          </View>

          {/* Contribution Preview */}
          {amount && parseFloat(amount) > 0 && (
            <View style={styles.previewSection}>
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>Vista previa</Text>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Nuevo progreso:</Text>
                  <Text style={styles.previewValue}>
                    {((goal.currentAmount + parseFloat(amount)) / goal.targetAmount * 100).toFixed(1)}%
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Restante después:</Text>
                  <Text style={styles.previewValue}>
                    {formatCurrency(remaining - parseFloat(amount))}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>

          <LinearGradient
            colors={['#2563EB', '#1d4ed8']}
            style={[styles.saveButton, loading && styles.disabledButton]}
          >
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading || !amount || parseFloat(amount) <= 0}
              style={styles.saveButtonInner}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="white" />
                  <Text style={styles.saveButtonText}>Añadir Contribución</Text>
                </>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  goalInfo: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalIcon: {
    fontSize: 24,
  },
  goalDetails: {
    flex: 1,
  },
  goalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  goalCategory: {
    fontSize: 12,
    color: '#64748b',
  },
  progressSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressAmount: {
    fontSize: 12,
    color: '#64748b',
  },
  progressTarget: {
    fontSize: 12,
    color: '#64748b',
  },
  formSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  maxAmount: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },
  previewSection: {
    marginBottom: 20,
  },
  previewCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 12,
    color: '#1e40af',
  },
  previewValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
  },
  saveButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  disabledButton: {
    opacity: 0.7,
  },
});

export default ContributionForm;