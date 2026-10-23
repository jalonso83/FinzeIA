import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { sharedAPI, VistaInvitacion } from '../../utils/api';
import { useCurrency } from '../../hooks/useCurrency';
import { sheet, mensajeDeError, montoEn } from './sharedUi';
import { logger } from '../../utils/logger';
import { useSharedStore } from '../../stores/sharedStore';
import { useDashboardStore } from '../../stores/dashboard';

interface Props {
  visible: boolean;
  /** Código ya conocido (enlace o invitación pendiente). '' = pedirlo. */
  codigoInicial: string;
  onClose: () => void;
  /** Se unió: el que abrió esto recarga y lleva a la pestaña que toca. */
  onAceptada: (kind: 'BUDGET' | 'GOAL') => void;
}

type Paso =
  | { tipo: 'escribir' }
  | { tipo: 'cargando' }
  | { tipo: 'ver'; vista: VistaInvitacion }
  | { tipo: 'hecho'; vista: VistaInvitacion };

const LARGO_CODIGO = 6;

function limpiar(codigo: string) {
  return codigo.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, LARGO_CODIGO);
}

/** Por qué no se puede entrar, dicho para la persona. null = sí se puede. */
function bloqueo(v: VistaInvitacion): string | null {
  const cosa = v.kind === 'GOAL' ? 'Esta meta' : 'Este presupuesto';
  if (v.esDueno) return v.kind === 'GOAL' ? 'Esta meta es tuya: la invitación es para otra persona.' : 'Este presupuesto es tuyo: la invitación es para otra persona.';
  if (v.yaEsMiembro) return `Ya estás en ${v.kind === 'GOAL' ? 'esta meta' : 'este presupuesto'}.`;
  switch (v.estado) {
    case 'vencida': return `Esta invitación venció. Pídele a ${v.dueno} una nueva.`;
    case 'usada': return `Esta invitación ya se usó. Pídele a ${v.dueno} una nueva.`;
    case 'revocada': return `${v.dueno} canceló esta invitación.`;
    case 'cerrada': return `${cosa} ya no se comparte.`;
    case 'pausada': return `${cosa} está en pausa por ahora. Pídele a ${v.dueno} que te avise cuando vuelva.`;
    case 'llena': return `${cosa} ya tiene ${v.maxMiembros} personas, que es el máximo.`;
  }
  return v.conflicto;
}

