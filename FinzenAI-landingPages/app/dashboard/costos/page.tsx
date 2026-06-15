'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Loader2, Plus, Trash2, Save, X, DollarSign, Users, TrendingUp, Info } from 'lucide-react';
import {
  fetchCampaignCosts,
  upsertCampaignCost,
  deleteCampaignCost,
  type CampaignCostRow,
  type CampaignCostsResponse,
} from '@/lib/dashboard-api';

function formatMoney(n: number | null): string {
  if (n === null || !isFinite(n)) return '—';
  return `$${n.toFixed(2)}`;
}

// Definiciones centrales — coherentes con PdfGlossary.tsx.
const GLOSSARY = {
  totalInvertido:
    'Suma de todos los costos ingresados manualmente por campaña. Acumulativo total — no aplica el filtro de fechas del dashboard.',
  atribuidosKPI:
    'Total de usuarios atribuidos a campañas que tienen costo > $0. Cada anonymousId único que clickeó "Descargar iOS/Android" cuenta como 1 atribuido.',
  cacPromedio:
    'Costo de Adquisición promedio = Total invertido / Atribuidos totales. Cuánto te cuesta en promedio cada usuario que decidió descargar la app.',
  source:
    'Origen del tráfico capturado del UTM al click del ad (meta, tiktok, google, ig, etc.). "Directo" no aparece acá porque no aplica costo de campaña.',
  campaign:
    'Nombre exacto de la campaña en la plataforma de anuncios (utm_campaign). "—" significa que la fuente no envió campaña (ej. tráfico de bio orgánico).',
  fechaInicio:
    'Fecha de inicio de la campaña (informativa). Solo aplica a campañas con costo manual. No filtra ni afecta las métricas del dashboard.',
  inversion:
    'Costo manual ingresado para esta campaña. Es acumulativo total: cuando inviertas más, actualizas el número aquí. No tiene granularidad temporal.',
  visitors:
    'AnonymousIds únicos que vieron la landing page (PageView). Lifetime — no se filtra por fecha.',
  leads:
    'Total de clicks al botón "Descargar iOS/Android" (incluye reclicks del mismo user). Lifetime.',
  atribuidos:
    'AnonymousIds únicos que clickearon "Descargar" (cada anonymousId cuenta una sola vez, sin importar reclicks). Es la unidad de atribución por campaña.',
  cpv:
    'Cost Per Visit = Inversión / Visitors. Cuánto te cuesta cada visita a la landing. Útil para campañas de awareness.',
  cpl:
    'Cost Per Lead = Inversión / Leads. Cuánto te cuesta cada click al botón Descargar (sin deduplicar). Refleja agresividad del CTA.',
  cac:
    'Cost of Acquisition = Inversión / Atribuidos. La métrica clave: cuánto te cuesta cada usuario único que decidió descargar la app desde esta campaña.',
};

function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <Info size={12} className="text-finzen-gray/50 cursor-help ml-1" />
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 bg-finzen-black text-white text-xs font-normal normal-case tracking-normal rounded-lg shadow-lg whitespace-normal text-left">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-finzen-black" />
        </span>
      )}
    </span>
  );
}

function CostInput({
  initial,
  onSave,
  disabled,
}: {
  initial: number;
  onSave: (value: number) => Promise<void>;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(initial.toString());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(initial.toString());
  }, [initial]);

  const hasChanged = parseFloat(value || '0') !== initial;

  const handleSave = async () => {
    const num = parseFloat(value || '0');
    if (!isFinite(num) || num < 0) {
      setError('Inválido');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(num);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-finzen-gray">$</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled || saving}
          className="w-24 pl-5 pr-2 py-1 text-sm border border-finzen-gray/20 rounded text-right focus:outline-none focus:ring-1 focus:ring-finzen-blue/30 focus:border-finzen-blue disabled:bg-finzen-white"
        />
      </div>
      {hasChanged && (
        <button
          onClick={handleSave}
          disabled={saving}
          title="Guardar"
          className="p-1 text-finzen-blue hover:bg-finzen-blue/10 rounded transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        </button>
      )}
      {error && <span className="text-[10px] text-finzen-red ml-1">{error}</span>}
    </div>
  );
}

// Fecha de inicio editable inline. Guarda al cambiar (igual patrón que CostInput).
function DateInput({
  initial,
  onSave,
  disabled,
}: {
  initial: string | null; // ISO o null
  onSave: (value: string | null) => Promise<void>;
  disabled?: boolean;
}) {
  const toInputValue = (iso: string | null) => (iso ? iso.slice(0, 10) : '');
  const [value, setValue] = useState(toInputValue(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(toInputValue(initial));
  }, [initial]);

  const hasChanged = value !== toInputValue(initial);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(value || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <input
        type="date"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled || saving}
        className="w-36 px-2 py-1 text-sm border border-finzen-gray/20 rounded focus:outline-none focus:ring-1 focus:ring-finzen-blue/30 focus:border-finzen-blue disabled:bg-finzen-white"
      />
      {hasChanged && (
        <button
          onClick={handleSave}
          disabled={saving}
          title="Guardar"
          className="p-1 text-finzen-blue hover:bg-finzen-blue/10 rounded transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        </button>
      )}
      {error && <span className="text-[10px] text-finzen-red ml-1">{error}</span>}
    </div>
  );
}

