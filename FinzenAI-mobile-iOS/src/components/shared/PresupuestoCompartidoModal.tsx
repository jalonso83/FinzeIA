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
import { sharedAPI, DetallePresupuestoCompartido, InvitacionCreada } from '../../utils/api';
import { useCurrency } from '../../hooks/useCurrency';
import { sheet, mensajeDeError, pideMejorarPlan, montoEn, fechaCorta } from './sharedUi';
import { logger } from '../../utils/logger';

const MAX_PERSONAS = 4;

interface Props {
  visible: boolean;
  /** Presupuesto a mostrar (el vigente del compartido, o uno propio sin compartir). */
  budgetId: string | null;
  /** Nombre para el título mientras carga. */
  nombre: string;
  /** true si es mío: puedo invitar, quitar y dejar de compartir. */
  soyDueno: boolean;
  /** Mío y todavía sin compartir: no hay detalle que cargar, solo invitar. */
  sinCompartir: boolean;
  onClose: () => void;
  /** Algo cambió (invitó, quitó, salió…): recargar listas. */
  onCambio: () => void;
  /** El plan no alcanza: cerrar y abrir Planes. */
  onMejorarPlan: () => void;
}

type Confirmar =
  | { tipo: 'quitar'; userId: string; nombre: string }
  | { tipo: 'dejar' }
  | { tipo: 'salir' }
  | null;

