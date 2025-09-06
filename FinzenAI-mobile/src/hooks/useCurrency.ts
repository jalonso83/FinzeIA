import { useState, useEffect, useCallback } from 'react';
import { authAPI } from '../utils/api';
import { formatCurrency as baseCurrencyFormatter, getCurrencyByCode, DEFAULT_CURRENCY } from '../utils/currency';

interface UserProfile {
  currency: string;
  country?: string;
  [key: string]: any;
}

let cachedProfile: UserProfile | null = null;
let fetchPromise: Promise<UserProfile> | null = null;

export const useCurrency = () => {
  const [userCurrency, setUserCurrency] = useState<string>(DEFAULT_CURRENCY.code);
  const [userCountry, setUserCountry] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUserCurrency = useCallback(async () => {
    if (cachedProfile) {
      setUserCurrency(cachedProfile.currency || DEFAULT_CURRENCY.code);
      setUserCountry(cachedProfile.country);
      return cachedProfile;
    }

    if (fetchPromise) {
      const profile = await fetchPromise;
      setUserCurrency(profile.currency || DEFAULT_CURRENCY.code);
      setUserCountry(profile.country);
      return profile;
    }

    setIsLoading(true);
    fetchPromise = authAPI.getProfile().then(response => {
      const profile = response.data;
      cachedProfile = profile;
      setUserCurrency(profile.currency || DEFAULT_CURRENCY.code);
      setUserCountry(profile.country);
      setIsLoading(false);
      fetchPromise = null;
      return profile;
    }).catch(error => {
      console.error('Error fetching user currency:', error);
      setIsLoading(false);
      fetchPromise = null;
      // En caso de error, usar valores por defecto sin país específico
      setUserCurrency(DEFAULT_CURRENCY.code);
      setUserCountry(undefined);
      return { currency: DEFAULT_CURRENCY.code, country: undefined };
    });

    return fetchPromise;
  }, []);

  useEffect(() => {
    fetchUserCurrency();
  }, [fetchUserCurrency]);

  // Función para formatear moneda usando la moneda y país del usuario
  const formatCurrency = useCallback((amount: number): string => {
    return baseCurrencyFormatter(amount, userCurrency, userCountry);
  }, [userCurrency, userCountry]);

  // Información de la moneda del usuario
  const userCurrencyInfo = getCurrencyByCode(userCurrency) || DEFAULT_CURRENCY;

  // Función para limpiar caché (útil después de actualizar perfil)
  const clearCache = () => {
    cachedProfile = null;
  };

  return {
    userCurrency,
    userCountry,
    isLoading,
    formatCurrency,
    userCurrencyInfo,
    currencySymbol: userCurrencyInfo.symbol,
    refreshCurrency: fetchUserCurrency,
    clearCache
  };
};