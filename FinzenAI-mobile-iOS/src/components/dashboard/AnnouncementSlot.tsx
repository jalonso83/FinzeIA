// AnnouncementSlot — espacio dinámico en el tope del dashboard.
//
// Se expande cuando hay un mensaje activo y NO ocupa espacio (return null)
// cuando no lo hay. Pinta título + cuerpo + botón CTA opcional + ✕ descartable.
//
// Fuentes de mensajes (se mezclan, gana el de mayor `priority`):
//   1. LOCAL: reglas en cliente vía la prop `messages` (ej. CTA de 1ª transacción).
//   2. SERVER: campañas empujadas desde el panel admin (broadcast surface slot/both),
//      vía GET /api/announcements. Sus impresiones/clicks/descartes se reportan al
//      backend (POST /api/announcements/:id/event) para el funnel de medición.
//
// El destino del botón (`cta.action`) se resuelve con un Action Registry (whitelist):
// un `action` desconocido NO navega (botón oculto), de modo que un server nuevo nunca
// crashea una app vieja.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager, AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { announcementsAPI, h13API } from '../../utils/api';

export interface SlotMessage {
  id: string;                          // único; se usa para recordar descartes
  variant?: 'info' | 'promo' | 'success' | 'warning';
  icon?: string;                       // emoji opcional
  title: string;
  body?: string;
  cta?: { label: string; action: string; params?: Record<string, any> };
  // Botones interactivos (H13): varios botones que hacen POST y refrescan el estado,
  // en vez de un CTA de navegación. Si están presentes, se muestran en vez del cta.
  buttons?: { label: string; action: string; value: string }[];
  dismissible?: boolean;
  priority?: number;                   // mayor gana si coinciden varios
}

