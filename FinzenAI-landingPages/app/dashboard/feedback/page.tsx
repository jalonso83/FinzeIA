'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Search, Loader2, Bug, Lightbulb, MessageCircle, Check, X, Smartphone, Apple } from 'lucide-react';

type FeedbackType = 'BUG' | 'SUGGESTION' | 'OTHER';
type FeedbackStatus = 'NEW' | 'REVIEWED' | 'RESOLVED' | 'WONT_FIX';

interface FeedbackUser {
  id: string;
  name: string;
  lastName: string;
  email: string;
}

interface FeedbackItem {
  id: string;
  userId: string;
  user: FeedbackUser;
  type: FeedbackType;
  module: string | null;
  message: string;
  appVersion: string | null;
  platform: string | null;
  status: FeedbackStatus;
  adminResponse: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FeedbackListResponse {
  items: FeedbackItem[];
  total: number;
  limit: number;
  offset: number;
}

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  transactions: 'Transacciones',
  budgets: 'Presupuestos',
  goals: 'Metas',
  zenio: 'Zenio',
  tools: 'Herramientas',
  subscriptions: 'Suscripciones',
  email_sync: 'Email Bancario',
  notifications: 'Notificaciones',
  gamification: 'Gamificación',
  auth: 'Login/Registro',
  other: 'Otro',
};

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  NEW: 'Nuevo',
  REVIEWED: 'Revisado',
  RESOLVED: 'Resuelto',
  WONT_FIX: 'No se arregla',
};

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  NEW: 'bg-blue-50 text-blue-700 border-blue-200',
  REVIEWED: 'bg-amber-50 text-amber-700 border-amber-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  WONT_FIX: 'bg-gray-100 text-gray-600 border-gray-200',
};

