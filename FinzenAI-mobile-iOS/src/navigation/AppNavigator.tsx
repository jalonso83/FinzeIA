// Navegación principal de la app móvil FinZen
// Configuración multiplataforma (Android + iOS)

import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TouchableOpacity, Alert, View, Text, Modal, Image, Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProfileForm from '../components/profile/ProfileForm';
import ChangePasswordForm from '../components/ChangePasswordForm';
import CustomModal from '../components/modals/CustomModal';
import api from '../utils/api';

// Screens (las crearemos después)
import DashboardScreen from '../screens/DashboardScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import BudgetsScreen from '../screens/BudgetsScreen';
import GoalsScreen from '../screens/GoalsScreen';
import ToolsScreen from '../screens/ToolsScreen';
import FakeToolsScreen from '../screens/FakeToolsScreen';
import ZenioScreen from '../screens/ZenioScreen';
import LoanCalculatorScreen from '../screens/LoanCalculatorScreen';
import InvestmentSimulatorScreen from '../screens/InvestmentSimulatorScreen';
import GoalCalculatorScreen from '../screens/GoalCalculatorScreen';
import SkipVsSaveScreen from '../screens/SkipVsSaveScreen';
import InflationCalculatorScreen from '../screens/InflationCalculatorScreen';
import AntExpenseDetectiveScreen from '../screens/AntExpenseDetectiveScreen';
import RemindersScreen from '../screens/RemindersScreen';
import AddReminderScreen from '../screens/AddReminderScreen';
import ReferralsScreen from '../screens/ReferralsScreen';
import HelpCenterScreen from '../screens/HelpCenterScreen';
import SubscriptionsScreen from '../screens/SubscriptionsScreen';
import PaymentHistoryScreen from '../screens/PaymentHistoryScreen';
import EmailSyncScreen from '../screens/EmailSyncScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import WeeklyReportsScreen from '../screens/WeeklyReportsScreen';
import NotificationBell from '../components/NotificationBell';
import UtilitiesMenu from '../components/UtilitiesMenu';
import ZenioFloatingButton from '../components/ZenioFloatingButton';
import VoiceZenioFloatingButton from '../components/VoiceZenioFloatingButton';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import OnboardingWelcomeScreen from '../screens/OnboardingWelcomeScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

// Stores
import { useAuthStore } from '../stores/auth';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { useDashboardStore } from '../stores/dashboard';
import { useNotificationStore } from '../stores/notificationStore';

// Services
import notificationService from '../services/notificationService';
import { revenueCatMobileService } from '../services/revenueCatService';

// Hooks
import { useBiometric } from '../hooks/useBiometric';

import { logger } from '../utils/logger';
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Navegación de autenticación y onboarding
function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="OnboardingWelcome" component={OnboardingWelcomeScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    </Stack.Navigator>
  );
}

// Stack Navigator para Herramientas
function ToolsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ToolsHome" component={ToolsScreen} />
      <Stack.Screen name="Reminders" component={RemindersScreen} />
      <Stack.Screen name="AddReminder" component={AddReminderScreen} />
      <Stack.Screen name="Referrals" component={ReferralsScreen} />
      <Stack.Screen name="LoanCalculator" component={LoanCalculatorScreen} />
      <Stack.Screen name="InvestmentSimulator" component={InvestmentSimulatorScreen} />
      <Stack.Screen name="GoalCalculator" component={GoalCalculatorScreen} />
      <Stack.Screen name="SkipVsSave" component={SkipVsSaveScreen} />
      <Stack.Screen name="InflationCalculator" component={InflationCalculatorScreen} />
      <Stack.Screen name="AntExpenseDetective" component={AntExpenseDetectiveScreen} />
    </Stack.Navigator>
  );
}

