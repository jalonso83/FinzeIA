// ─── Mock Data for Dashboard (will be replaced with real API data) ───

// ─── Banner Superior ────────────────────────────────────────────
export const bannerData = {
  runway: 8, // meses
  mrrNeto: 142,
  mrrCambio: 12, // porcentaje
  mau: 87,
};

// ─── KPI Cards ──────────────────────────────────────────────────
export const kpiCards = [
  {
    label: 'Total Usuarios',
    value: '234',
    change: null,
    changeType: 'neutral' as const,
  },
  {
    label: 'Nuevos Registros',
    value: '47',
    change: '+15%',
    changeType: 'positive' as const,
  },
  {
    label: 'Activados (7d)',
    value: '12',
    change: null,
    changeType: 'neutral' as const,
  },
  {
    label: 'Free → Paid (30d)',
    value: '2.8%',
    change: '+0.3%',
    changeType: 'positive' as const,
  },
  {
    label: 'Churn Rate',
    value: '8.5%',
    change: '-1.2%',
    changeType: 'negative' as const,
  },
  {
    label: 'Costo IA / Usuario',
    value: '$0.12',
    change: '-$0.02',
    changeType: 'positive' as const,
  },
];

// ─── Crecimiento Usuarios (últimos 30 días) ─────────────────────
export const userGrowthData = [
  { date: '01 Feb', registros: 3, activaciones: 1 },
  { date: '02 Feb', registros: 5, activaciones: 2 },
  { date: '03 Feb', registros: 2, activaciones: 1 },
  { date: '04 Feb', registros: 7, activaciones: 3 },
  { date: '05 Feb', registros: 4, activaciones: 2 },
  { date: '06 Feb', registros: 6, activaciones: 2 },
  { date: '07 Feb', registros: 3, activaciones: 1 },
  { date: '08 Feb', registros: 8, activaciones: 4 },
  { date: '09 Feb', registros: 5, activaciones: 2 },
  { date: '10 Feb', registros: 4, activaciones: 1 },
  { date: '11 Feb', registros: 6, activaciones: 3 },
  { date: '12 Feb', registros: 9, activaciones: 4 },
  { date: '13 Feb', registros: 7, activaciones: 3 },
  { date: '14 Feb', registros: 5, activaciones: 2 },
  { date: '15 Feb', registros: 4, activaciones: 2 },
  { date: '16 Feb', registros: 6, activaciones: 3 },
  { date: '17 Feb', registros: 8, activaciones: 3 },
  { date: '18 Feb', registros: 3, activaciones: 1 },
  { date: '19 Feb', registros: 5, activaciones: 2 },
  { date: '20 Feb', registros: 7, activaciones: 4 },
  { date: '21 Feb', registros: 4, activaciones: 2 },
  { date: '22 Feb', registros: 6, activaciones: 3 },
  { date: '23 Feb', registros: 9, activaciones: 5 },
  { date: '24 Feb', registros: 5, activaciones: 2 },
  { date: '25 Feb', registros: 7, activaciones: 3 },
  { date: '26 Feb', registros: 4, activaciones: 2 },
  { date: '27 Feb', registros: 8, activaciones: 4 },
  { date: '28 Feb', registros: 6, activaciones: 3 },
];

// ─── MRR Trend (últimos 30 días) ────────────────────────────────
export const mrrTrendData = [
  { date: '01 Feb', mrr: 98 },
  { date: '04 Feb', mrr: 102 },
  { date: '07 Feb', mrr: 105 },
  { date: '10 Feb', mrr: 108 },
  { date: '13 Feb', mrr: 115 },
  { date: '16 Feb', mrr: 120 },
  { date: '19 Feb', mrr: 125 },
  { date: '22 Feb', mrr: 132 },
  { date: '25 Feb', mrr: 138 },
  { date: '28 Feb', mrr: 142 },
];

// ─── Distribución de Planes ─────────────────────────────────────
export const planDistribution = [
  { name: 'Free', value: 78, color: '#b0b8be' },
  { name: 'Plus', value: 15, color: '#6cad7f' },
  { name: 'Pro', value: 7, color: '#204274' },
];

// ─── Registros por Canal ────────────────────────────────────────
export const channelData = [
  { canal: 'Orgánico', registros: 45, color: '#204274' },
  { canal: 'Ads', registros: 28, color: '#6cad7f' },
  { canal: 'Referral', registros: 12, color: '#f59e0b' },
  { canal: 'Directo', registros: 8, color: '#b0b8be' },
];

