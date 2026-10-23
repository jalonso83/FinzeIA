import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Share,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { sharedAPI, DetalleMetaCompartida, InvitacionCreada } from '../../utils/api';
import { useCurrency } from '../../hooks/useCurrency';
import { sheet, mensajeDeError, pideMejorarPlan, montoEn, fechaCorta } from './sharedUi';
import { logger } from '../../utils/logger';

const MAX_PERSONAS = 4;

interface Props {
  visible: boolean;
  goalId: string | null;
  nombre: string;
  soyDueno: boolean;
  /** Mía y todavía sin compartir: solo invitar. */
  sinCompartir: boolean;
  onClose: () => void;
  onCambio: () => void;
  onMejorarPlan: () => void;
  /** Aportar se hace con el formulario de siempre: la pantalla lo abre al cerrar esta hoja. */
  onAportar?: () => void;
}

type Confirmar =
  | { tipo: 'quitar'; userId: string; nombre: string }
  | { tipo: 'quitarAportes'; userId: string; nombre: string; aportado: number }
  | { tipo: 'dejar' }
  | { tipo: 'salir' }
  | null;

export default function MetaCompartidaModal({
  visible, goalId, nombre, soyDueno, sinCompartir, onClose, onCambio, onMejorarPlan, onAportar,
}: Props) {
  const { formatCurrency } = useCurrency();
  const [detalle, setDetalle] = useState<DetalleMetaCompartida | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mejorarPlan, setMejorarPlan] = useState(false);
  const [invitacion, setInvitacion] = useState<InvitacionCreada | null>(null);
  const [invitando, setInvitando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [confirmar, setConfirmar] = useState<Confirmar>(null);
  const [trabajando, setTrabajando] = useState(false);
  // Tras invitar por primera vez ya existe el compartido: hay detalle que cargar.
  const [recienCompartido, setRecienCompartido] = useState(false);
  const sinCompartirAhora = sinCompartir && !recienCompartido;

  const cargar = useCallback(async () => {
    if (!goalId || sinCompartirAhora) {
      setDetalle(null);
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const { data } = await sharedAPI.detalleMeta(goalId);
      setDetalle(data);
    } catch (e: any) {
      if (e?.response?.status === 404 && soyDueno) {
        setDetalle(null); // la dejó de compartir: queda como propia sin compartir
      } else {
        logger.error('[Compartidos] Error cargando meta compartida:', e);
        setError(mensajeDeError(e, 'No pudimos cargar la meta compartida.'));
      }
    } finally {
      setCargando(false);
    }
  }, [goalId, sinCompartirAhora, soyDueno]);

  useEffect(() => {
    if (!visible) return;
    setInvitacion(null);
    setConfirmar(null);
    setMejorarPlan(false);
    setCopiado(false);
    setRecienCompartido(false);
  }, [visible]);

  useEffect(() => {
    if (visible) cargar();
  }, [visible, cargar]);

  const moneda = detalle?.moneda;
  const monto = (n: number) => montoEn(n, moneda, formatCurrency);
  const miembros = detalle?.miembros ?? [];
  const lleno = miembros.length >= MAX_PERSONAS;

  const invitar = async () => {
    if (!goalId) return;
    setInvitando(true);
    setError(null);
    setMejorarPlan(false);
    try {
      const { data } = await sharedAPI.invitarMeta(goalId);
      setInvitacion(data);
      setRecienCompartido(true);
      onCambio();
    } catch (e: any) {
      logger.error('[Compartidos] Error invitando a meta:', e);
      setError(mensajeDeError(e, 'No pudimos crear la invitación.'));
      setMejorarPlan(pideMejorarPlan(e));
    } finally {
      setInvitando(false);
    }
  };

  const enviar = async () => {
    if (!invitacion) return;
    try {
      await Share.share({ message: invitacion.mensaje });
    } catch (e) {
      logger.error('[Compartidos] Error compartiendo invitación:', e);
    }
  };

  const copiar = async () => {
    if (!invitacion) return;
    await Clipboard.setStringAsync(invitacion.code);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const ejecutar = async () => {
    if (!confirmar || !detalle?.groupId || !goalId) return;
    setTrabajando(true);
    setError(null);
    try {
      if (confirmar.tipo === 'quitar') {
        await sharedAPI.quitarMiembro(detalle.groupId, confirmar.userId);
      } else if (confirmar.tipo === 'quitarAportes') {
        await sharedAPI.quitarAportesDeExMiembro(goalId, confirmar.userId);
      } else if (confirmar.tipo === 'dejar') {
        await sharedAPI.dejarDeCompartir(detalle.groupId);
      } else {
        await sharedAPI.salir(detalle.groupId);
      }
      onCambio();
      if (confirmar.tipo === 'dejar' || confirmar.tipo === 'salir') {
        onClose();
      } else {
        setConfirmar(null);
        await cargar();
      }
    } catch (e: any) {
      logger.error('[Compartidos] Error en acción de meta:', e);
      setError(mensajeDeError(e));
      setConfirmar(null);
    } finally {
      setTrabajando(false);
    }
  };

  const renderError = () => error && (
    <View style={sheet.errorBox}>
      <Text style={sheet.errorText}>{error}</Text>
      {mejorarPlan && (
        <TouchableOpacity style={styles.inlineLink} onPress={onMejorarPlan}>
          <Text style={styles.inlineLinkText}>Ver planes</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderConfirmar = () => {
    if (!confirmar) return null;
    const meta = detalle?.goal?.name ?? nombre;
    const textos =
      confirmar.tipo === 'quitar' ? {
        titulo: `¿Quitar a ${confirmar.nombre}?`,
        cuerpo: `${confirmar.nombre} deja de ver "${meta}". Lo que aportó se queda en la meta; después decides si lo quitas.`,
        boton: 'Quitar',
      } : confirmar.tipo === 'quitarAportes' ? {
        titulo: `¿Quitar los aportes de ${confirmar.nombre}?`,
        cuerpo: `Se restan ${monto(confirmar.aportado)} del total de "${meta}". ${confirmar.nombre} los puede seguir pasando a una meta suya.`,
        boton: 'Quitar aportes',
      } : confirmar.tipo === 'dejar' ? (miembros.length > 1 || detalle?.pausado ? {
        titulo: '¿Dejar de compartir?',
        cuerpo: 'Las demás personas dejan de verla. Lo que aportaron se queda en la meta y la meta sigue siendo tuya.',
        boton: 'Dejar de compartir',
      } : {
        titulo: '¿Cancelar la invitación?',
        cuerpo: 'El código deja de servir. Puedes invitar de nuevo cuando quieras.',
        boton: 'Cancelar la invitación',
      }) : {
        titulo: '¿Salir de esta meta?',
        cuerpo: 'Dejas de verla. Lo que aportaste se queda en la meta y, si quieres, lo puedes pasar a una meta tuya.',
        boton: 'Salir',
      };
    return (
      <View style={sheet.card}>
        <Text style={styles.confirmTitle}>{textos.titulo}</Text>
        <Text style={[sheet.muted, styles.confirmBody]}>{textos.cuerpo}</Text>
        <TouchableOpacity style={[sheet.dangerButton, trabajando && sheet.disabled]} onPress={ejecutar} disabled={trabajando}>
          {trabajando ? <ActivityIndicator color="#dc2626" /> : <Text style={sheet.dangerButtonText}>{textos.boton}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelar} onPress={() => setConfirmar(null)} disabled={trabajando}>
          <Text style={styles.cancelarText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderResumen = () => {
    const g = detalle?.goal;
    if (!g) return null;
    const pct = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
    return (
      <View style={sheet.card}>
        <Text style={styles.resumenNombre}>{g.category?.icon} {g.name}</Text>
        <View style={styles.barra}>
          <View style={[styles.barraFill, { width: `${pct}%` }]} />
        </View>
        <View style={styles.resumenFila}>
          <Text style={sheet.muted}>Van {monto(g.currentAmount)} de {monto(g.targetAmount)}</Text>
          <Text style={styles.pct}>{pct.toFixed(0)}%</Text>
        </View>
        {!detalle?.pausado && !g.isCompleted && onAportar && (
          <TouchableOpacity style={[sheet.primaryButton, styles.aportar]} onPress={onAportar}>
            <Ionicons name="add-circle-outline" size={20} color="white" />
            <Text style={sheet.primaryButtonText}>Aportar</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderInvitar = () => {
    if (!soyDueno) return null;
    if (invitacion) {
      return (
        <View style={sheet.card}>
          <Text style={sheet.sectionTitle}>Invitación lista</Text>
          <TouchableOpacity style={styles.codigoBox} onPress={copiar} activeOpacity={0.7}>
            <Text style={styles.codigo}>{invitacion.code}</Text>
            <Text style={styles.copiar}>{copiado ? '¡Copiado!' : 'Copiar'}</Text>
          </TouchableOpacity>
          <Text style={[sheet.muted, styles.vence]}>Vale para una persona y vence el {fechaCorta(invitacion.expiresAt)}.</Text>
          <TouchableOpacity style={sheet.primaryButton} onPress={enviar}>
            <Ionicons name="share-outline" size={20} color="white" />
            <Text style={sheet.primaryButtonText}>Enviar invitación</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (lleno) {
      return <View style={sheet.infoBox}><Text style={sheet.infoText}>Ya son {MAX_PERSONAS} personas, que es el máximo.</Text></View>;
    }
    return (
      <View style={sheet.card}>
        <Text style={sheet.sectionTitle}>{sinCompartirAhora || miembros.length <= 1 ? 'Ahorren juntos' : 'Invitar a alguien más'}</Text>
        <Text style={[sheet.muted, styles.explica]}>
          Cada quien aporta desde su celular y todos ven quién puso cuánto. Solo tú puedes cambiar el objetivo o borrarla.
        </Text>
        <TouchableOpacity style={[sheet.primaryButton, invitando && sheet.disabled]} onPress={invitar} disabled={invitando}>
          {invitando ? <ActivityIndicator color="white" /> : (
            <>
              <Ionicons name="person-add-outline" size={20} color="white" />
              <Text style={sheet.primaryButtonText}>Invitar a alguien</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderMiembros = () => (
    <View style={sheet.card}>
      <Text style={sheet.sectionTitle}>Quiénes están ({miembros.length} de {MAX_PERSONAS})</Text>
      {miembros.map((m, i) => (
        <View key={m.userId} style={[sheet.row, i === miembros.length - 1 && sheet.rowLast]}>
          <View style={{ flex: 1 }}>
            <Text style={sheet.rowTitle}>{m.nombre}{m.rol === 'OWNER' ? (' · la creó') : ''}</Text>
            <Text style={sheet.rowSubtitle}>Aportó {monto(m.aportado)}</Text>
          </View>
          {soyDueno && m.rol === 'MEMBER' && (
            <TouchableOpacity onPress={() => setConfirmar({ tipo: 'quitar', userId: m.userId, nombre: m.nombre })}>
              <Text style={styles.quitar}>Quitar</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );

  const renderExMiembros = () => {
    const ex = detalle?.exMiembros ?? [];
    if (!soyDueno || ex.length === 0) return null;
    return (
      <View style={sheet.card}>
        <Text style={sheet.sectionTitle}>Salieron, pero sus aportes siguen</Text>
        {ex.map((m, i) => (
          <View key={m.userId} style={[sheet.row, i === ex.length - 1 && sheet.rowLast]}>
            <View style={{ flex: 1 }}>
              <Text style={sheet.rowTitle}>{m.nombre}</Text>
              <Text style={sheet.rowSubtitle}>Aportó {monto(m.aportado)}</Text>
            </View>
            <TouchableOpacity onPress={() => setConfirmar({ tipo: 'quitarAportes', userId: m.userId, nombre: m.nombre, aportado: m.aportado })}>
              <Text style={styles.quitar}>Quitar aportes</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  const renderAportes = () => {
    const aportes = detalle?.aportes ?? [];
    return (
      <View style={sheet.card}>
        <Text style={sheet.sectionTitle}>Aportes</Text>
        {aportes.length === 0 ? (
          <Text style={sheet.muted}>Todavía no hay aportes.</Text>
        ) : aportes.map((a, i) => (
          <View key={a.id} style={[sheet.row, i === aportes.length - 1 && sheet.rowLast]}>
            <View style={{ flex: 1 }}>
              <Text style={sheet.rowTitle}>{a.mio ? 'Tú' : a.nombre}</Text>
              <Text style={sheet.rowSubtitle}>{fechaCorta(a.fecha)}</Text>
            </View>
            <Text style={sheet.rowAmount}>{monto(a.monto)}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderContenido = () => {
    if (cargando) return <View style={styles.cargando}><ActivityIndicator size="large" color="#2563EB" /></View>;
    if (confirmar) return renderConfirmar();

    if (detalle?.pausado && !soyDueno) {
      return (
        <>
          <View style={sheet.infoBox}><Text style={sheet.infoText}>{detalle.mensaje}</Text></View>
          {renderError()}
          <TouchableOpacity style={sheet.dangerButton} onPress={() => setConfirmar({ tipo: 'salir' })}>
            <Text style={sheet.dangerButtonText}>Salir de esta meta</Text>
          </TouchableOpacity>
        </>
      );
    }

    return (
      <>
        {detalle?.pausado && soyDueno && (
          <View style={sheet.infoBox}>
            <Text style={sheet.infoText}>
              Está en pausa porque tu plan ya no la incluye. No se borró nada: mejora tu plan y vuelve a estar activa.
            </Text>
            <TouchableOpacity style={styles.inlineLink} onPress={onMejorarPlan}>
              <Text style={styles.inlineLinkText}>Ver planes</Text>
            </TouchableOpacity>
          </View>
        )}
        {renderError()}
        {renderResumen()}
        {!detalle?.pausado && renderInvitar()}
        {detalle && renderMiembros()}
        {renderExMiembros()}
        {detalle && renderAportes()}
        {detalle && (soyDueno ? (
          <TouchableOpacity style={sheet.dangerButton} onPress={() => setConfirmar({ tipo: 'dejar' })}>
            <Text style={sheet.dangerButtonText}>
              {miembros.length > 1 || detalle.pausado ? 'Dejar de compartir' : 'Cancelar la invitación'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={sheet.dangerButton} onPress={() => setConfirmar({ tipo: 'salir' })}>
            <Text style={sheet.dangerButtonText}>Salir de esta meta</Text>
          </TouchableOpacity>
        ))}
      </>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={sheet.container} edges={['top', 'bottom']}>
        <View style={sheet.header}>
          <TouchableOpacity onPress={onClose} style={sheet.closeButton} disabled={trabajando}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
          <Text style={sheet.title} numberOfLines={1}>{detalle?.goal?.name ?? nombre}</Text>
          <View style={sheet.headerSpacer} />
        </View>
        <ScrollView contentContainerStyle={sheet.content}>
          {renderContenido()}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  cargando: { paddingVertical: 60, alignItems: 'center' },
  resumenNombre: { fontSize: 17, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  barra: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, marginTop: 12, marginBottom: 10, overflow: 'hidden' },
  barraFill: { height: '100%', borderRadius: 4, backgroundColor: '#10b981' },
  resumenFila: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', columnGap: 8, rowGap: 4 },
  pct: { fontSize: 14, fontWeight: '700', color: '#059669' },
  aportar: { marginTop: 14 },
  quitar: { color: '#dc2626', fontSize: 14, fontWeight: '600', paddingLeft: 12 },
  explica: { marginBottom: 14 },
  codigoBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#93c5fd', backgroundColor: '#eff6ff',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
  },
  codigo: { fontSize: 26, fontWeight: '700', letterSpacing: 6, color: '#1e293b' },
  copiar: { color: '#2563EB', fontWeight: '600', fontSize: 14 },
  vence: { fontSize: 13, marginTop: 8, marginBottom: 14 },
  confirmTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  confirmBody: { marginBottom: 18 },
  cancelar: { paddingVertical: 14, alignItems: 'center' },
  cancelarText: { color: '#64748b', fontSize: 15, fontWeight: '500' },
  inlineLink: { marginTop: 8 },
  inlineLinkText: { color: '#2563EB', fontWeight: '700', fontSize: 14 },
});
