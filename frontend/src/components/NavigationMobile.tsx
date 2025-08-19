import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import logoHorizontal from '../assets/logo-horizontal.png';
import { 
  Home, 
  CreditCard, 
  Target, 
  TrendingUp, 
  BarChart3, 
  Calculator, 
  Menu, 
  X, 
  User, 
  Settings, 
  LogOut 
} from 'lucide-react';
import ProfileForm from './profile/ProfileForm';
import ChangePasswordForm from './ChangePasswordForm';
import api from '../utils/api';

const NavigationMobile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updateUser } = useAuthStore();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [profileData, setProfileData] = useState(null);

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
      setShowMobileMenu(false);
    } catch (error) {
      alert('No se pudo cargar el perfil');
    }
  };

  const handleChangePassword = () => {
    setShowChangePasswordModal(true);
    setShowUserMenu(false);
    setShowMobileMenu(false);
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
      {/* Header Desktop y Mobile */}
      <nav className="bg-primary shadow-sm border-b border-border">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <img 
                src={logoHorizontal} 
                alt="FinZen AI" 
                className="h-8 w-auto cursor-pointer hover:opacity-80 transition-opacity" 
                onClick={() => navigate('/')}
              />
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex lg:items-center lg:space-x-4">
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

            {/* Right side - User menu and mobile button */}
            <div className="flex items-center space-x-2">
              {/* User Menu Desktop */}
              <div className="hidden lg:block relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 px-3 py-2 text-white hover:bg-white/10 rounded-md transition-colors"
                >
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-primary font-semibold text-sm">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm font-medium">{user?.name}</span>
                </button>

                {/* Desktop User Dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-700">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <div className="py-1">
                      <button 
                        onClick={handleEditProfile}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                      >
                        <User size={16} />
                        <span>Editar Perfil</span>
                      </button>
                      <button 
                        onClick={handleChangePassword}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                      >
                        <Settings size={16} />
                        <span>Cambiar Contraseña</span>
                      </button>
                    </div>
                    <div className="border-t border-gray-100 py-1">
                      <button 
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3"
                      >
                        <LogOut size={16} />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="lg:hidden p-2 text-white hover:bg-white/10 rounded-md transition-colors"
              >
                {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {showMobileMenu && (
          <div className="lg:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-primary border-t border-white/10">
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

              {/* Mobile User Section */}
              <div className="pt-4 mt-4 border-t border-white/10">
                <div className="flex items-center px-3 py-2 text-white">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary font-semibold">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-white/70">{user?.email}</p>
                  </div>
                </div>
                
                <div className="mt-2 space-y-1">
                  <button 
                    onClick={handleEditProfile}
                    className="w-full flex items-center px-3 py-3 text-white hover:bg-white/10 rounded-md transition-colors"
                  >
                    <User size={20} className="mr-3" />
                    <span>Editar Perfil</span>
                  </button>
                  <button 
                    onClick={handleChangePassword}
                    className="w-full flex items-center px-3 py-3 text-white hover:bg-white/10 rounded-md transition-colors"
                  >
                    <Settings size={20} className="mr-3" />
                    <span>Cambiar Contraseña</span>
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center px-3 py-3 text-red-200 hover:bg-red-500/20 rounded-md transition-colors"
                  >
                    <LogOut size={20} className="mr-3" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Overlay para cerrar menús */}
      {(showUserMenu || showMobileMenu) && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 lg:bg-transparent" 
          onClick={() => {
            setShowUserMenu(false);
            setShowMobileMenu(false);
          }}
        />
      )}

      {/* Modales */}
      {showProfileModal && profileData && (
        <ProfileForm
          user={profileData}
          onClose={() => setShowProfileModal(false)}
          onProfileUpdated={async () => {
            setShowProfileModal(false);
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

export default NavigationMobile;