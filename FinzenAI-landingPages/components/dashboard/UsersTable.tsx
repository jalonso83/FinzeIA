'use client';

import { ChevronUp, ChevronDown } from 'lucide-react';
import type { UserListItem, UserListPagination, UsersListParams } from '@/lib/dashboard-api';

interface UsersTableProps {
  users: UserListItem[];
  pagination: UserListPagination | null;
  params: UsersListParams;
  onSort: (sortBy: string) => void;
  onPageChange: (page: number) => void;
}

// ─── Helpers ──────────────────────────────────────────────────

function getInitials(name: string, lastName: string): string {
  return ((name?.[0] || '') + (lastName?.[0] || '')).toUpperCase() || '??';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'Sin actividad';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Hace ${days}d`;
  const months = Math.floor(days / 30);
  return `Hace ${months}mes${months > 1 ? 'es' : ''}`;
}

const planBadge: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-600',
  PREMIUM: 'bg-emerald-100 text-emerald-700',
  PRO: 'bg-blue-100 text-blue-700',
};

const planLabel: Record<string, string> = {
  FREE: 'Free',
  PREMIUM: 'Plus',
  PRO: 'Pro',
};

function getUserStatus(user: UserListItem): { label: string; className: string } {
  if (!user.subscriptionStatus) {
    return { label: 'Free', className: 'bg-gray-100 text-gray-600' };
  }
  switch (user.subscriptionStatus) {
    case 'TRIALING':
      return { label: 'Trial', className: 'bg-blue-100 text-blue-700' };
    case 'ACTIVE':
      return { label: 'Activo', className: 'bg-emerald-100 text-emerald-700' };
    case 'CANCELED':
      return { label: 'Cancelado', className: 'bg-red-100 text-red-700' };
    case 'PAST_DUE':
    case 'UNPAID':
    case 'INCOMPLETE_EXPIRED':
      return { label: 'Vencido', className: 'bg-amber-100 text-amber-700' };
    default:
      return { label: '--', className: 'bg-gray-100 text-gray-500' };
  }
}

// ─── Sort Header ──────────────────────────────────────────────

function SortHeader({
  label,
  field,
  currentSort,
  currentOrder,
  onSort,
}: {
  label: string;
  field: string;
  currentSort: string;
  currentOrder: string;
  onSort: (field: string) => void;
}) {
  const isActive = currentSort === field;
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 hover:text-finzen-blue transition-colors"
    >
      {label}
      <span className="flex flex-col -space-y-1">
        <ChevronUp
          size={12}
          className={isActive && currentOrder === 'asc' ? 'text-finzen-blue' : 'text-gray-300'}
        />
        <ChevronDown
          size={12}
          className={isActive && currentOrder === 'desc' ? 'text-finzen-blue' : 'text-gray-300'}
        />
      </span>
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────

export default function UsersTable({ users, pagination, params, onSort, onPageChange }: UsersTableProps) {
  const handleSort = (field: string) => {
    onSort(field);
  };

  if (users.length === 0) {
    return (
      <div className="text-center py-16 text-finzen-gray">
        <p className="text-lg font-medium">No se encontraron usuarios</p>
        <p className="text-sm mt-1">Intenta cambiar los filtros de búsqueda</p>
      </div>
    );
  }

  const currentSort = params.sortBy || 'createdAt';
  const currentOrder = params.sortOrder || 'desc';
  const page = pagination?.page || 1;
  const total = pagination?.total || 0;
  const limit = pagination?.limit || 20;
  const totalPages = pagination?.totalPages || 1;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div>
      {/* Table */}
      <div className="overflow-x-auto border border-finzen-gray/20 rounded-lg">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-finzen-white text-left text-xs font-semibold text-finzen-gray uppercase tracking-wider">
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">
                <SortHeader label="Email" field="email" currentSort={currentSort} currentOrder={currentOrder} onSort={handleSort} />
              </th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">
                <SortHeader label="País" field="country" currentSort={currentSort} currentOrder={currentOrder} onSort={handleSort} />
              </th>
              <th className="px-4 py-3">
                <SortHeader label="Registro" field="createdAt" currentSort={currentSort} currentOrder={currentOrder} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 text-center">TX</th>
              <th className="px-4 py-3">Última act.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-finzen-gray/10">
            {users.map((user) => {
              const status = getUserStatus(user);
              return (
                <tr key={user.id} className="hover:bg-finzen-white/80 transition-colors">
                  {/* Usuario */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-finzen-blue/10 text-finzen-blue flex items-center justify-center text-xs font-bold shrink-0">
                        {getInitials(user.name, user.lastName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-finzen-black truncate">
                          {user.name} {user.lastName}
                        </p>
                        {user.verified && (
                          <span className="text-[10px] text-finzen-green font-medium">Verificado</span>
                        )}
                      </div>
                    </div>
                  </td>
                  {/* Email */}
                  <td className="px-4 py-3 text-sm text-finzen-gray">{user.email}</td>
                  {/* Plan */}
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${planBadge[user.plan] || planBadge.FREE}`}>
                      {planLabel[user.plan] || 'Free'}
                    </span>
                  </td>
                  {/* Estado */}
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                  {/* País */}
                  <td className="px-4 py-3 text-sm text-finzen-gray">{user.country || '--'}</td>
                  {/* Registro */}
                  <td className="px-4 py-3 text-sm text-finzen-gray">{formatDate(user.createdAt)}</td>
                  {/* TX */}
                  <td className="px-4 py-3 text-sm text-center font-medium text-finzen-black">
                    {user.transactionCount}
                  </td>
                  {/* Última actividad */}
                  <td className="px-4 py-3 text-sm text-finzen-gray">{timeAgo(user.lastActivity)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-finzen-gray">
            Mostrando {from}-{to} de {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-md border border-finzen-gray/20 text-finzen-gray hover:bg-finzen-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    pageNum === page
                      ? 'bg-finzen-blue text-white'
                      : 'border border-finzen-gray/20 text-finzen-gray hover:bg-finzen-white'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-md border border-finzen-gray/20 text-finzen-gray hover:bg-finzen-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
