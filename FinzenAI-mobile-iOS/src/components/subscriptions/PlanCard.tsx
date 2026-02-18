import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Plan, SubscriptionPlan, BillingPeriod } from '../../types/subscription';

interface PlanCardProps {
  plan: Plan;
  currentPlan: SubscriptionPlan;
  onSelect: (planId: SubscriptionPlan) => void;
  disabled?: boolean;
  billingPeriod?: BillingPeriod;
  rcPriceString?: string;       // Precio formateado de App Store (e.g. "$4.99")
  rcYearlyPriceNum?: number;    // Precio numérico anual de RC (para calcular equivalente mensual)
}

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  currentPlan,
  onSelect,
  disabled = false,
  billingPeriod = 'monthly',
  rcPriceString,
  rcYearlyPriceNum,
}) => {
  // Defensive checks for plan data
  if (!plan || !plan.id) {
    return null;
  }

  const isCurrentPlan = plan.id === currentPlan;
  const isFree = plan.id === 'FREE';
  const isPremium = plan.id === 'PREMIUM';
  const isPro = plan.id === 'PRO';

  // Defensive defaults - price es un objeto {monthly, yearly}
  const planPrice = typeof plan.price === 'object' && plan.price !== null
    ? (billingPeriod === 'yearly' ? (plan.price.yearly ?? 0) : (plan.price.monthly ?? 0))
    : (typeof plan.price === 'number' ? plan.price : 0);
  const monthlyEquivalent = billingPeriod === 'yearly' && typeof plan.price === 'object' && plan.price !== null
    ? (plan.price.yearly ?? 0) / 12
    : 0;
  const periodText = billingPeriod === 'yearly' ? '/año' : '/mes';
  const planFeatures = Array.isArray(plan.features) ? plan.features : [];

  // Colores según el plan
  const getColors = () => {
    if (isPro) {
      return {
        primary: '#1E40AF',
        secondary: '#DBEAFE',
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
          <Text style={styles.currentBadgeText}>Plan Actual</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.icon}>{colors.icon}</Text>
        <Text style={styles.planName}>{plan.name}</Text>
      </View>

      {/* Precio */}
      <View style={styles.priceContainer}>
        {rcPriceString ? (
          <Text style={styles.rcPriceText}>{rcPriceString}</Text>
        ) : (
          <>
            <Text style={styles.currency}>$</Text>
            <Text style={styles.price}>{planPrice.toFixed(2)}</Text>
          </>
        )}
        {!isFree && <Text style={styles.period}>{periodText}</Text>}
      </View>

      {/* Equivalente mensual para plan anual */}
      {!isFree && billingPeriod === 'yearly' && (rcYearlyPriceNum || monthlyEquivalent) > 0 && (
        <Text style={styles.monthlyEquivalent}>
          Solo ${(rcYearlyPriceNum ? rcYearlyPriceNum / 12 : monthlyEquivalent).toFixed(2)}/mes
        </Text>
      )}

      {/* Trial (solo para planes de pago) */}
      {!isFree && (
        <View style={styles.trialContainer}>
          <Ionicons name="gift-outline" size={14} color={colors.primary} />
          <Text style={[styles.trialText, { color: colors.primary }]}>
            7 días de prueba gratis
          </Text>
        </View>
      )}

      {/* Features */}
      <View style={styles.featuresContainer}>
        {planFeatures.map((feature, index) => (
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
            {disabled ? 'Procesando...' : 'Seleccionar Plan'}
          </Text>
        </TouchableOpacity>
      )}

      {isCurrentPlan && !isFree && (
        <View style={[styles.currentButton, { borderColor: colors.primary }]}>
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          <Text style={[styles.currentButtonText, { color: colors.primary }]}>
            Activo
          </Text>
        </View>
      )}

      {isFree && isCurrentPlan && (
        <View style={styles.freeInfo}>
          <Text style={styles.freeInfoText}>Tu plan actual</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  currentBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
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
  rcPriceText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1F2937',
  },
  period: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 4,
  },
  monthlyEquivalent: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    marginBottom: 8,
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
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
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
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
