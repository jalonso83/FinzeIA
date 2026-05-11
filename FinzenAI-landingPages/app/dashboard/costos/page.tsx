'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Loader2, Plus, Trash2, Save, X, DollarSign, Users, TrendingUp } from 'lucide-react';
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

function ManualForm({
  onAdd,
  onCancel,
}: {
  onAdd: (input: { source: string; campaign: string; costUSD: number }) => Promise<void>;
  onCancel: () => void;
}) {
  const [source, setSource] = useState('');
  const [campaign, setCampaign] = useState('');
  const [cost, setCost] = useState('');
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
      await onAdd({ source: source.trim(), campaign: campaign.trim(), costUSD: num });
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

export default function CostosPage() {
  const router = useRouter();
  const [data, setData] = useState<CampaignCostsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);

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

  const handleAddManual = async (input: { source: string; campaign: string; costUSD: number }) => {
    await upsertCampaignCost(input);
    setShowManualForm(false);
    await load();
  };

  const rows = data?.rows ?? [];
  const summary = data?.summary;

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
              <p className="text-xs text-finzen-gray">Total invertido</p>
              <p className="text-xl font-bold text-finzen-black">{formatMoney(summary.totalInvested)}</p>
            </div>
          </div>
          <div className="rounded-lg border border-finzen-gray/20 bg-white p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <p className="text-xs text-finzen-gray">Atribuidos (Lead)</p>
              <p className="text-xl font-bold text-finzen-black">{summary.totalAttributed.toLocaleString('es')}</p>
            </div>
          </div>
          <div className="rounded-lg border border-finzen-gray/20 bg-white p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-xs text-finzen-gray">CAC promedio</p>
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
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Campaña</th>
                  <th className="px-4 py-3">Inversión</th>
                  <th className="px-4 py-3 text-right">Visitors</th>
                  <th className="px-4 py-3 text-right">Leads</th>
                  <th className="px-4 py-3 text-right">Atribuidos</th>
                  <th className="px-4 py-3 text-right">CPV</th>
                  <th className="px-4 py-3 text-right">CPL</th>
                  <th className="px-4 py-3 text-right">CAC</th>
                  <th className="px-4 py-3 text-center">·</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-finzen-gray/10">
                {rows.map((row) => (
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
