import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { sharedAPI, PresupuestoCompartidoConmigo, MetaCompartidaConmigo } from '../../utils/api';
import { useCurrency } from '../../hooks/useCurrency';
import { useDashboardStore } from '../../stores/dashboard';
import { useSharedStore } from '../../stores/sharedStore';
import { montoEn } from '../shared/sharedUi';
import { logger } from '../../utils/logger';

/**
 * Lo que OTROS comparten conmigo, para el dashboard. Va DENTRO de la tarjeta de
 * su tema (presupuestos o metas), en un bloque aparte, y NO suma a los totales
 * personales (decisión de producto: lo del grupo no es mío). Lo que yo comparto
 * ya sale en mis listas con el ícono de personas.
 *
 * Antes era una tarjeta suelta "Compartidos" debajo de las metas: lejos de su
 * tema y sin decir si era un presupuesto o una meta.
 */

// Cuántos se muestran en el dashboard; el resto está en su pantalla.
const MAXIMO = 2;

export function useCompartidosConmigo() {
  const { refreshTrigger } = useDashboardStore();
  const { version } = useSharedStore();
  const [presupuestos, setPresupuestos] = useState<PresupuestoCompartidoConmigo[]>([]);
  const [metas, setMetas] = useState<MetaCompartidaConmigo[]>([]);

  // Si llega una recarga nueva antes de que termine la anterior, la vieja no pisa.
  useEffect(() => {
    let vigente = true;
    (async () => {
      const [p, m] = await Promise.allSettled([sharedAPI.presupuestosConmigo(), sharedAPI.metasConmigo()]);
      if (!vigente) return;
      if (p.status === 'fulfilled') setPresupuestos(p.value.data.compartidos || []);
      else logger.error('[Dashboard] Error cargando presupuestos compartidos:', p.reason);
      if (m.status === 'fulfilled') setMetas(m.value.data.compartidas || []);
      else logger.error('[Dashboard] Error cargando metas compartidas:', m.reason);
    })();
    return () => { vigente = false; };
  }, [refreshTrigger, version]);

  return { presupuestos, metas };
}

function Encabezado({ texto, separado }: { texto: string; separado: boolean }) {
  return (
    <View style={[styles.encabezado, separado && styles.separado]}>
      <Ionicons name="people" size={15} color="#2563EB" />
      <Text style={styles.encabezadoTexto}>{texto}</Text>
    </View>
  );
}

function LineaPausa({ cuantos }: { cuantos: number }) {
  if (cuantos === 0) return null;
  return (
    <Text style={styles.pausa}>
      {cuantos === 1 ? '1 compartido está en pausa.' : `${cuantos} compartidos están en pausa.`}
    </Text>
  );
}

function VerMas({ cuantos, onPress }: { cuantos: number; onPress: () => void }) {
  if (cuantos <= 0) return null;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.verMas}>{cuantos === 1 ? 'Ver 1 más' : `Ver ${cuantos} más`}</Text>
    </TouchableOpacity>
  );
}

/** `separado`: con raya arriba, cuando hay presupuestos propios encima. */
export function PresupuestosCompartidosConmigo({ items, separado }: { items: PresupuestoCompartidoConmigo[]; separado: boolean }) {
  const navigation = useNavigation<any>();
  const { formatCurrency } = useCurrency();
  const activos = items.filter((c) => !c.pausado && c.budget);
  const enPausa = items.length - activos.length;
  if (items.length === 0) return null;
  const irA = () => navigation.navigate('Budgets');

  return (
    <View>
      <Encabezado texto="Compartidos contigo" separado={separado} />
      {activos.slice(0, MAXIMO).map((c) => {
        const b = c.budget!;
        const pct = b.amount > 0 ? (b.spent / b.amount) * 100 : 0;
        const color = pct > 100 ? '#dc2626' : pct >= 80 ? '#f59e0b' : '#10b981';
        const m = (n: number) => montoEn(n, c.moneda, formatCurrency);
        return (
          <TouchableOpacity key={c.groupId} style={styles.fila} onPress={irA} activeOpacity={0.7}>
            <View style={styles.filaTop}>
              <Text style={styles.nombre} numberOfLines={1}>{b.category?.icon || '💰'} {b.name}</Text>
              <Text style={[styles.pct, { color }]}>{pct.toFixed(0)}%</Text>
            </View>
            <View style={styles.barra}>
              <View style={[styles.barraFill, { width: `${Math.min(100, pct)}%`, backgroundColor: color }]} />
            </View>
            <Text style={styles.detalle} numberOfLines={2}>De {c.dueno} · llevan {m(b.spent)} de {m(b.amount)}</Text>
          </TouchableOpacity>
        );
      })}
      <VerMas cuantos={activos.length - MAXIMO} onPress={irA} />
      <LineaPausa cuantos={enPausa} />
    </View>
  );
}

/** `separado`: con raya arriba, cuando hay metas propias encima. */
export function MetasCompartidasConmigo({ items, separado }: { items: MetaCompartidaConmigo[]; separado: boolean }) {
  const navigation = useNavigation<any>();
  const { formatCurrency } = useCurrency();
  const activas = items.filter((c) => !c.pausado && c.goal);
  const enPausa = items.length - activas.length;
  if (items.length === 0) return null;
  const irA = () => navigation.navigate('Goals');

  return (
    <View>
      <Encabezado texto="Compartidas contigo" separado={separado} />
      {activas.slice(0, MAXIMO).map((c) => {
        const g = c.goal!;
        const pct = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
        const m = (n: number) => montoEn(n, c.moneda, formatCurrency);
        return (
          <TouchableOpacity key={c.groupId} style={styles.fila} onPress={irA} activeOpacity={0.7}>
            <View style={styles.filaTop}>
              <Text style={styles.nombre} numberOfLines={1}>{g.category?.icon || '🎯'} {g.name}</Text>
              <Text style={[styles.pct, { color: '#059669' }]}>{pct.toFixed(0)}%</Text>
            </View>
            <View style={styles.barra}>
              <View style={[styles.barraFill, { width: `${Math.min(100, pct)}%`, backgroundColor: '#10b981' }]} />
            </View>
            <Text style={styles.detalle} numberOfLines={2}>
              De {c.dueno} · llevan {m(g.currentAmount)} de {m(g.targetAmount)} · tú {m(c.miAporte ?? 0)}
            </Text>
          </TouchableOpacity>
        );
      })}
      <VerMas cuantos={activas.length - MAXIMO} onPress={irA} />
      <LineaPausa cuantos={enPausa} />
    </View>
  );
}

const styles = StyleSheet.create({
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  separado: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  encabezadoTexto: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  fila: {
    paddingVertical: 8,
  },
  filaTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nombre: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    paddingRight: 8,
  },
  pct: {
    fontSize: 13,
    fontWeight: '700',
  },
  barra: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginVertical: 6,
    overflow: 'hidden',
  },
  barraFill: {
    height: '100%',
    borderRadius: 3,
  },
  detalle: {
    fontSize: 12,
    color: '#64748b',
  },
  verMas: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
    paddingVertical: 4,
  },
  pausa: {
    fontSize: 12,
    color: '#b45309',
    marginTop: 4,
  },
});
