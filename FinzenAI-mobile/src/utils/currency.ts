// Configuración de monedas para toda la aplicación
export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces?: number;
}

// Mapeo de países a locales para formateo de números
export const countryToLocale: Record<string, string> = {
  // Países que usan formato americano (1,234.56)
  'República Dominicana': 'es-DO',
  'México': 'es-MX', 
  'Colombia': 'es-CO',
  'Panamá': 'es-PA',
  'Guatemala': 'es-GT',
  'Honduras': 'es-HN',
  'Nicaragua': 'es-NI',
  'Costa Rica': 'es-CR',
  'El Salvador': 'es-SV',
  'Cuba': 'es-CU',
  'Puerto Rico': 'es-PR',
  'Estados Unidos': 'en-US',
  
  // Países que usan formato europeo (1.234,56)
  'España': 'es-ES',
  'Argentina': 'es-AR',
  'Chile': 'es-CL',
  'Uruguay': 'es-UY',
  'Paraguay': 'es-PY',
  'Bolivia': 'es-BO',
  'Perú': 'es-PE',
  'Ecuador': 'es-EC',
  'Venezuela': 'es-VE',
  'Brasil': 'pt-BR',
};

export const currencies: Currency[] = [
  { code: 'ARS', name: 'Peso Argentino', symbol: '$', decimalPlaces: 2 },
  { code: 'BOB', name: 'Boliviano', symbol: 'Bs.', decimalPlaces: 2 },
  { code: 'BRL', name: 'Real Brasileño', symbol: 'R$', decimalPlaces: 2 },
  { code: 'CLP', name: 'Peso Chileno', symbol: '$', decimalPlaces: 0 },
  { code: 'COP', name: 'Peso Colombiano', symbol: '$', decimalPlaces: 0 },
  { code: 'CRC', name: 'Colón Costarricense', symbol: '₡', decimalPlaces: 0 },
  { code: 'CUP', name: 'Peso Cubano', symbol: '$', decimalPlaces: 2 },
  { code: 'DOP', name: 'Peso Dominicano', symbol: 'RD$', decimalPlaces: 2 },
  { code: 'USD', name: 'Dólar Estadounidense', symbol: '$', decimalPlaces: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2 },
  { code: 'GTQ', name: 'Quetzal Guatemalteco', symbol: 'Q', decimalPlaces: 2 },
  { code: 'HNL', name: 'Lempira Hondureña', symbol: 'L', decimalPlaces: 2 },
  { code: 'MXN', name: 'Peso Mexicano', symbol: '$', decimalPlaces: 2 },
  { code: 'NIO', name: 'Córdoba Nicaragüense', symbol: 'C$', decimalPlaces: 2 },
  { code: 'PAB', name: 'Balboa Panameña', symbol: 'B/.', decimalPlaces: 2 },
  { code: 'PEN', name: 'Sol Peruano', symbol: 'S/', decimalPlaces: 2 },
  { code: 'PYG', name: 'Guaraní Paraguayo', symbol: '₲', decimalPlaces: 0 },
  { code: 'UYU', name: 'Peso Uruguayo', symbol: '$U', decimalPlaces: 2 },
  { code: 'VES', name: 'Bolívar Venezolano', symbol: 'Bs.S', decimalPlaces: 2 },
];

// Función para obtener información de una moneda por código
export const getCurrencyByCode = (code: string): Currency | undefined => {
  return currencies.find(currency => currency.code === code);
};

// Función para formatear moneda usando la información de la moneda y país
export const formatCurrency = (amount: number, currencyCode: string = 'DOP', userCountry?: string): string => {
  const currency = getCurrencyByCode(currencyCode);
  if (!currency) {
    // Fallback usando locale neutro
    return `${DEFAULT_CURRENCY.symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  const decimalPlaces = currency.decimalPlaces ?? 2;
  const locale = (userCountry && countryToLocale[userCountry]) || 'en-US'; // Fallback neutro
  
  const formattedAmount = amount.toLocaleString(locale, { 
    minimumFractionDigits: decimalPlaces, 
    maximumFractionDigits: decimalPlaces 
  });

  return `${currency.symbol}${formattedAmount}`;
};

// Moneda por defecto (peso dominicano)
export const DEFAULT_CURRENCY: Currency = currencies.find(c => c.code === 'DOP')!;