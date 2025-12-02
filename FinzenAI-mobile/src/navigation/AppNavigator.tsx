// Navegación principal de la app móvil FinZen
// Configuración multiplataforma (Android + iOS)

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TouchableOpacity, Alert, View, Text, Modal, Image, Platform } from 'react-native';
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
import HelpCenterScreen from '../screens/HelpCenterScreen';
import SubscriptionsScreen from '../screens/SubscriptionsScreen';
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
import { useBiometric } from '../hooks/useBiometric';
import { useState, useEffect } from 'react';

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
function MainTabNavigator({ setShowUserMenu }: { setShowUserMenu: (show: boolean) => void }) {
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
          height: Platform.OS === 'ios' ? Math.max(110 + insets.top, 120) : 80,
        },
        headerRight: route.name === 'Dashboard' ? () => (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginRight: Platform.OS === 'ios' ? Math.max(insets.right + 12, 20) : 16,
            marginTop: Platform.OS === 'ios' ? Math.max(insets.top - 20, 0) : 0,
          }}>
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
                marginBottom: Platform.OS === 'ios' ? 20 : 8,
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
          tabBarLabel: 'Más',
          tabBarItemStyle: { flex: 1 }
        }}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            // Prevenir la navegación por defecto
            e.preventDefault();
            // El UtilitiesMenu manejará la apertura del modal
          },
        })}
      />
    </Tab.Navigator>
  );
}

// Wrapper del MainTabNavigator en un Stack para permitir navegación desde onboarding
function MainNavigator({ route }: any) {
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = React.useState(false);
  const [showHelpCenter, setShowHelpCenter] = React.useState(false);
  const [showSubscriptions, setShowSubscriptions] = React.useState(false);
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [showPlansModal, setShowPlansModal] = React.useState(false);
  const [cameFromTutorial, setCameFromTutorial] = React.useState(false);
  const [profileData, setProfileData] = React.useState(null);
  const { updateUser, logout } = useAuthStore();
  const insets = useSafeAreaInsets();

  // Detectar si viene del onboarding y debe abrir HelpCenter
  React.useEffect(() => {
    const checkOpenHelpCenter = async () => {
      try {
        console.log('🔍 MainNavigator montado, verificando flag de HelpCenter...');
        const shouldOpen = await AsyncStorage.getItem('openHelpCenterAfterOnboarding');
        console.log('🔍 Flag de HelpCenter leído:', shouldOpen);

        if (shouldOpen === 'true') {
          console.log('✅ Flag es "true", abriendo HelpCenter después del onboarding');

          // Marcar que viene del tutorial para mostrar planes después
          setCameFromTutorial(true);

          // Limpiar el flag PRIMERO
          await AsyncStorage.removeItem('openHelpCenterAfterOnboarding');
          console.log('🗑️ Flag limpiado de AsyncStorage');

          // Abrir el HelpCenter INMEDIATAMENTE
          console.log('🚀 Llamando setShowHelpCenter(true)...');
          setShowHelpCenter(true);
          console.log('✅ HelpCenter modal debería estar visible ahora');
        } else {
          console.log('ℹ️ Flag no es "true", no se abre HelpCenter');
        }
      } catch (error) {
        console.error('❌ Error checking HelpCenter flag:', error);
      }
    };

    checkOpenHelpCenter();
  }, []);

  const handleCloseHelpCenter = () => {
    console.log('🔚 Cerrando HelpCenter, cameFromTutorial:', cameFromTutorial);
    setShowHelpCenter(false);

    // Si viene del tutorial, mostrar modal de planes
    if (cameFromTutorial) {
      console.log('🎁 Mostrando modal de planes después del tutorial');
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
          paddingTop: Platform.OS === 'ios' ? Math.max(insets.top + 80, 120) : 90,
          paddingRight: Platform.OS === 'ios' ? Math.max(insets.right + 12, 20) : 16,
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
                  console.log('Cargando perfil del usuario...');
                  const res = await api.get('/auth/profile');
                  console.log('Perfil cargado:', res.data);
                  setProfileData(res.data);
                  setShowProfileModal(true);
                } catch (error) {
                  console.error('Error cargando perfil:', error);
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
                setShowSubscriptions(true);
              }}
            >
              <Ionicons name="diamond-outline" size={20} color="#374151" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 14, color: '#374151' }}>Suscripción</Text>
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
          {() => <MainTabNavigator setShowUserMenu={setShowUserMenu} />}
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
          onProfileUpdated={async () => {
            setShowProfileModal(false);
            // Recargar usuario global
            try {
              const res = await api.get('/auth/profile');
              updateUser(res.data);
            } catch (e) {
              console.error('Error updating user profile:', e);
            }
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
        visible={showSubscriptions}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSubscriptions(false)}
      >
        <SubscriptionsScreen onClose={() => setShowSubscriptions(false)} />
      </Modal>

      {/* Help Center Modal */}
      <Modal
        visible={showHelpCenter}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseHelpCenter}
      >
        <HelpCenterScreen onClose={handleCloseHelpCenter} />
      </Modal>

      {/* Logout Confirmation Modal */}
      <CustomModal
        visible={showLogoutModal}
        type="warning"
        title="Cerrar Sesión"
        message="¿Estás seguro que quieres cerrar sesión?"
        buttonText="Cerrar"
        showSecondaryButton={true}
        secondaryButtonText="Cancelar"
        onClose={() => {
          logout();
          setShowLogoutModal(false);
        }}
        onSecondaryPress={() => setShowLogoutModal(false)}
      />

      {/* Plans Modal after Tutorial */}
      <CustomModal
        visible={showPlansModal}
        type="success"
        title="🎉 ¡Ahora que conoces FinZen AI!"
        message={`Acabas de ver todo lo que puedes hacer:\n\n✨ Zenio AI ilimitado\n📊 Reportes avanzados con IA\n💰 Presupuestos y metas sin límites\n📈 Todas las calculadoras\n\n¿Quieres desbloquearlo TODO?\n7 días gratis, cancela cuando quieras`}
        buttonText="Ver Planes Premium 👑"
        showSecondaryButton={true}
        secondaryButtonText="Empezar con Gratis"
        onClose={() => {
          setShowPlansModal(false);
          setShowSubscriptions(true);
        }}
        onSecondaryPress={() => setShowPlansModal(false)}
      />

      {/* Subscriptions Modal */}
      <Modal
        visible={showSubscriptions}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSubscriptions(false)}
      >
        <SubscriptionsScreen onClose={() => setShowSubscriptions(false)} />
      </Modal>
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

