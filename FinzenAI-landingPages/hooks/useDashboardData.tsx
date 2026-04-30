'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchAllDashboardData,
  type DateRange,
  type PulseData,
  type UsersData,
  type RevenueData,
  type EngagementData,
  type OpenAICostsData,
  type UnitEconomicsData,
  type FinancialHealthData,
  type AcquisitionData,
} from '@/lib/dashboard-api';

interface DashboardState {
  range: DateRange;
  setRange: (r: DateRange) => void;
  pulse: PulseData | null;
  users: UsersData | null;
  revenue: RevenueData | null;
  engagement: EngagementData | null;
  openaiCosts: OpenAICostsData | null;
  unitEconomics: UnitEconomicsData | null;
  financialHealth: FinancialHealthData | null;
  acquisition: AcquisitionData | null;
  loading: boolean;
  error: string | null;
}

const DashboardContext = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [range, setRange] = useState<DateRange>('30d');
  const [pulse, setPulse] = useState<PulseData | null>(null);
  const [users, setUsers] = useState<UsersData | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [engagement, setEngagement] = useState<EngagementData | null>(null);
  const [openaiCosts, setOpenaiCosts] = useState<OpenAICostsData | null>(null);
  const [unitEconomics, setUnitEconomics] = useState<UnitEconomicsData | null>(null);
  const [financialHealth, setFinancialHealth] = useState<FinancialHealthData | null>(null);
  const [acquisition, setAcquisition] = useState<AcquisitionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllDashboardData(range);
      setPulse(data.pulse);
      setUsers(data.users);
      setRevenue(data.revenue);
      setEngagement(data.engagement);
      setOpenaiCosts(data.openaiCosts);
      setUnitEconomics(data.unitEconomics);
      setFinancialHealth(data.financialHealth);
      setAcquisition(data.acquisition);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      if (msg === 'UNAUTHORIZED') {
        router.push('/login');
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [range, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <DashboardContext.Provider
      value={{ range, setRange, pulse, users, revenue, engagement, openaiCosts, unitEconomics, financialHealth, acquisition, loading, error }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardData(): DashboardState {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboardData must be used within DashboardProvider');
  return ctx;
}
