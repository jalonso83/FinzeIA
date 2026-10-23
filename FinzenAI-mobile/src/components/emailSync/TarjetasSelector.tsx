import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Lista de tarjetas detectadas en los avisos del banco, con un interruptor por
 * tarjeta para decidir si sus consumos se importan.
 *
 * Caso típico: la tarjeta corporativa, que el usuario no quiere mezclar con sus
 * finanzas personales. La confirmación de apagar NO va aquí: la pinta la
 * pantalla como vista superpuesta (en iOS no se puede abrir un Modal encima de
 * otro, y Gastos en automático ya es un Modal).
 */

export interface TarjetaDetectada {
  last4: string;
  bancos: string[];
  consumosImportados: number;
  ultimoConsumo: string | null;
  excluida: boolean;
  excluidaDesde: string | null;
}

interface Props {
  tarjetas: TarjetaDetectada[];
  /** Terminación que se está guardando ahora (deshabilita su interruptor). */
  ocupada: string | null;
  onCambiar: (tarjeta: TarjetaDetectada, encender: boolean) => void;
  onAgregar: (last4: string) => void;
  /** Error de la última acción. Va dentro de la lista y no en un modal: la
   *  pantalla de éxito no monta modales y ahí se perdería. */
  error?: string | null;
}

const fechaCorta = (iso: string | null) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-DO', { day: 'numeric', month: 'short' });
};

export const nombreTarjeta = (t: TarjetaDetectada) =>
  `${t.bancos[0] ? t.bancos[0].replace(' Dominicano', '') + ' ' : 'Tarjeta '}•••• ${t.last4}`;

const TarjetasSelector: React.FC<Props> = ({ tarjetas, ocupada, onCambiar, onAgregar, error }) => {
  const [agregando, setAgregando] = useState(false);
  const [digitos, setDigitos] = useState('');
  const valido = /^\d{4}$/.test(digitos);

  return (
    <View>
      {!!error && (
        <View style={styles.error}>
          <Ionicons name="alert-circle-outline" size={18} color="#b91c1c" />
          <Text style={styles.errorTexto}>{error}</Text>
        </View>
      )}
      {tarjetas.length > 0 && (
        <View style={styles.lista}>
          {tarjetas.map((t, i) => (
            <View key={t.last4} style={[styles.fila, i > 0 && styles.filaBorde]}>
              <View style={styles.icono}>
                <Ionicons name="card-outline" size={18} color="#1e293b" />
              </View>
              <View style={styles.textos}>
                <Text style={styles.nombre}>{nombreTarjeta(t)}</Text>
                <Text style={styles.detalle}>
                  {t.excluida
                    ? `No se importa${t.excluidaDesde ? ` desde el ${fechaCorta(t.excluidaDesde)}` : ''}`
                    : `${t.consumosImportados} consumo${t.consumosImportados === 1 ? '' : 's'}${t.ultimoConsumo ? ` · último ${fechaCorta(t.ultimoConsumo)}` : ''}`}
                </Text>
              </View>
              {ocupada === t.last4 ? (
                <ActivityIndicator size="small" color="#2563EB" style={styles.cargando} />
              ) : (
                <Switch
                  value={!t.excluida}
                  onValueChange={(encender) => onCambiar(t, encender)}
                  disabled={ocupada !== null}
                  trackColor={{ false: '#d1d5db', true: '#2563EB' }}
                  thumbColor="#ffffff"
                  accessibilityLabel={`Importar consumos de ${nombreTarjeta(t)}`}
                />
              )}
            </View>
          ))}
        </View>
      )}

      {agregando ? (
        <View style={styles.agregar}>
          <Text style={styles.agregarTitulo}>Últimos 4 dígitos de la tarjeta</Text>
          <View style={styles.agregarFila}>
            <TextInput
              style={styles.input}
              value={digitos}
              onChangeText={(v) => setDigitos(v.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="1234"
              placeholderTextColor="#9ca3af"
              autoFocus
            />
            <TouchableOpacity
              style={[styles.agregarBoton, (!valido || ocupada !== null) && styles.deshabilitado]}
              disabled={!valido || ocupada !== null}
              onPress={() => {
                onAgregar(digitos);
                setDigitos('');
                setAgregando(false);
              }}
            >
              <Text style={styles.agregarBotonTexto}>Agregar</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.ayuda}>Quedará apagada: sus consumos no se importarán.</Text>
          <TouchableOpacity onPress={() => { setAgregando(false); setDigitos(''); }}>
            <Text style={styles.enlace}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.agregarEnlace} onPress={() => setAgregando(true)}>
          <Ionicons name="add" size={18} color="#2563EB" />
          <Text style={styles.enlace}>Agregar una tarjeta que no quieres importar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  error: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  errorTexto: {
    flex: 1,
    fontSize: 13,
    color: '#b91c1c',
    lineHeight: 18,
  },
  lista: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  filaBorde: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  icono: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {
    flex: 1,
  },
  nombre: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  detalle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  cargando: {
    width: 51,
  },
  agregarEnlace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  enlace: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  agregar: {
    marginTop: 12,
    padding: 14,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 10,
  },
  agregarTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  agregarFila: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    letterSpacing: 4,
    color: '#1e293b',
  },
  agregarBoton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  agregarBotonTexto: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  deshabilitado: {
    opacity: 0.5,
  },
  ayuda: {
    fontSize: 12,
    color: '#64748b',
  },
});

export default TarjetasSelector;
