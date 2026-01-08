/**
 * FinZen AI - Sistema de Colores Centralizado
 *
 * USO:
 * import { colors } from '../theme/colors';
 *
 * <View style={{ backgroundColor: colors.primary.main }}>
 * <Text style={{ color: colors.text.primary }}>
 *
 * NO USAR colores hardcodeados:
 * ❌ backgroundColor: '#2563EB'
 * ✅ backgroundColor: colors.primary.main
 */

export const colors = {
  // ============================================
  // COLORES PRIMARIOS (Marca FinZen)
  // ============================================
  primary: {
    main: '#2563EB',      // Azul principal - botones, links, acciones
    dark: '#1d4ed8',      // Azul oscuro - hover, pressed states
    darker: '#1E40AF',    // Azul más oscuro - énfasis fuerte
    light: '#eff6ff',     // Azul muy claro - fondos sutiles
    lighter: '#bfdbfe',   // Azul claro - bordes, badges
    contrast: '#FFFFFF',  // Texto sobre primary
  },

  // ============================================
  // COLORES DE ESTADO
  // ============================================
  success: {
    main: '#10B981',      // Verde - éxito, ingresos, positivo
    dark: '#059669',      // Verde oscuro - hover
    light: '#D1FAE5',     // Verde claro - fondos
    lighter: '#ECFDF5',   // Verde muy claro
    contrast: '#FFFFFF',
  },

  warning: {
    main: '#F59E0B',      // Dorado/Ámbar - advertencias, plan Plus
    dark: '#D97706',      // Dorado oscuro - hover
    light: '#FEF3C7',     // Dorado claro - fondos
    lighter: '#FFFBEB',   // Dorado muy claro
    contrast: '#FFFFFF',
  },

  error: {
    main: '#DC2626',      // Rojo - errores, gastos, alertas
    dark: '#B91C1C',      // Rojo oscuro - hover
    light: '#FEE2E2',     // Rojo claro - fondos
    lighter: '#FEF2F2',   // Rojo muy claro
    contrast: '#FFFFFF',
  },

  // ============================================
  // COLORES DE PLANES DE SUSCRIPCIÓN
  // ============================================
  plan: {
    free: {
      primary: '#6B7280',   // Gris - plan gratuito
      secondary: '#F3F4F6',
      icon: '📱',
    },
    plus: {
      primary: '#F59E0B',   // Dorado - plan Plus
      secondary: '#FEF3C7',
      icon: '⭐',
    },
    pro: {
      primary: '#1E40AF',   // Azul Marino - plan PRO (antes morado)
      secondary: '#DBEAFE',
      icon: '💎',
    },
  },

  // ============================================
  // FONDOS
  // ============================================
  background: {
    main: '#f8fafc',        // Fondo principal de la app
    card: '#FFFFFF',        // Fondo de cards
    secondary: '#f1f5f9',   // Fondo secundario
    elevated: '#FFFFFF',    // Elementos elevados
    overlay: 'rgba(0, 0, 0, 0.5)', // Overlay para modals
  },

  // ============================================
  // TEXTO
  // ============================================
  text: {
    primary: '#1e293b',     // Texto principal - títulos, contenido
    secondary: '#64748b',   // Texto secundario - descripciones
    tertiary: '#9CA3AF',    // Texto terciario - placeholders
    disabled: '#6b7280',    // Texto deshabilitado
    inverse: '#FFFFFF',     // Texto sobre fondos oscuros
    link: '#2563EB',        // Links
  },

  // ============================================
  // BORDES
  // ============================================
  border: {
    light: '#e2e8f0',       // Bordes sutiles
    main: '#d1d5db',        // Bordes normales
    dark: '#9ca3af',        // Bordes marcados
    active: '#2563EB',      // Borde activo/focus
  },

  // ============================================
  // CATEGORÍAS DE TRANSACCIONES
  // ============================================
  category: {
    food: '#F59E0B',        // Alimentación
    transport: '#3B82F6',   // Transporte
    entertainment: '#EC4899', // Entretenimiento
    health: '#10B981',      // Salud
    education: '#0EA5E9',   // Educación (sky blue)
    shopping: '#EF4444',    // Compras
    bills: '#6366F1',       // Facturas
    income: '#10B981',      // Ingresos
    savings: '#0891B2',     // Ahorros
    other: '#6B7280',       // Otros
  },

  // ============================================
  // COLORES DE RECORDATORIOS
  // ============================================
  reminder: {
    bill: '#EF4444',        // Facturas
    subscription: '#0891B2', // Suscripciones (cyan)
    loan: '#F59E0B',        // Préstamos
    insurance: '#EC4899',   // Seguros (rosa)
    tax: '#6366F1',         // Impuestos
    other: '#6B7280',       // Otros
  },

  // ============================================
  // GAMIFICACIÓN
  // ============================================
  gamification: {
    streak: '#F59E0B',      // Racha
    badge: '#2563EB',       // Badges
    progress: '#10B981',    // Progreso
    level: '#1E40AF',       // Niveles
  },

  // ============================================
  // UTILIDADES
  // ============================================
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

// Tipo para autocompletado
export type Colors = typeof colors;

// Export por defecto
export default colors;