function ManualForm({
  onAdd,
  onCancel,
}: {
  onAdd: (input: { source: string; campaign: string; costUSD: number; campaignDate: string | null }) => Promise<void>;
  onCancel: () => void;
}) {
  const [source, setSource] = useState('');
  const [campaign, setCampaign] = useState('');
  const [cost, setCost] = useState('');
  const [startDate, setStartDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!source.trim()) {
      setError('Source es requerido');
      return;
    }
    const num = parseFloat(cost || '0');
    if (!isFinite(num) || num < 0) {
      setError('Inversión inválida');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onAdd({ source: source.trim(), campaign: campaign.trim(), costUSD: num, campaignDate: startDate || null });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-dashed border-finzen-blue/30 bg-finzen-blue/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-finzen-black">Agregar campaña manual</h3>
        <button
          onClick={onCancel}
          className="p-1 text-finzen-gray hover:text-finzen-red rounded"
          title="Cancelar"
        >
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-finzen-gray mb-1">Source</label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="meta / tiktok / google..."
            className="w-full px-3 py-2 text-sm border border-finzen-gray/20 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-finzen-blue/20 focus:border-finzen-blue"
          />
        </div>
        <div>
          <label className="block text-xs text-finzen-gray mb-1">Campaign</label>
          <input
            type="text"
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            placeholder="Nombre exacto de la campaña"
            className="w-full px-3 py-2 text-sm border border-finzen-gray/20 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-finzen-blue/20 focus:border-finzen-blue"
          />
        </div>
        <div>
          <label className="block text-xs text-finzen-gray mb-1">Fecha de inicio</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-finzen-gray/20 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-finzen-blue/20 focus:border-finzen-blue"
          />
        </div>
        <div>
          <label className="block text-xs text-finzen-gray mb-1">Inversión (USD)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-finzen-gray">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="100.00"
              className="w-full pl-7 pr-3 py-2 text-sm border border-finzen-gray/20 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-finzen-blue/20 focus:border-finzen-blue"
            />
          </div>
        </div>
      </div>
      {error && <p className="text-xs text-finzen-red">{error}</p>}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-3 py-1.5 text-sm font-medium text-finzen-gray hover:text-finzen-black rounded-lg transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg bg-finzen-blue text-white hover:bg-finzen-blue/90 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Agregar
        </button>
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;

export default function CostosPage() {
  const router = useRouter();
  const [data, setData] = useState<CampaignCostsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchCampaignCosts();
      setData(response);
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        router.push('/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'Error cargando costos');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveCost = async (row: CampaignCostRow, costUSD: number) => {
    await upsertCampaignCost({
      source: row.source,
      campaign: row.campaign,
      costUSD,
      campaignDate: row.campaignDate, // preservar la fecha al editar el costo
    });
    await load();
  };

  const handleSaveDate = async (row: CampaignCostRow, campaignDate: string | null) => {
    await upsertCampaignCost({
      source: row.source,
      campaign: row.campaign,
      costUSD: row.costUSD, // preservar el costo al editar la fecha
      campaignDate,
    });
    await load();
  };

  const handleDelete = async (row: CampaignCostRow) => {
    if (!row.id) return;
    if (!confirm(`¿Borrar el costo de "${row.source} / ${row.campaign || '—'}"?`)) return;
    try {
      await deleteCampaignCost(row.id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al borrar');
    }
  };

  const handleAddManual = async (input: { source: string; campaign: string; costUSD: number; campaignDate: string | null }) => {
    await upsertCampaignCost(input);
    setShowManualForm(false);
    await load();
  };

  const rows = data?.rows ?? [];
  const summary = data?.summary;

  // Paginado del lado del cliente (los KPIs de arriba siguen sobre todas las filas).
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const fromRow = rows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const toRow = Math.min(currentPage * PAGE_SIZE, rows.length);

  // Si cambia el set de filas (borrar/agregar) y la página queda fuera de rango, corrige.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-finzen-black">Costos de Campañas</h1>
          <p className="text-sm text-finzen-gray mt-0.5">
            Inversión manual por campaña. Métricas lifetime (no aplica filtro de fechas).
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-finzen-gray/20 text-finzen-gray hover:text-finzen-black hover:bg-finzen-white transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-finzen-gray/20 bg-white p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-finzen-blue/10 text-finzen-blue flex items-center justify-center">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-xs text-finzen-gray flex items-center">
                Total invertido
                <InfoTooltip text={GLOSSARY.totalInvertido} />
              </p>
              <p className="text-xl font-bold text-finzen-black">{formatMoney(summary.totalInvested)}</p>
            </div>
          </div>
          <div className="rounded-lg border border-finzen-gray/20 bg-white p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <p className="text-xs text-finzen-gray flex items-center">
                Atribuidos (Lead)
                <InfoTooltip text={GLOSSARY.atribuidosKPI} />
              </p>
              <p className="text-xl font-bold text-finzen-black">{summary.totalAttributed.toLocaleString('es')}</p>
            </div>
          </div>
          <div className="rounded-lg border border-finzen-gray/20 bg-white p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-xs text-finzen-gray flex items-center">
                CAC promedio
                <InfoTooltip text={GLOSSARY.cacPromedio} />
              </p>
              <p className="text-xl font-bold text-finzen-black">{formatMoney(summary.avgCAC)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button onClick={load} className="ml-2 underline">Reintentar</button>
        </div>
      )}

      {/* Loading inicial */}
      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-finzen-blue" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-finzen-gray/20 bg-white p-12 text-center">
          <p className="text-finzen-gray">No hay campañas registradas todavía.</p>
          <button
            onClick={() => setShowManualForm(true)}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-finzen-blue text-white hover:bg-finzen-blue/90"
          >
            <Plus size={14} />
            Agregar primera campaña
          </button>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="rounded-lg border border-finzen-gray/20 bg-white overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-finzen-white border-b border-finzen-gray/20">
                <tr className="text-left text-xs font-semibold text-finzen-gray uppercase tracking-wider">
                  <th className="px-4 py-3">
                    <span className="inline-flex items-center">Source<InfoTooltip text={GLOSSARY.source} /></span>
                  </th>
                  <th className="px-4 py-3">
                    <span className="inline-flex items-center">Campaña<InfoTooltip text={GLOSSARY.campaign} /></span>
                  </th>
                  <th className="px-4 py-3">
                    <span className="inline-flex items-center">Fecha inicio<InfoTooltip text={GLOSSARY.fechaInicio} /></span>
                  </th>
                  <th className="px-4 py-3">
                    <span className="inline-flex items-center">Inversión<InfoTooltip text={GLOSSARY.inversion} /></span>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <span className="inline-flex items-center justify-end">Visitors<InfoTooltip text={GLOSSARY.visitors} /></span>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <span className="inline-flex items-center justify-end">Leads<InfoTooltip text={GLOSSARY.leads} /></span>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <span className="inline-flex items-center justify-end">Atribuidos<InfoTooltip text={GLOSSARY.atribuidos} /></span>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <span className="inline-flex items-center justify-end">CPV<InfoTooltip text={GLOSSARY.cpv} /></span>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <span className="inline-flex items-center justify-end">CPL<InfoTooltip text={GLOSSARY.cpl} /></span>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <span className="inline-flex items-center justify-end">CAC<InfoTooltip text={GLOSSARY.cac} /></span>
                  </th>
                  <th className="px-4 py-3 text-center">·</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-finzen-gray/10">
                {pagedRows.map((row) => (
                  <tr
                    key={`${row.source}::${row.campaign}`}
                    className="hover:bg-finzen-white/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-finzen-black">
                      {row.source}
                      {row.isManual && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-normal">
                          manual
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-finzen-black">
                      {row.campaign || <span className="text-finzen-gray/50">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <DateInput
                        initial={row.campaignDate}
                        onSave={(v) => handleSaveDate(row, v)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <CostInput
                        initial={row.costUSD}
                        onSave={(v) => handleSaveCost(row, v)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-finzen-black">{row.visitors.toLocaleString('es')}</td>
                    <td className="px-4 py-3 text-right text-finzen-black">{row.leads.toLocaleString('es')}</td>
                    <td className="px-4 py-3 text-right text-finzen-black font-medium">{row.registrations.toLocaleString('es')}</td>
                    <td className="px-4 py-3 text-right text-finzen-gray">{formatMoney(row.cpv)}</td>
                    <td className="px-4 py-3 text-right text-finzen-gray">{formatMoney(row.cpl)}</td>
                    <td className="px-4 py-3 text-right text-finzen-black font-medium">{formatMoney(row.cac)}</td>
                    <td className="px-4 py-3 text-center">
                      {row.id && (
                        <button
                          onClick={() => handleDelete(row)}
                          className="p-1 text-finzen-gray hover:text-finzen-red transition-colors"
                          title="Borrar costo"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-finzen-gray">
                Mostrando {fromRow}-{toRow} de {rows.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 rounded-md border border-finzen-gray/20 text-finzen-gray hover:bg-finzen-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        pageNum === currentPage
                          ? 'bg-finzen-blue text-white'
                          : 'border border-finzen-gray/20 text-finzen-gray hover:bg-finzen-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 rounded-md border border-finzen-gray/20 text-finzen-gray hover:bg-finzen-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

          {/* Manual add */}
          {showManualForm ? (
            <ManualForm onAdd={handleAddManual} onCancel={() => setShowManualForm(false)} />
          ) : (
            <button
              onClick={() => setShowManualForm(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-dashed border-finzen-gray/30 text-finzen-gray hover:text-finzen-blue hover:border-finzen-blue/40 transition-colors"
            >
              <Plus size={14} />
              Agregar campaña manual
            </button>
          )}
        </>
      )}
    </div>
  );
}