// Navegador principal de la app
export default function AppNavigator() {
  const { isAuthenticated, user, saveBiometricCredentials } = useAuthStore();
  const { enable, refresh, biometricType } = useBiometric();
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [storedBiometricType, setStoredBiometricType] = useState('');

  // Verificar si hay un setup pendiente de biometría
  useEffect(() => {
    if (isAuthenticated && user) {
      checkPendingBiometricSetup();
    }
  }, [isAuthenticated, user]);

  const checkPendingBiometricSetup = async () => {
    try {
      const pending = await AsyncStorage.getItem('pendingBiometricSetup');
      const bioType = await AsyncStorage.getItem('biometricType');

      if (pending === 'true') {
        console.log('🔔 Detectado setup pendiente de biometría');
        setStoredBiometricType(bioType || biometricType);
        setShowBiometricModal(true);
        // Limpiar el flag
        await AsyncStorage.removeItem('pendingBiometricSetup');
      }
    } catch (error) {
      console.error('Error verificando pending biometric setup:', error);
    }
  };

  const handleEnableBiometric = async () => {
    try {
      console.log('🔐 Usuario aceptó configurar biometría desde AppNavigator');
      await enable();
      console.log('✅ Biometría habilitada exitosamente');

      if (user) {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          await saveBiometricCredentials(user, token);
          console.log('🔐 Credenciales guardadas en SecureStore');
        }
      }

      await refresh();
      setShowBiometricModal(false);

      // Mostrar modal de éxito
      Alert.alert(
        '¡Listo!',
        `${storedBiometricType} configurado exitosamente. La próxima vez podrás iniciar sesión más rápido.`
      );
    } catch (error) {
      console.error('❌ Error configurando biometría:', error);
      Alert.alert(
        'Error',
        'No se pudo configurar la biometría. Intenta desde tu perfil.'
      );
    }
  };

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        // Si está autenticado pero no completó onboarding, mostrar onboarding
        user && !user.onboardingCompleted ? <OnboardingNavigator /> : <MainStackNavigator />
      ) : (
        <AuthNavigator />
      )}

      {/* Modal de configuración biométrica */}
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
    </NavigationContainer>
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