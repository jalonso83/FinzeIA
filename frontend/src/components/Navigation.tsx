import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import logoHorizontal from '../assets/logo-horizontal.png';
import './Navigation.css';
import { 
  Home, 
  CreditCard, 
  Target, 
  TrendingUp, 
  BarChart3, 
  Calculator,
  User,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import ProfileForm from './profile/ProfileForm';
import ChangePasswordForm from './ChangePasswordForm';
import api from '../utils/api';

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updateUser } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [profileData, setProfileData] = useState(null);
  
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside of menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (showUserMenu && userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
      
      if (showMobileMenu && mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu, showMobileMenu]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleEditProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      setProfileData(res.data);
      setShowProfileModal(true);
      setShowUserMenu(false);
    } catch (error) {
      alert('No se pudo cargar el perfil');
    }
  };

  const handleChangePassword = () => {
    setShowChangePasswordModal(true);
    setShowUserMenu(false);
  };

  const handleLogoutClick = () => {
    setShowUserMenu(false);
    setShowMobileMenu(false);
    handleLogout();
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Inicio' },
    { path: '/transactions', icon: CreditCard, label: 'Transacciones' },
    { path: '/budgets', icon: Target, label: 'Presupuestos' },
    { path: '/goals', icon: TrendingUp, label: 'Metas' },
    { path: '/reports', icon: BarChart3, label: 'Reportes' },
    { path: '/loan-calculator', icon: Calculator, label: 'Calculadora' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    setShowMobileMenu(false);
  };

  return (
    <>
      <nav className="bg-primary shadow-sm border-b border-border mb-6 relative z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0">
              <img 
                src={logoHorizontal} 
                alt="FinZen AI" 
                className="h-8 w-auto max-w-[100px] sm:max-w-[120px] object-contain cursor-pointer hover:opacity-80 transition-opacity" 
                onClick={() => navigate('/')}
              />
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex lg:items-center lg:space-x-4 flex-1 justify-center">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? 'bg-white text-primary'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    <IconComponent size={18} className="mr-2" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Right side - Mobile menu button and User menu */}
            <div className="flex items-center space-x-2">
              {/* Mobile menu button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="lg:hidden p-2 text-white hover:bg-white/10 rounded-md transition-colors"
                aria-label="Toggle menu"
              >
                {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
              </button>

              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 px-3 py-2 text-white hover:text-warning rounded-lg hover:bg-white/10 transition"
                >
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-primary font-semibold text-sm nav-avatar">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-white">{user?.name}</div>
                    <div className="text-xs text-white/70">{user?.email}</div>
                  </div>
                  <svg className={`w-4 h-4 transition-transform nav-icon ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Menú Desplegable del Usuario */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[60]">
                <div className="px-4 py-2 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700">Mi Cuenta</h3>
                </div>
                
                <div className="py-1">
                  <button 
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3" 
                    onClick={handleEditProfile}
                  >
                    <svg className="w-4 h-4 nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Editar Perfil</span>
                  </button>
                  
                  <button 
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3" 
                    onClick={handleChangePassword}
                  >
                    <svg className="w-4 h-4 nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Cambiar Contraseña</span>
                  </button>
                  
                  <button 
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                  >
                    <svg className="w-4 h-4 nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-6H4v6zM4 5h6V4a2 2 0 00-2-2H6a2 2 0 00-2 2v1zM14 5h6V4a2 2 0 00-2-2h-2a2 2 0 00-2 2v1zM4 12h6v-1H4v1zM14 12h6v-1h-6v1z" />
                    </svg>
                    <span>Configuración</span>
                  </button>
                  

                  
                  <button 
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                  >
                    <svg className="w-4 h-4 nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Ayuda</span>
                  </button>
                  
                  <button 
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                  >
                    <svg className="w-4 h-4 nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                    <span>Compartir</span>
                  </button>
                </div>
                
                <div className="border-t border-gray-100 py-1">
                  <button 
                    onClick={handleLogoutClick}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3"
                  >
                    <svg className="w-4 h-4 nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {showMobileMenu && (
          <div className="lg:hidden bg-primary border-t border-white/10" ref={mobileMenuRef}>
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={`w-full flex items-center px-3 py-3 rounded-md text-base font-medium transition-colors ${
                      isActive(item.path)
                        ? 'bg-white text-primary'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    <IconComponent size={20} className="mr-3" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {showProfileModal && profileData && (
        <ProfileForm
          user={profileData}
          onClose={() => setShowProfileModal(false)}
          onProfileUpdated={async () => {
            setShowProfileModal(false);
            // Recargar usuario global
            try {
              const res = await api.get('/auth/profile');
              updateUser(res.data);
            } catch (e) {}
          }}
        />
      )}
      
      {showChangePasswordModal && (
        <ChangePasswordForm
          onClose={() => setShowChangePasswordModal(false)}
        />
      )}
    </>
  );
};

export default Navigation; 