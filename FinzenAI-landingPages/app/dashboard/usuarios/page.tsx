'use client';

import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Search, Loader2 } from 'lucide-react';
import { useUsersList } from '@/hooks/useUsersList';
import UsersTable from '@/components/dashboard/UsersTable';

export default function UsuariosPage() {
  const {
    users,
    pagination,
    countries,
    loading,
    error,
    params,
    setParams,
    setPage,
    refresh,
  } = useUsersList();

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setParams({ search: searchInput || undefined });
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput, setParams]);

  const handleSort = (field: string) => {
    const isSameField = params.sortBy === field;
    setParams({
      sortBy: field,
      sortOrder: isSameField && params.sortOrder === 'desc' ? 'asc' : 'desc',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-finzen-black">Usuarios</h1>
          {pagination && (
            <p className="text-sm text-finzen-gray mt-0.5">
              {pagination.total} usuario{pagination.total !== 1 ? 's' : ''} registrado{pagination.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-finzen-gray/20 text-finzen-gray hover:text-finzen-black hover:bg-finzen-white transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-finzen-gray" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-finzen-gray/20 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-finzen-blue/20 focus:border-finzen-blue transition-all"
          />
        </div>

        {/* Plan filter */}
        <select
          value={params.plan || ''}
          onChange={(e) => setParams({ plan: e.target.value || undefined })}
          className="px-3 py-2 text-sm border border-finzen-gray/20 rounded-lg bg-white text-finzen-gray focus:outline-none focus:ring-2 focus:ring-finzen-blue/20 focus:border-finzen-blue"
        >
          <option value="">Todos los planes</option>
          <option value="FREE">Free</option>
          <option value="PREMIUM">Plus</option>
          <option value="PRO">Pro</option>
        </select>

        {/* Status filter */}
        <select
          value={params.status || ''}
          onChange={(e) => setParams({ status: e.target.value || undefined })}
          className="px-3 py-2 text-sm border border-finzen-gray/20 rounded-lg bg-white text-finzen-gray focus:outline-none focus:ring-2 focus:ring-finzen-blue/20 focus:border-finzen-blue"
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVE">Activo</option>
          <option value="TRIALING">Trial</option>
          <option value="CANCELED">Cancelado</option>
          <option value="EXPIRED">Vencido</option>
        </select>

        {/* Country filter */}
        <select
          value={params.country || ''}
          onChange={(e) => setParams({ country: e.target.value || undefined })}
          className="px-3 py-2 text-sm border border-finzen-gray/20 rounded-lg bg-white text-finzen-gray focus:outline-none focus:ring-2 focus:ring-finzen-blue/20 focus:border-finzen-blue"
        >
          <option value="">Todos los países</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-600 font-medium">Error al cargar usuarios</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
          <button
            onClick={refresh}
            className="mt-3 px-4 py-2 text-sm font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
          >
            Reintentar
          </button>
        </div>
      ) : loading && users.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-finzen-blue" />
        </div>
      ) : (
        <div className={loading ? 'opacity-60 pointer-events-none' : ''}>
          <UsersTable
            users={users}
            pagination={pagination}
            params={params}
            onSort={handleSort}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
