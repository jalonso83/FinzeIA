import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Plan, SubscriptionPlan } from '../../types/subscription';

interface PlanCardProps {
  plan: Plan;
  currentPlan: SubscriptionPlan;
  onSelect: (planId: SubscriptionPlan) => void;
  disabled?: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  currentPlan,
  onSelect,
  disabled = false,
}) => {
  const isCurrentPlan = plan.id === currentPlan;
  const isFree = plan.id === 'FREE';
  const isPremium = plan.id === 'PREMIUM';
  const isPro = plan.id === 'PRO';

  // Colores según el plan
  const getColors = () => {
    if (isPro) {
      return {
        primary: '#8B5CF6',
        secondary: '#F3EEFF',
        icon: '💎',
      };
    }
    if (isPremium) {
      return {
        primary: '#F59E0B',
        secondary: '#FEF3C7',
        icon: '👑',
      };
    }
    return {
      primary: '#6B7280',
      secondary: '#F3F4F6',
      icon: '🆓',
    };
  };

  const colors = getColors();

  // Estilo del card según estado
  const cardStyle: ViewStyle = {
    ...styles.card,
    borderColor: isCurrentPlan ? colors.primary : '#E5E5E5',
    borderWidth: isCurrentPlan ? 2 : 1,
    backgroundColor: isCurrentPlan ? colors.secondary : '#fff',
  };

  return (
    <View style={cardStyle}>
      {/* Badge de plan actual */}
      {isCurrentPlan && (
        <View style={[styles.currentBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.currentBadgeText}>Current Plan</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.icon}>{colors.icon}</Text>
        <Text style={styles.planName}>{plan.name}</Text>
      </View>

      {/* Precio */}
      <View style={styles.priceContainer}>
        <Text style={styles.currency}>$</Text>
        <Text style={styles.price}>{plan.price.toFixed(2)}</Text>
        {!isFree && <Text style={styles.period}>/month</Text>}
      </View>

      {/* Trial (solo para planes de pago) */}
      {!isFree && (
        <>
          <View style={styles.trialContainer}>
            <Ionicons name="gift-outline" size={14} color={colors.primary} />
            <Text style={[styles.trialText, { color: colors.primary }]}>
              7 days free trial
            </Text>
          </View>
          <View style={styles.realPaymentNotice}>
            <Ionicons name="card-outline" size={12} color="#6B7280" />
            <Text style={styles.realPaymentText}>
              Real card required • Charges apply after trial
            </Text>
          </View>
        </>
      )}

      {/* Features */}
      <View style={styles.featuresContainer}>
        {plan.features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={colors.primary}
            />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      {/* Botón de acción */}
      {!isCurrentPlan && !isFree && (
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.primary },
            disabled && styles.buttonDisabled,
          ]}
          onPress={() => onSelect(plan.id)}
          disabled={disabled}
        >
          <Text style={styles.buttonText}>
            {disabled ? 'Processing...' : 'Select Plan'}
          </Text>
        </TouchableOpacity>
      )}

      {isCurrentPlan && !isFree && (
        <View style={[styles.button, styles.currentButton]}>
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          <Text style={[styles.currentButtonText, { color: colors.primary }]}>
            Active
          </Text>
        </View>
      )}

      {isFree && !isCurrentPlan && (
        <View style={styles.freeInfo}>
          <Text style={styles.freeInfoText}>Your current plan</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
  },
  currentBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  icon: {
    fontSize: 28,
  },
  planName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  currency: {
    fontSize: 24,
    fontWeight: '600',
    color: '#374151',
  },
  price: {
    fontSize: 40,
    fontWeight: '700',
    color: '#1F2937',
  },
  period: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 4,
  },
  trialContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
  },
  trialText: {
    fontSize: 13,
    fontWeight: '600',
  },
  realPaymentNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  realPaymentText: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  featuresContainer: {
    marginBottom: 20,
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  currentButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    flexDirection: 'row',
    gap: 6,
  },
  currentButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  freeInfo: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  freeInfoText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});

export default PlanCard;
