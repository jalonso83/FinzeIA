import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { sharedAPI, GastoPorConfirmar } from '../../utils/api';
import { useCurrency } from '../../hooks/useCurrency';
import { sheet, mensajeDeError, fechaCorta } from './sharedUi';
import { logger } from '../../utils/logger';

interface Props {
  visible: boolean;
  gastos: GastoPorConfirmar[];
  onClose: () => void;
  /** Se confirmó o se sacó algo: recargar. */
  onCambio: () => void;
}

/**
 * Gastos que entraron solos por el correo y cuentan en un compartido. Los demás
 * los ven solo por el monto hasta que quien los hizo los confirme ("sí, va en
 * el compartido") o los saque ("es personal").
 */
export default function PorConfirmarModal({ visible, gastos, onClose, onCambio }: Props) {
  const { formatCurrency } = useCurrency();
  const [lista, setLista] = useState<GastoPorConfirmar[]>([]);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setLista(gastos);
      setError(null);
    }
  }, [visible, gastos]);

  const quitarDeLista = (id: string) => setLista((l) => l.filter((g) => g.id !== id));

  const accion = async (g: GastoPorConfirmar, tipo: 'confirmar' | 'personal') => {
    setOcupado(g.id);
    setError(null);
    try {
      if (tipo === 'confirmar') await sharedAPI.confirmarGasto(g.id);
      else await sharedAPI.sacarDelCompartido(g.id);
      quitarDeLista(g.id);
      onCambio();
    } catch (e: any) {
      logger.error('[Compartidos] Error confirmando gasto:', e);
      setError(mensajeDeError(e));
    } finally {
      setOcupado(null);
    }
  };

  const confirmarTodos = async () => {
    setOcupado('todos');
    setError(null);
    const pendientes = [...lista];
    for (const g of pendientes) {
      try {
        await sharedAPI.confirmarGasto(g.id);
        quitarDeLista(g.id);
      } catch (e: any) {
        logger.error('[Compartidos] Error confirmando gasto:', e);
        setError(mensajeDeError(e));
        break;
      }
    }
    onCambio();
    setOcupado(null);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={sheet.container} edges={['top', 'bottom']}>
        <View style={sheet.header}>
          <TouchableOpacity onPress={onClose} style={sheet.closeButton}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
          <Text style={sheet.title}>Por confirmar</Text>
          <View style={sheet.headerSpacer} />
        </View>
        <ScrollView contentContainerStyle={sheet.content}>
          <Text style={[sheet.muted, styles.intro]}>
            Estos gastos entraron solos por tu correo y cuentan en un presupuesto compartido. Los demás solo ven el monto hasta que los confirmes. Si alguno es personal, sácalo.
          </Text>

          {error && <View style={sheet.errorBox}><Text style={sheet.errorText}>{error}</Text></View>}

          {lista.length === 0 ? (
            <View style={styles.vacio}>
              <Ionicons name="checkmark-circle" size={48} color="#10b981" />
              <Text style={styles.vacioTexto}>No tienes gastos por confirmar.</Text>
            </View>
          ) : (
            <>
              {lista.map((g) => (
                <View key={g.id} style={sheet.card}>
                  <View style={styles.fila}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={sheet.rowTitle} numberOfLines={2}>{g.descripcion || 'Gasto automático'}</Text>
                      <Text style={sheet.rowSubtitle}>{fechaCorta(g.fecha)} · en «{g.presupuesto.name}»</Text>
                    </View>
                    <Text style={sheet.rowAmount}>{formatCurrency(g.monto)}</Text>
                  </View>
                  <View style={styles.botones}>
                    <TouchableOpacity
                      style={[styles.boton, styles.botonPersonal]}
                      onPress={() => accion(g, 'personal')}
                      disabled={!!ocupado}
                    >
                      <Text style={styles.botonPersonalTexto}>Es personal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.boton, styles.botonConfirmar]}
                      onPress={() => accion(g, 'confirmar')}
                      disabled={!!ocupado}
                    >
                      {ocupado === g.id ? <ActivityIndicator color="white" /> : <Text style={styles.botonConfirmarTexto}>Confirmar</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {lista.length > 1 && (
                <TouchableOpacity
                  style={[sheet.secondaryButton, !!ocupado && sheet.disabled]}
                  onPress={confirmarTodos}
                  disabled={!!ocupado}
                >
                  {ocupado === 'todos' ? <ActivityIndicator color="#2563EB" /> : <Text style={sheet.secondaryButtonText}>Confirmar todos</Text>}
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginBottom: 16,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botones: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  boton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonPersonal: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: 'white',
  },
  botonPersonalTexto: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 14,
  },
  botonConfirmar: {
    backgroundColor: '#2563EB',
  },
  botonConfirmarTexto: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  vacio: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  vacioTexto: {
    fontSize: 15,
    color: '#475569',
  },
});
