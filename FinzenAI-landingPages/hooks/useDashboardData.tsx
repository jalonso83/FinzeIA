'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchAllDashboardData,
  computeDateParams,
  type DateRange,
  type PeriodParams,
  type PulseData,
  type UsersData,
  type RevenueData,
  type EngagementData,
  type OpenAICostsData,
  type UnitEconomicsData,
  type FinancialHealthData,
  type AcquisitionData,
  type TrialEvalData,
} from '@/lib/dashboard-api';

interface DashboardState {
  range: DateRange;
  setRange: (r: DateRange) => void;
  // Periodo absoluto (mes/trimestre/rolling) usado al generar el PDF.
  // Si está seteado, manda sobre `range` para el fetch de datos.
  customPeriod: PeriodParams | null;
  setCustomPeriod: (p: PeriodParams | null) => void;
  pulse: PulseData | null;
  users: UsersData | null;
  revenue: RevenueData | null;
  engagement: EngagementData | null;
  openaiCosts: OpenAICostsData | null;
  unitEconomics: UnitEconomicsData | null;
  financialHealth: FinancialHealthData | null;
  acquisition: AcquisitionData | null;
  trialEval: TrialEvalData | null;
  loading: boolean;
  error: string | null;
}

const DashboardContext = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [range, setRange] = useState<DateRange>('30d');
  const [customPeriod, setCustomPeriod] = useState<PeriodParams | null>(null);
  const [pulse, setPulse] = useState<PulseData | null>(null);
  const [users, setUsers] = useState<UsersData | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [engagement, setEngagement] = useState<EngagementData | null>(null);
  const [openaiCosts, setOpenaiCosts] = useState<OpenAICostsData | null>(null);
  const [unitEconomics, setUnitEconomics] = useState<UnitEconomicsData | null>(null);
  const [financialHealth, setFinancialHealth] = useState<FinancialHealthData | null>(null);
  const [trialEval, setTrialEval] = useState<TrialEvalData | null>(null);
  const [acquisition, setAcquisition] = useState<AcquisitionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guard de petición obsoleta: si el usuario (o el modo PDF) cambia el rango
  // mientras un fetch anterior sigue en vuelo, descartamos la respuesta vieja
  // para que no pise los datos del rango actual. Sin esto, el fetch del rango
  // default (30d, más pesado y lento) resolvía después del rango seleccionado
  // y sobrescribía los datos correctos en el PDF.
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const { from, to } = customPeriod ?? computeDateParams(range);
      const data = await fetchAllDashboardData(from, to);
      if (reqId !== requestIdRef.current) return; // respuesta obsoleta → ignorar
      setPulse(data.pulse);
      setUsers(data.users);
      setRevenue(data.revenue);
      setEngagement(data.engagement);
      setOpenaiCosts(data.openaiCosts);
      setUnitEconomics(data.unitEconomics);
      setFinancialHealth(data.financialHealth);
      setAcquisition(data.acquisition);
      setTrialEval(data.trialEval);
    } catch (err: unknown) {
      if (reqId !== requestIdRef.current) return; // respuesta obsoleta → ignorar
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      if (msg === 'UNAUTHORIZED') {
        router.push('/login');
        return;
      }
      setError(msg);
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [range, customPeriod, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <DashboardContext.Provider
      value={{ range, setRange, customPeriod, setCustomPeriod, pulse, users, revenue, engagement, openaiCosts, unitEconomics, financialHealth, acquisition, trialEval, loading, error }}
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