const TYPE_ICONS = {
  BUG: { Icon: Bug, color: 'text-red-600 bg-red-50', label: 'Bug' },
  SUGGESTION: { Icon: Lightbulb, color: 'text-amber-600 bg-amber-50', label: 'Sugerencia' },
  OTHER: { Icon: MessageCircle, color: 'text-indigo-600 bg-indigo-50', label: 'Otro' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function FeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [moduleFilter, setModuleFilter] = useState<string>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Detail panel
  const [selected, setSelected] = useState<FeedbackItem | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set('status', statusFilter);
      if (typeFilter) qs.set('type', typeFilter);
      if (moduleFilter) qs.set('module', moduleFilter);
      if (search) qs.set('search', search);

      const res = await fetch(`/api/admin/feedback?${qs.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Error al cargar feedback');
        setItems([]);
        setTotal(0);
        return;
      }
      const payload = data as FeedbackListResponse;
      setItems(payload.items);
      setTotal(payload.total);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, moduleFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchInput), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const handleUpdateStatus = async (id: string, status: FeedbackStatus) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || 'No se pudo actualizar');
        return;
      }
      const updated = (await res.json()) as FeedbackItem;
      setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
      if (selected?.id === id) setSelected(updated);
    } catch {
      alert('Error de conexión');
    } finally {
      setUpdating(false);
    }
  };

  const counts = {
    total,
    new: items.filter((it) => it.status === 'NEW').length,
    bugs: items.filter((it) => it.type === 'BUG').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-finzen-black">Feedback</h1>
          <p className="text-sm text-finzen-gray mt-0.5">
            {counts.total} total · {counts.new} nuevos · {counts.bugs} bugs (en filtro)
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-finzen-gray/20 text-finzen-gray hover:text-finzen-black hover:bg-finzen-white transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-finzen-gray" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar en mensajes..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-finzen-gray/20 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-finzen-blue/20 focus:border-finzen-blue transition-all"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-finzen-gray/20 rounded-lg bg-white text-finzen-gray focus:outline-none focus:ring-2 focus:ring-finzen-blue/20 focus:border-finzen-blue"
        >
          <option value="">Todos los estados</option>
          <option value="NEW">Nuevos</option>
          <option value="REVIEWED">Revisados</option>
          <option value="RESOLVED">Resueltos</option>
          <option value="WONT_FIX">No se arregla</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-finzen-gray/20 rounded-lg bg-white text-finzen-gray focus:outline-none focus:ring-2 focus:ring-finzen-blue/20 focus:border-finzen-blue"
        >
          <option value="">Todos los tipos</option>
          <option value="BUG">Bugs</option>
          <option value="SUGGESTION">Sugerencias</option>
          <option value="OTHER">Otros</option>
        </select>

        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-finzen-gray/20 rounded-lg bg-white text-finzen-gray focus:outline-none focus:ring-2 focus:ring-finzen-blue/20 focus:border-finzen-blue"
        >
          <option value="">Todos los módulos</option>
          {Object.entries(MODULE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-finzen-red/5 border border-finzen-red/20 rounded-lg px-4 py-3">
          <p className="text-sm text-finzen-red">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && items.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-finzen-blue" />
        </div>
      )}

      {/* Empty */}
      {!loading && items.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-finzen-gray/10 p-12 text-center">
          <MessageCircle size={40} className="mx-auto text-finzen-gray/40 mb-3" />
          <p className="text-sm text-finzen-gray">No hay feedback con los filtros actuales.</p>
        </div>
      )}

      {/* List */}
      {items.length > 0 && (
        <div className="bg-white rounded-2xl border border-finzen-gray/10 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-finzen-gray border-b border-finzen-gray/10">
            <div className="col-span-1">Tipo</div>
            <div className="col-span-2">Usuario</div>
            <div className="col-span-2">Módulo</div>
            <div className="col-span-3">Mensaje</div>
            <div className="col-span-1">App</div>
            <div className="col-span-2">Fecha</div>
            <div className="col-span-1">Estado</div>
          </div>
          <div className="divide-y divide-finzen-gray/10">
            {items.map((it) => {
              const { Icon, color, label } = TYPE_ICONS[it.type];
              const PlatformIcon = it.platform === 'ios' ? Apple : Smartphone;
              return (
                <button
                  key={it.id}
                  onClick={() => setSelected(it)}
                  className="w-full grid grid-cols-12 gap-2 px-4 py-3 text-sm text-left hover:bg-finzen-white transition-colors"
                >
                  <div className="col-span-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${color}`}>
                      <Icon size={12} />
                      {label}
                    </span>
                  </div>
                  <div className="col-span-2 truncate">
                    <div className="font-medium text-finzen-black">{it.user.name} {it.user.lastName}</div>
                    <div className="text-xs text-finzen-gray truncate">{it.user.email}</div>
                  </div>
                  <div className="col-span-2 text-finzen-gray">
                    {it.module ? (MODULE_LABELS[it.module] ?? it.module) : '—'}
                  </div>
                  <div className="col-span-3 text-finzen-black truncate">{it.message}</div>
                  <div className="col-span-1 flex items-center gap-1 text-xs text-finzen-gray">
                    {it.platform && <PlatformIcon size={12} />}
                    {it.appVersion ?? '—'}
                  </div>
                  <div className="col-span-2 text-xs text-finzen-gray">{formatDate(it.createdAt)}</div>
                  <div className="col-span-1">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium border ${STATUS_COLORS[it.status]}`}>
                      {STATUS_LABELS[it.status]}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-finzen-gray/10">
              <div className="flex items-center gap-3">
                {(() => {
                  const { Icon, color, label } = TYPE_ICONS[selected.type];
                  return (
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${color}`}>
                      <Icon size={16} />
                      {label}
                    </span>
                  );
                })()}
                <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium border ${STATUS_COLORS[selected.status]}`}>
                  {STATUS_LABELS[selected.status]}
                </span>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg hover:bg-finzen-white transition-colors"
              >
                <X size={20} className="text-finzen-gray" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs uppercase font-semibold text-finzen-gray mb-1">Usuario</div>
                  <div className="text-finzen-black font-medium">{selected.user.name} {selected.user.lastName}</div>
                  <div className="text-xs text-finzen-gray">{selected.user.email}</div>
                </div>
                <div>
                  <div className="text-xs uppercase font-semibold text-finzen-gray mb-1">Módulo</div>
                  <div className="text-finzen-black">{selected.module ? (MODULE_LABELS[selected.module] ?? selected.module) : '—'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase font-semibold text-finzen-gray mb-1">Plataforma</div>
                  <div className="text-finzen-black">{selected.platform ? selected.platform.toUpperCase() : '—'} · v{selected.appVersion ?? '?'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase font-semibold text-finzen-gray mb-1">Fecha</div>
                  <div className="text-finzen-black">{formatDate(selected.createdAt)}</div>
                </div>
                {selected.reviewedAt && selected.reviewedBy && (
                  <div className="col-span-2">
                    <div className="text-xs uppercase font-semibold text-finzen-gray mb-1">Revisado por</div>
                    <div className="text-finzen-black">{selected.reviewedBy} · {formatDate(selected.reviewedAt)}</div>
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs uppercase font-semibold text-finzen-gray mb-2">Mensaje</div>
                <div className="bg-finzen-white border border-finzen-gray/10 rounded-lg p-4 text-sm text-finzen-black whitespace-pre-wrap">
                  {selected.message}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-finzen-gray/10 flex flex-wrap items-center gap-2 justify-end">
              {selected.status !== 'REVIEWED' && (
                <button
                  onClick={() => handleUpdateStatus(selected.id, 'REVIEWED')}
                  disabled={updating}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-50"
                >
                  Marcar revisado
                </button>
              )}
              {selected.status !== 'RESOLVED' && (
                <button
                  onClick={() => handleUpdateStatus(selected.id, 'RESOLVED')}
                  disabled={updating}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                  <Check size={14} />
                  Resuelto
                </button>
              )}
              {selected.status !== 'WONT_FIX' && (
                <button
                  onClick={() => handleUpdateStatus(selected.id, 'WONT_FIX')}
                  disabled={updating}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  No se arregla
                </button>
              )}
              {selected.status !== 'NEW' && (
                <button
                  onClick={() => handleUpdateStatus(selected.id, 'NEW')}
                  disabled={updating}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  Marcar nuevo
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
