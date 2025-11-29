import { Tutorial } from './types';

export const TUTORIALS: Tutorial[] = [
  // CATEGORÍA: Primeros Pasos
  {
    id: 'dashboard-overview',
    name: 'Interpreta tu Dashboard',
    category: 'Primeros Pasos',
    icon: 'speedometer',
    color: '#2563EB',
    screen: 'Dashboard',
    duration: 30,
    lastUpdated: '2025-01-15',
    tags: ['dashboard', 'inicio', 'resumen'],
    slides: [
      {
        id: '1',
        title: 'Tu Resumen Financiero',
        description: 'Ve tus ingresos, gastos y balance del mes en un solo vistazo',
        icon: 'trending-up',
        backgroundColor: '#2563EB',
        gradientEnd: '#1e40af',
      },
      {
        id: '2',
        title: 'Presupuestos y Metas',
        description: 'Monitorea el progreso de tus objetivos financieros en tiempo real',
        icon: 'target',
        backgroundColor: '#7C3AED',
        gradientEnd: '#6D28D9',
      },
      {
        id: '3',
        title: 'Transacciones Recientes',
        description: 'Revisa tus últimos movimientos y categorías de gasto',
        icon: 'list-circle',
        backgroundColor: '#059669',
        gradientEnd: '#047857',
      },
    ],
  },

  // CATEGORÍA: Asistente IA
  {
    id: 'zenio-advanced',
    name: 'Domina a Zenio',
    category: 'Asistente IA',
    icon: 'chatbubbles',
    color: '#7C3AED',
    screen: 'Zenio',
    duration: 45,
    lastUpdated: '2025-01-15',
    tags: ['zenio', 'ia', 'asistente', 'chat'],
    slides: [
      {
        id: '1',
        title: 'Registra Gastos Rápido',
        description: 'Solo di: "Gasté $50 en comida" y Zenio lo registra automáticamente',
        icon: 'fast-food',
        backgroundColor: '#2563EB',
        gradientEnd: '#1e40af',
      },
      {
        id: '2',
        title: 'Zenio Entiende Contexto',
        description: 'Puedes decir "compré café esta mañana" y él infiere la categoría y hora',
        icon: 'cafe',
        backgroundColor: '#7C3AED',
        gradientEnd: '#6D28D9',
      },
      {
        id: '3',
        title: 'Consulta tus Finanzas',
        description: 'Pregunta: "¿Cuánto gasté en restaurantes este mes?"',
        icon: 'stats-chart',
        backgroundColor: '#059669',
        gradientEnd: '#047857',
      },
      {
        id: '4',
        title: 'Crea Presupuestos y Metas',
        description: 'Di: "Quiero ahorrar $1000 para vacaciones en 6 meses"',
        icon: 'airplane',
        backgroundColor: '#DC2626',
        gradientEnd: '#B91C1C',
      },
    ],
  },

  // CATEGORÍA: Funcionalidades
  {
    id: 'budgets-guide',
    name: 'Gestiona Presupuestos',
    category: 'Funcionalidades',
    icon: 'wallet',
    color: '#059669',
    screen: 'Budgets',
    duration: 40,
    lastUpdated: '2025-01-15',
    tags: ['presupuestos', 'limites', 'control'],
    slides: [
      {
        id: '1',
        title: 'Crea un Presupuesto',
        description: 'Define límites de gasto por categoría como comida, transporte o entretenimiento',
        icon: 'add-circle',
        backgroundColor: '#2563EB',
        gradientEnd: '#1e40af',
      },
      {
        id: '2',
        title: 'Monitorea tu Progreso',
        description: 'Ve en tiempo real cuánto has gastado versus tu límite establecido',
        icon: 'pie-chart',
        backgroundColor: '#059669',
        gradientEnd: '#047857',
      },
      {
        id: '3',
        title: 'Recibe Alertas',
        description: 'Te avisamos cuando te acerques al 80% de tu límite de gasto',
        icon: 'notifications',
        backgroundColor: '#F59E0B',
        gradientEnd: '#D97706',
      },
    ],
  },

  {
    id: 'goals-guide',
    name: 'Alcanza tus Metas',
    category: 'Funcionalidades',
    icon: 'flag',
    color: '#10B981',
    screen: 'Goals',
    duration: 35,
    lastUpdated: '2025-01-15',
    tags: ['metas', 'ahorro', 'objetivos'],
    slides: [
      {
        id: '1',
        title: 'Define tu Meta',
        description: 'Establece un objetivo de ahorro con monto y fecha límite',
        icon: 'flag',
        backgroundColor: '#2563EB',
        gradientEnd: '#1e40af',
      },
      {
        id: '2',
        title: 'Añade Contribuciones',
        description: 'Registra tus ahorros periódicos hacia tu meta',
        icon: 'cash',
        backgroundColor: '#10B981',
        gradientEnd: '#059669',
      },
      {
        id: '3',
        title: 'Celebra tus Logros',
        description: 'Recibe una notificación cuando completes tu meta de ahorro',
        icon: 'trophy',
        backgroundColor: '#F59E0B',
        gradientEnd: '#D97706',
      },
    ],
  },

  {
    id: 'transactions-guide',
    name: 'Registra Transacciones',
    category: 'Funcionalidades',
    icon: 'swap-horizontal',
    color: '#3B82F6',
    screen: 'Transactions',
    duration: 30,
    lastUpdated: '2025-01-15',
    tags: ['transacciones', 'gastos', 'ingresos'],
    slides: [
      {
        id: '1',
        title: 'Dos Formas de Registrar',
        description: 'Usa el formulario manual o pídele a Zenio que lo haga por ti',
        icon: 'create',
        backgroundColor: '#2563EB',
        gradientEnd: '#1e40af',
      },
      {
        id: '2',
        title: 'Categoriza tus Gastos',
        description: 'Asigna categorías para obtener análisis detallados de tus finanzas',
        icon: 'pricetags',
        backgroundColor: '#7C3AED',
        gradientEnd: '#6D28D9',
      },
      {
        id: '3',
        title: 'Edita o Elimina',
        description: 'Toca cualquier transacción para modificar sus detalles o eliminarla',
        icon: 'pencil',
        backgroundColor: '#059669',
        gradientEnd: '#047857',
      },
    ],
  },

  // CATEGORÍA: Herramientas
  {
    id: 'calculators-guide',
    name: 'Usa las Calculadoras',
    category: 'Herramientas',
    icon: 'calculator',
    color: '#DC2626',
    screen: 'Calculators',
    duration: 40,
    lastUpdated: '2025-01-15',
    tags: ['calculadoras', 'herramientas', 'simuladores'],
    slides: [
      {
        id: '1',
        title: 'Calculadora de Préstamos',
        description: 'Calcula cuotas mensuales y el total de intereses que pagarás',
        icon: 'calculator',
        backgroundColor: '#2563EB',
        gradientEnd: '#1e40af',
      },
      {
        id: '2',
        title: 'Simulador de Inversión',
        description: 'Proyecta el crecimiento de tus inversiones con interés compuesto',
        icon: 'trending-up',
        backgroundColor: '#10B981',
        gradientEnd: '#059669',
      },
      {
        id: '3',
        title: 'Calculadora de Inflación',
        description: 'Descubre cómo la inflación afecta el valor de tu dinero',
        icon: 'swap-vertical',
        backgroundColor: '#F59E0B',
        gradientEnd: '#D97706',
      },
      {
        id: '4',
        title: 'Comparador Skip vs Save',
        description: 'Ve cuánto ahorras al evitar pequeñas compras diarias',
        icon: 'analytics',
        backgroundColor: '#7C3AED',
        gradientEnd: '#6D28D9',
      },
    ],
  },

  {
    id: 'ant-detective-guide',
    name: 'Detective de Gastos Hormiga',
    category: 'Herramientas',
    icon: 'search',
    color: '#F59E0B',
    screen: 'AntExpenseDetective',
    duration: 30,
    lastUpdated: '2025-01-15',
    tags: ['gastos-hormiga', 'análisis', 'ahorro'],
    slides: [
      {
        id: '1',
        title: 'Identifica Gastos Pequeños',
        description: 'Encuentra esos cafés, snacks y compras que pasan desapercibidos',
        icon: 'search',
        backgroundColor: '#F59E0B',
        gradientEnd: '#D97706',
      },
      {
        id: '2',
        title: 'Ve el Impacto Total',
        description: 'Descubre cuánto suman estos gastos pequeños al mes y al año',
        icon: 'cash',
        backgroundColor: '#DC2626',
        gradientEnd: '#B91C1C',
      },
      {
        id: '3',
        title: 'Toma Acción',
        description: 'Crea presupuestos específicos para controlar estos gastos',
        icon: 'shield-checkmark',
        backgroundColor: '#059669',
        gradientEnd: '#047857',
      },
    ],
  },
];

// Función helper para obtener tutoriales por categoría
export function getTutorialsByCategory(category: string): Tutorial[] {
  return TUTORIALS.filter(t => t.category === category);
}

// Función helper para obtener tutorial por pantalla
export function getTutorialByScreen(screen: string): Tutorial | undefined {
  return TUTORIALS.find(t => t.screen === screen);
}

// Función helper para buscar tutoriales
export function searchTutorials(query: string): Tutorial[] {
  const lowercaseQuery = query.toLowerCase();
  return TUTORIALS.filter(
    t =>
      t.name.toLowerCase().includes(lowercaseQuery) ||
      t.category.toLowerCase().includes(lowercaseQuery) ||
      t.tags?.some(tag => tag.includes(lowercaseQuery))
  );
}
