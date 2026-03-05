'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchUsersList,
  fetchDistinctCountries,
  type UserListItem,
  type UserListPagination,
  type UsersListParams,
} from '@/lib/dashboard-api';

interface UseUsersListReturn {
  users: UserListItem[];
  pagination: UserListPagination | null;
  countries: string[];
  loading: boolean;
  error: string | null;
  params: UsersListParams;
  setParams: (update: Partial<UsersListParams>) => void;
  setPage: (page: number) => void;
  refresh: () => void;
}

export function useUsersList(): UseUsersListReturn {
  const router = useRouter();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [pagination, setPagination] = useState<UserListPagination | null>(null);
  const [countries, setCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [params, setParamsState] = useState<UsersListParams>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsersList(params);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        router.push('/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  }, [params, router]);

  // Fetch countries once on mount
  useEffect(() => {
    fetchDistinctCountries()
      .then(setCountries)
      .catch(() => {
        // non-critical, dropdown just won't populate
      });
  }, []);

  // Fetch users whenever params change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setParams = useCallback((update: Partial<UsersListParams>) => {
    setParamsState(prev => ({ ...prev, ...update, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setParamsState(prev => ({ ...prev, page }));
  }, []);

  return {
    users,
    pagination,
    countries,
    loading,
    error,
    params,
    setParams,
    setPage,
    refresh: fetchData,
  };
}