export default function AceptarInvitacionModal({ visible, codigoInicial, onClose, onAceptada }: Props) {
  const { formatCurrency } = useCurrency();
  const [codigo, setCodigo] = useState('');
  const [paso, setPaso] = useState<Paso>({ tipo: 'escribir' });
  const [error, setError] = useState<string | null>(null);
  const [aceptando, setAceptando] = useState(false);

  const buscar = useCallback(async (code: string) => {
    const limpio = limpiar(code);
    if (limpio.length < LARGO_CODIGO) {
      setError(`El código tiene ${LARGO_CODIGO} letras y números.`);
      return;
    }
    setError(null);
    setPaso({ tipo: 'cargando' });
    try {
      const { data } = await sharedAPI.verInvitacion(limpio);
      setPaso({ tipo: 'ver', vista: data });
    } catch (e: any) {
      logger.error('[Compartidos] Error viendo invitación:', e);
      setError(mensajeDeError(e, 'No pudimos revisar ese código.'));
      setPaso({ tipo: 'escribir' });
    }
  }, []);

  // Cada vez que se abre arranca limpio; si ya viene el código, se busca directo.
  useEffect(() => {
    if (!visible) return;
    const inicial = limpiar(codigoInicial || '');
    setCodigo(inicial);
    setError(null);
    setAceptando(false);
    if (inicial.length === LARGO_CODIGO) {
      buscar(inicial);
    } else {
      setPaso({ tipo: 'escribir' });
    }
  }, [visible, codigoInicial, buscar]);

  // Es una capa, no un <Modal>: sin esto el botón "atrás" de Android saldría de
  // la pantalla de abajo en vez de cerrar la invitación.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!aceptando) onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, aceptando, onClose]);

  const aceptar = async (vista: VistaInvitacion) => {
    setAceptando(true);
    setError(null);
    try {
      await sharedAPI.aceptarInvitacion(vista.code);
      setPaso({ tipo: 'hecho', vista });
      // Refrescar YA: si cierra con la X en vez de "Ver…", las listas igual lo muestran.
      useSharedStore.getState().refrescarCompartidos();
      useDashboardStore.getState().refreshDashboard();
    } catch (e: any) {
      logger.error('[Compartidos] Error aceptando invitación:', e);
      setError(mensajeDeError(e, 'No pudimos unirte. Intenta de nuevo.'));
    } finally {
      setAceptando(false);
    }
  };

  const renderEscribir = () => (
    <View>
      <Text style={styles.lead}>Escribe el código que te mandaron para unirte a un presupuesto o una meta compartida.</Text>
      <TextInput
        style={styles.codeInput}
        value={codigo}
        onChangeText={(t) => { setCodigo(limpiar(t)); setError(null); }}
        placeholder="ABC123"
        placeholderTextColor="#cbd5e1"
        autoCapitalize="characters"
        autoCorrect={false}
        // Solo si la abrió la persona sin código: llegada por un enlace roto con
        // otra ventana encima, el teclado saldría sobre esa ventana.
        autoFocus={!codigoInicial}
        maxLength={LARGO_CODIGO}
        returnKeyType="go"
        onSubmitEditing={() => buscar(codigo)}
      />
      {error && (
        <View style={sheet.errorBox}><Text style={sheet.errorText}>{error}</Text></View>
      )}
      <TouchableOpacity
        style={[sheet.primaryButton, codigo.length < LARGO_CODIGO && sheet.disabled]}
        onPress={() => buscar(codigo)}
        disabled={codigo.length < LARGO_CODIGO}
      >
        <Text style={sheet.primaryButtonText}>Continuar</Text>
      </TouchableOpacity>
    </View>
  );

  const renderVer = (v: VistaInvitacion) => {
    const motivo = bloqueo(v);
    const esMeta = v.kind === 'GOAL';
    const nombre = esMeta ? v.meta?.nombre : v.presupuesto?.nombre;
    const icono = esMeta ? v.meta?.categoria?.icon : v.presupuesto?.categoria?.icon;
    return (
      <View>
        <View style={[sheet.card, styles.hero]}>
          <Text style={styles.heroIcon}>{icono || (esMeta ? '🎯' : '💰')}</Text>
          <Text style={styles.heroTitle}>
            {esMeta
              ? `${v.dueno} te invita a ahorrar juntos para «${nombre ?? 'una meta'}»`
              : `${v.dueno} te invita a llevar juntos «${nombre ?? 'un presupuesto'}»`}
          </Text>
          {!esMeta && v.presupuesto && (
            <Text style={sheet.muted}>
              {v.presupuesto.categoria?.name} · límite {montoEn(v.presupuesto.monto, v.moneda, formatCurrency)}
            </Text>
          )}
          {esMeta && v.meta && (
            <Text style={sheet.muted}>
              Van {montoEn(v.meta.ahorrado, v.moneda, formatCurrency)} de {montoEn(v.meta.objetivo, v.moneda, formatCurrency)}
            </Text>
          )}
          <Text style={[sheet.muted, styles.miembros]}>
            {v.miembros === 1 ? 'Por ahora solo está ' + v.dueno : `Ya son ${v.miembros} personas`} · máximo {v.maxMiembros}
          </Text>
        </View>

        {motivo ? (
          <>
            <View style={sheet.infoBox}><Text style={sheet.infoText}>{motivo}</Text></View>
            <TouchableOpacity style={sheet.secondaryButton} onPress={onClose}>
              <Text style={sheet.secondaryButtonText}>Entendido</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={sheet.card}>
              <Text style={sheet.sectionTitle}>Lo que aceptas</Text>
              <Text style={styles.acuerdo}>{v.acuerdo}</Text>
            </View>
            {error && (
              <View style={sheet.errorBox}><Text style={sheet.errorText}>{error}</Text></View>
            )}
            <TouchableOpacity
              style={[sheet.primaryButton, aceptando && sheet.disabled]}
              onPress={() => aceptar(v)}
              disabled={aceptando}
            >
              {aceptando ? <ActivityIndicator color="white" /> : <Text style={sheet.primaryButtonText}>Unirme</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkButton} onPress={onClose} disabled={aceptando}>
              <Text style={styles.linkText}>Ahora no</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  const renderHecho = (v: VistaInvitacion) => {
    const esMeta = v.kind === 'GOAL';
    const nombre = esMeta ? v.meta?.nombre : v.presupuesto?.nombre;
    return (
      <View style={styles.hechoBox}>
        <View style={styles.hechoIcon}>
          <Ionicons name="checkmark" size={36} color="#059669" />
        </View>
        <Text style={styles.heroTitle}>¡Listo! Ya estás en «{nombre}»</Text>
        <Text style={[sheet.muted, styles.centerText]}>
          {esMeta
            ? 'Lo encuentras en Metas, en "Compartidas conmigo". Ya puedes aportar.'
            : 'Lo encuentras en Presupuestos, en "Compartidos conmigo". Tus gastos de esa categoría ya suman ahí.'}
        </Text>
        <TouchableOpacity style={[sheet.primaryButton, styles.fullWidth]} onPress={() => onAceptada(v.kind)}>
          <Text style={sheet.primaryButtonText}>{esMeta ? 'Ver la meta' : 'Ver el presupuesto'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    // Capa a pantalla completa y NO un <Modal>: puede llegar por un enlace con
    // cualquier otra ventana abierta, y en iOS dos <Modal> a la vez traban la app.
    // Una capa nunca choca: si hay un formulario abierto, queda debajo de él y se
    // ve al cerrarlo.
    !visible ? null : (
    <View style={styles.capa}>
      <SafeAreaView style={sheet.container} edges={['top', 'bottom']}>
        <View style={sheet.header}>
          <TouchableOpacity onPress={onClose} style={sheet.closeButton} disabled={aceptando}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
          <Text style={sheet.title}>Invitación</Text>
          <View style={sheet.headerSpacer} />
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={sheet.content} keyboardShouldPersistTaps="handled">
            {paso.tipo === 'escribir' && renderEscribir()}
            {paso.tipo === 'cargando' && (
              <View style={styles.cargando}><ActivityIndicator size="large" color="#2563EB" /></View>
            )}
            {paso.tipo === 'ver' && renderVer(paso.vista)}
            {paso.tipo === 'hecho' && renderHecho(paso.vista)}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
    )
  );
}

const styles = StyleSheet.create({
  capa: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
    elevation: 2000,
  },
  lead: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 20,
  },
  codeInput: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#bfdbfe',
    borderRadius: 14,
    paddingVertical: 16,
    fontSize: 28,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  hero: {
    alignItems: 'center',
  },
  heroIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 8,
  },
  miembros: {
    marginTop: 6,
    fontSize: 13,
  },
  acuerdo: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
  },
  linkButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  linkText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '500',
  },
  cargando: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  hechoBox: {
    alignItems: 'center',
    paddingTop: 24,
  },
  hechoIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  centerText: {
    textAlign: 'center',
    marginBottom: 24,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
});