// Navegación principal con tabs
function MainTabNavigator({
  setShowUserMenu,
  setShowNotifications
}: {
  setShowUserMenu: (show: boolean) => void;
  setShowNotifications: (show: boolean) => void;
}) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Tools') {
            // Para Tools, usar UtilitiesMenu como ícono
            return <UtilitiesMenu color={color} focused={focused} />;
          }

          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Transactions':
              iconName = focused ? 'list' : 'list-outline';
              break;
            case 'Budgets':
              iconName = focused ? 'wallet' : 'wallet-outline';
              break;
            case 'Goals':
              iconName = focused ? 'trophy' : 'trophy-outline';
              break;
            case 'HelpCenter':
              iconName = focused ? 'help-circle' : 'help-circle-outline';
              break;
            default:
              iconName = 'home-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563EB', // Azul principal de FinZen
        tabBarInactiveTintColor: 'gray',
        headerShown: route.name === 'Dashboard', // Solo mostrar header en Dashboard
        headerTitle: route.name === 'Dashboard' ? `Hola, ${user?.name}!` : '',
        headerTitleAlign: 'left', // Alinear título a la izquierda en ambas plataformas
        headerStyle: {
          backgroundColor: 'white',
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 1,
          },
          shadowOpacity: 0.08,
          shadowRadius: 2,
          elevation: 1,
          height: Math.max(110 + insets.top, 120),
        },
        headerRight: route.name === 'Dashboard' ? () => (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginRight: Math.max(insets.right + 12, 20),
            marginTop: Math.max(insets.top - 20, 0),
            gap: 8,
          }}>
            {/* Notification Bell */}
            <View style={{
              backgroundColor: '#f8fafc',
              borderRadius: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
              elevation: 2,
              marginBottom: 20,
            }}>
              <NotificationBell
                onPress={() => setShowNotifications(true)}
                size={22}
                color="#374151"
              />
            </View>
            {/* User Menu Button */}
            <TouchableOpacity
              onPress={() => setShowUserMenu(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 10,
                backgroundColor: '#f8fafc',
                borderRadius: 22,
                shadowColor: '#000',
                shadowOffset: {
                  width: 0,
                  height: 3,
                },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 3,
                marginBottom: 20,
              }}
            >
              <View style={{
                width: 32,
                height: 32,
                backgroundColor: '#2563EB',
                borderRadius: 16,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 8,
              }}>
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </TouchableOpacity>
          </View>
        ) : undefined,
        tabBarStyle: {
          paddingBottom: insets.bottom + 5,
          paddingTop: 8,
          height: 80 + insets.bottom,
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingHorizontal: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
          textAlign: 'center',
        },
        tabBarItemStyle: {
          paddingHorizontal: 0,
          justifyContent: 'center',
          alignItems: 'center',
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ 
          tabBarLabel: 'Inicio',
          tabBarItemStyle: { flex: 1.5 }
        }}
      />
      <Tab.Screen 
        name="Transactions" 
        component={TransactionsScreen}
        options={{ 
          tabBarLabel: 'Transacciones',
          tabBarItemStyle: { flex: 2 }
        }}
      />
      <Tab.Screen 
        name="Budgets" 
        component={BudgetsScreen}
        options={{ 
          tabBarLabel: 'Presupuestos',
          tabBarItemStyle: { flex: 2 }
        }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsScreen}
        options={{
          tabBarLabel: 'Metas',
          tabBarItemStyle: { flex: 1.5 }
        }}
      />
      <Tab.Screen
        name="Tools"
        component={ToolsStackNavigator}
        options={{
          tabBarItemStyle: { flex: 1 },
          tabBarButton: (props) => (
            <UtilitiesMenu color={props.accessibilityState?.selected ? '#2563EB' : 'gray'} focused={props.accessibilityState?.selected || false} size={24} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Wrapper del MainTabNavigator en un Stack para permitir navegación desde onboarding
function MainNavigator({ route }: any) {
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = React.useState(false);
  const [showSubscriptionsModal, setShowSubscriptionsModal] = React.useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = React.useState(false);
  const [showHelpCenter, setShowHelpCenter] = React.useState(false);
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [showPlansModal, setShowPlansModal] = React.useState(false);
  const [cameFromTutorial, setCameFromTutorial] = React.useState(false);
  // Ref para que el biometric check sepa si estamos en flujo post-onboarding
  // Un ref funciona en closures (siempre lee el valor actual, no el del montaje)
  const isPostOnboardingRef = React.useRef(false);
  const [profileData, setProfileData] = React.useState(null);
  const [showProfileSuccessModal, setShowProfileSuccessModal] = React.useState(false);
  const [profileSuccessMessage, setProfileSuccessMessage] = React.useState('');
  const [showBiometricModal, setShowBiometricModal] = React.useState(false);
  const [storedBiometricType, setStoredBiometricType] = React.useState('');
  // New states for Email Sync and Notifications
  const [showEmailSync, setShowEmailSync] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = React.useState(false);
  const [showWeeklyReports, setShowWeeklyReports] = React.useState(false);
  const { updateUser, logout, user, saveBiometricCredentials } = useAuthStore();
  const { subscription, fetchSubscription, showPlansModal: storePlansModal, closePlansModal } = useSubscriptionStore();
  const { onTransactionChange } = useDashboardStore();
  const { enable, refresh } = useBiometric();
  const insets = useSafeAreaInsets();

  // Sincronizar modal de planes desde el store global
  React.useEffect(() => {
    if (storePlansModal) {
      setShowSubscriptionsModal(true);
      closePlansModal();
    }
  }, [storePlansModal, closePlansModal]);

  // Detectar si viene del onboarding y debe abrir HelpCenter
  React.useEffect(() => {
    const checkOpenHelpCenter = async () => {
      try {
        logger.log('🔍 MainNavigator montado, verificando flag de HelpCenter...');
        const shouldOpen = await AsyncStorage.getItem('openHelpCenterAfterOnboarding');
        logger.log('🔍 Flag de HelpCenter leído:', shouldOpen);

        if (shouldOpen === 'true') {
          logger.log('✅ Flag es "true", abriendo HelpCenter después del onboarding');

          // Bloquear biometric — estamos en flujo post-onboarding
          isPostOnboardingRef.current = true;

          // Marcar que viene del tutorial para mostrar planes después
          setCameFromTutorial(true);

          // Limpiar el flag PRIMERO
          await AsyncStorage.removeItem('openHelpCenterAfterOnboarding');
          logger.log('🗑️ Flag limpiado de AsyncStorage');

          // Abrir el HelpCenter INMEDIATAMENTE
          logger.log('🚀 Llamando setShowHelpCenter(true)...');
          setShowHelpCenter(true);
          logger.log('✅ HelpCenter modal debería estar visible ahora');
        } else {
          logger.log('ℹ️ Flag no es "true", no se abre HelpCenter');
        }
      } catch (error) {
        logger.error('❌ Error checking HelpCenter flag:', error);
      }
    };

    checkOpenHelpCenter();
  }, []);

  // Verificar si hay un setup pendiente de biometría
  // Usa isPostOnboardingRef (ref, no state) para detectar si estamos en flujo post-onboarding.
  // Si es post-onboarding, NO mostrar biometric ahora — el flag se queda en AsyncStorage
  // y se mostrará la próxima vez que el usuario abra la app.
  React.useEffect(() => {
    const checkPendingBiometricSetup = async () => {
      try {
        // Esperar para que el check de HelpCenter corra primero y marque el ref
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Si estamos en flujo post-onboarding, NO mostrar biometric
        // El flag pendingBiometricSetup se queda en AsyncStorage para la próxima sesión
        if (isPostOnboardingRef.current) {
          logger.log('🔐 Biometric: flujo post-onboarding activo — se mostrará en próxima sesión');
          return;
        }

        const pending = await AsyncStorage.getItem('pendingBiometricSetup');
        const bioType = await AsyncStorage.getItem('biometricType');

        if (pending === 'true') {
          logger.log('🔔 Detectado setup pendiente de biometría (no post-onboarding)');
          setStoredBiometricType(bioType || 'Face ID');
          await AsyncStorage.removeItem('pendingBiometricSetup');
          setShowBiometricModal(true);
        }
      } catch (error) {
        logger.error('Error verificando pending biometric setup:', error);
      }
    };

    checkPendingBiometricSetup();
  }, []);

  // Initialize push notifications when user is authenticated
  React.useEffect(() => {
    const initializeNotifications = async () => {
      try {
        logger.log('🔔 Inicializando servicio de notificaciones...');
        const token = await notificationService.initialize();

        if (token) {
          // Registrar dispositivo en el backend
          const registered = await notificationService.registerDevice();
          if (registered) {
            logger.log('✅ Dispositivo iOS registrado para notificaciones');
          } else {
            logger.warn('⚠️ No se pudo registrar el dispositivo iOS');
          }
        } else {
          logger.log('⚠️ No se obtuvo token de notificaciones');
        }
      } catch (error) {
        logger.error('❌ Error inicializando notificaciones:', error);
      }
    };

    if (user) {
      initializeNotifications();
    }

    return () => {
      // Cleanup listeners when component unmounts
      notificationService.removeListeners();
    };
  }, [user]);

  // Initialize RevenueCat when user is authenticated (iOS only)
  React.useEffect(() => {
    if (user && Platform.OS === 'ios') {
      revenueCatMobileService.initialize(user.id);
    }
  }, [user]);

  const handleEnableBiometric = async () => {
    try {
      logger.log('🔐 Usuario aceptó configurar biometría desde MainNavigator');
      await enable();
      logger.log('✅ Biometría habilitada exitosamente');

      if (user) {
        const token = useAuthStore.getState().token;
        if (token) {
          await saveBiometricCredentials(user, token);
          logger.log('Credenciales biometricas guardadas');
        }
      }

      await refresh();
      setShowBiometricModal(false);

      // Mostrar alerta de éxito
      Alert.alert(
        '¡Listo!',
        `${storedBiometricType} configurado exitosamente. La próxima vez podrás iniciar sesión más rápido.`
      );
    } catch (error) {
      logger.error('❌ Error configurando biometría:', error);
      setShowBiometricModal(false);
      Alert.alert(
        'Error',
        'No se pudo configurar la biometría. Intenta desde tu perfil.'
      );
    }
  };

  const handleCloseHelpCenter = () => {
    logger.log('🔚 Cerrando HelpCenter, cameFromTutorial:', cameFromTutorial);
    setShowHelpCenter(false);

    // Si viene del tutorial, mostrar modal de planes
    if (cameFromTutorial) {
      logger.log('🎁 Mostrando modal de planes después del tutorial');
      setTimeout(() => {
        setShowPlansModal(true);
      }, 500); // Pequeño delay para mejor UX
      setCameFromTutorial(false); // Reset flag
    }
  };

  const UserMenuModal = () => (
    <Modal
      key={showUserMenu ? 'menu-open' : 'menu-closed'}
      visible={showUserMenu}
      transparent
      animationType="fade"
      onRequestClose={() => setShowUserMenu(false)}
      pointerEvents={showUserMenu ? 'auto' : 'none'}
    >
      <TouchableOpacity 
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-start',
          alignItems: 'flex-end',
          paddingTop: Platform.OS === 'ios' ? Math.max(insets.top + 50, 100) : 60,
          paddingRight: Platform.OS === 'ios' ? Math.max(insets.right + 12, 16) : 12,
        }}
        activeOpacity={1}
        onPress={() => setShowUserMenu(false)}
      >
        <View style={{
          backgroundColor: 'white',
          borderRadius: 12,
          minWidth: 200,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 8,
        }}>
          {/* Header del menú */}
          <View style={{
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#f1f5f9',
          }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>
              Mi Cuenta
            </Text>
          </View>

          {/* Opciones del menú */}
          <View style={{ paddingVertical: 8 }}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
              onPress={async () => {
                setShowUserMenu(false);
                try {
                  logger.log('Cargando perfil del usuario...');
                  const res = await api.get('/auth/profile');
                  logger.log('Perfil cargado:', res.data);
                  setProfileData(res.data);
                  setShowProfileModal(true);
                } catch (error) {
                  logger.error('Error cargando perfil:', error);
                  Alert.alert('Error', 'No se pudo cargar el perfil');
                }
              }}
            >
              <Ionicons name="person-outline" size={20} color="#374151" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 14, color: '#374151' }}>Editar Perfil</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
              onPress={() => {
                setShowUserMenu(false);
                setShowChangePasswordModal(true);
              }}
            >
              <Ionicons name="key-outline" size={20} color="#374151" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 14, color: '#374151' }}>Cambiar Contraseña</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
              onPress={() => {
                setShowUserMenu(false);
                setShowSubscriptionsModal(true);
              }}
            >
              <Ionicons name="card-outline" size={20} color="#374151" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 14, color: '#374151' }}>Suscripciones</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
              onPress={() => {
                setShowUserMenu(false);
                if (subscription?.plan === 'PRO') {
                  setShowEmailSync(true);
                } else {
                  setTimeout(() => {
                    setShowSubscriptionsModal(true);
                  }, 300);
                }
              }}
            >
              <Ionicons name="mail-outline" size={20} color="#374151" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 14, color: '#374151' }}>Email Bancario</Text>
              {subscription?.plan !== 'PRO' && (
                <View style={{
                  backgroundColor: '#6366F1',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                  marginLeft: 8,
                }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>PRO</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
              onPress={() => {
                setShowUserMenu(false);
                setShowNotificationSettings(true);
              }}
            >
              <Ionicons name="notifications-outline" size={20} color="#374151" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 14, color: '#374151' }}>Notificaciones</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
              onPress={() => {
                setShowUserMenu(false);
                setShowWeeklyReports(true);
              }}
            >
              <Ionicons name="document-text-outline" size={20} color="#374151" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 14, color: '#374151' }}>Reportes Quincenales</Text>
              {subscription?.plan !== 'PRO' && (
                <View style={{
                  backgroundColor: '#6366F1',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                  marginLeft: 8,
                }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>PRO</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
              onPress={() => {
                setShowUserMenu(false);
                setShowHelpCenter(true);
              }}
            >
              <Ionicons name="help-circle-outline" size={20} color="#374151" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 14, color: '#374151' }}>Centro de Ayuda</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderTopWidth: 1,
                borderTopColor: '#f1f5f9',
                marginTop: 8,
              }}
              onPress={() => {
                setShowUserMenu(false);
                setShowLogoutModal(true);
              }}
            >
              <Ionicons name="log-out-outline" size={20} color="#dc2626" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 14, color: '#dc2626' }}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <React.Fragment>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main">
          {() => <MainTabNavigator setShowUserMenu={setShowUserMenu} setShowNotifications={setShowNotifications} />}
        </Stack.Screen>
      </Stack.Navigator>
      
      {/* Zenio Floating Button - Global */}
      <ZenioFloatingButton />
      
      <UserMenuModal />

      {/* Profile Modal */}
      {showProfileModal && profileData && (
        <ProfileForm
          visible={showProfileModal}
          user={profileData}
          onClose={() => setShowProfileModal(false)}
          onProfileUpdated={async (message: string) => {
            // 1. CERRAR FORMULARIO PRIMERO
            setShowProfileModal(false);

            // 2. Recargar usuario global
            try {
              const res = await api.get('/auth/profile');
              updateUser(res.data);
            } catch (e) {
              logger.error('Error updating user profile:', e);
            }

            // 3. Mostrar modal de éxito DESPUÉS de cerrar formulario
            setProfileSuccessMessage(message);
            setShowProfileSuccessModal(true);
          }}
        />
      )}
      
      {/* Change Password Modal */}
      <ChangePasswordForm
        visible={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />

      {/* Subscriptions Modal */}
      <Modal
        visible={showSubscriptionsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSubscriptionsModal(false)}
      >
        <SubscriptionsScreen
          onClose={() => setShowSubscriptionsModal(false)}
          onViewPayments={() => {
            setShowSubscriptionsModal(false);
            setTimeout(() => setShowPaymentHistory(true), 500);
          }}
        />
      </Modal>

      {/* Payment History Modal */}
      <Modal
        visible={showPaymentHistory}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPaymentHistory(false)}
      >
        <PaymentHistoryScreen onClose={() => setShowPaymentHistory(false)} />
      </Modal>

      {/* Help Center Modal */}
      <Modal
        visible={showHelpCenter}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={false}
        onRequestClose={handleCloseHelpCenter}
      >
        <HelpCenterScreen onClose={handleCloseHelpCenter} />
      </Modal>

      {/* Email Sync Modal */}
      <Modal
        visible={showEmailSync}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEmailSync(false)}
      >
        <EmailSyncScreen
          onClose={() => {
            setShowEmailSync(false);
            // Refresh dashboard data after email sync
            onTransactionChange?.();
          }}
          onOpenPlans={() => setShowSubscriptionsModal(true)}
        />
      </Modal>

      {/* Notifications Modal */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotifications(false)}
      >
        <NotificationsScreen
          onClose={() => setShowNotifications(false)}
          onOpenSettings={() => {
            setShowNotifications(false);
            setTimeout(() => setShowNotificationSettings(true), 500);
          }}
        />
      </Modal>

      {/* Notification Settings Modal */}
      <Modal
        visible={showNotificationSettings}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotificationSettings(false)}
      >
        <NotificationSettingsScreen
          onClose={() => setShowNotificationSettings(false)}
          onOpenPlans={() => {
            setShowNotificationSettings(false);
            setShowSubscriptionsModal(true);
          }}
        />
      </Modal>

      {/* Weekly Reports Modal */}
      <Modal
        visible={showWeeklyReports}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWeeklyReports(false)}
      >
        <WeeklyReportsScreen
          onClose={() => setShowWeeklyReports(false)}
          onOpenPlans={() => {
            setShowWeeklyReports(false);
            setShowSubscriptionsModal(true);
          }}
        />
      </Modal>

      {/* Plans Modal after Tutorial */}
      <CustomModal
        visible={showPlansModal}
        type="success"
        title="🎉 ¡Ahora que conoces FinZen AI!"
        message={`Acabas de ver todo lo que puedes hacer:\n\n✨ Zenio AI ilimitado\n📊 Acceso a reportes\n💰 Presupuestos y metas sin límites\n📈 Todas las calculadoras\n\n¿Quieres desbloquearlo TODO?\n7 días gratis, cancela cuando quieras`}
        buttonText="Ver Planes"
        showSecondaryButton={true}
        secondaryButtonText="Gratis"
        onClose={() => {
          setShowPlansModal(false);
          setTimeout(() => setShowSubscriptionsModal(true), 500);
        }}
        onSecondaryPress={() => setShowPlansModal(false)}
      />

      {/* Profile Success Modal */}
      <CustomModal
        visible={showProfileSuccessModal}
        type="success"
        title="¡Perfil actualizado!"
        message={profileSuccessMessage}
        buttonText="Continuar"
        onClose={() => setShowProfileSuccessModal(false)}
      />

      {/* Biometric Setup Modal */}
      <CustomModal
        visible={showBiometricModal}
        type="info"
        title={`¿Usar ${storedBiometricType}?`}
        message={`¿Quieres usar ${storedBiometricType} para iniciar sesión más rápido en el futuro?`}
        buttonText="Sí, activar"
        showSecondaryButton={true}
        secondaryButtonText="No, gracias"
        onSecondaryPress={() => setShowBiometricModal(false)}
        onClose={handleEnableBiometric}
      />

      {/* Logout Confirmation Modal */}
      <CustomModal
        visible={showLogoutModal}
        type="warning"
        title="Cerrar Sesión"
        message="¿Estás seguro que quieres cerrar sesión?"
        buttonText="Cerrar"
        showSecondaryButton={true}
        secondaryButtonText="Cancelar"
        onClose={async () => {
          if (Platform.OS === 'ios') {
            await revenueCatMobileService.logout();
          }
          logout();
          setShowLogoutModal(false);
        }}
        onSecondaryPress={() => setShowLogoutModal(false)}
      />
    </React.Fragment>
  );
}

