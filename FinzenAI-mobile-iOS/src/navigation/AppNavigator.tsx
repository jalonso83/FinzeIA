// Navegación principal de la app móvil FinZen
// Configuración multiplataforma (Android + iOS)

import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TouchableOpacity, Alert, View, Text, Modal, Image, Platform, Linking, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProfileForm from '../components/profile/ProfileForm';
import ChangePasswordForm from '../components/ChangePasswordForm';
import CustomModal from '../components/modals/CustomModal';
import api, { configAPI, sharedAPI } from '../utils/api';

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
import FeedbackScreen from '../screens/FeedbackScreen';
import SubscriptionsScreen from '../screens/SubscriptionsScreen';
import TrialExpiredScreen, { TrialExpiryState } from '../screens/TrialExpiredScreen';
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
import RePersonalizationScreen from '../screens/RePersonalizationScreen';

// Stores
import { useAuthStore } from '../stores/auth';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { useDashboardStore } from '../stores/dashboard';
import { useSharedStore } from '../stores/sharedStore';
import AceptarInvitacionModal from '../components/shared/AceptarInvitacionModal';
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
  setShowNotifications,
  setShowSubscriptions
}: {
  setShowUserMenu: (show: boolean) => void;
  setShowNotifications: (show: boolean) => void;
  setShowSubscriptions: (show: boolean) => void;
}) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { subscription } = useSubscriptionStore();

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
        headerTitle: '', // El "Hola, {user}" se movió al modal de usuario; aquí va el chip de plan
        headerTitleAlign: 'left',
        // Chip de plan a la izquierda (donde estaba el saludo). Abre Suscripciones.
        // Label sin la palabra "Plan" para ser consistente con Plus/Pro.
        headerLeft: route.name === 'Dashboard' ? () => {
          const plan = subscription?.plan;
          const planIcon = !plan || plan === 'FREE' ? '🆓' : plan === 'PREMIUM' ? '👑' : '💎';
          const planLabel = !plan || plan === 'FREE' ? 'Gratis' : plan === 'PREMIUM' ? 'Plus' : 'Pro';
          return (
            <TouchableOpacity
              onPress={() => setShowSubscriptions(true)}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginLeft: Platform.OS === 'ios' ? Math.max(insets.left + 12, 20) : 16,
                marginTop: Platform.OS === 'ios' ? Math.max(insets.top - 20, 0) : 4,
                marginBottom: Platform.OS === 'ios' ? 20 : 5,
                paddingVertical: 6,
                paddingHorizontal: 12,
                backgroundColor: '#f8fafc',
                borderRadius: 22,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Text style={{ fontSize: 14 }}>{planIcon}</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>{planLabel}</Text>
              <Ionicons name="chevron-down" size={14} color="#64748b" />
            </TouchableOpacity>
          );
        } : undefined,
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
function MainNavigator({ route, navigation }: any) {
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = React.useState(false);
  const [showSubscriptionsModal, setShowSubscriptionsModal] = React.useState(false);
  // Por qué se abrió la pantalla de planes. Lo necesita el evento `ver_planes`
  // para distinguir a quien vino buscando "Gastos en automático" de quien entró
  // a mirar precios por su cuenta.
  const [origenPlanes, setOrigenPlanes] = React.useState<undefined | 'gastos_automatico' | 'menu' | 'limite' | 'vencimiento'>(undefined);

  // Cerrar la pantalla de planes SIEMPRE limpia el origen, y esto no es una
  // formalidad: hay entradas que abren esa pantalla sin fijarlo (el chip de plan
  // del header, los avisos Pro de notificaciones y reportes). Si el valor se
  // quedara pegado, todas ellas heredarían el último. El caso feo es
  // 'vencimiento': una sola apertura desde ahí dejaría marcada como venida del
  // vencimiento el resto de la sesión — y ese número es justo el que dice si esa
  // pantalla sirve. Un origen ausente es un dato honesto; uno heredado, no.
  const cerrarPlanes = React.useCallback(() => {
    setShowSubscriptionsModal(false);
    setOrigenPlanes(undefined);
  }, []);

  // ─── Pantalla de vencimiento del trial (D6) ────────────────────────────────
  //
  // El servidor decide si toca mostrarla y qué dice. La app solo decide CUÁNDO,
  // y ahí está toda la dificultad: en iOS no se puede abrir un <Modal> mientras
  // hay otro abierto —el segundo no se pinta y deja la pantalla trabada— y esta
  // consulta cae justo en el arranque, que es cuando pueden estar saliendo el
  // aviso de Face ID, el centro de ayuda post-onboarding o la repersonalización.
  //
  // Por eso va en dos pasos: `vencimientoEnCola` guarda lo que dijo el servidor,
  // y un segundo efecto la muestra recién cuando no hay ningún otro modal
  // abierto. Si nunca se despeja, simplemente no se muestra hoy y se vuelve a
  // intentar en el próximo arranque.
  const [vencimientoEnCola, setVencimientoEnCola] = React.useState<TrialExpiryState | null>(null);
  const [estadoVencimiento, setEstadoVencimiento] = React.useState<TrialExpiryState | null>(null);

  // Espejo en ref para los temporizadores que arrancan con `[]` y no vuelven a
  // ver el estado (el aviso diferido de biometría). Leer el estado desde ahí
  // devolvería siempre el valor del primer render.
  const vencimientoActivoRef = React.useRef(false);
  React.useEffect(() => {
    vencimientoActivoRef.current = vencimientoEnCola != null || estadoVencimiento != null;
  }, [vencimientoEnCola, estadoVencimiento]);

  React.useEffect(() => {
    let vigente = true;

    const revisarVencimiento = async () => {
      try {
        const { data } = await api.get('/subscriptions/trial-expiry');
        if (!vigente || !data?.vencioElTrial) return;

        const clave = `@finzen_vencimiento_visto_${data.trialEndedAt ?? 'sin_fecha'}`;
        const yaLaVio = await AsyncStorage.getItem(clave);
        if (yaLaVio === 'true' || !vigente) return;

        // `data` llega de axios como `any`: la interfaz de TypeScript no valida
        // nada en runtime. Y esto se pinta DENTRO de un pageSheet, así que un
        // `undefined.map` no es un warning: es pantalla roja sin forma de salir
        // más que matando la app. Basta con que un despliegue renombre un campo.
        //
        // El aterrizaje suave exige las dos piezas: sin `limitesFree` no hay con
        // qué comparar, y tratarlo como cero haría pasar por regalo lo que todo
        // el mundo ya tiene gratis.
        const conserva = data.conserva ?? null;
        const limitesFree = data.limitesFree ?? null;
        setVencimientoEnCola({
          vencioElTrial: true,
          trialEndedAt: data.trialEndedAt ?? null,
          transaccionesImportadas: Number(data.transaccionesImportadas) || 0,
          seDetuvo: Array.isArray(data.seDetuvo) ? data.seDetuvo : [],
          aterrizajeSuave: data.aterrizajeSuave === true && conserva != null && limitesFree != null,
          conserva,
          limitesFree: limitesFree ?? { budgets: 0, goals: 0, zenioQueries: 0 },
        });
      } catch (error) {
        // Si falla, no pasa nada: no es una pantalla que valga la pena forzar.
        logger.error('[Vencimiento] No se pudo consultar el estado:', error);
      }
    };

    revisarVencimiento();
    return () => { vigente = false; };
  }, []);
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
  const [showFeedback, setShowFeedback] = React.useState(false);
  const [showFeedbackSuccessModal, setShowFeedbackSuccessModal] = React.useState(false);
  const [feedbackSuccessMessage, setFeedbackSuccessMessage] = React.useState('');
  const [showFeedbackErrorModal, setShowFeedbackErrorModal] = React.useState(false);
  const [feedbackErrorMessage, setFeedbackErrorMessage] = React.useState('');
  const [showBiometricModal, setShowBiometricModal] = React.useState(false);
  const [storedBiometricType, setStoredBiometricType] = React.useState('');
  // New states for Email Sync and Notifications
  const [showEmailSync, setShowEmailSync] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = React.useState(false);
  const [showWeeklyReports, setShowWeeklyReports] = React.useState(false);
  const [showRePersonalization, setShowRePersonalization] = React.useState(false);
  const { updateUser, logout, user, saveBiometricCredentials } = useAuthStore();
  const { subscription, fetchSubscription, showPlansModal: storePlansModal, closePlansModal, trialConfig, showEmailSyncModal: storeEmailSync, closeEmailSyncModal } = useSubscriptionStore();
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

  // Lo mismo para "Gastos en automático": una campaña del slot del dashboard
  // puede pedir que se abra, y esa pantalla es un <Modal> de aquí, no una ruta.
  React.useEffect(() => {
    if (storeEmailSync) {
      // Un usuario sin Pro no puede entrar: se le manda a planes, igual que
      // desde el menú. Así la misma campaña sirve para los dos casos.
      if (subscription?.plan === 'PRO') {
        setShowEmailSync(true);
      } else {
        setOrigenPlanes('gastos_automatico');
        setShowSubscriptionsModal(true);
      }
      closeEmailSyncModal();
    }
  }, [storeEmailSync, closeEmailSyncModal, subscription?.plan]);

  // ─── Presupuestos y metas compartidos (2026-10) ─────────────────────────────
  //
  // La pantalla de aceptar invitación es una CAPA, no un <Modal>: puede abrirse
  // desde un enlace con cualquier ventana abierta y no puede chocar con ninguna.
  // La invitación pendiente se descarta recién cuando la persona la cierra o la
  // acepta: si se descartara al leerla y la app se cerrara antes de mostrarla,
  // se perdería.
  const { invitacion, abrirInvitacion, cerrarInvitacion, setEnabled: setSharedEnabled, refrescarCompartidos } = useSharedStore();

  React.useEffect(() => {
    let vigente = true;
    const revisarCompartidos = async () => {
      try {
        const { data } = await configAPI.getFeatures();
        if (vigente) setSharedEnabled(!!data?.sharedEnabled);
      } catch (e) {
        if (vigente) setSharedEnabled(false);
        logger.error('[Compartidos] No se pudo leer el flag:', e);
      }
      try {
        // Código que llegó por enlace antes de iniciar sesión.
        const guardado = await AsyncStorage.getItem('pendingInviteCode');
        if (guardado) {
          if (vigente) abrirInvitacion(guardado, true);
          return;
        }
        // Código que escribió al registrarse (lo guarda el servidor).
        const { data } = await sharedAPI.invitacionPendiente();
        if (vigente && data?.invitacion?.code) {
          abrirInvitacion(data.invitacion.code, true);
        }
      } catch (e) {
        logger.error('[Compartidos] No se pudo revisar la invitación pendiente:', e);
      }
    };
    revisarCompartidos();
    return () => { vigente = false; };
  }, []);

  // Se ofrece una sola vez: cerrada o aceptada, no vuelve a salir sola (el código
  // sigue sirviendo con "¿Te invitaron?").
  const cerrarLaInvitacion = React.useCallback(() => {
    if (invitacion?.automatica) {
      AsyncStorage.removeItem('pendingInviteCode').catch(() => {});
      sharedAPI.descartarInvitacionPendiente().catch(() => {});
    }
    cerrarInvitacion();
  }, [cerrarInvitacion, invitacion]);

  const alAceptarInvitacion = React.useCallback((kind: 'BUDGET' | 'GOAL') => {
    cerrarLaInvitacion();
    refrescarCompartidos();
    onTransactionChange();
    navigation?.navigate('MainScreen', { screen: 'Main', params: { screen: kind === 'GOAL' ? 'Goals' : 'Budgets' } });
  }, [cerrarLaInvitacion, refrescarCompartidos, onTransactionChange, navigation]);

  // ─── Segundo paso del vencimiento: mostrarla solo si la vía está libre ──────
  //
  // Va aquí abajo, y no junto al resto de la lógica de vencimiento, porque
  // necesita leer TODAS las banderas de modales y varias se declaran después.
  //
  // Si añades un <Modal> nuevo a este componente, súmalo a esta lista. Que se
  // olvide no rompe nada visible en el momento: lo que pasa es que un día, a un
  // usuario, se le abre esta pantalla encima de otra y en iOS se le traba la app.
  const hayOtroModalAbierto =
    showUserMenu || showProfileModal || showChangePasswordModal || showSubscriptionsModal ||
    showPaymentHistory || showHelpCenter || showLogoutModal || showPlansModal ||
    showProfileSuccessModal || showFeedback || showFeedbackSuccessModal ||
    showFeedbackErrorModal || showBiometricModal || showEmailSync || showNotifications ||
    showNotificationSettings || showWeeklyReports || showRePersonalization ||
    estadoVencimiento != null || !!invitacion;

  React.useEffect(() => {
    if (!vencimientoEnCola || estadoVencimiento || hayOtroModalAbierto) return;

    // La vía tiene que estar libre de forma SOSTENIDA, no en un instante suelto.
    //
    // No basta con mirar las banderas una vez: este archivo encadena modales con
    // "cierro este, abro el otro a los 300-500 ms" en cinco sitios, y durante ese
    // hueco TODAS las banderas están en false. Mostrar ahí sería lo peor de los
    // dos mundos: el modal siguiente se abriría encima del nuestro y en iOS
    // dejaría la app trabada, y encima la pantalla quedaría marcada como vista.
    //
    // La espera resuelve las dos direcciones a la vez. Si cualquier modal se
    // abre mientras corre, `hayOtroModalAbierto` cambia, el efecto se rearma y
    // el cleanup cancela el temporizador — o sea que solo llega al final si de
    // verdad no pasó nada en esos segundos. 3 s cubre con holgura el handoff más
    // largo (500 ms) y el aviso diferido de biometría (1,5 s).
    const temporizador = setTimeout(() => {
      // La marca de "ya la vio" se escribe AQUÍ, cuando de verdad se muestra.
      // Escribirla al consultarla la quemaría sin que nadie la hubiera visto.
      //
      // Lleva la fecha del vencimiento, no un booleano: si esta persona recibe
      // una concesión más adelante y ese trial también termina, la pantalla
      // vuelve a salir en vez de quedar muda para siempre.
      const clave = `@finzen_vencimiento_visto_${vencimientoEnCola.trialEndedAt ?? 'sin_fecha'}`;
      AsyncStorage.setItem(clave, 'true').catch((e) =>
        logger.error('[Vencimiento] No se pudo marcar como vista:', e));

      setEstadoVencimiento(vencimientoEnCola);
      setVencimientoEnCola(null);
    }, 3000);

    return () => clearTimeout(temporizador);
  }, [vencimientoEnCola, estadoVencimiento, hayOtroModalAbierto]);

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

        // Misma idea que el guard de arriba, por la otra razón: aquí el flag se
        // consulta a los 1500 ms fijos, y la pantalla de vencimiento puede estar
        // ya presentada para entonces. Abrir este CustomModal encima de ese
        // pageSheet traba la app en iOS.
        //
        // Se sale ANTES de borrar el flag, igual que en el caso post-onboarding:
        // así el aviso no se pierde, reaparece en la próxima sesión.
        if (vencimientoActivoRef.current) {
          logger.log('🔐 Biometric: pantalla de vencimiento en curso — se mostrará en próxima sesión');
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
              {user?.name ? `Hola, ${user.name}!` : 'Hola!'}
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
                setShowRePersonalization(true);
              }}
            >
              <Ionicons name="sparkles-outline" size={20} color="#374151" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 14, color: '#374151' }}>Personalizar mi experiencia</Text>
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
                setOrigenPlanes('menu');
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
                  // El usuario FREE que toca aquí está pidiendo Gastos en
                  // automático, no mirando precios. Se etiqueta para poder
                  // contarlo aparte: es la señal más limpia de demanda por la
                  // única función que justifica pagar.
                  setOrigenPlanes('gastos_automatico');
                  setTimeout(() => {
                    setShowSubscriptionsModal(true);
                  }, 300);
                }
              }}
            >
              <Ionicons name="mail-outline" size={20} color="#374151" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 14, color: '#374151' }}>Gastos en automático</Text>
              {/* La etiqueta invita o cierra la puerta, según lo que la persona
                  pueda hacer HOY.
                  - Le queda prueba → "GRATIS" en verde. Decir "PRO" aquí sería
                    marcar como bloqueado algo que puede tener ahora mismo sin
                    pagar, y esa píldora es lo último que lee antes de decidir
                    si toca. Este es el único sitio donde un usuario gratis se
                    entera de que la función existe.
                  - Ya usó la prueba → "PRO" en morado. Ahí sí cuesta dinero y
                    prometer "gratis" sería mentir. */}
              {subscription?.plan !== 'PRO' && (
                <View style={{
                  backgroundColor: subscription?.canUseTrial ? '#059669' : '#6366F1',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                  marginLeft: 8,
                }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>
                    {subscription?.canUseTrial ? 'GRATIS' : 'PRO'}
                  </Text>
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
              }}
              onPress={() => {
                setShowUserMenu(false);
                setShowFeedback(true);
              }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="#374151" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 14, color: '#374151' }}>Enviar Feedback</Text>
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
          {() => <MainTabNavigator setShowUserMenu={setShowUserMenu} setShowNotifications={setShowNotifications} setShowSubscriptions={setShowSubscriptionsModal} />}
        </Stack.Screen>
      </Stack.Navigator>
      
      {/* Zenio Floating Button - Global */}
      <ZenioFloatingButton />

      {/* Aceptar invitación a un presupuesto o meta compartida */}
      <AceptarInvitacionModal
        visible={!!invitacion}
        codigoInicial={invitacion?.codigo ?? ''}
        onClose={cerrarLaInvitacion}
        onAceptada={alAceptarInvitacion}
      />
      
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
        onRequestClose={cerrarPlanes}
      >
        <SubscriptionsScreen
          origen={origenPlanes}
          onClose={cerrarPlanes}
          onViewPayments={() => {
            cerrarPlanes();
            setTimeout(() => setShowPaymentHistory(true), 500);
          }}
        />
      </Modal>

      {/* Vencimiento del trial (D6) */}
      <Modal
        visible={estadoVencimiento != null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEstadoVencimiento(null)}
      >
        {estadoVencimiento && (
          <TrialExpiredScreen
            estado={estadoVencimiento}
            onClose={() => setEstadoVencimiento(null)}
            onRecuperar={() => {
              setEstadoVencimiento(null);
              // Etiqueta propia: sirve para saber cuánta gente llega a los
              // planes DESDE el vencimiento, que es lo que mide si esta
              // pantalla hace algo o solo estorba.
              setOrigenPlanes('vencimiento');
              // En iOS hay que esperar a que este modal cierre antes de abrir el
              // siguiente: dos pageSheet a la vez no se llevan bien.
              setTimeout(() => setShowSubscriptionsModal(true), 400);
            }}
          />
        )}
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

      {/* Feedback Modal */}
      <Modal
        visible={showFeedback}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFeedback(false)}
      >
        <FeedbackScreen
          onClose={() => setShowFeedback(false)}
          onSuccess={(message: string) => {
            // 1. Cerrar formulario primero (patrón Screen-level iOS)
            setShowFeedback(false);
            // 2. Mostrar success modal después
            setFeedbackSuccessMessage(message);
            setShowFeedbackSuccessModal(true);
          }}
          onError={(message: string) => {
            // FeedbackScreen ya cerró el form via onClose() antes de invocar onError
            setFeedbackErrorMessage(message);
            setShowFeedbackErrorModal(true);
          }}
        />
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

      {/* Re-personalización Modal — relanza el chat con Zenio para actualizar el perfil */}
      <Modal
        visible={showRePersonalization}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowRePersonalization(false)}
      >
        <RePersonalizationScreen onClose={() => setShowRePersonalization(false)} />
      </Modal>

      {/* Plans Modal after Tutorial */}
      <CustomModal
        visible={showPlansModal}
        type="success"
        title="🎉 ¡Ahora que conoces FinZen AI!"
        message={`Acabas de ver todo lo que puedes hacer:\n\n✨ Zenio AI ilimitado\n📊 Acceso a reportes\n💰 Presupuestos y metas sin límites\n📈 Todas las calculadoras\n\n¿Quieres desbloquearlo TODO?\n${trialConfig?.durationDays ?? 7} días gratis, cancela cuando quieras`}
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

      {/* Feedback Success Modal */}
      <CustomModal
        visible={showFeedbackSuccessModal}
        type="success"
        title="¡Feedback enviado!"
        message={feedbackSuccessMessage}
        buttonText="Continuar"
        onClose={() => setShowFeedbackSuccessModal(false)}
      />

      {/* Feedback Error Modal */}
      <CustomModal
        visible={showFeedbackErrorModal}
        type="error"
        title="No pudimos enviar"
        message={feedbackErrorMessage}
        buttonText="Entendido"
        onClose={() => setShowFeedbackErrorModal(false)}
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
  // H10 — flag de onboarding no-bloqueante. Decide si un usuario sin onboarding
  // completado entra igual al dashboard (variante) o ve el muro (control).
  const [nonblockingEnabled, setNonblockingEnabled] = useState(false);
  const [flagChecked, setFlagChecked] = useState(false);

  // H10 — leer el flag no-bloqueante SOLO para usuarios sin onboarding completado.
  // Los que ya lo completaron van directo a Main. Fallback seguro = muro.
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setFlagChecked(false);
      setNonblockingEnabled(false);
      return;
    }
    if (user.onboardingCompleted) {
      setFlagChecked(true);
      return;
    }
    let cancelled = false;
    setFlagChecked(false);
    configAPI.getFeatures()
      .then((res) => { if (!cancelled) setNonblockingEnabled(!!res.data?.onboardingNonblockingEnabled); })
      .catch((e) => { if (!cancelled) { setNonblockingEnabled(false); logger.error('[H10] Error leyendo feature flag, fallback a muro:', e); } })
      .finally(() => { if (!cancelled) setFlagChecked(true); });
    return () => { cancelled = true; };
    // Deps acotadas a id + onboardingCompleted (no a la referencia de `user`) para
    // no re-disparar el flag —y parpadear el loader— ante cambios no relacionados.
  }, [isAuthenticated, user?.id, user?.onboardingCompleted]);

  // Al cerrar sesión no se arrastra nada de compartidos a la siguiente cuenta.
  useEffect(() => {
    if (!isAuthenticated) {
      useSharedStore.setState({ enabled: false, invitacion: null });
    }
  }, [isAuthenticated]);

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
      // Invitación a un compartido: finzenai://invite/CODIGO
      else if (/^finzenai:\/\/invite\/[A-Za-z0-9]{6}(?![A-Za-z0-9])/i.test(url) || /^https:\/\/(www\.)?finzenai\.com\/invite\/[A-Za-z0-9]{6}(?![A-Za-z0-9])/i.test(url)) {
        const match = url.match(/invite\/([A-Za-z0-9]+)/);
        const code = match ? match[1].toUpperCase() : '';
        if (code) {
          logger.log('🤝 Invitación a compartido recibida:', code);
          if (useAuthStore.getState().isAuthenticated) {
            useSharedStore.getState().abrirInvitacion(code);
          } else {
            // Sin sesión: se usa al registrarse y se abre al entrar.
            await AsyncStorage.setItem('pendingInviteCode', code);
          }
        }
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
          user && !user.onboardingCompleted ? (
            // H10: la variante no-bloqueante entra a Main aunque no haya completado
            // el onboarding; el control ve el muro. Mientras se resuelve el flag,
            // mostramos un loader para no parpadear el muro a la variante.
            !flagChecked ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                <ActivityIndicator size="large" color="#2563EB" />
              </View>
            ) : nonblockingEnabled ? <MainStackNavigator /> : <OnboardingNavigator />
          ) : <MainStackNavigator />
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