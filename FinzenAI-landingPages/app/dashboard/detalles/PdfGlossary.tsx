/**
 * Glosario de indicadores que aparece al final del PDF.
 *
 * NOTA DE MANTENIMIENTO: Estas definiciones son una copia de los tooltips
 * usados en el dashboard interactivo (page.tsx). Si actualizas un tooltip
 * en el dashboard, **actualízalo también acá** para que el PDF quede
 * sincronizado.
 *
 * Las entradas están ordenadas alfabéticamente por nombre del indicador.
 */

interface GlossaryEntry {
  name: string;
  definition: string;
}

const GLOSSARY_ENTRIES: GlossaryEntry[] = [
  {
    name: 'Activados',
    definition: 'Usuarios del período que registraron al menos una transacción (criterio de activación real).',
  },
  {
    name: 'Adopción TX',
    definition: '% del cohort registrado en el período que hizo al menos 1 transacción durante el mismo período. Cohort y actividad están alineados (no se mezcla con users legacy). Excluye users registrados en la última hora (sin chance razonable de activarse). Métrica de activación core: si es bajo, los users registran pero no usan la app.',
  },
  {
    name: 'Adopción Zenio',
    definition: '% del cohort registrado en el período que usó Zenio (chat v2, agentes o transcripción) durante el mismo período. Cohort-consistent — no incluye legacy users. Mide adopción del feature diferenciador (AI) por usuarios nuevos.',
  },
  {
    name: 'ARPU',
    definition: 'Average Revenue Per User. Ingreso promedio por suscriptor activo pagando.',
  },
  {
    name: 'Break-Even',
    definition: 'Punto de equilibrio: cuántos suscriptores pagados necesitas para que la contribución (ARPU − costo variable por user) cubra los costos fijos mensuales.',
  },
  {
    name: 'Burn Rate',
    definition: 'Gastos − Ingresos del mes. Positivo = pérdida mensual neta. Negativo = ganancia.',
  },
  {
    name: 'Cancelaciones (30d)',
    definition: 'Usuarios que pagaron hace 30-60 días pero no en los últimos 30 (attrition real basado en pagos). Captura mensuales correctamente; anuales pueden tardar hasta su fecha de no-renovación.',
  },
  {
    name: 'Cash Flow Mensual',
    definition: 'MRR − Costo Total. Positivo = profit, negativo = burn. Es la métrica más honesta de viabilidad mensual.',
  },
  {
    name: 'Cohortes de Retención',
    definition: 'Agrupa usuarios por semana de registro y muestra qué % se mantienen activos en D1, D7, D14 y D30. Indica qué tan bien retienes usuarios nuevos.',
  },
  {
    name: 'Conversión Referidos',
    definition: 'Referidos creados en el período que terminaron convirtiéndose en usuarios activos. El % es vs total de referidos enviados (mismo cohorte).',
  },
  {
    name: 'Costo IA / Total',
    definition: 'Costo OpenAI escalado a mensual / TODOS los usuarios registrados (incluye dormidos). Vista más conservadora del costo de IA por usuario.',
  },
  {
    name: 'Costo IA / Usuario',
    definition: 'Costo OpenAI escalado a mensual / usuarios con ≥1 transacción en el período (usuarios activos).',
  },
  {
    name: 'Costo Infra / Total',
    definition: 'Costos fijos mensuales (Railway, Vercel, etc.) / total de usuarios registrados.',
  },
  {
    name: 'Costo Infra / Usuario',
    definition: 'Costos fijos mensuales / usuarios activos en el período.',
  },
  {
    name: 'Costo Total / Total',
    definition: 'Costo total mensual / total de usuarios registrados. Vista optimista del costo unitario.',
  },
  {
    name: 'Costo Total / Usuario',
    definition: 'Costo total mensual / usuarios activos. Indicador clave para unit economics.',
  },
  {
    name: 'Costo Total Mensual',
    definition: 'Suma de costos fijos (Railway, Vercel, dominios, etc.) + costos variables (OpenAI, fees de Stripe/RevenueCat) escalados a mensual.',
  },
  {
    name: 'CR% (Conversion Rate)',
    definition: 'Subscriptions / Visitors × 100. % del tráfico que se convirtió en suscripción pagada. Mide eficacia del funnel completo.',
  },
  {
    name: 'Desglose de Costos',
    definition: 'Costos fijos hardcodeados (actualizar en backend cuando cambien) + variables calculados desde DB. % calculado sobre el total.',
  },
  {
    name: 'Estado Financiero',
    definition: 'Sostenible (cash flow ≥ 0) / Precaución (burn activo, runway ≥ 6 meses) / Crítico (burn activo, runway < 6 meses).',
  },
  {
    name: 'Eventos por Día',
    definition: 'Serie temporal de cada evento (PageView, Lead, Registro, Subscribe) durante el período. Útil para correlacionar con campañas activas o picos de tráfico.',
  },
  {
    name: 'Funnel Completo (Usuarios)',
    definition: 'Del cohorte de usuarios registrados en el período seleccionado, muestra cuántos avanzaron a cada etapa (Onboarding, Activación, Retención D1/D7, Trial, Paid). El % se calcula vs total registrados (base 100%).',
  },
  {
    name: 'Funnel de Conversión (Adquisición)',
    definition: 'Desde Visitors (PageView) hasta Subscriptions, muestra el % que avanza en cada etapa. Útil para identificar dónde se cae la conversión.',
  },
  {
    name: 'Gastos Mes Actual',
    definition: 'Costos fijos + variables (OpenAI + fees) del mes calendario en curso.',
  },
  {
    name: 'Ingreso Bruto Total',
    definition: 'Suma de TODOS los pagos exitosos de toda la historia (sin filtro de fecha). Es el dinero total que ha entrado a la empresa.',
  },
  {
    name: 'Ingresos Mes Actual',
    definition: 'Pagos exitosos del mes calendario actual.',
  },
  {
    name: 'Ingresos Total',
    definition: 'Suma total de pagos exitosos en el período seleccionado.',
  },
  {
    name: 'Leads',
    definition: 'Clics en CTAs de descarga (App Store / Google Play). Indica intención de conversión. Cuenta cada click — un mismo usuario puede generar varios leads.',
  },
  {
    name: 'Margen Bruto',
    definition: '(MRR − costos variables) / MRR × 100. Excluye costos fijos por convención SaaS. Indica rentabilidad a escala.',
  },
  {
    name: 'MAU',
    definition: 'Monthly Active Users. Usuarios únicos con actividad (transacción, login, etc.) en los últimos 30 días.',
  },
  {
    name: 'MRR',
    definition: 'Ingreso Mensual Recurrente actual. Solo suscripciones activas pagando (sin trials). Suma normalizada a mensual de planes mensuales y anuales.',
  },
  {
    name: 'MRR Trend',
    definition: 'Tendencia histórica del Ingreso Mensual Recurrente. Muestra crecimiento o caídas en ingresos pagados a lo largo del tiempo.',
  },
  {
    name: 'Pagos Exitosos',
    definition: 'Número de pagos procesados con éxito en el período.',
  },
  {
    name: 'Pagos Fallidos',
    definition: 'Pagos que no se pudieron procesar (tarjeta rechazada, fondos insuficientes, etc.).',
  },
  {
    name: 'Racha Activa',
    definition: '% de usuarios activos con racha (streak) viva en el período. Indica formación de hábito vía gamification. Si está estancado, las streaks no están enganchando.',
  },
  {
    name: 'Referidos Enviados',
    definition: 'Invitaciones de referido creadas en el período (top del funnel viral).',
  },
  {
    name: 'Registros',
    definition: 'Usuarios únicos que completaron signup en la app durante el período. Disparado server-side desde el endpoint de registro.',
  },
  {
    name: 'Registros Diarios',
    definition: 'Número de nuevas registraciones por día. Útil para identificar picos de adquisición o efectividad de campañas de marketing.',
  },
  {
    name: 'Revenue por Plan',
    definition: 'Desglose de ingresos (MRR) por cada plan de suscripción. Muestra qué plan genera más ingresos y cuántos usuarios pagan por cada uno.',
  },
  {
    name: 'RevenueCat',
    definition: 'Ingresos totales de RevenueCat (compras in-app iOS/Android) en el período.',
  },
  {
    name: 'Runway',
    definition: 'Meses que el ingreso bruto acumulado cubriría la pérdida mensual actual. ∞ si actualmente no hay burn (cash flow positivo).',
  },
  {
    name: 'Stripe',
    definition: 'Ingresos totales de Stripe (pagos web) en el período.',
  },
  {
    name: 'Subscriptions',
    definition: 'Usuarios únicos con pago confirmado (Stripe + RevenueCat). Solo cuenta nuevas suscripciones, no renovaciones.',
  },
  {
    name: 'Tasa Onboarding',
    definition: '% de usuarios registrados en el período que ya completaron el onboarding con Zenio.',
  },
  {
    name: 'Time-to-First-TX',
    definition: 'Mediana de horas entre registro y primera transacción del cohorte del período. Entre paréntesis: % del cohorte que llegó a hacer primera tx. Solo cohortes con ≥1h desde registro.',
  },
  {
    name: 'Top Sources',
    definition: 'Agrupa eventos por utm_source de forma lifetime (NO aplica el filtro de fechas del dashboard). "Directo" = users que llegaron sin UTM. Registros = anonymousIds únicos que clickearon "Descargar" (cada Lead cuenta como atribución). CR% = Registros / Visitors.',
  },
  {
    name: 'Total Suscripciones',
    definition: 'Usuarios pagando actualmente (Plus o Pro con status ACTIVE), sobre el total de usuarios registrados. NO incluye trials.',
  },
  {
    name: 'Trials Activos',
    definition: 'Usuarios en período de prueba gratuita de 7 días.',
  },
  {
    name: 'TX / Usuario Activo',
    definition: 'Promedio de transacciones por usuario activo en el período. Indica profundidad de uso. Nota: es promedio simple — no refleja distribución.',
  },
  {
    name: 'Usuarios Activos',
    definition: 'Usuarios que registraron al menos 1 transacción (con fecha en el período seleccionado). Mide actividad financiera, no toda actividad en la app.',
  },
  {
    name: 'Visitantes',
    definition: 'Visitantes únicos en el período. Cada navegador cuenta como 1, no se cuentan recargas (DISTINCT por anonymousId).',
  },

  // ─── Entradas del Resumen Ejecutivo (Pulso) ───
  {
    name: 'Churn Rate',
    definition: 'Porcentaje de suscripciones pagadas que se cancelaron en el período. Menor es mejor.',
  },
  {
    name: 'Costos OpenAI',
    definition: 'Costo total de OpenAI (Zenio, Email Parser, TTS, etc.) en el período.',
  },
  {
    name: 'Crecimiento de Usuarios',
    definition: 'Curva temporal de nuevos registros por día durante el período seleccionado. Útil para identificar picos relacionados a campañas o estacionalidad.',
  },
  {
    name: 'DAU / MAU',
    definition: 'Daily Active Users / Monthly Active Users. Indicador de "stickiness": % del MAU que abre la app cada día. >20% se considera saludable.',
  },
  {
    name: 'Distribución por Plan',
    definition: 'Composición de usuarios entre Free, Plus y Pro. Muestra qué % de la base es de pago vs gratuita.',
  },
  {
    name: 'MRR Neto',
    definition: 'Monthly Recurring Revenue normalizado (ingresos recurrentes mensuales después de descuentos). Métrica top-line de SaaS.',
  },
  {
    name: 'Nuevos Registros',
    definition: 'Usuarios que se registraron en el período seleccionado. El % compara con el período anterior de igual duración.',
  },
  {
    name: 'Registros por País',
    definition: 'Distribución geográfica de registros del período. Útil para validar si las campañas activas están atrayendo el mercado objetivo.',
  },
  {
    name: 'Retención D1',
    definition: '% de usuarios que vuelven a la app al día siguiente de registrarse. Mide la primera impresión del producto.',
  },
  {
    name: 'Retención D7',
    definition: '% de usuarios que siguen activos a los 7 días de registrarse. Indicador de tracción inicial.',
  },
  {
    name: 'Retención D30',
    definition: '% de usuarios que siguen activos a los 30 días de registrarse. Indicador de retención de largo plazo y product-market fit.',
  },
  {
    name: 'Total Usuarios',
    definition: 'Número total de usuarios registrados en la plataforma all-time (sin filtro de fecha).',
  },
];