// Stack para el Main (para poder pasar params desde onboarding)
const MainStack = createNativeStackNavigator();

function MainStackNavigator() {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen name="MainScreen" component={MainNavigator} />
    </MainStack.Navigator>
  );
}

// Configuración de Universal Links / Deep Links
const BACKEND_DOMAIN = 'finzenai-backend-production.up.railway.app';

const linking = {
  prefixes: [
    `https://${BACKEND_DOMAIN}`,
    'finzenai://',
  ],
  config: {
    screens: {
      // Rutas de checkout manejadas globalmente
      CheckoutSuccess: 'checkout/success',
      CheckoutCancel: 'checkout/cancel',
    },
  },
};

// Navegador principal de la app
export default function AppNavigator() {
  const { isAuthenticated, user } = useAuthStore();
  const { fetchSubscription, syncCheckoutSession } = useSubscriptionStore();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false);
  const [showPaymentCancelModal, setShowPaymentCancelModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Manejar URLs entrantes (Universal Links)
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      logger.log('🔗 Deep link recibido:', url);

      // Checkout Success
      if (url.includes('/checkout/success')) {
        logger.log('✅ Checkout exitoso detectado');
        setProcessingPayment(true);

        try {
          // Extraer session_id de la URL
          const urlObj = new URL(url);
          const sessionId = urlObj.searchParams.get('session_id');

          if (sessionId) {
            logger.log('🔄 Sincronizando sesión:', sessionId);
            await syncCheckoutSession(sessionId);
          }

          // Actualizar suscripción
          await fetchSubscription();
          setShowPaymentSuccessModal(true);
        } catch (error) {
          logger.error('Error sincronizando pago:', error);
          // Aún así mostrar éxito si el pago se procesó
          setShowPaymentSuccessModal(true);
        } finally {
          setProcessingPayment(false);
        }
      }
      // Checkout Cancel
      else if (url.includes('/checkout/cancel')) {
        logger.log('❌ Checkout cancelado');
        setShowPaymentCancelModal(true);
      }
      // Referral Deep Link - Guardar código para registro
      else if (url.includes('/referral') || url.includes('referral?code=')) {
        try {
          const urlObj = new URL(url.replace('finzenai://', 'https://finzenai.com/'));
          const refCode = urlObj.searchParams.get('code');

          if (refCode) {
            logger.log('🎁 Código de referido recibido:', refCode);
            // Guardar en AsyncStorage para usar en registro
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            await AsyncStorage.setItem('pendingReferralCode', refCode);

            // Si no está autenticado, el código se usará automáticamente en registro
            if (!isAuthenticated) {
              Alert.alert(
                '¡Código Aplicado!',
                `El código ${refCode} se aplicará automáticamente cuando te registres. Obtendrás 50% de descuento en tu primer mes.`,
                [{ text: 'Entendido' }]
              );
            }
          }
        } catch (error) {
          logger.error('Error procesando código de referido:', error);
        }
      }
    };

    // Listener para URLs mientras la app está abierta
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Verificar si la app se abrió con una URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        logger.log('🚀 App abierta con URL:', url);
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [fetchSubscription, syncCheckoutSession]);

  return (
    <>
      <NavigationContainer ref={navigationRef} linking={linking}>
        {isAuthenticated ? (
          // Si está autenticado pero no completó onboarding, mostrar onboarding
          user && !user.onboardingCompleted ? <OnboardingNavigator /> : <MainStackNavigator />
        ) : (
          <AuthNavigator />
        )}
      </NavigationContainer>

      {/* Payment Success Modal */}
      <CustomModal
        visible={showPaymentSuccessModal}
        type="success"
        title="¡Pago Exitoso!"
        message="¡Ahora eres miembro Plus! Disfruta del acceso ilimitado a todas las funciones."
        buttonText="¡Genial!"
        onClose={() => setShowPaymentSuccessModal(false)}
      />

      {/* Payment Cancel Modal */}
      <CustomModal
        visible={showPaymentCancelModal}
        type="info"
        title="Pago Cancelado"
        message="No te preocupes, puedes completar tu suscripción en cualquier momento."
        buttonText="Entendido"
        onClose={() => setShowPaymentCancelModal(false)}
      />

      {/* Processing Payment Overlay */}
      {processingPayment && (
        <Modal visible={true} transparent animationType="fade">
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.7)',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <View style={{
              backgroundColor: 'white',
              padding: 24,
              borderRadius: 16,
              alignItems: 'center',
            }}>
              <Ionicons name="sync" size={40} color="#2563EB" />
              <Text style={{ marginTop: 12, fontSize: 16, color: '#374151' }}>
                Procesando pago...
              </Text>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

// Navegación de onboarding para usuarios autenticados
function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OnboardingWelcome" component={OnboardingWelcomeScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    </Stack.Navigator>
  );
}