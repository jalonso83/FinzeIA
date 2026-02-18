import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import CustomModal from '../components/modals/CustomModal';
import { referralsAPI, ReferralStats } from '../utils/api';

import { logger } from '../utils/logger';
interface ReferralsScreenProps {
  onClose?: () => void;
}

const ReferralsScreen: React.FC<ReferralsScreenProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Estados para CustomModal
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    buttonText?: string;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const response = await referralsAPI.getStats();
      setStats(response.data);
    } catch (err: any) {
      logger.error('Error loading referral stats:', err);
      setError(err.response?.data?.message || 'Error al cargar datos de referidos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCopyCode = async () => {
    if (!stats?.referralCode) return;

    try {
      await Clipboard.setStringAsync(stats.referralCode);
      setModalConfig({
        visible: true,
        type: 'success',
        title: 'Copiado',
        message: 'Tu código de referido ha sido copiado al portapapeles',
        buttonText: 'Entendido',
      });
    } catch (err) {
      logger.error('Error copying code:', err);
    }
  };

  const handleShare = async () => {
    if (!stats) return;

    const message = `¡Únete a FinZen AI y toma el control de tus finanzas! 🚀\n\nUsa mi código de referido: ${stats.referralCode}\n\nObtendrás ${stats.config.discountPercent}% de descuento en tu primer mes.\n\nIngresa el código al registrarte en la app.`;

    try {
      await Share.share({
        message,
        title: 'Invita a tus amigos a FinZen AI',
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        logger.error('Error sharing:', err);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REWARDED':
        return '#10B981';
      case 'CONVERTED':
        return '#3B82F6';
      case 'PENDING':
        return '#F59E0B';
      case 'EXPIRED':
      case 'CANCELLED':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'REWARDED':
        return 'Recompensado';
      case 'CONVERTED':
        return 'Convertido';
      case 'PENDING':
        return 'Pendiente';
      case 'EXPIRED':
        return 'Expirado';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Close Button */}
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={28} color="#1F2937" />
          </TouchableOpacity>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="gift" size={32} color="#2563EB" />
          </View>
          <Text style={styles.title}>Invita Amigos</Text>
          <Text style={styles.subtitle}>
            Comparte FinZen AI y gana recompensas por cada amigo que se suscriba
          </Text>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {stats && (
          <>
            {/* Referral Code Card */}
            <View style={styles.codeCard}>
              <Text style={styles.codeLabel}>Tu Código de Referido</Text>
              <View style={styles.codeContainer}>
                <Text style={styles.codeText}>{stats.referralCode}</Text>
                <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
                  <Ionicons name="copy-outline" size={20} color="#2563EB" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                <Ionicons name="share-social" size={20} color="#fff" />
                <Text style={styles.shareButtonText}>Compartir con Amigos</Text>
              </TouchableOpacity>
            </View>

            {/* Benefits Section */}
            <View style={styles.benefitsCard}>
              <Text style={styles.sectionTitle}>Beneficios</Text>
              <View style={styles.benefitRow}>
                <View style={styles.benefitIcon}>
                  <Ionicons name="person-add" size={24} color="#10B981" />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitTitle}>Tu amigo recibe</Text>
                  <Text style={styles.benefitValue}>
                    {stats.config.discountPercent}% de descuento en su primer mes
                  </Text>
                </View>
              </View>
              <View style={styles.benefitDivider} />
              <View style={styles.benefitRow}>
                <View style={[styles.benefitIcon, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="trophy" size={24} color="#2563EB" />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitTitle}>Tú ganas</Text>
                  <Text style={styles.benefitValue}>
                    {stats.config.freeMonths} mes{stats.config.freeMonths > 1 ? 'es' : ''} gratis por cada amigo que pague
                  </Text>
                </View>
              </View>
            </View>

            {/* Stats Section */}
            <View style={styles.statsCard}>
              <Text style={styles.sectionTitle}>Tus Estadísticas</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.totalReferrals}</Text>
                  <Text style={styles.statLabel}>Invitados</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: '#F59E0B' }]}>
                    {stats.pendingReferrals}
                  </Text>
                  <Text style={styles.statLabel}>Pendientes</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: '#10B981' }]}>
                    {stats.rewardedReferrals}
                  </Text>
                  <Text style={styles.statLabel}>Exitosos</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: '#2563EB' }]}>
                    {stats.totalRewardsEarned}
                  </Text>
                  <Text style={styles.statLabel}>Meses Ganados</Text>
                </View>
              </View>
            </View>

            {/* Referrals List */}
            {stats.referralsList.length > 0 && (
              <View style={styles.listCard}>
                <Text style={styles.sectionTitle}>Amigos Invitados</Text>
                {stats.referralsList.map((referral, index) => (
                  <View
                    key={referral.id}
                    style={[
                      styles.referralItem,
                      index < stats.referralsList.length - 1 && styles.referralItemBorder,
                    ]}
                  >
                    <View style={styles.referralInfo}>
                      <Text style={styles.referralName}>{referral.refereeName}</Text>
                      <Text style={styles.referralEmail}>{referral.refereeEmail}</Text>
                      <Text style={styles.referralDate}>
                        {new Date(referral.createdAt).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: `${getStatusColor(referral.status)}20` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(referral.status) },
                        ]}
                      >
                        {getStatusLabel(referral.status)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Empty State */}
            {stats.referralsList.length === 0 && (
              <View style={styles.emptyCard}>
                <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>Sin referidos aún</Text>
                <Text style={styles.emptyText}>
                  ¡Comparte tu código y empieza a ganar recompensas!
                </Text>
              </View>
            )}

            {/* Terms Section */}
            <View style={styles.termsCard}>
              <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
              <Text style={styles.termsText}>
                Tu amigo tiene {stats.config.expiryDays} días para suscribirse después de
                registrarse. Las recompensas se aplican automáticamente cuando tu amigo
                realiza su primer pago.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Custom Modal */}
      <CustomModal
        visible={modalConfig.visible}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        buttonText={modalConfig.buttonText}
        onClose={() => setModalConfig({ ...modalConfig, visible: false })}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 10,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
  },
  codeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 12,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  codeText: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: 1,
  },
  copyButton: {
    padding: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  benefitsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  benefitValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  benefitDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 14,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  statItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  listCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  referralItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  referralItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  referralInfo: {
    flex: 1,
  },
  referralName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  referralEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  referralDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  termsCard: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  termsText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
});

export default ReferralsScreen;
