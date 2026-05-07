import { DateRange } from '@/lib/dashboard-api';

interface PdfCoverPageProps {
  range: DateRange;
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  generatedBy?: string | null; // email del admin (opcional, viene en Hito 4)
}

const RANGE_LABELS: Record<string, string> = {
  '7d': '7 días',
  '14d': '14 días',
  '30d': '30 días',
  '90d': '90 días',
};

function formatDateLong(isoDate: string): string {
  // El input es YYYY-MM-DD; lo convertimos a fecha local y formateamos.
  // Usamos UTC para evitar shift de zona horaria con fechas tipo "2026-05-01".
  const d = new Date(`${isoDate}T00:00:00Z`);
  return d.toLocaleDateString('es', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function PdfCoverPage({ range, fromDate, toDate, generatedBy }: PdfCoverPageProps) {
  const rangeLabel = RANGE_LABELS[range] ?? range;
  const generatedAt = new Date().toLocaleString('es', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return (
    <section
      className="pdf-cover-page"
      style={{
        minHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '40px 0',
      }}
    >
      {/* Logo / branding */}
      <div style={{ textAlign: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-horizontal.png"
          alt="FinZen AI"
          style={{ height: '60px', width: 'auto', margin: '0 auto', display: 'block' }}
        />
        <p
          style={{
            fontSize: '13px',
            color: '#666',
            marginTop: '8px',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
        >
          Reporte interno · Confidencial
        </p>
      </div>

      {/* Título principal */}
      <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h2
          style={{
            fontSize: '40px',
            fontWeight: 700,
            color: '#1a1a1a',
            marginBottom: '24px',
            letterSpacing: '-1px',
          }}
        >
          Reporte Ejecutivo
          <br />
          de Métricas
        </h2>

        <div
          style={{
            display: 'inline-block',
            margin: '32px auto 0',
            padding: '20px 32px',
            background: '#f5f7fa',
            borderRadius: '12px',
            borderLeft: '6px solid #204274',
            textAlign: 'left',
            minWidth: '320px',
          }}
        >
          <p style={{ fontSize: '11px', color: '#666', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Periodo del reporte
          </p>
          <p style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
            Últimos {rangeLabel}
          </p>
          <p style={{ fontSize: '14px', color: '#444', marginTop: '6px' }}>
            {formatDateLong(fromDate)} — {formatDateLong(toDate)}
          </p>
        </div>
      </div>

      {/* Footer del cover */}
      <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '16px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
        <p style={{ margin: 0 }}>
          <strong style={{ color: '#1a1a1a' }}>Generado:</strong> {generatedAt}
        </p>
        {generatedBy && (
          <p style={{ margin: '4px 0 0' }}>
            <strong style={{ color: '#1a1a1a' }}>Por:</strong> {generatedBy}
          </p>
        )}
        <p style={{ margin: '12px 0 0', fontSize: '10px', color: '#999' }}>
          Este documento contiene información interna y confidencial de FinZen AI.
          No distribuir sin autorización.
        </p>
      </div>
    </section>
  );
}
