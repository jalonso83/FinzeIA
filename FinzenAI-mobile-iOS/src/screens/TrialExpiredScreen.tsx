import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { sharedAPI } from '../utils/api';
import { logger } from '../utils/logger';

/**
 * ─── Pantalla de vencimiento del trial (D6) ────────────────────────────────────
 *
 * Hasta ahora, vencer el trial era un apagón silencioso: el plan bajaba a FREE,
 * se borraba la conexión de correo y el usuario se enteraba chocando contra un
 * límite. De los 16 que llegaron a ese momento no sobrevivió ninguno.
 *
 * Dos decisiones gobiernan esta pantalla:
 *
 * 1. **Primero lo que conserva, después lo que perdió.** Sus transacciones NO se
 *    borran —solo se borra la conexión— y decírselo cambia el mensaje entero:
 *    no es "se acabó", es "tus 340 transacciones se quedan; lo que se detiene es
 *    que entren solas".
 *
 * 2. **Nada de esto se decide aquí.** Todo el contenido sale de
 *    `GET /subscriptions/trial-expiry`. Si el "qué conservas" viviera dentro de
 *    la app, encender el aterrizaje suave costaría compilar y esperar revisión
 *    de las tiendas; preguntándolo, cuesta cambiar una variable en el servidor.
 */

interface TrialExpiryState {
  vencioElTrial: boolean;
  trialEndedAt: string | null;
  transaccionesImportadas: number;
  seDetuvo: string[];
  aterrizajeSuave: boolean;
  conserva: { budgets: number; goals: number; zenioQueries: number } | null;
  limitesFree: { budgets: number; goals: number; zenioQueries: number };
}

interface TrialExpiredScreenProps {
  estado: TrialExpiryState;
  onClose: () => void;
  onRecuperar: () => void;
}

/** Nombres de cara al usuario. `seDetuvo` viene en clave para que el servidor
 *  pueda añadir cosas sin que la app tenga que entenderlas de antemano. */
const NOMBRES_DE_FUNCION: Record<string, string> = {
  gastos_en_automatico: 'Gastos en automático',
};

