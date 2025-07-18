import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import logoHorizontal from '../assets/logo-horizontal.png';
import './Navigation.css';
import { Home } from 'lucide-react';
import ProfileForm from './profile/ProfileForm';
import ChangePasswordForm from './ChangePasswordForm';
import api from '../utils/api';

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updateUser } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showReportsSubmenu, setShowReportsSubmenu] = useState(false);
  const [showUtilitiesMenu, setShowUtilitiesMenu] = useState(false);
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
    } catch (error) {
      alert('No se pudo cargar el perfil');
    }
  };

  const handleChangePassword = () => {
    setShowChangePasswordModal(true);
    setShowUserMenu(false);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-primary shadow-sm border-b border-border px-6 py-3 mb-6">
      <div className="flex justify-between items-center">
        {/* Logo y Navegación Principal */}
        <div className="flex items-center space-x-6">
          <img src={logoHorizontal} alt="FinZen AI" className="h-10 w-auto mr-2 select-none" style={{ minWidth: 120 }} />
          <div className="flex space-x-2 md:space-x-4">
            <button 
              onClick={() => navigate('/')}
              className={`px-3 py-2 rounded-lg transition nav-active-indicator flex items-center justify-center ${
                isActive('/') 
                  ? 'bg-white text-primary font-semibold' 
                  : 'text-white hover:bg-white/10 hover:text-white'
              }`}
              aria-label="Inicio"
            >
              <Home size={22} className="inline-block" />
            </button>
            <button 
              onClick={() => navigate('/transactions')}
              className={`px-3 py-2 rounded-lg transition nav-active-indicator ${
                isActive('/transactions') 
                  ? 'bg-white text-primary font-semibold' 
                  : 'text-white hover:bg-white/10 hover:text-white'
              }`}
            >
              Transacciones
            </button>
            <button 
              onClick={() => navigate('/budgets')}
              className={`px-3 py-2 rounded-lg transition nav-active-indicator ${
                isActive('/budgets') 
                  ? 'bg-white text-primary font-semibold' 
                  : 'text-white hover:bg-white/10 hover:text-white'
              }`}
            >
              Presupuestos
            </button>
            <button 
              onClick={() => navigate('/goals')}
              className={`px-3 py-2 rounded-lg transition nav-active-indicator ${
                isActive('/goals') 
                  ? 'bg-white text-primary font-semibold' 
                  : 'text-white hover:bg-white/10 hover:text-white'
              }`}
            >
              Metas
            </button>
            <button 
              onClick={() => navigate('/reports')}
              className={`px-3 py-2 rounded-lg transition nav-active-indicator ${
                isActive('/reports') 
                  ? 'bg-white text-primary font-semibold' 
                  : 'text-white hover:bg-white/10 hover:text-white'
              }`}
            >
              Reporte
            </button>
            
            {/* Menú de Utilidades */}
            <div className="relative">
              <button
                onClick={() => setShowUtilitiesMenu(!showUtilitiesMenu)}
                className={`px-3 py-2 rounded-lg transition nav-active-indicator flex items-center space-x-2 ${
                  isActive('/loan-calculator') 
                    ? 'bg-white text-primary font-semibold' 
                    : 'text-white hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>Utilidades</span>
                <svg className={`w-4 h-4 transition-transform nav-icon ${showUtilitiesMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Menú Desplegable de Utilidades */}
              {showUtilitiesMenu && (
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 nav-menu-dropdown">
                  <div className="py-1">
                    <button 
                      onClick={() => {
                        navigate('/loan-calculator');
                        setShowUtilitiesMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 nav-menu-item"
                    >
                      <svg className="w-4 h-4 nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span>Calculadora de Préstamos</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Menú del Usuario */}
        <div className="flex items-center space-x-4">
          {/* Menú del Usuario */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 px-3 py-2 text-white hover:text-warning rounded-lg hover:bg-white/10 transition"
            >
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-primary font-semibold text-sm nav-avatar">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-white">{user?.name}</div>
                <div className="text-xs text-white/70">{user?.email}</div>
              </div>
              <svg className={`w-4 h-4 transition-transform nav-icon ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Menú Desplegable del Usuario */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 nav-menu-dropdown">
                <div className="px-4 py-2 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700">Mi Cuenta</h3>
                </div>
                
                <div className="py-1">
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 nav-menu-item" onClick={handleEditProfile}>
                    <svg className="w-4 h-4 nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Editar Perfil</span>
                  </button>
                  
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 nav-menu-item" onClick={handleChangePassword}>
                    <svg className="w-4 h-4 nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Cambiar Contraseña</span>
                  </button>
                  
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 nav-menu-item">
                    <svg className="w-4 h-4 nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-6H4v6zM4 5h6V4a2 2 0 00-2-2H6a2 2 0 00-2 2v1zM14 5h6V4a2 2 0 00-2-2h-2a2 2 0 00-2 2v1zM4 12h6v-1H4v1zM14 12h6v-1h-6v1z" />
                    </svg>
                    <span>Configuración</span>
                  </button>
                  
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 nav-menu-item">
                    <svg className="w-4 h-4 nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Onboarding</span>
                  </button>
                  
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 nav-menu-item">
                    <svg className="w-4 h-4 nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Ayuda</span>
                  </button>
                  
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 nav-menu-item">
                    <svg className="w-4 h-4 nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                    <span>Compartir</span>
                  </button>
                </div>
                
                <div className="border-t border-gray-100 py-1">
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3 nav-menu-item"
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

      {/* Overlay para cerrar menús al hacer clic fuera */}
      {(showUserMenu || showUtilitiesMenu) && (
        <div 
          className="fixed inset-0 z-40 nav-overlay" 
          onClick={() => {
            setShowUserMenu(false);
            setShowReportsSubmenu(false);
            setShowUtilitiesMenu(false);
          }}
        />
      )}
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
    </nav>
  );
};

export default Navigation; 