// id fijo del mensaje del reto H13 en el slot (para prioridad; no reporta eventos
// de announcements — su instrumentación vive en el backend).
const H13_MSG_ID = 'h13-challenge';

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
  const [serverMessages, setServerMessages] = useState<SlotMessage[]>([]);
  const [h13Message, setH13Message] = useState<SlotMessage | null>(null);
  // Guard de doble-tap: mientras un botón del reto está en vuelo, se ignoran taps.
  const h13Busy = useRef(false);
  const [h13Sending, setH13Sending] = useState(false);
  // "Latest-wins" para el fetch de H13: un refetch más viejo que la última acción
  // local no debe sobrescribir el estado (evita el parpadeo POST-vs-GET concurrentes).
  const h13Seq = useRef(0);

  // ids que vinieron del servidor → solo para esos reportamos eventos (los locales no).
  const serverIds = useRef<Set<string>>(new Set());
  // ids cuya impresión ya reportamos en esta sesión (evita re-postear).
  const impressed = useRef<Set<string>>(new Set());

  // Cargar ids ya descartados (local).
  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY)
      .then((raw) => { if (raw) setDismissed(JSON.parse(raw)); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  // Traer mensajes del servidor (campañas del slot). Best-effort: si falla, el slot
  // sigue mostrando los locales. Se refresca cada vez que el dashboard gana foco
  // (cambiar de tab y volver) y cuando la app vuelve a primer plano, así un mensaje
  // recién enviado aparece sin tener que reloguear.
  const loadServer = useCallback(async () => {
    try {
      const res = await announcementsAPI.list();
      const msgs: SlotMessage[] = (res.data?.messages ?? []).filter((m: any) => m && m.id && m.title);
      serverIds.current = new Set(msgs.map((m) => m.id));
      setServerMessages(msgs);
    } catch {}
  }, []);

  // H13 · traer el estado del reto y convertirlo en un mensaje del slot con botones.
  // Best-effort: si falla o el usuario no está en el brazo reto, no muestra nada.
  // Prioridad alta (200) para ganarle a campañas mientras el reto está activo.
  const loadH13 = useCallback(async () => {
    // No refrescar mientras hay una acción del usuario en vuelo (evita revertir el
    // paso local con un GET emitido antes de que el server procese el POST).
    if (h13Busy.current) return;
    const seq = ++h13Seq.current;
    try {
      const res = await h13API.getState();
      if (seq !== h13Seq.current || h13Busy.current) return; // llegó una acción más nueva → descartar
      const v = res.data;
      if (v?.view === 'offer' || v?.view === 'hour_picker') {
        setH13Message({
          id: H13_MSG_ID,
          variant: 'promo',
          icon: v.view === 'offer' ? '🔥' : '⏰',
          // El título viene del servidor para poder renombrar el reto sin build.
          // El respaldo cubre un backend viejo que todavía no mande el campo.
          title: v.title ?? (v.view === 'offer' ? 'Reto de Arranque' : '¿A qué hora te recuerdo?'),
          body: v.message,
          buttons: v.buttons,
          dismissible: false,
          priority: 200,
        });
      } else {
        setH13Message(null);
      }
    } catch { /* best-effort: mantener el estado actual */ }
  }, []);

  const loadAll = useCallback(() => { loadServer(); loadH13(); }, [loadServer, loadH13]);

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') loadAll(); });
    return () => sub.remove();
  }, [loadAll]);

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

  // Botones del reto H13: hacen POST al backend y refrescan el estado (flujo de 2
  // pasos oferta → selector de hora). Best-effort; nunca crashea.
  const runH13Button = useCallback(async (action: string, value: string) => {
    if (h13Busy.current) return;          // guard doble-tap
    h13Busy.current = true;
    setH13Sending(true);
    h13Seq.current++;                     // invalida cualquier refetch en vuelo
    try {
      if (action === 'h13_offer') {
        const res = await h13API.offer(value === 'accept' ? 'accept' : 'decline');
        const v = res.data;
        if (v?.view === 'hour_picker') {
          setH13Message({
            id: H13_MSG_ID, variant: 'promo', icon: '⏰',
            title: '¿A qué hora te recuerdo?', body: v.message, buttons: v.buttons,
            dismissible: false, priority: 200,
          });
        } else {
          setH13Message(null); // decline o none → el reto desaparece del slot
        }
      } else if (action === 'h13_hour') {
        await h13API.hour(Number(value));
        setH13Message(null); // hora elegida → reto arrancó, se cierra el slot
      } else if (action === 'h13_optout') {
        await h13API.optout();
        setH13Message(null);
      }
    } catch { /* best-effort: dejar el mensaje visible para reintentar */ }
    finally { h13Busy.current = false; setH13Sending(false); }
  }, []);

  // Mensaje activo de mayor prioridad, excluyendo descartados. Mezcla local + server + H13.
  const active = [...messages, ...serverMessages, ...(h13Message ? [h13Message] : [])]
    .filter((m) => !dismissed.includes(m.id))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];

  // Reportar impresión cuando se muestra un mensaje del servidor (una vez por id).
  useEffect(() => {
    if (!active) return;
    if (serverIds.current.has(active.id) && !impressed.current.has(active.id)) {
      impressed.current.add(active.id);
      announcementsAPI.trackEvent(active.id, 'impression').catch(() => {});
    }
  }, [active?.id]);

  if (!ready || !active) return null; // ← cero espacio cuando no hay mensaje

  // Fallback a 'info' si el server manda una variante desconocida (no crashear).
  const variant = VARIANT_STYLES[active.variant ?? 'info'] ?? VARIANT_STYLES.info;
  const isServer = serverIds.current.has(active.id);

  const onCtaPress = () => {
    if (isServer) announcementsAPI.trackEvent(active.id, 'click').catch(() => {});
    runAction(active.cta!.action, active.cta!.params);
  };

  const dismiss = async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = [...dismissed, active.id];
    setDismissed(next);
    if (isServer) announcementsAPI.trackEvent(active.id, 'dismiss').catch(() => {});
    try { await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(next)); } catch {}
  };

  const showCta = active.cta && isKnownAction(active.cta.action);
  const showButtons = !!active.buttons && active.buttons.length > 0;

  return (
    <View style={[styles.card, { backgroundColor: variant.bg, borderColor: variant.border }]}>
      <View style={styles.row}>
        {active.icon ? <Text style={styles.icon}>{active.icon}</Text> : null}
        <View style={styles.content}>
          <Text style={styles.title}>{active.title}</Text>
          {active.body ? <Text style={styles.body}>{active.body}</Text> : null}
          {showButtons ? (
            <View style={styles.buttonRow}>
              {active.buttons!.map((b, i) => (
                <TouchableOpacity
                  key={`${b.action}-${b.value}`}
                  style={[
                    styles.actionButton,
                    i === 0
                      ? { backgroundColor: variant.accent }
                      : { backgroundColor: '#fff', borderWidth: 1, borderColor: variant.border },
                    h13Sending && { opacity: 0.5 },
                  ]}
                  onPress={() => runH13Button(b.action, b.value)}
                  disabled={h13Sending}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.actionText, i === 0 ? { color: '#fff' } : { color: variant.accent }]}>
                    {b.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : showCta ? (
            <TouchableOpacity
              style={[styles.ctaButton, { backgroundColor: variant.accent }]}
              onPress={onCtaPress}
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
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
