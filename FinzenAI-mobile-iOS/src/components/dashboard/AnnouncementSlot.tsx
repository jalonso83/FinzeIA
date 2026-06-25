// AnnouncementSlot — espacio dinámico en el tope del dashboard.
//
// Se expande cuando hay un mensaje activo y NO ocupa espacio (return null)
// cuando no lo hay. Pinta título + cuerpo + botón CTA opcional + ✕ descartable.
//
// El contrato `SlotMessage` es el mismo que viajará en el `data` del broadcast
// (surface: 'slot'), así el backend podrá empujar mensajes/CTAs sin actualizar
// la app. El destino del botón (`cta.action`) se resuelve con un Action Registry
// (whitelist): un `action` desconocido NO navega (botón oculto), de modo que un
// server nuevo nunca crashea una app vieja.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscriptionStore } from '../../stores/subscriptionStore';

export interface SlotMessage {
  id: string;                          // único; se usa para recordar descartes
  variant?: 'info' | 'promo' | 'success' | 'warning';
  icon?: string;                       // emoji opcional
  title: string;
  body?: string;
  cta?: { label: string; action: string; params?: Record<string, any> };
  dismissible?: boolean;
  priority?: number;                   // mayor gana si coinciden varios
}

const VARIANT_STYLES = {
  info:    { bg: '#eff6ff', border: '#bfdbfe', accent: '#2563EB' },
  promo:   { bg: '#ecfdf5', border: '#a7f3d0', accent: '#059669' },
  success: { bg: '#ecfdf5', border: '#a7f3d0', accent: '#059669' },
  warning: { bg: '#fffbeb', border: '#fde68a', accent: '#d97706' },
} as const;

// Rutas a las que el slot sabe navegar. Whitelist explícita por seguridad.
const KNOWN_ACTIONS = ['Transactions', 'Budgets', 'Goals', 'Dashboard', 'Subscriptions'];

// Habilitar LayoutAnimation en Android (animación suave al expandir/colapsar).
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DISMISSED_KEY = '@finzen/announcement_dismissed';

interface Props {
  messages?: SlotMessage[];
}

export default function AnnouncementSlot({ messages = [] }: Props) {
  const navigation = useNavigation<any>();
  const { openPlansModal } = useSubscriptionStore();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  // Cargar ids ya descartados una sola vez.
  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY)
      .then((raw) => { if (raw) setDismissed(JSON.parse(raw)); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  // Action Registry: traduce el `action` (string del server) a navegación real.
  const runAction = useCallback((action: string, params?: Record<string, any>) => {
    switch (action) {
      case 'Transactions':
      case 'Budgets':
      case 'Goals':
      case 'Dashboard':
        navigation.navigate(action, params);
        break;
      case 'Subscriptions':
        openPlansModal();
        break;
      default:
        break; // acción desconocida → no-op seguro
    }
  }, [navigation, openPlansModal]);

  const isKnownAction = (action?: string) => !!action && KNOWN_ACTIONS.includes(action);

  // Mensaje activo de mayor prioridad, excluyendo descartados.
  const active = (messages || [])
    .filter((m) => !dismissed.includes(m.id))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];

  if (!ready || !active) return null; // ← cero espacio cuando no hay mensaje

  const variant = VARIANT_STYLES[active.variant ?? 'info'];

  const dismiss = async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = [...dismissed, active.id];
    setDismissed(next);
    try { await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(next)); } catch {}
  };

  const showCta = active.cta && isKnownAction(active.cta.action);

  return (
    <View style={[styles.card, { backgroundColor: variant.bg, borderColor: variant.border }]}>
      <View style={styles.row}>
        {active.icon ? <Text style={styles.icon}>{active.icon}</Text> : null}
        <View style={styles.content}>
          <Text style={styles.title}>{active.title}</Text>
          {active.body ? <Text style={styles.body}>{active.body}</Text> : null}
          {showCta ? (
            <TouchableOpacity
              style={[styles.ctaButton, { backgroundColor: variant.accent }]}
              onPress={() => runAction(active.cta!.action, active.cta!.params)}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaText}>{active.cta!.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </View>
        {active.dismissible ? (
          <TouchableOpacity onPress={dismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={20} color="#94a3b8" />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  icon: {
    fontSize: 24,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  body: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 12,
  },
  ctaText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
