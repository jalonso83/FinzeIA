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

import { logger } from '../../utils/logger';
interface StripeWebViewProps {
  visible: boolean;
  checkoutUrl: string;
  onSuccess: (sessionId?: string) => void;
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

    logger.log('🔍 Navigation state changed:', url);

    // Detectar redirección a success Y extraer sessionId
    if (url.includes('/subscription/success')) {
      logger.log('✅ Payment successful detected');

      // Extraer sessionId de la URL
      const sessionIdMatch = url.match(/session_id=([^&]+)/);
      if (sessionIdMatch && sessionIdMatch[1]) {
        const sessionId = sessionIdMatch[1];
        logger.log('📝 SessionId extraído:', sessionId);
        setLoading(false);
        onSuccess(sessionId); // Pasar sessionId al callback
      } else {
        logger.log('⚠️ No se pudo extraer sessionId de la URL');
        setLoading(false);
        onSuccess(); // Llamar sin sessionId como fallback
      }
      return;
    }

    // Detectar redirección a canceled
    if (url.includes('/subscription/canceled')) {
      logger.log('❌ Payment canceled by user');
      setLoading(false);
      onCancel();
      return;
    }

    // Detectar cuando Stripe cierra la ventana (X dentro del checkout)
    // Stripe redirige a la URL base o a about:blank cuando se cierra
    if (url === 'about:blank' || url.includes('checkout.stripe.com/canceled')) {
      logger.log('❌ Stripe checkout closed by user');
      setLoading(false);
      onCancel();
      return;
    }
  };

  // Manejar mensajes desde Stripe (para detectar el cierre del checkout)
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      logger.log('📩 Message from WebView:', data);

      if (data.type === 'checkout_closed' || data.action === 'close') {
        logger.log('❌ Checkout closed via message');
        setLoading(false);
        onCancel();
      }
    } catch (e) {
      // No es JSON, ignorar
    }
  };

  // Script para interceptar el cierre del checkout de Stripe
  const injectedJavaScript = `
    (function() {
      // Interceptar clicks en el botón X de Stripe
      document.addEventListener('click', function(e) {
        const target = e.target;
        // Stripe usa varios selectores para el botón de cerrar
        if (target.closest('[data-testid="hosted-payment-cancel-button"]') ||
            target.closest('.CloseButton') ||
            target.closest('[aria-label="Close"]') ||
            target.closest('[aria-label="Cerrar"]')) {
          window.ReactNativeWebView.postMessage(JSON.stringify({type: 'checkout_closed'}));
        }
      }, true);

      // Detectar si window.close es llamado
      const originalClose = window.close;
      window.close = function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({type: 'checkout_closed'}));
        return originalClose.apply(this, arguments);
      };
    })();
    true;
  `;

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
          onMessage={handleMessage}
          injectedJavaScript={injectedJavaScript}
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
