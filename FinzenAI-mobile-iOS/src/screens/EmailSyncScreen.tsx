import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import api from '../utils/api';
import CustomModal from '../components/modals/CustomModal';
import TarjetasSelector, { TarjetaDetectada, nombreTarjeta } from '../components/emailSync/TarjetasSelector';
import { useDashboardStore } from '../stores/dashboard';

import { logger } from '../utils/logger';
interface EmailSyncScreenProps {
  onClose: () => void;
  onOpenPlans?: () => void;
}

interface ConnectionDetail {
  id: string;
  provider: 'GMAIL' | 'OUTLOOK';
  email: string;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  importedCount: number;
}

interface ConnectionStatus {
  connected: boolean;
  connections: ConnectionDetail[];
  connectedProviders: string[];
  totalImported: number;
}

// Avance de la sincronización que corre sola al conectar el correo. El backend
// lo va escribiendo mientras revisa; aquí se consulta cada pocos segundos para
// que el usuario vea que algo pasa en vez de una pantalla quieta.
interface SyncProgress {
  estado: 'IN_PROGRESS' | 'SUCCESS' | 'FAILED' | null;
  correosEncontrados: number;
  correosProcesados: number;
  transaccionesCreadas: number;
  terminado: boolean;
  /** Días hacia atrás que miró la revisión. Viene del servidor y no se escribe
   *  aquí: si la app lo trajera cocido, cambiarlo en el backend la dejaría
   *  diciéndole al usuario un período que no es. */
  historialDias?: number;
}

interface SupportedBank {
  id: string;
  name: string;
  country: string;
  logoUrl?: string;
  isActive: boolean;
}

