import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { safeStorage } from '@/lib/safeStorage';

export type CurrencyCode = 'GBP' | 'USD' | 'EUR';

interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
};

// Exchange rates relative to GBP (base currency)
// These would ideally come from an API, but for simplicity we use static rates
const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  GBP: 1,
  USD: 1.27,
  EUR: 1.17,
};

interface CurrencyContextType {
  currency: CurrencyCode;
  currencyInfo: CurrencyInfo;
  setCurrency: (currency: CurrencyCode) => void;
  convertPrice: (priceInGBP: number) => number;
  formatPrice: (priceInGBP: number) => string;
}

const STORAGE_KEY = 'eclipse_currency';

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const stored = safeStorage.getItem(STORAGE_KEY);
    if (stored && stored in CURRENCIES) {
      return stored as CurrencyCode;
    }
    return 'GBP';
  });

  const setCurrency = useCallback((newCurrency: CurrencyCode) => {
    setCurrencyState(newCurrency);
    safeStorage.setItem(STORAGE_KEY, newCurrency);
  }, []);

  const convertPrice = useCallback((priceInGBP: number): number => {
    const rate = EXCHANGE_RATES[currency];
    return priceInGBP * rate;
  }, [currency]);

  const formatPrice = useCallback((priceInGBP: number): string => {
    const converted = convertPrice(priceInGBP);
    const info = CURRENCIES[currency];
    return new Intl.NumberFormat(info.locale, {
      style: 'currency',
      currency: info.code,
    }).format(converted);
  }, [currency, convertPrice]);

  const currencyInfo = CURRENCIES[currency];

  return (
    <CurrencyContext.Provider value={{ currency, currencyInfo, setCurrency, convertPrice, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
}