export function PdfGlossary() {
  // Aseguramos orden alfabético en runtime también, por si las entradas se editan.
  const sorted = [...GLOSSARY_ENTRIES].sort((a, b) =>
    a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
  );

  return (
    <section className="pdf-glossary">
      <h2
        style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#1a1a1a',
          marginBottom: '8px',
        }}
      >
        Glosario de Indicadores
      </h2>
      <p style={{ fontSize: '12px', color: '#666', marginBottom: '20px' }}>
        Definiciones de los términos y métricas usadas en este reporte. Ordenadas alfabéticamente.
      </p>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '11px',
        }}
      >
        <thead>
          <tr style={{ background: '#f5f7fa', borderBottom: '2px solid #cdd6e0' }}>
            <th
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                fontSize: '10px',
                fontWeight: 700,
                color: '#444',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                width: '30%',
              }}
            >
              Indicador
            </th>
            <th
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                fontSize: '10px',
                fontWeight: 700,
                color: '#444',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Definición
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry) => (
            <tr
              key={entry.name}
              style={{ borderBottom: '1px solid #e8ecef', verticalAlign: 'top' }}
              className="pdf-no-break"
            >
              <td
                style={{
                  padding: '8px 12px',
                  fontWeight: 600,
                  color: '#204274',
                  whiteSpace: 'nowrap',
                }}
              >
                {entry.name}
              </td>
              <td style={{ padding: '8px 12px', color: '#1a1a1a', lineHeight: 1.5 }}>
                {entry.definition}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