// ─── Quick Stats ────────────────────────────────────────────────
export const quickStats = {
  retencionD1: '28%',
  retencionD7: '14%',
  retencionD30: '9%',
  dauMau: '18%',
  trialToPaid: '42%',
  ultimaActualizacion: 'hace 5 min',
};

// ─── Detalles — Funnel de Conversión ────────────────────────────
export const funnelData = [
  { etapa: 'Descarga', valor: 763, porcentaje: '100%' },
  { etapa: 'Registro', valor: 534, porcentaje: '70%' },
  { etapa: 'Activación', valor: 115, porcentaje: '15%' },
  { etapa: 'Retención D1', valor: 32, porcentaje: '28%' },
  { etapa: 'Retención D7', valor: 16, porcentaje: '14%' },
  { etapa: 'Trial', valor: 9, porcentaje: '8%' },
  { etapa: 'Paid', valor: 4, porcentaje: '42%' },
];

// ─── Detalles — Cohortes ────────────────────────────────────────
export const cohortData = [
  { semana: 'Feb 1', d1: 32, d7: 15, d14: 11, d30: 8 },
  { semana: 'Feb 8', d1: 28, d7: 12, d14: 9, d30: null },
  { semana: 'Feb 15', d1: 35, d7: 18, d14: null, d30: null },
  { semana: 'Feb 22', d1: 30, d7: null, d14: null, d30: null },
];

// ─── Detalles — Revenue ─────────────────────────────────────────
export const revenueStats = {
  mrrActual: '$142',
  mrrAnterior: '$127',
  mrrCambio: '+11.8%',
  arpu: '$4.73',
  ltv: '$28.40',
  cac: '$8.50',
  ltvCacRatio: '3.3x',
  totalSuscripciones: 30,
  trials: 8,
  cancelaciones: 3,
};

export const revenueByPlan = [
  { plan: 'Plus ($4.99/mes)', usuarios: 22, mrr: '$109.78' },
  { plan: 'Pro ($9.99/mes)', usuarios: 8, mrr: '$79.92' },
];

// ─── Detalles — Engagement ──────────────────────────────────────
export const engagementStats = {
  sesionesZenioDiarias: 45,
  promedioMensajesPorSesion: 4.2,
  transaccionesPorUsuarioActivo: 8.3,
  tasaOnboarding: '65%',
  featureMasUsado: 'Registro por voz',
  featureMenosUsado: 'Exportar CSV',
};

export const zenioUsageData = [
  { date: '01 Feb', sesiones: 32 },
  { date: '04 Feb', sesiones: 38 },
  { date: '07 Feb', sesiones: 41 },
  { date: '10 Feb', sesiones: 35 },
  { date: '13 Feb', sesiones: 48 },
  { date: '16 Feb', sesiones: 52 },
  { date: '19 Feb', sesiones: 45 },
  { date: '22 Feb', sesiones: 50 },
  { date: '25 Feb', sesiones: 47 },
  { date: '28 Feb', sesiones: 55 },
];

// ─── Detalles — Unit Economics ──────────────────────────────────
export const unitEconomics = {
  costoIAPorUsuario: '$0.12',
  costoInfraPorUsuario: '$0.05',
  costoTotalPorUsuario: '$0.17',
  margenBruto: '64%',
  breakEvenUsuarios: 450,
  usuariosActuales: 234,
  progresoBreakEven: '52%',
};

export const costBreakdown = [
  { concepto: 'OpenAI API', costo: '$28.08', porcentaje: '70%' },
  { concepto: 'Infraestructura (Railway)', costo: '$5.00', porcentaje: '12.5%' },
  { concepto: 'Firebase', costo: '$0.00', porcentaje: '0%' },
  { concepto: 'Resend (emails)', costo: '$0.00', porcentaje: '0%' },
  { concepto: 'Stripe fees', costo: '$7.10', porcentaje: '17.5%' },
];

// ─── Detalles — Salud Financiera ────────────────────────────────
export const financialHealth = {
  balanceCuenta: '$1,136',
  gastosMensuales: '$142',
  ingresosMensuales: '$142',
  runway: '8 meses',
  burnRate: '$0/mes',
  estado: 'Sostenible',
};