export default function PresupuestoCompartidoModal({
  visible, budgetId, nombre, soyDueno, sinCompartir, onClose, onCambio, onMejorarPlan,
}: Props) {
  const { formatCurrency } = useCurrency();
  const [detalle, setDetalle] = useState<DetallePresupuestoCompartido | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mejorarPlan, setMejorarPlan] = useState(false);
  const [invitacion, setInvitacion] = useState<InvitacionCreada | null>(null);
  const [invitando, setInvitando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [confirmar, setConfirmar] = useState<Confirmar>(null);
  const [trabajando, setTrabajando] = useState(false);
  // Gasto propio por confirmar que se está decidiendo ahora mismo.
  const [gastoEnCurso, setGastoEnCurso] = useState<string | null>(null);
  // Tras invitar por primera vez ya existe el compartido: hay detalle que cargar.
  const [recienCompartido, setRecienCompartido] = useState(false);
  const sinCompartirAhora = sinCompartir && !recienCompartido;

  const cargar = useCallback(async () => {
    if (!budgetId || sinCompartirAhora) {
      setDetalle(null);
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const { data } = await sharedAPI.detallePresupuesto(budgetId);
      setDetalle(data);
    } catch (e: any) {
      // Un presupuesto propio cuyo compartido se cerró: queda como "sin compartir".
      if (e?.response?.data?.error === 'NOT_SHARED') {
        setDetalle(null);
      } else {
        logger.error('[Compartidos] Error cargando detalle:', e);
        setError(mensajeDeError(e, 'No pudimos cargar el presupuesto compartido.'));
      }
    } finally {
      setCargando(false);
    }
  }, [budgetId, sinCompartirAhora]);

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
    if (!budgetId) return;
    setInvitando(true);
    setError(null);
    setMejorarPlan(false);
    try {
      const { data } = await sharedAPI.invitarPresupuesto(budgetId);
      setInvitacion(data);
      setRecienCompartido(true);
      onCambio();
    } catch (e: any) {
      logger.error('[Compartidos] Error invitando:', e);
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
    if (!confirmar || !detalle?.groupId) return;
    setTrabajando(true);
    setError(null);
    try {
      if (confirmar.tipo === 'quitar') {
        await sharedAPI.quitarMiembro(detalle.groupId, confirmar.userId);
        setConfirmar(null);
        onCambio();
        await cargar();
      } else {
        if (confirmar.tipo === 'dejar') await sharedAPI.dejarDeCompartir(detalle.groupId);
        else await sharedAPI.salir(detalle.groupId);
        onCambio();
        onClose();
      }
    } catch (e: any) {
      logger.error('[Compartidos] Error en acción:', e);
      setError(mensajeDeError(e));
      setConfirmar(null);
    } finally {
      setTrabajando(false);
    }
  };

  // ─── Piezas ────────────────────────────────────────────────────────────────

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
    const textos = confirmar.tipo === 'quitar'
      ? {
          titulo: `¿Quitar a ${confirmar.nombre}?`,
          cuerpo: `${confirmar.nombre} deja de ver "${detalle?.budget?.name ?? nombre}" y sus gastos dejan de sumar aquí. Sus gastos siguen en su historial.`,
          boton: 'Quitar',
        }
      : confirmar.tipo === 'dejar'
        ? miembros.length > 1 || detalle?.pausado
          ? {
              titulo: '¿Dejar de compartir?',
              cuerpo: 'Las demás personas dejan de verlo y solo cuentan tus gastos. El presupuesto sigue siendo tuyo.',
              boton: 'Dejar de compartir',
            }
          : {
              titulo: '¿Cancelar la invitación?',
              cuerpo: 'El código deja de servir. Puedes invitar de nuevo cuando quieras.',
              boton: 'Cancelar la invitación',
            }
        : {
            titulo: '¿Salir de este presupuesto?',
            cuerpo: 'Dejas de verlo y tus gastos dejan de sumar aquí. Tus gastos siguen en tu historial.',
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
    const b = detalle?.budget;
    if (!b) return null;
    const restante = b.amount - b.spent;
    const pct = b.amount > 0 ? Math.min(100, (b.spent / b.amount) * 100) : 0;
    const excedido = b.spent > b.amount;
    return (
      <View style={sheet.card}>
        <Text style={styles.resumenNombre}>{b.category?.icon} {b.name}</Text>
        <Text style={sheet.muted}>
          {b.category?.name && b.category.name.trim().toLowerCase() !== b.name.trim().toLowerCase() ? `${b.category.name} · ` : ''}
          {fechaCorta(b.start_date)} – {fechaCorta(b.end_date)}
        </Text>
        <View style={styles.barra}>
          <View style={[styles.barraFill, { width: `${pct}%`, backgroundColor: excedido ? '#dc2626' : pct >= 80 ? '#f59e0b' : '#10b981' }]} />
        </View>
        <View style={styles.resumenFila}>
          <Text style={sheet.muted}>Van {monto(b.spent)} de {monto(b.amount)}</Text>
          <Text style={[styles.restante, { color: excedido ? '#dc2626' : '#059669' }]}>
            {excedido ? `Pasados ${monto(-restante)}` : `Quedan ${monto(restante)}`}
          </Text>
        </View>
      </View>
    );
  };

  const renderMiembros = () => (
    <View style={sheet.card}>
      <Text style={sheet.sectionTitle}>Quiénes están ({miembros.length} de {MAX_PERSONAS})</Text>
      {miembros.map((m, i) => (
        <View key={m.userId} style={[sheet.row, i === miembros.length - 1 && sheet.rowLast]}>
          <View style={{ flex: 1 }}>
            <Text style={sheet.rowTitle}>{m.nombre}{m.rol === 'OWNER' ? (' · lo creó') : ''}</Text>
            <Text style={sheet.rowSubtitle}>Lleva {monto(m.aportado)}</Text>
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
          <Text style={[sheet.muted, styles.vence]}>
            Vale para una persona y vence el {fechaCorta(invitacion.expiresAt)}.
          </Text>
          <TouchableOpacity style={sheet.primaryButton} onPress={enviar}>
            <Ionicons name="share-outline" size={20} color="white" />
            <Text style={sheet.primaryButtonText}>Enviar invitación</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (lleno) {
      return (
        <View style={sheet.infoBox}>
          <Text style={sheet.infoText}>Ya son {MAX_PERSONAS} personas, que es el máximo.</Text>
        </View>
      );
    }
    return (
      <View style={sheet.card}>
        <Text style={sheet.sectionTitle}>{sinCompartirAhora || miembros.length <= 1 ? 'Llévenlo juntos' : 'Invitar a alguien más'}</Text>
        <Text style={[sheet.muted, styles.explica]}>
          Los gastos de esta categoría de todos suman en el mismo presupuesto. Solo tú puedes cambiarlo o borrarlo.
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

  // Cada quien confirma SOLO lo suyo: así decide quien hizo el gasto si los
  // demás ven el comercio. La lista se recarga sin parpadear.
  const decidirGasto = async (transactionId: string, esCompartido: boolean) => {
    if (!budgetId) return;
    setGastoEnCurso(transactionId);
    setError(null);
    try {
      if (esCompartido) await sharedAPI.confirmarGasto(transactionId);
      else await sharedAPI.sacarDelCompartido(transactionId);
    } catch (e) {
      logger.error('[Compartidos] Error confirmando gasto:', e);
      setError(mensajeDeError(e, 'No pudimos guardar tu respuesta. Intenta de nuevo.'));
      setGastoEnCurso(null);
      return;
    }
    onCambio();
    try {
      const { data } = await sharedAPI.detallePresupuesto(budgetId);
      setDetalle(data);
    } catch (e) {
      // Ya quedó guardado; solo no se pudo refrescar la lista.
      logger.error('[Compartidos] Error recargando detalle tras confirmar:', e);
    } finally {
      setGastoEnCurso(null);
    }
  };

  const renderGastos = () => {
    const gastos = detalle?.gastos ?? [];
    return (
      <View style={sheet.card}>
        <Text style={sheet.sectionTitle}>Gastos del período</Text>
        {gastos.length === 0 ? (
          <Text style={sheet.muted}>Todavía no hay gastos en este período.</Text>
        ) : gastos.map((g, i) => (
          <View key={g.id} style={[styles.gasto, i === gastos.length - 1 && sheet.rowLast]}>
            <View style={styles.gastoFila}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={sheet.rowTitle} numberOfLines={1}>
                  {g.descripcion || (g.porConfirmar ? 'Gasto automático' : 'Gasto')}
                </Text>
                <Text style={sheet.rowSubtitle}>
                  {g.mio ? 'Tú' : g.miembro} · {fechaCorta(g.fecha)}{g.porConfirmar ? ' · por confirmar' : ''}
                </Text>
              </View>
              <Text style={sheet.rowAmount}>{monto(g.monto)}</Text>
            </View>
            {g.mio && g.porConfirmar && (
              gastoEnCurso === g.id ? (
                <ActivityIndicator size="small" color="#2563EB" style={styles.decidiendo} />
              ) : (
                <View style={styles.decision}>
                  <TouchableOpacity
                    style={[styles.decisionBoton, styles.decisionSi]}
                    onPress={() => decidirGasto(g.id, true)}
                    disabled={!!gastoEnCurso}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.decisionSiTexto}>Confirmar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.decisionBoton}
                    onPress={() => decidirGasto(g.id, false)}
                    disabled={!!gastoEnCurso}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.decisionNoTexto}>Es personal</Text>
                  </TouchableOpacity>
                </View>
              )
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderContenido = () => {
    if (cargando) {
      return <View style={styles.cargando}><ActivityIndicator size="large" color="#2563EB" /></View>;
    }
    if (confirmar) return renderConfirmar();

    // Pausado y no soy el dueño: solo el porqué y la salida.
    if (detalle?.pausado && !soyDueno) {
      return (
        <>
          <View style={sheet.infoBox}><Text style={sheet.infoText}>{detalle.mensaje}</Text></View>
          {renderError()}
          <TouchableOpacity style={sheet.dangerButton} onPress={() => setConfirmar({ tipo: 'salir' })}>
            <Text style={sheet.dangerButtonText}>Salir de este presupuesto</Text>
          </TouchableOpacity>
        </>
      );
    }

    return (
      <>
        {detalle?.pausado && soyDueno && (
          <View style={sheet.infoBox}>
            <Text style={sheet.infoText}>
              Está en pausa porque tu plan ya no lo incluye. No se borró nada: mejora tu plan y vuelve a estar activo.
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
        {detalle && renderGastos()}
        {detalle && (soyDueno ? (
          <TouchableOpacity style={sheet.dangerButton} onPress={() => setConfirmar({ tipo: 'dejar' })}>
            <Text style={sheet.dangerButtonText}>
              {miembros.length > 1 || detalle.pausado ? 'Dejar de compartir' : 'Cancelar la invitación'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={sheet.dangerButton} onPress={() => setConfirmar({ tipo: 'salir' })}>
            <Text style={sheet.dangerButtonText}>Salir de este presupuesto</Text>
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
          <Text style={sheet.title} numberOfLines={1}>{detalle?.budget?.name ?? nombre}</Text>
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
  cargando: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  resumenNombre: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  barra: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginTop: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  barraFill: {
    height: '100%',
    borderRadius: 4,
  },
  resumenFila: {
    gap: 4,
  },
  restante: {
    fontSize: 14,
    fontWeight: '700',
  },
  gasto: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  gastoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  decision: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  decisionBoton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  decisionSi: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  decisionSiTexto: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  decisionNoTexto: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  decidiendo: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  quitar: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
    paddingLeft: 12,
  },
  explica: {
    marginBottom: 14,
  },
  codigoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  codigo: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 6,
    color: '#1e293b',
  },
  copiar: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },
  vence: {
    fontSize: 13,
    marginTop: 8,
    marginBottom: 14,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  confirmBody: {
    marginBottom: 18,
  },
  cancelar: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelarText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '500',
  },
  inlineLink: {
    marginTop: 8,
  },
  inlineLinkText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 14,
  },
});
