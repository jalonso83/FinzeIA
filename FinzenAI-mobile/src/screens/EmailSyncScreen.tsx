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
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

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
          const providerName = provider === 'gmail' ? 'Gmail' : 'Outlook';
          showModal(
            'success',
            '¡Conectado!',
            `Tu cuenta ${email || `de ${providerName}`} ha sido conectada exitosamente.`,
            'Continuar',
            () => fetchStatus()
          );
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
      //       onClose();
      //       onOpenPlans();
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
          'No se encontraron nuevos emails bancarios.',
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
    fetchStatus();
  };

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

        {/* Agregar más cuentas o primera conexión */}
        {(!isGmailConnected || !isOutlookConnected) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {hasAnyConnection ? 'Agregar otra cuenta' : 'Conectar cuenta de email'}
            </Text>

            {!hasAnyConnection && (
              <View style={styles.heroSection}>
                <View style={styles.heroIcon}>
                  <Ionicons name="mail-outline" size={48} color="#2563EB" />
                </View>
                <Text style={styles.heroTitle}>Importa tus gastos automáticamente</Text>
                <Text style={styles.heroDescription}>
                  Conecta tu correo y detectaremos las notificaciones de tu banco para registrar tus transacciones.
                </Text>
              </View>
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
                      <Text style={styles.buttonText}>Gmail</Text>
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
                      <Text style={styles.buttonText}>Outlook / Hotmail</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Bancos soportados */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bancos soportados</Text>
          <View style={styles.banksList}>
            {supportedBanks.slice(0, 6).map((bank) => (
              <View key={bank.id} style={styles.bankChip}>
                <Ionicons name="business-outline" size={14} color="#2563EB" />
                <Text style={styles.bankChipText}>
                  {bank.name.replace(' Dominicano', '').replace('Asociacion Popular de Ahorros y Prestamos ', '')}
                </Text>
              </View>
            ))}
            {supportedBanks.length > 6 && (
              <View style={styles.bankChip}>
                <Text style={styles.bankChipText}>+{supportedBanks.length - 6} más</Text>
              </View>
            )}
          </View>
        </View>

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
