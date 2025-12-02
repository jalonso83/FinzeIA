import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

interface StripeWebViewProps {
  visible: boolean;
  checkoutUrl: string;
  onSuccess: () => void;
  onCancel: () => void;
  onClose: () => void;
}

const StripeWebView: React.FC<StripeWebViewProps> = ({
  visible,
  checkoutUrl,
  onSuccess,
  onCancel,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);

  const handleNavigationStateChange = (navState: any) => {
    const { url } = navState;

    // Detectar redirección a success
    if (url.includes('/subscription/success') || url.includes('session_id')) {
      console.log('✅ Payment successful, closing WebView');
      setLoading(false);
      onSuccess();
      return;
    }

    // Detectar redirección a canceled
    if (url.includes('/subscription/canceled')) {
      console.log('❌ Payment canceled by user');
      setLoading(false);
      onCancel();
      return;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pago Seguro</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6C47FF" />
            <Text style={styles.loadingText}>Cargando pago seguro...</Text>
          </View>
        )}

        {/* WebView */}
        <WebView
          source={{ uri: checkoutUrl }}
          style={styles.webview}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={handleNavigationStateChange}
          startInLoadingState={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          sharedCookiesEnabled={true}
        />

        {/* Powered by Stripe */}
        <View style={styles.footer}>
          <Ionicons name="lock-closed" size={16} color="#10B981" />
          <Text style={styles.footerText}>Pago Seguro • Se aplicarán cargos reales</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 36,
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  webview: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
  },
});

export default StripeWebView;
