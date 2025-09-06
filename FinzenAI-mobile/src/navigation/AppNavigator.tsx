// Navegación principal de la app móvil FinZen
// Configuración multiplataforma (Android + iOS)

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TouchableOpacity, Alert, View, Text, Modal, Image } from 'react-native';
import ProfileForm from '../components/profile/ProfileForm';
import ChangePasswordForm from '../components/ChangePasswordForm';
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
import UtilitiesMenu from '../components/UtilitiesMenu';
import ZenioFloatingButton from '../components/ZenioFloatingButton';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import OnboardingWelcomeScreen from '../screens/OnboardingWelcomeScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

// Stores
import { useAuthStore } from '../stores/auth';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Navegación de autenticación y onboarding
function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
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
        headerRight: route.name === 'Dashboard' ? () => (
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginRight: Math.max(insets.right + 8, 16) // Asegurar margen mínimo de 16, más espacio en notch
          }}>
            <TouchableOpacity 
              onPress={() => setShowUserMenu(true)}
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                padding: 8,
                backgroundColor: '#f8fafc',
                borderRadius: 20,
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
function MainNavigator() {
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = React.useState(false);
  const [profileData, setProfileData] = React.useState(null);
  const { updateUser } = useAuthStore();
  const insets = useSafeAreaInsets();

  const UserMenuModal = () => (
    <Modal
      visible={showUserMenu}
      transparent
      animationType="fade"
      onRequestClose={() => setShowUserMenu(false)}
    >
      <TouchableOpacity 
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-start',
          alignItems: 'flex-end',
          paddingTop: Math.max(insets.top + 50, 90), // Asegurar que esté debajo del header
          paddingRight: Math.max(insets.right + 8, 16), // Consistente con el botón
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
                borderTopWidth: 1,
                borderTopColor: '#f1f5f9',
                marginTop: 8,
              }}
              onPress={() => {
                setShowUserMenu(false);
                const { logout } = useAuthStore.getState();
                Alert.alert(
                  'Cerrar Sesión',
                  '¿Estás seguro que quieres cerrar sesión?',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { 
                      text: 'Cerrar Sesión', 
                      style: 'destructive',
                      onPress: logout
                    }
                  ]
                );
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
    </React.Fragment>
  );
}

// Navegador principal de la app
export default function AppNavigator() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        // Si está autenticado pero no completó onboarding, mostrar onboarding
        user && !user.onboardingCompleted ? <OnboardingNavigator /> : <MainNavigator />
      ) : (
        <AuthNavigator />
      )}
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