import { useState, useEffect } from 'react';
import { authAPI } from '../utils/api';
import { formatCurrency as baseCurrencyFormatter, getCurrencyByCode, DEFAULT_CURRENCY } from '../utils/currency';

import { logger } from '../utils/logger';
interface UserProfile {
  id: string;
  name: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  country: string;
  state: string;
  city: string;
  currency: string;
  preferredLanguage: string;
  occupation: string;
  company?: string;
  verified: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export const useUserCurrency = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await authAPI.getProfile();
        setUserProfile(response.data);
      } catch (err: any) {
        logger.error('Error fetching user profile:', err);
        setError(err.response?.data?.message || 'Error al obtener el perfil del usuario');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  // Función para formatear moneda usando la moneda del usuario
  const formatCurrency = (amount: number): string => {
    const currencyCode = userProfile?.currency || DEFAULT_CURRENCY.code;
    return baseCurrencyFormatter(amount, currencyCode);
  };

  // Información de la moneda del usuario
  const userCurrencyInfo = userProfile 
    ? getCurrencyByCode(userProfile.currency) || DEFAULT_CURRENCY
    : DEFAULT_CURRENCY;

  return {
    userProfile,
    isLoading,
    error,
    formatCurrency,
    userCurrencyInfo,
    currencyCode: userProfile?.currency || DEFAULT_CURRENCY.code,
    currencySymbol: userCurrencyInfo.symbol,
    refreshProfile: async () => {
      const response = await authAPI.getProfile();
      setUserProfile(response.data);
    }
  };
};