const TrialExpiredScreen: React.FC<TrialExpiredScreenProps> = ({ estado, onClose, onRecuperar }) => {
  const insets = useSafeAreaInsets();
  const [saliendo, setSaliendo] = useState(false);
  // Compartidos que el vencimiento dejó en pausa: "María deja de ver «Súper casa»".
  const [compartidosEnPausa, setCompartidosEnPausa] = useState<
    { groupId: string; tipo: 'presupuesto' | 'meta'; nombre: string; miembros: string[] }[]
  >([]);

  useEffect(() => {
    sharedAPI.resumenDeDueno()
      .then(({ data }) => setCompartidosEnPausa((data?.compartidos || []).filter((c) => c.pausado)))
      .catch((e) => logger.error('[Vencimiento] No se pudieron leer los compartidos:', e));
  }, []);

  // Denominador de la pantalla: cuánta gente la ve. Sin esto, dentro de dos
  // meses sabríamos que existe pero no si sirve — que es exactamente lo que nos
  // pasó con Gastos en automático.
  useEffect(() => {
    api.post('/subscriptions/trial-expiry/event', { accion: 'vio' })
      .catch((e) => logger.error('[Vencimiento] No se pudo registrar "vio":', e));
  }, []);

  const registrarYSalir = (accion: 'toco_recuperar' | 'cerro', despues: () => void) => {
    if (saliendo) return;
    setSaliendo(true);
    // No se espera la respuesta: el usuario no tiene por qué mirar un spinner
    // para que nosotros midamos.
    api.post('/subscriptions/trial-expiry/event', { accion })
      .catch((e) => logger.error(`[Vencimiento] No se pudo registrar "${accion}":`, e));
    despues();
  };

  const importadas = estado.transaccionesImportadas;
  const detenido = estado.seDetuvo.map((k) => NOMBRES_DE_FUNCION[k] ?? k);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Tu prueba terminó</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => registrarYSalir('cerro', onClose)}
        >
          <Ionicons name="close" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.contenido}>
        {/* Lo que CONSERVA va primero y arriba. El orden no es estético: abrir
            con la pérdida convierte la pantalla en una factura. */}
        <View style={styles.conservaCard}>
          <Ionicons name="shield-checkmark" size={28} color="#059669" />
          <Text style={styles.conservaTitulo}>
            {importadas > 0
              ? `Tus ${importadas} transacciones se quedan contigo`
              : 'Todo tu historial se queda contigo'}
          </Text>
          <Text style={styles.conservaTexto}>
            No borramos nada de lo que registraste. Tus transacciones, presupuestos y metas
            siguen donde estaban.
          </Text>
        </View>

        {/* Qué dejó de funcionar */}
        {detenido.length > 0 && (
          <View style={styles.bloque}>
            <Text style={styles.bloqueTitulo}>QUÉ SE DETUVO</Text>
            {detenido.map((nombre) => (
              <View key={nombre} style={styles.fila}>
                <Ionicons name="pause-circle-outline" size={20} color="#b45309" />
                <View style={styles.filaTexto}>
                  <Text style={styles.filaTitulo}>{nombre}</Text>
                  <Text style={styles.filaSub}>
                    Tus compras ya no entran solas. Vuelves a anotarlas a mano.
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Compartidos en pausa: lo que las otras personas dejan de ver. */}
        {compartidosEnPausa.length > 0 && (
          <View style={styles.bloque}>
            <Text style={styles.bloqueTitulo}>COMPARTIDOS EN PAUSA</Text>
            {compartidosEnPausa.map((c) => (
              <View key={c.groupId} style={styles.fila}>
                <Ionicons name="people-outline" size={20} color="#b45309" />
                <View style={styles.filaTexto}>
                  <Text style={styles.filaTitulo}>{c.nombre}</Text>
                  <Text style={styles.filaSub}>
                    {c.miembros.length > 0
                      ? `${c.miembros.length === 1 ? c.miembros[0] : `${c.miembros.slice(0, -1).join(', ')} y ${c.miembros[c.miembros.length - 1]}`} ${c.miembros.length === 1 ? 'deja' : 'dejan'} de ${c.tipo === 'meta' ? 'verla' : 'verlo'} hasta que mejores tu plan. No se borró nada.`
                      : 'Queda en pausa hasta que mejores tu plan. No se borró nada.'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Aterrizaje suave. Solo aparece si el servidor lo tiene encendido: la
            app no sabe ni tiene que saber si está activo. */}
        {estado.aterrizajeSuave && estado.conserva && (
          <View style={styles.bloque}>
            <Text style={styles.bloqueTitulo}>Y ESTO TE LO DEJAMOS</Text>
            {[
              { etiqueta: 'presupuestos', valor: estado.conserva.budgets, base: estado.limitesFree.budgets },
              { etiqueta: 'metas', valor: estado.conserva.goals, base: estado.limitesFree.goals },
              { etiqueta: 'consultas a Zenio al mes', valor: estado.conserva.zenioQueries, base: estado.limitesFree.zenioQueries },
            ]
              // Solo se lista lo que de verdad está por encima del plan gratis.
              // Anunciar como regalo algo que todo el mundo tiene ya sería ruido.
              .filter((item) => item.valor > item.base)
              .map((item) => (
                <View key={item.etiqueta} style={styles.fila}>
                  <Ionicons name="gift-outline" size={20} color="#059669" />
                  <View style={styles.filaTexto}>
                    <Text style={styles.filaTitulo}>
                      {item.valor} {item.etiqueta}
                    </Text>
                    <Text style={styles.filaSub}>En vez de {item.base} del plan gratis.</Text>
                  </View>
                </View>
              ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.botonPrincipal}
          onPress={() => registrarYSalir('toco_recuperar', onRecuperar)}
          disabled={saliendo}
        >
          {saliendo ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.botonPrincipalTexto}>
              {detenido.length > 0 ? `Recuperar ${detenido[0]}` : 'Ver los planes'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => registrarYSalir('cerro', onClose)} disabled={saliendo}>
          <Text style={styles.botonSecundario}>Seguir en el plan gratis</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    width: 40,
    alignItems: 'flex-end',
  },
  contenido: {
    padding: 20,
    paddingBottom: 40,
  },
  conservaCard: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  conservaTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#065f46',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  conservaTexto: {
    fontSize: 14,
    lineHeight: 20,
    color: '#047857',
    textAlign: 'center',
  },
  bloque: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  bloqueTitulo: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#6b7280',
    marginBottom: 12,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  filaTexto: {
    flex: 1,
  },
  filaTitulo: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  filaSub: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6b7280',
    marginTop: 2,
  },
  botonPrincipal: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  botonPrincipalTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  botonSecundario: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 16,
  },
});

export type { TrialExpiryState };
export default TrialExpiredScreen;
