import React, { useState, useEffect, useCallback } from 'react';
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

interface EmailSyncScreenProps {
  onClose: () => void;
}

interface ConnectionStatus {
  connected: boolean;
  email?: string;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  importedCount?: number;
}

interface SupportedBank {
  id: string;
  name: string;
  country: string;
  logoUrl?: string;
  isActive: boolean;
}

const EmailSyncScreen: React.FC<EmailSyncScreenProps> = ({ onClose }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [supportedBanks, setSupportedBanks] = useState<SupportedBank[]>([]);

  // Estados para CustomModal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalButtonText, setModalButtonText] = useState('Continuar');
  const [modalOnClose, setModalOnClose] = useState<() => void>(() => () => setModalVisible(false));

  // Estado para modal de confirmación de desconexión
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const showModal = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    buttonText: string = 'Continuar',
    onCloseCallback?: () => void
  ) => {
    setModalType(type);
    setModalTitle(title);
    setModalMessage(message);
    setModalButtonText(buttonText);
    setModalOnClose(() => () => {
      setModalVisible(false);
      if (onCloseCallback) onCloseCallback();
    });
    setModalVisible(true);
  };

  const fetchStatus = useCallback(async () => {
    try {
      // Primero obtener bancos soportados (público, no requiere auth)
      const banksRes = await api.get('/email-sync/supported-banks').catch(() => ({ data: { banks: [] } }));
      const banks = banksRes.data.banks || [];
      // Asegurar que cada banco tenga un id para las keys de React
      setSupportedBanks(banks.map((bank: any, index: number) => ({
        ...bank,
        id: bank.id || `bank-${index}`,
      })));

      // Luego intentar obtener status (requiere auth, puede fallar)
      try {
        const statusRes = await api.get('/email-sync/status');
        setConnectionStatus({
          connected: statusRes.data.connected || false,
          email: statusRes.data.email,
          lastSyncAt: statusRes.data.lastSyncAt,
          lastSyncStatus: statusRes.data.lastSyncStatus,
          importedCount: statusRes.data.importedCount,
        });
      } catch (statusError: any) {
        // Si es 401, simplemente mostrar como no conectado (sin hacer logout)
        console.log('Status check failed, showing as not connected');
        setConnectionStatus({ connected: false });
      }
    } catch (error) {
      console.error('Error fetching email sync data:', error);
      setConnectionStatus({ connected: false });
      setSupportedBanks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleConnectGmail = async () => {
    try {
      setConnecting(true);

      // Definir la URL de retorno (deep link)
      const redirectUrl = Linking.createURL('email-sync/callback');
      console.log('Redirect URL:', redirectUrl);

      // Obtener la URL de autorización de Gmail, pasando la redirect URL
      const response = await api.get('/email-sync/gmail/auth-url', {
        params: { mobileRedirectUrl: redirectUrl }
      });
      const { authUrl } = response.data;

      if (!authUrl) {
        throw new Error('No se pudo obtener la URL de autorización');
      }

      // Abrir el navegador de autenticación
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        redirectUrl
      );

      console.log('WebBrowser result:', result);

      if (result.type === 'success' && result.url) {
        // Parsear la URL de callback
        const url = new URL(result.url);
        const success = url.searchParams.get('success');
        const error = url.searchParams.get('error');
        const email = url.searchParams.get('email');

        if (success === 'true') {
          showModal(
            'success',
            '¡Conectado!',
            `Tu cuenta ${email || 'de Gmail'} ha sido conectada exitosamente.`,
            'Continuar',
            () => fetchStatus()
          );
        } else if (error) {
          showModal('error', 'Error', decodeURIComponent(error));
        }
      } else if (result.type === 'cancel') {
        console.log('Usuario canceló la autenticación');
      }
    } catch (error: any) {
      console.error('Error connecting Gmail:', error);
      showModal('error', 'Error', error.response?.data?.message || error.message || 'No se pudo iniciar la conexión');
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      // Timeout extendido para sincronización (3 minutos) porque procesa muchos emails con AI
      const response = await api.post('/email-sync/sync', {}, { timeout: 180000 });

      const { result } = response.data;
      const transactionsCreated = result?.transactionsCreated || 0;
      const emailsProcessed = result?.emailsProcessed || 0;
      const emailsSkipped = result?.emailsSkipped || 0;

      if (transactionsCreated > 0) {
        showModal(
          'success',
          'Sincronización completada',
          `Se importaron ${transactionsCreated} nueva(s) transacción(es).\n\nEmails procesados: ${emailsProcessed}\nEmails omitidos: ${emailsSkipped} (duplicados o pagos)`,
          'Continuar',
          () => fetchStatus()
        );
      } else if (emailsProcessed > 0 || emailsSkipped > 0) {
        showModal(
          'info',
          'Sincronización completada',
          `No se crearon nuevas transacciones.\n\nEmails revisados: ${emailsProcessed + emailsSkipped}\nOmitidos: ${emailsSkipped} (ya importados, duplicados o pagos de tarjeta)`,
          'Continuar',
          () => fetchStatus()
        );
      } else {
        showModal(
          'info',
          'Sincronización completada',
          'No se encontraron nuevos emails bancarios.',
          'Continuar',
          () => fetchStatus()
        );
      }
    } catch (error: any) {
      console.error('Error syncing:', error);

      // Si es un timeout, la sincronización probablemente sí se completó en el backend
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        showModal(
          'warning',
          'Sincronización en proceso',
          'La sincronización está tomando más tiempo del esperado. Espera unos segundos y actualiza para ver los resultados.',
          'Actualizar',
          () => fetchStatus()
        );
      } else if (error.message === 'Network Error') {
        // Network Error también puede ser timeout
        showModal(
          'warning',
          'Sincronización en proceso',
          'La conexión se interrumpió pero la sincronización puede haber terminado. Actualiza para ver los resultados.',
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

  const handleDisconnect = () => {
    setShowDisconnectConfirm(true);
  };

  const confirmDisconnect = async () => {
    setShowDisconnectConfirm(false);
    try {
      await api.delete('/email-sync/disconnect');
      setConnectionStatus({ connected: false });
      showModal('success', 'Email desconectado', 'Tu email ha sido desconectado exitosamente.');
    } catch (error: any) {
      showModal('error', 'Error', error.response?.data?.message || 'Error al desconectar');
    }
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

  const onRefresh = () => {
    setRefreshing(true);
    fetchStatus();
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Email Bancario</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Email Bancario</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {!connectionStatus?.connected ? (
          // Estado: No conectado
          <>
            <View style={styles.heroSection}>
              <View style={styles.heroIcon}>
                <Ionicons name="mail-outline" size={48} color="#2563EB" />
              </View>
              <Text style={styles.heroTitle}>Importa tus gastos automáticamente</Text>
              <Text style={styles.heroDescription}>
                Conecta tu Gmail y detectaremos las notificaciones de tu banco para registrar tus transacciones automáticamente.
              </Text>
            </View>

            <View style={styles.banksSection}>
              <Text style={styles.sectionTitle}>Bancos soportados</Text>
              <View style={styles.banksList}>
                {supportedBanks.slice(0, 6).map((bank) => (
                  <View key={bank.id} style={styles.bankChip}>
                    <Ionicons name="business-outline" size={14} color="#2563EB" />
                    <Text style={styles.bankChipText}>{bank.name.replace(' Dominicano', '').replace('Asociacion Popular de Ahorros y Prestamos ', '')}</Text>
                  </View>
                ))}
                {supportedBanks.length > 6 && (
                  <View style={styles.bankChip}>
                    <Text style={styles.bankChipText}>+{supportedBanks.length - 6} más</Text>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.connectButton, connecting && styles.connectButtonDisabled]}
              onPress={handleConnectGmail}
              disabled={connecting}
            >
              {connecting ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="white" />
                  <Text style={styles.connectButtonText}>Conectar Gmail</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.securityNote}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#059669" />
              <Text style={styles.securityText}>
                Solo leemos emails de bancos. Tu información está segura y nunca compartimos tus datos.
              </Text>
            </View>

            <View style={styles.infoNote}>
              <Ionicons name="information-circle-outline" size={20} color="#2563EB" />
              <Text style={styles.infoNoteText}>
                Importamos las transacciones desde los emails de tu banco. Si eliminaste algún correo o lo moviste a spam, no podremos detectarlo. Ocasionalmente, algunos emails podrían no procesarse correctamente.
              </Text>
            </View>
          </>
        ) : (
          // Estado: Conectado
          <>
            <View style={styles.connectedHeader}>
              <View style={styles.connectedIcon}>
                <Ionicons name="checkmark-circle" size={32} color="#059669" />
              </View>
              <Text style={styles.connectedTitle}>Conectado</Text>
              <Text style={styles.connectedEmail}>{connectionStatus.email}</Text>
            </View>

            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{connectionStatus.importedCount || 0}</Text>
                <Text style={styles.statLabel}>Transacciones importadas</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatDate(connectionStatus.lastSyncAt)}</Text>
                <Text style={styles.statLabel}>Última sincronización</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="time-outline" size={20} color="#2563EB" />
              <Text style={styles.infoText}>
                La sincronización automática se ejecuta cada hora. También puedes sincronizar manualmente.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
              onPress={handleSync}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="sync-outline" size={20} color="white" />
                  <Text style={styles.syncButtonText}>Sincronizar Ahora</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.disconnectButton}
              onPress={handleDisconnect}
            >
              <Ionicons name="unlink-outline" size={20} color="#dc2626" />
              <Text style={styles.disconnectButtonText}>Desconectar Email</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Modal general para mensajes */}
      <CustomModal
        visible={modalVisible}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
        buttonText={modalButtonText}
        onClose={modalOnClose}
      />

      {/* Modal de confirmación para desconectar */}
      <CustomModal
        visible={showDisconnectConfirm}
        type="warning"
        title="Desconectar Email"
        message="¿Estás seguro que quieres desconectar tu email? Las transacciones ya importadas se mantendrán."
        buttonText="Desconectar"
        showSecondaryButton={true}
        secondaryButtonText="Cancelar"
        onClose={confirmDisconnect}
        onSecondaryPress={() => setShowDisconnectConfirm(false)}
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
    padding: 20,
  },
  // Estado: No conectado
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 20,
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
  banksSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
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
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
  },
  connectButtonDisabled: {
    opacity: 0.7,
  },
  connectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
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
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 12,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  // Estado: Conectado
  connectedHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  connectedIcon: {
    marginBottom: 8,
  },
  connectedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 4,
  },
  connectedEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    marginBottom: 12,
  },
  syncButtonDisabled: {
    opacity: 0.7,
  },
  syncButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  disconnectButtonText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EmailSyncScreen;