const EmailSyncScreen: React.FC<EmailSyncScreenProps> = ({ onClose, onOpenPlans }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState<'gmail' | 'outlook' | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [supportedBanks, setSupportedBanks] = useState<SupportedBank[]>([]);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  // `siguiendoProgreso` enciende el sondeo; `resumenVisible` deja la tarjeta con
  // el resultado en pantalla cuando termina, hasta que el usuario refresque.
  const [progreso, setProgreso] = useState<SyncProgress | null>(null);
  const [siguiendoProgreso, setSiguiendoProgreso] = useState(false);
  const [resumenVisible, setResumenVisible] = useState(false);
  const [mostrarBancos, setMostrarBancos] = useState(false);
  // Pantalla de éxito tras la primera conexión: ocupa todo y lleva el número.
  // Es el momento de más ilusión del producto —acabo de darle acceso a mi
  // correo y aparecieron mis gastos— y merece más que una línea en una tarjeta.
  const [exitoPrimeraSync, setExitoPrimeraSync] = useState<SyncProgress | null>(null);
  // Ref y no estado: el sondeo la lee dentro de un intervalo ya montado, y un
  // estado obligaría a rearmar el efecto a mitad de la revisión.
  const reciénConectado = useRef(false);
  // Instante en que dejamos de preguntar. En ref para que sobreviva a los
  // rearmes del efecto; si se recalculara en cada uno, nunca se cumpliría.
  const limiteSondeo = useRef<number | null>(null);
  // Nos rendimos sin que el servidor dijera que terminó. Es distinto de un
  // final: los números que tenemos son parciales y no se pueden presentar
  // como el resultado.
  const [sondeoAbandonado, setSondeoAbandonado] = useState(false);
  // Espejo en ref: `fetchStatus` es un useCallback con deps vacías y leería
  // siempre el valor del primer render.
  const abandonadoRef = useRef(false);

  // Estados para CustomModal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalButtonText, setModalButtonText] = useState('Continuar');
  const [modalOnClose, setModalOnClose] = useState<() => void>(() => () => setModalVisible(false));
  const [modalShowSecondary, setModalShowSecondary] = useState(false);
  const [modalSecondaryText, setModalSecondaryText] = useState('');
  const [modalSecondaryAction, setModalSecondaryAction] = useState<() => void>(() => () => {});

  // Tarjetas detectadas en los avisos del banco. El usuario apaga las que no
  // quiere importar (ej. la corporativa). `necesitaRevision`: el servidor pide
  // que la lista se le presente una vez; al tocar "Listo" no vuelve a salir.
  const [tarjetas, setTarjetas] = useState<TarjetaDetectada[]>([]);
  const [necesitaRevision, setNecesitaRevision] = useState(false);
  const [tarjetaOcupada, setTarjetaOcupada] = useState<string | null>(null);
  // Confirmación de apagar una tarjeta con consumos ya importados. Va como vista
  // superpuesta y no como Modal: esta pantalla ya es un Modal, y en iOS no se
  // puede abrir otro encima.
  const [tarjetaAConfirmar, setTarjetaAConfirmar] = useState<TarjetaDetectada | null>(null);
  // Error de la última acción sobre tarjetas. En línea y no en CustomModal: la
  // pantalla de éxito no monta modales y el aviso se perdería.
  const [errorTarjetas, setErrorTarjetas] = useState<string | null>(null);
  // Consumos quitados en esta visita: el titular "Encontramos N compras" tiene
  // que bajar en la misma cantidad.
  const [quitadosTotal, setQuitadosTotal] = useState(0);
  const { onTransactionChange } = useDashboardStore();

  // Estado para modal de confirmación de desconexión
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [connectionToDisconnect, setConnectionToDisconnect] = useState<ConnectionDetail | null>(null);

  const showModal = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    buttonText: string = 'Continuar',
    onCloseCallback?: () => void,
    secondaryButton?: { text: string; action: () => void }
  ) => {
    setModalType(type);
    setModalTitle(title);
    setModalMessage(message);
    setModalButtonText(buttonText);
    setModalOnClose(() => () => {
      setModalVisible(false);
      if (onCloseCallback) onCloseCallback();
    });
    if (secondaryButton) {
      setModalShowSecondary(true);
      setModalSecondaryText(secondaryButton.text);
      setModalSecondaryAction(() => () => {
        setModalVisible(false);
        secondaryButton.action();
      });
    } else {
      setModalShowSecondary(false);
      setModalSecondaryText('');
      setModalSecondaryAction(() => () => {});
    }
    setModalVisible(true);
  };

  const fetchCards = useCallback(async () => {
    try {
      const res = await api.get('/email-sync/cards');
      setTarjetas(res.data.tarjetas || []);
      setNecesitaRevision(!!res.data.necesitaRevision);
    } catch (error) {
      // Sin la lista no se rompe nada: la importación sigue igual.
      logger.error('Error fetching cards:', error);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const banksRes = await api.get('/email-sync/supported-banks').catch(() => ({ data: { banks: [] } }));
      const banks = banksRes.data.banks || [];
      setSupportedBanks(banks.map((bank: any, index: number) => ({
        ...bank,
        id: bank.id || `bank-${index}`,
      })));

      try {
        const statusRes = await api.get('/email-sync/status');
        setConnectionStatus({
          connected: statusRes.data.connected || false,
          connections: statusRes.data.connections || [],
          connectedProviders: statusRes.data.connectedProviders || [],
          totalImported: statusRes.data.totalImported || 0,
        });

        if ((statusRes.data.connections || []).length > 0) {
          fetchCards();
        }

        // `/status` ya trae el avance, así que si el usuario vuelve a entrar con
        // una sincronización a medias (cerró la app, se fue a otra pantalla) la
        // retomamos donde iba en vez de mostrarle nada.
        const avance: SyncProgress | undefined = statusRes.data.progreso;
        if (avance) {
          setProgreso(avance);
          // El `!abandonadoRef` corta un ping-pong posible: al terminar el
          // sondeo se llama a `fetchStatus`, y si `/status` viniera rezagado
          // diciendo IN_PROGRESS volvería a encenderlo, que a su vez volvería a
          // llamar a `fetchStatus`… un ciclo de 3 s indefinido. Una vez que nos
          // rendimos, solo el usuario reabre el sondeo jalando para refrescar.
          if (avance.estado === 'IN_PROGRESS' && !abandonadoRef.current) {
            setSiguiendoProgreso(true);
          }
        }
      } catch (statusError: any) {
        setConnectionStatus({
          connected: false,
          connections: [],
          connectedProviders: [],
          totalImported: 0,
        });
      }
    } catch (error) {
      logger.error('Error fetching email sync data:', error);
      setConnectionStatus({
        connected: false,
        connections: [],
        connectedProviders: [],
        totalImported: 0,
      });
      setSupportedBanks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchCards]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Sondeo del avance. Cada 3 segundos: suficiente para que el número se mueva
  // solo y lo bastante barato como para no castigar al backend (el endpoint lee
  // una fila, sin joins).
  useEffect(() => {
    if (!siguiendoProgreso) return;

    let vigente = true;
    let enVuelo = false;

    // Corte de seguridad: si el backend se queda colgado, la pantalla no puede
    // quedarse preguntando para siempre. El instante límite vive en la ref y NO
    // se recalcula al rearmarse el efecto: si se reiniciara en cada rearme, y
    // `fetchStatus` puede volver a encender el sondeo, los cinco minutos nunca
    // llegarían a cumplirse.
    if (limiteSondeo.current == null) {
      limiteSondeo.current = Date.now() + 5 * 60 * 1000;
    }

    const consultar = async () => {
      // Sin esto, un endpoint lento (axios corta a los 60 s) acumularía ~20
      // peticiones en vuelo, cada una escribiendo estado por su cuenta.
      if (enVuelo) return;
      enVuelo = true;
      try {
        const res = await api.get('/email-sync/progress');
        if (!vigente) return;
        setProgreso(res.data);

        const seAgotoElTiempo = limiteSondeo.current != null && Date.now() > limiteSondeo.current;

        if (res.data.terminado || seAgotoElTiempo) {
          setSiguiendoProgreso(false);
          limiteSondeo.current = null;

          if (seAgotoElTiempo && !res.data.terminado) {
            // Rendirse NO es haber terminado. Antes esta rama caía en el mismo
            // sitio que el éxito y le enseñaba al usuario "Listo: N importadas"
            // con un número parcial de una revisión que sigue corriendo.
            setSondeoAbandonado(true);
            abandonadoRef.current = true;
            setResumenVisible(true);
          } else if (reciénConectado.current && res.data.estado === 'SUCCESS') {
            // Si esta revisión salió de una conexión que el usuario acaba de
            // hacer, se gana la pantalla de éxito entera. Si solo estaba abierta
            // la pantalla mientras corría, basta la tarjeta de resumen.
            //
            // Se cierra cualquier CustomModal abierto ANTES de irnos a la
            // pantalla de éxito: ese return temprano desmonta el modal, y
            // desmontar uno ya presentado lo hace desaparecer de golpe y
            // reaparecer al volver.
            setModalVisible(false);
            setExitoPrimeraSync(res.data);
          } else {
            setResumenVisible(true);
          }
          reciénConectado.current = false;
          fetchStatus(); // refresca los contadores de la tarjeta de la cuenta
        }
      } catch (error) {
        // Si falla la consulta del avance no pasa nada grave: la sincronización
        // sigue corriendo en el servidor. Solo dejamos de preguntar.
        if (vigente) setSiguiendoProgreso(false);
      } finally {
        enVuelo = false;
      }
    };

    consultar();
    const id = setInterval(consultar, 3000);

    return () => {
      vigente = false;
      clearInterval(id);
    };
  }, [siguiendoProgreso, fetchStatus]);

  const handleConnectEmail = async (provider: 'gmail' | 'outlook') => {
    try {
      setConnecting(provider);

      const redirectUrl = Linking.createURL('email-sync/callback');

      const endpoint = provider === 'gmail'
        ? '/email-sync/gmail/auth-url'
        : '/email-sync/outlook/auth-url';

      const response = await api.get(endpoint, {
        params: { mobileRedirectUrl: redirectUrl }
      });
      const { authUrl } = response.data;

      if (!authUrl) {
        throw new Error('No se pudo obtener la URL de autorización');
      }

      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        redirectUrl
      );

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const success = url.searchParams.get('success');
        const error = url.searchParams.get('error');
        const email = url.searchParams.get('email');

        if (success === 'true') {
          // El backend arranca la primera revisión solo, al conectar. Empezamos
          // a seguirla ya para no perder los primeros segundos, que son justo
          // cuando el usuario está mirando.
          //
          // Y NO se muestra un modal de "¡Conectado!". Antes había uno, y era un
          // paso de más en el peor sitio: obligaba a tocar "Continuar" para
          // volver a una pantalla que todavía no tenía nada que enseñar. Ahora
          // se cae directo en el progreso y de ahí a la pantalla de éxito con el
          // número, que es lo que la persona vino a ver.
          setProgreso(null);
          setResumenVisible(false);
          setExitoPrimeraSync(null);
          reciénConectado.current = true;
          setSiguiendoProgreso(true);
          fetchStatus();
        } else if (error) {
          showModal('error', 'Error', decodeURIComponent(error));
          // Refrescar estado para asegurar que muestre el estado real
          fetchStatus();
        } else {
          // Respuesta sin success ni error - refrescar estado
          fetchStatus();
        }
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        logger.log('Usuario canceló la autenticación');
        // Refrescar estado para asegurar que no muestre "conectado" falsamente
        fetchStatus();
      }
    } catch (error: any) {
      logger.error(`Error connecting ${provider}:`, error);
      const errorMessage = error.response?.data?.message || error.message || 'No se pudo iniciar la conexión';

      // COMENTADO: Validación de PRO movida al menú principal (AppNavigator)
      // Si el usuario llegó aquí, ya es PRO. Se mantiene por si hay que revertir.
      // const isProRestriction = errorMessage.toLowerCase().includes('pro') ||
      //                          errorMessage.toLowerCase().includes('plan') ||
      //                          error.response?.status === 403;
      //
      // if (isProRestriction && onOpenPlans) {
      //   showModal(
      //     'warning',
      //     'Función PRO',
      //     'La sincronización de email bancario está disponible exclusivamente para usuarios del plan PRO.\n\n¡Mejora tu plan para desbloquear esta y más funciones!',
      //     'Ver Planes',
      //     () => {
      //       // Secuencia correcta para iOS: esperar que cada modal cierre antes de abrir el siguiente
      //       // 1. CustomModal ya se cerró (setModalVisible(false) en showModal callback)
      //       // 2. Esperar 350ms para que la animación del CustomModal termine
      //       setTimeout(() => {
      //         onClose(); // Cierra EmailSync Modal
      //         // 3. Esperar 400ms para que EmailSync Modal termine de cerrar
      //         setTimeout(() => {
      //           onOpenPlans(); // Abre Subscriptions Modal
      //         }, 400);
      //       }, 350);
      //     },
      //     { text: 'Cerrar', action: () => {} }
      //   );
      // } else {
      //   showModal('error', 'Error', errorMessage);
      // }

      // Mostrar error genérico (el usuario ya es PRO si llegó aquí)
      showModal('error', 'Error', errorMessage);
    } finally {
      setConnecting(null);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await api.post('/email-sync/sync', {}, { timeout: 180000 });

      const { result } = response.data;
      const transactionsCreated = result?.transactionsCreated || 0;
      const emailsProcessed = result?.emailsProcessed || 0;
      const emailsSkipped = result?.emailsSkipped || 0;
      const connectionsProcessed = result?.connectionsProcessed || 1;

      if (transactionsCreated > 0) {
        showModal(
          'success',
          'Sincronización completada',
          `Se importaron ${transactionsCreated} nueva(s) transacción(es) de ${connectionsProcessed} cuenta(s).\n\nEmails procesados: ${emailsProcessed}\nEmails omitidos: ${emailsSkipped}`,
          'Continuar',
          () => fetchStatus()
        );
      } else if (emailsProcessed > 0 || emailsSkipped > 0) {
        showModal(
          'info',
          'Sincronización completada',
          `No se crearon nuevas transacciones.\n\nCuentas sincronizadas: ${connectionsProcessed}\nEmails revisados: ${emailsProcessed + emailsSkipped}`,
          'Continuar',
          () => fetchStatus()
        );
      } else {
        showModal(
          'info',
          'Sincronización completada',
          'No encontramos compras nuevas en tus correos.',
          'Continuar',
          () => fetchStatus()
        );
      }
    } catch (error: any) {
      logger.error('Error syncing:', error);

      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        showModal(
          'warning',
          'Sincronización en proceso',
          'La sincronización está tomando más tiempo del esperado. Espera unos segundos y actualiza.',
          'Actualizar',
          () => fetchStatus()
        );
      } else if (error.message === 'Network Error') {
        showModal(
          'warning',
          'Sincronización en proceso',
          'La conexión se interrumpió. Actualiza para ver los resultados.',
          'Actualizar',
          () => fetchStatus()
        );
      } else {
        showModal('error', 'Error', error.response?.data?.message || 'Error al sincronizar');
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = (connection: ConnectionDetail) => {
    setConnectionToDisconnect(connection);
    setShowDisconnectConfirm(true);
  };

  const confirmDisconnect = async () => {
    if (!connectionToDisconnect) return;

    setShowDisconnectConfirm(false);
    setDisconnectingId(connectionToDisconnect.id);

    try {
      await api.delete(`/email-sync/disconnect/${connectionToDisconnect.id}`);
      showModal(
        'success',
        'Email desconectado',
        `${connectionToDisconnect.email} ha sido desconectado exitosamente.`,
        'Continuar',
        () => fetchStatus()
      );
    } catch (error: any) {
      showModal('error', 'Error', error.response?.data?.message || 'Error al desconectar');
    } finally {
      setDisconnectingId(null);
      setConnectionToDisconnect(null);
    }
  };

  // ─── Tarjetas ──────────────────────────────────────────────────────────────
  const apagarTarjeta = async (tarjeta: TarjetaDetectada, quitarImportados: boolean) => {
    setTarjetaAConfirmar(null);
    setErrorTarjetas(null);
    setTarjetaOcupada(tarjeta.last4);
    try {
      const res = await api.post(`/email-sync/cards/${tarjeta.last4}/exclude`, { quitarImportados });
      await fetchCards();
      if ((res.data?.quitados ?? 0) > 0) {
        setQuitadosTotal((q) => q + res.data.quitados);
        // Se borraron transacciones: el inicio y los presupuestos tienen que
        // recalcularse ya, no la próxima vez que se abra la app.
        onTransactionChange();
        fetchStatus();
      }
    } catch (error: any) {
      setErrorTarjetas(error.response?.data?.error || 'No pudimos apagar la tarjeta. Inténtalo de nuevo.');
    } finally {
      setTarjetaOcupada(null);
    }
  };

  const cambiarTarjeta = async (tarjeta: TarjetaDetectada, encender: boolean) => {
    if (!encender) {
      // Con consumos ya importados se pregunta qué hacer con ellos. Sin
      // consumos no hay nada que decidir: se apaga directo.
      if (tarjeta.consumosImportados > 0) {
        setTarjetaAConfirmar(tarjeta);
      } else {
        apagarTarjeta(tarjeta, false);
      }
      return;
    }
    setErrorTarjetas(null);
    setTarjetaOcupada(tarjeta.last4);
    try {
      await api.delete(`/email-sync/cards/${tarjeta.last4}/exclude`);
      await fetchCards();
    } catch (error: any) {
      setErrorTarjetas(error.response?.data?.error || 'No pudimos encender la tarjeta. Inténtalo de nuevo.');
    } finally {
      setTarjetaOcupada(null);
    }
  };

  const agregarTarjeta = async (last4: string) => {
    // Si escribe los dígitos de una tarjeta que ya está en la lista y encendida,
    // es lo mismo que apagarla: pasa por la misma pregunta de qué hacer con lo
    // ya importado, en vez de apagarla en silencio.
    const existente = tarjetas.find((t) => t.last4 === last4);
    if (existente) {
      if (!existente.excluida) cambiarTarjeta(existente, false);
      return;
    }
    setErrorTarjetas(null);
    setTarjetaOcupada(last4);
    try {
      await api.post('/email-sync/cards', { last4 });
      await fetchCards();
    } catch (error: any) {
      setErrorTarjetas(error.response?.data?.error || 'No pudimos agregar la tarjeta. Inténtalo de nuevo.');
    } finally {
      setTarjetaOcupada(null);
    }
  };

  const marcarTarjetasRevisadas = () => {
    setNecesitaRevision(false);
    api.post('/email-sync/cards/revisadas').catch((error) => {
      logger.error('Error marking cards reviewed:', error);
    });
  };

  // Confirmación de apagar una tarjeta. Vista superpuesta dentro de la misma
  // pantalla (ver la nota en `tarjetaAConfirmar`).
  const renderConfirmacionTarjeta = () => {
    if (!tarjetaAConfirmar) return null;
    const n = tarjetaAConfirmar.consumosImportados;
    return (
      <View style={styles.confirmFondo}>
        <View style={styles.confirmCaja}>
          <Text style={styles.confirmTitulo}>Apagar {nombreTarjeta(tarjetaAConfirmar)}</Text>
          <Text style={styles.confirmTexto}>
            Desde ahora no importaremos sus consumos. Ya entraron {n} consumo{n === 1 ? '' : 's'} de esta tarjeta: ¿los quitamos de tus gastos?
          </Text>
          <TouchableOpacity style={styles.confirmPrimario} onPress={() => apagarTarjeta(tarjetaAConfirmar, true)}>
            <Text style={styles.buttonText}>Apagar y quitar {n} consumo{n === 1 ? '' : 's'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmSecundario} onPress={() => apagarTarjeta(tarjetaAConfirmar, false)}>
            <Text style={styles.confirmSecundarioTexto}>Solo dejar de importar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTarjetaAConfirmar(null)}>
            <Text style={styles.confirmCancelar}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleString('es-DO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getProviderIcon = (provider: string) => {
    return provider === 'GMAIL' ? 'logo-google' : 'mail';
  };

  const getProviderColor = (provider: string) => {
    return provider === 'GMAIL' ? '#EA4335' : '#0078D4';
  };

  const getProviderName = (provider: string) => {
    return provider === 'GMAIL' ? 'Gmail' : 'Outlook';
  };

  const onRefresh = () => {
    setRefreshing(true);
    setResumenVisible(false); // jalar para refrescar también descarta el resumen
    setSondeoAbandonado(false);
    abandonadoRef.current = false;
    limiteSondeo.current = null; // el usuario pidió mirar otra vez: reloj nuevo
    fetchStatus();
  };

  const abrirBancos = () => setMostrarBancos(true);

  // Texto y barra de la tarjeta de avance. Mientras el backend no ha terminado
  // de buscar, `correosEncontrados` es 0 y no hay nada que contar todavía: ahí
  // decimos "Buscando" en vez de un "0 de 0" que parece un error.
  const buscando = siguiendoProgreso && (progreso?.correosEncontrados ?? 0) === 0;
  const porcentajeRevisado =
    progreso && progreso.correosEncontrados > 0
      ? Math.min(100, Math.round((progreso.correosProcesados / progreso.correosEncontrados) * 100))
      : 0;

  const isGmailConnected = connectionStatus?.connectedProviders?.includes('GMAIL');
  const isOutlookConnected = connectionStatus?.connectedProviders?.includes('OUTLOOK');
  const hasAnyConnection = (connectionStatus?.connections?.length || 0) > 0;

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gastos en automático</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </View>
    );
  }

  // ─── Pantalla de éxito de la primera conexión ───────────────────────────────
  // Ocupa todo y va con el número real. Es el pago de la promesa del titular:
  // la persona acaba de dar el permiso más sensible que pide la app, y lo que
  // recibe a cambio tiene que ser visible de inmediato, no una pantalla igual a
  // la de antes.
  if (exitoPrimeraSync) {
    const importadas = Math.max(0, exitoPrimeraSync.transaccionesCreadas - quitadosTotal);
    const dias = exitoPrimeraSync.historialDias ?? 90;
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>Gastos en automático</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.exitoContenido}>
          <View style={styles.exitoIcono}>
            <Ionicons name="checkmark-circle" size={64} color="#059669" />
          </View>

          <Text style={styles.exitoTitulo}>
            {importadas > 0 ? 'Listo. Ya no tienes que anotar.' : 'Listo, tu correo quedó conectado.'}
          </Text>

          {/* Con 0 el texto NO puede ser el mismo: decir "encontramos 0 compras"
              con el mismo tono de celebración parece que algo falló. Se explica
              por qué puede estar vacío y qué va a pasar de ahora en adelante. */}
          <Text style={styles.exitoSubtitulo}>
            {importadas > 0
              ? `Encontramos ${importadas} compra${importadas === 1 ? '' : 's'} en tus últimos ${dias} días. De ahora en adelante entran solas.`
              : `No encontramos compras en tus últimos ${dias} días, puede que tu banco no te haya escrito en ese tiempo. De ahora en adelante, cada compra que te notifique entra sola.`}
          </Text>

          {/* Elegir tarjetas justo aquí, antes de que la corporativa ensucie el
              mes: es el único momento en que la persona ve todo lo que entró. */}
          {tarjetas.length > 0 && (
            <View style={styles.exitoTarjetas}>
              <Text style={styles.sectionTitle}>
                Encontramos {tarjetas.length} tarjeta{tarjetas.length === 1 ? '' : 's'}
              </Text>
              <Text style={styles.tarjetasTexto}>
                ¿Alguna es del trabajo? Apágala y quitamos sus consumos de tus gastos.
              </Text>
              <TarjetasSelector
                tarjetas={tarjetas}
                ocupada={tarjetaOcupada}
                onCambiar={cambiarTarjeta}
                onAgregar={agregarTarjeta}
              error={errorTarjetas}
              />
            </View>
          )}

          <TouchableOpacity
            style={styles.exitoBoton}
            onPress={() => {
              if (tarjetas.length > 0) marcarTarjetasRevisadas();
              setExitoPrimeraSync(null);
              onClose();
            }}
          >
            <Text style={styles.buttonText}>{importadas > 0 ? 'Ver mis gastos' : 'Entendido'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (tarjetas.length > 0) marcarTarjetasRevisadas();
              setExitoPrimeraSync(null);
            }}
          >
            <Text style={styles.exitoEnlace}>Ver la configuración</Text>
          </TouchableOpacity>
        </ScrollView>
        {renderConfirmacionTarjeta()}
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gastos en automático</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Avance de la primera revisión (arranca sola al conectar el correo) */}
        {siguiendoProgreso && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.progressTitle}>
                {buscando
                  ? 'Buscando correos de tu banco…'
                  : `Revisando ${progreso?.correosProcesados ?? 0} de ${progreso?.correosEncontrados ?? 0} correos`}
              </Text>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${porcentajeRevisado}%` }]} />
            </View>

            <Text style={styles.progressSub}>
              {(progreso?.transaccionesCreadas ?? 0) > 0
                ? `${progreso?.transaccionesCreadas} transacción(es) encontrada(s) hasta ahora`
                : 'Puedes seguir usando la app, esto continúa solo.'}
            </Text>
          </View>
        )}

        {/* Resultado de la revisión, hasta que el usuario refresque */}
        {!siguiendoProgreso && resumenVisible && progreso && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              {/* Tres estados, no dos. `sondeoAbandonado` es que NOSOTROS
                  dejamos de mirar, no que el servidor terminara: sigue
                  revisando allá. Presentar sus números parciales como el
                  resultado final sería mentir con precisión. */}
              <Ionicons
                name={
                  progreso.estado === 'FAILED' ? 'alert-circle'
                    : sondeoAbandonado ? 'time-outline'
                      : 'checkmark-circle'
                }
                size={22}
                color={progreso.estado === 'FAILED' || sondeoAbandonado ? '#b45309' : '#059669'}
              />
              <Text style={styles.progressTitle}>
                {progreso.estado === 'FAILED'
                  ? 'No pudimos terminar de revisar'
                  : sondeoAbandonado
                    ? 'Esto está tardando más de lo normal'
                    : progreso.transaccionesCreadas > 0
                      ? `Listo: ${progreso.transaccionesCreadas} transacción(es) importada(s)`
                      : 'Listo, no encontramos transacciones nuevas'}
              </Text>
            </View>

            <Text style={styles.progressSub}>
              {progreso.estado === 'FAILED'
                ? 'Toca "Sincronizar Todas" para intentarlo de nuevo.'
                : sondeoAbandonado
                  ? 'Seguimos revisando tu correo en segundo plano. Vuelve en un rato y jala para actualizar.'
                  : `Revisamos ${progreso.correosProcesados} correo(s) de tu bandeja.`}
            </Text>
          </View>
        )}

        {/* Elección de tarjetas, una sola vez. Para quien ya tenía el correo
            conectado antes de que existiera esta opción (o cerró la pantalla de
            éxito sin elegir): va arriba para que no se pierda. */}
        {hasAnyConnection && necesitaRevision && !siguiendoProgreso && tarjetas.length > 0 && (
          <View style={styles.revisionCard}>
            <Text style={styles.revisionTitulo}>Elige de qué tarjetas importamos</Text>
            <Text style={styles.tarjetasTexto}>
              Ahora puedes apagar una tarjeta, por ejemplo la del trabajo, para que sus consumos no se mezclen con los tuyos.
            </Text>
            <TarjetasSelector
              tarjetas={tarjetas}
              ocupada={tarjetaOcupada}
              onCambiar={cambiarTarjeta}
              onAgregar={agregarTarjeta}
              error={errorTarjetas}
            />
            <TouchableOpacity style={styles.revisionBoton} onPress={marcarTarjetasRevisadas}>
              <Text style={styles.buttonText}>Listo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cuentas conectadas */}
        {hasAnyConnection && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cuentas conectadas</Text>
            {connectionStatus?.connections.map((connection) => (
              <View key={connection.id} style={styles.connectionCard}>
                <View style={styles.connectionHeader}>
                  <View style={[styles.providerIcon, { backgroundColor: getProviderColor(connection.provider) }]}>
                    <Ionicons
                      name={getProviderIcon(connection.provider) as any}
                      size={20}
                      color="white"
                    />
                  </View>
                  <View style={styles.connectionInfo}>
                    <Text style={styles.providerName}>{getProviderName(connection.provider)}</Text>
                    <Text style={styles.connectionEmail}>{connection.email}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.disconnectIconButton}
                    onPress={() => handleDisconnect(connection)}
                    disabled={disconnectingId === connection.id}
                  >
                    {disconnectingId === connection.id ? (
                      <ActivityIndicator size="small" color="#dc2626" />
                    ) : (
                      <Ionicons name="trash-outline" size={22} color="#dc2626" />
                    )}
                  </TouchableOpacity>
                </View>
                {/* Acceso revocado: el proveedor nos quitó el permiso y dejamos
                    de importar. Sin este aviso el usuario no se entera — la
                    tarjeta se ve igual de sana y solo puede sospechar por la
                    fecha de "Última sync". Solo él puede arreglarlo. */}
                {connection.lastSyncStatus === 'REVOKED' && (
                  <View style={styles.revokedBanner}>
                    <View style={styles.revokedHeader}>
                      <Ionicons name="alert-circle" size={20} color="#b45309" />
                      <Text style={styles.revokedTitle}>Se perdió el acceso a este correo</Text>
                    </View>
                    <Text style={styles.revokedText}>
                      Dejamos de importar tus gastos. Vuelve a conectarlo para reanudarlo.
                    </Text>
                    <TouchableOpacity
                      style={[styles.revokedButton, connecting !== null && styles.buttonDisabled]}
                      onPress={() => handleConnectEmail(connection.provider === 'GMAIL' ? 'gmail' : 'outlook')}
                      disabled={connecting !== null}
                    >
                      {connecting !== null ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <>
                          <Ionicons name="refresh-outline" size={18} color="white" />
                          <Text style={styles.revokedButtonText}>Reconectar</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.connectionStats}>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{connection.importedCount}</Text>
                    <Text style={styles.statLabel}>Transacciones</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <Text style={styles.statTime}>{formatDate(connection.lastSyncAt)}</Text>
                    <Text style={styles.statLabel}>Última sync</Text>
                  </View>
                </View>
              </View>
            ))}

            {/* Botón de sincronizar */}
            <TouchableOpacity
              style={[styles.syncButton, syncing && styles.buttonDisabled]}
              onPress={handleSync}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="sync-outline" size={20} color="white" />
                  <Text style={styles.buttonText}>Sincronizar Todas</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Tus tarjetas: la elección queda aquí para cambiarla cuando quiera.
            No se muestra mientras está arriba la elección de una sola vez. */}
        {hasAnyConnection && !(necesitaRevision && !siguiendoProgreso && tarjetas.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tus tarjetas</Text>
            <Text style={styles.tarjetasTexto}>
              {tarjetas.length > 0
                ? 'Apaga una tarjeta para que sus consumos no se importen, por ejemplo la del trabajo.'
                : 'Cuando tu banco te avise de una compra, aquí verás tus tarjetas y podrás elegir cuáles importar.'}
            </Text>
            <TarjetasSelector
              tarjetas={tarjetas}
              ocupada={tarjetaOcupada}
              onCambiar={cambiarTarjeta}
              onAgregar={agregarTarjeta}
              error={errorTarjetas}
            />
          </View>
        )}

        {/* Agregar más cuentas o primera conexión */}
        {(!isGmailConnected || !isOutlookConnected) && (
          <View style={styles.section}>
            {hasAnyConnection && <Text style={styles.sectionTitle}>Agregar otra cuenta</Text>}

            {/* Primera conexión: el contrato de datos va ANTES del botón.
                Qué leemos y qué no se lee en la misma pantalla donde se decide,
                no en un enlace de privacidad que nadie abre. Es el permiso más
                sensible que pide la app y lo único que lo hace aceptable es que
                la persona sepa qué entra y qué no antes de tocar Conectar. */}
            {!hasAnyConnection && (
              <>
                <View style={styles.heroSection}>
                  <View style={styles.heroIcon}>
                    <Ionicons name="mail-outline" size={40} color="#2563EB" />
                  </View>
                  {/* Titular en resultado, no en mecanismo: dice lo que gana.
                      "Conecta tu correo" es lo que le cuesta y va en el subtítulo. */}
                  <Text style={styles.heroTitle}>Que tus gastos se anoten solos</Text>
                  <Text style={styles.heroDescription}>
                    Conecta tu correo y cada compra que tu banco te notifica entra sola a
                    FinZen AI. Tú no escribes nada.
                  </Text>
                </View>

                <View style={styles.contratoCard}>
                  <Text style={styles.contratoTituloSi}>QUÉ HACEMOS</Text>
                  {[
                    'Buscamos los correos donde tu banco te avisa de una compra',
                    'Tomamos el monto, el comercio y la fecha',
                    'Los convertimos en transacciones tuyas',
                  ].map((linea) => (
                    <View key={linea} style={styles.contratoFila}>
                      <View style={styles.contratoPunto} />
                      <Text style={styles.contratoTexto}>{linea}</Text>
                    </View>
                  ))}

                  <Text style={[styles.contratoTituloNo, { marginTop: 18 }]}>QUÉ NO HACEMOS</Text>
                  {[
                    'No leemos tus correos personales ni los del trabajo',
                    // La línea más importante del bloque: el miedo real no es
                    // que leamos, es que nos quedemos con sus cosas.
                    'No guardamos el contenido de ningún correo',
                    'No le damos tu información a nadie',
                  ].map((linea) => (
                    <View key={linea} style={styles.contratoFila}>
                      <View style={[styles.contratoPunto, styles.contratoPuntoNo]} />
                      <Text style={styles.contratoTexto}>{linea}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.lineaDeSalida}>
                  Desconéctalo cuando quieras desde Gastos en automático y dejamos de leer.
                </Text>
              </>
            )}

            <View style={styles.connectButtons}>
              {!isGmailConnected && (
                <TouchableOpacity
                  style={[styles.connectButton, styles.gmailButton, connecting && styles.buttonDisabled]}
                  onPress={() => handleConnectEmail('gmail')}
                  disabled={connecting !== null}
                >
                  {connecting === 'gmail' ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons name="logo-google" size={20} color="white" />
                      <Text style={styles.buttonText}>Conectar Gmail</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {!isOutlookConnected && (
                <TouchableOpacity
                  style={[styles.connectButton, styles.outlookButton, connecting && styles.buttonDisabled]}
                  onPress={() => handleConnectEmail('outlook')}
                  disabled={connecting !== null}
                >
                  {connecting === 'outlook' ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons name="mail" size={20} color="white" />
                      <Text style={styles.buttonText}>Conectar Outlook</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* "Ahora no" existe a propósito y no es un descuido de diseño.
                Forzarlo como puerta dura sería pedirle el permiso más invasivo
                que hay a alguien que lleva cinco minutos con la app. El que dice
                que no hoy puede decir que sí en tres días, y para eso la función
                tiene que seguir estando donde la busque. */}
            {!hasAnyConnection && (
              <TouchableOpacity style={styles.ahoraNo} onPress={onClose} disabled={connecting !== null}>
                <Text style={styles.ahoraNoTexto}>Ahora no</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Bancos que reconocemos. En la primera conexión va como enlace
            secundario —no como lista abierta— para no competir con el bloque de
            qué sí y qué no, que es lo que la persona tiene que leer antes de
            decidir. Ya conectada, la lista se muestra sin más. */}
        {supportedBanks.length > 0 && (
          <View style={styles.section}>
            {!hasAnyConnection && !mostrarBancos ? (
              <TouchableOpacity onPress={abrirBancos}>
                <Text style={styles.enlaceSecundario}>
                  Ver los {supportedBanks.length} bancos que reconocemos
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Bancos que reconocemos</Text>
                <View style={styles.banksList}>
                  {supportedBanks.map((bank) => (
                    <View key={bank.id} style={styles.bankChip}>
                      <Ionicons name="business-outline" size={14} color="#2563EB" />
                      <Text style={styles.bankChipText}>
                        {bank.name.replace(' Dominicano', '').replace('Asociacion Popular de Ahorros y Prestamos ', '')}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* Nota informativa */}
        <View style={styles.infoNote}>
          <Ionicons name="information-circle-outline" size={20} color="#2563EB" />
          <Text style={styles.infoNoteText}>
            Importamos las transacciones desde los emails de tu banco. Si eliminaste algún correo o lo moviste a spam, no podremos detectarlo. Ocasionalmente, algunos emails podrían no procesarse correctamente.
          </Text>
        </View>

        {/* Notas de seguridad */}
        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#059669" />
          <Text style={styles.securityText}>
            Solo leemos emails de bancos. Tu información está segura y nunca compartimos tus datos.
          </Text>
        </View>
      </ScrollView>

      {renderConfirmacionTarjeta()}

      <CustomModal
        visible={modalVisible}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
        buttonText={modalButtonText}
        onClose={modalOnClose}
        showSecondaryButton={modalShowSecondary}
        secondaryButtonText={modalSecondaryText}
        onSecondaryPress={modalSecondaryAction}
      />

      <CustomModal
        visible={showDisconnectConfirm}
        type="warning"
        title="Desconectar Email"
        message={`¿Estás seguro que quieres desconectar ${connectionToDisconnect?.email}? Las transacciones ya importadas se mantendrán.`}
        buttonText="Desconectar"
        showSecondaryButton={true}
        secondaryButtonText="Cancelar"
        onClose={confirmDisconnect}
        onSecondaryPress={() => {
          setShowDisconnectConfirm(false);
          setConnectionToDisconnect(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  progressCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1e3a8a',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#dbeafe',
    overflow: 'hidden',
    marginTop: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#2563EB',
  },
  progressSub: {
    fontSize: 13,
    color: '#1d4ed8',
    marginTop: 10,
  },

  // ─── Contrato de datos (qué hacemos / qué no hacemos) ───────────────────────
  contratoCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  contratoTituloSi: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#059669',
    marginBottom: 10,
  },
  contratoTituloNo: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#b91c1c',
    marginBottom: 10,
  },
  contratoFila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  contratoPunto: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#059669',
    marginTop: 7,
    marginRight: 10,
  },
  contratoPuntoNo: {
    backgroundColor: '#b91c1c',
  },
  contratoTexto: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
  lineaDeSalida: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  ahoraNo: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  ahoraNoTexto: {
    fontSize: 15,
    color: '#6b7280',
  },
  enlaceSecundario: {
    fontSize: 14,
    color: '#2563EB',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },

  // ─── Pantalla de éxito de la primera conexión ───────────────────────────────
  // `flexGrow` y no `flex`: ahora va dentro de un ScrollView (la lista de
  // tarjetas puede no caber), y con `flex: 1` el contenido no se desplazaría.
  exitoContenido: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  exitoTarjetas: {
    alignSelf: 'stretch',
    marginTop: 24,
    marginBottom: 8,
  },
  tarjetasTexto: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  revisionCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 16,
    marginBottom: 20,
  },
  revisionTitulo: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  revisionBoton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  confirmFondo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  confirmCaja: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  confirmTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  confirmTexto: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 21,
  },
  confirmPrimario: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  confirmSecundario: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmSecundarioTexto: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  confirmCancelar: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 6,
  },
  exitoIcono: {
    marginBottom: 24,
  },
  exitoTitulo: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  exitoSubtitulo: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 32,
  },
  exitoBoton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  exitoEnlace: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  // Tarjeta de conexión
  connectionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  providerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  connectionEmail: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  disconnectIconButton: {
    padding: 4,
  },
  revokedBanner: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  revokedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  revokedTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  revokedText: {
    fontSize: 13,
    color: '#92400e',
    marginBottom: 10,
  },
  revokedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#d97706',
    borderRadius: 8,
    paddingVertical: 10,
  },
  revokedButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  connectionStats: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  statTime: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 12,
  },
  // Hero section
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Botones
  connectButtons: {
    gap: 10,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 10,
  },
  gmailButton: {
    backgroundColor: '#EA4335',
  },
  outlookButton: {
    backgroundColor: '#0078D4',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 10,
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Bancos
  banksList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bankChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  bankChipText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500',
  },
  // Nota informativa
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 12,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  // Nota de seguridad
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ecfdf5',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    color: '#065f46',
    lineHeight: 18,
  },
});

export default EmailSyncScreen;
