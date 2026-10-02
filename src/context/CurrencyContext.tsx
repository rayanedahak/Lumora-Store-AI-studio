import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

export type SupportedCurrencyCode =
  | 'CAD'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'AUD'
  | 'JPY'
  | 'CHF'
  | 'NZD'
  | 'SGD';

export interface CurrencyMeta {
  code: SupportedCurrencyCode;
  symbol: string;
  label: string;
  flag: string;
  decimals: number;
}

export const SUPPORTED_CURRENCIES: CurrencyMeta[] = [
  { code: 'CAD', symbol: '$', label: 'Canadian Dollar', flag: '🇨🇦', decimals: 2 },
  { code: 'USD', symbol: '$', label: 'US Dollar', flag: '🇺🇸', decimals: 2 },
  { code: 'EUR', symbol: '€', label: 'Euro', flag: '🇪🇺', decimals: 2 },
  { code: 'GBP', symbol: '£', label: 'British Pound', flag: '🇬🇧', decimals: 2 },
  { code: 'AUD', symbol: '$', label: 'Australian Dollar', flag: '🇦🇺', decimals: 2 },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen', flag: '🇯🇵', decimals: 0 },
  { code: 'CHF', symbol: 'CHF ', label: 'Swiss Franc', flag: '🇨🇭', decimals: 2 },
  { code: 'NZD', symbol: '$', label: 'New Zealand Dollar', flag: '🇳🇿', decimals: 2 },
  { code: 'SGD', symbol: '$', label: 'Singapore Dollar', flag: '🇸🇬', decimals: 2 },
];

/**
 * Fallback exchange rates relative to 1.00 CAD
 * Used immediately before the live API resolves or if https://open.er-api.com/v6/latest/CAD is unreachable.
 */
const FALLBACK_RATES_FROM_CAD: Record<SupportedCurrencyCode, number> = {
  CAD: 1.0,
  USD: 0.73,
  EUR: 0.67,
  GBP: 0.56,
  AUD: 1.11,
  JPY: 110.0,
  CHF: 0.64,
  NZD: 1.21,
  SGD: 0.98,
};

/**
 * Map ISO 3166-1 alpha-2 country codes from IP geolocation (https://ipapi.co/json/)
 * to a supported storefront currency. Defaults to CAD if unmapped.
 */
const COUNTRY_TO_CURRENCY: Record<string, SupportedCurrencyCode> = {
  CA: 'CAD',
  US: 'USD',
  GB: 'GBP',
  UK: 'GBP',
  AU: 'AUD',
  JP: 'JPY',
  CH: 'CHF',
  NZ: 'NZD',
  SG: 'SGD',
  // Eurozone countries
  AT: 'EUR',
  BE: 'EUR',
  CY: 'EUR',
  DE: 'EUR',
  EE: 'EUR',
  ES: 'EUR',
  FI: 'EUR',
  FR: 'EUR',
  GR: 'EUR',
  HR: 'EUR',
  IE: 'EUR',
  IT: 'EUR',
  LT: 'EUR',
  LU: 'EUR',
  LV: 'EUR',
  MT: 'EUR',
  NL: 'EUR',
  PT: 'EUR',
  SI: 'EUR',
  SK: 'EUR',
};

const STORAGE_CURRENCY_KEY = 'lumora_selected_currency_v1';
const SESSION_RATES_KEY = 'lumora_cad_exchange_rates_v1';

export interface CurrencyContextValue {
  currency: SupportedCurrencyCode;
  setCurrency: (code: SupportedCurrencyCode | string) => void;
  convertPrice: (cadAmount: number) => number;
  formatPrice: (cadAmount: number, includeCode?: boolean) => string;
  supportedCurrencies: CurrencyMeta[];
  rates: Record<string, number>;
  isLoadingRates: boolean;
  isUsingFallbackRates: boolean;
  detectedCountry: string | null;
  currencyToast: string | null;
  dismissCurrencyToast: () => void;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(
  undefined
);

function isSupportedCurrency(code: string): code is SupportedCurrencyCode {
  return SUPPORTED_CURRENCIES.some((c) => c.code === code.toUpperCase());
}

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currency, setCurrencyState] = useState<SupportedCurrencyCode>(() => {
    if (typeof window === 'undefined') return 'CAD';
    // 1. Check URL query param ?country=XX or ?currency=XXX for instant testing
    const params = new URLSearchParams(window.location.search);
    const queryCountry = params.get('country')?.toUpperCase();
    if (queryCountry && COUNTRY_TO_CURRENCY[queryCountry]) {
      return COUNTRY_TO_CURRENCY[queryCountry];
    }
    const queryCurrency = params.get('currency')?.toUpperCase();
    if (queryCurrency && isSupportedCurrency(queryCurrency)) {
      return queryCurrency;
    }

    // 2. Check saved preference in localStorage
    try {
      const saved = localStorage.getItem(STORAGE_CURRENCY_KEY);
      if (saved && isSupportedCurrency(saved)) {
        return saved;
      }
    } catch {
      // Ignore storage access errors
    }
    return 'CAD';
  });

  const [rates, setRates] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem(SESSION_RATES_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object' && parsed.CAD === 1) {
            return parsed;
          }
        }
      } catch {
        // Ignore session storage errors
      }
    }
    return { ...FALLBACK_RATES_FROM_CAD };
  });

  const [isLoadingRates, setIsLoadingRates] = useState<boolean>(false);
  const [isUsingFallbackRates, setIsUsingFallbackRates] =
    useState<boolean>(false);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [currencyToast, setCurrencyToast] = useState<string | null>(null);

  // Manual currency switcher handler with localStorage persistence + toast notification
  const setCurrency = useCallback((rawCode: SupportedCurrencyCode | string) => {
    const normalized = rawCode.trim().toUpperCase();
    if (!isSupportedCurrency(normalized)) return;

    setCurrencyState(normalized);
    try {
      localStorage.setItem(STORAGE_CURRENCY_KEY, normalized);
    } catch {
      // Ignore storage errors
    }

    const meta = SUPPORTED_CURRENCIES.find((c) => c.code === normalized);
    setCurrencyToast(
      `Currency switched to ${normalized}${meta ? ` (${meta.symbol.trim()})` : ''}`
    );
  }, []);

  // Auto-hide toast after 2.6 seconds
  useEffect(() => {
    if (!currencyToast) return;
    const timer = window.setTimeout(() => {
      setCurrencyToast(null);
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [currencyToast]);

  const dismissCurrencyToast = useCallback(() => {
    setCurrencyToast(null);
  }, []);

  // Fetch live CAD exchange rates once per session from https://open.er-api.com/v6/latest/CAD
  useEffect(() => {
    let cancelled = false;

    async function fetchExchangeRates() {
      // Check if already cached in sessionStorage
      try {
        const cached = sessionStorage.getItem(SESSION_RATES_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object' && parsed.USD) {
            setRates(parsed);
            return;
          }
        }
      } catch {
        // Continue to network fetch
      }

      setIsLoadingRates(true);
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/CAD', {
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) {
          throw new Error(`Exchange rate API status ${res.status}`);
        }
        const data = (await res.json()) as {
          result?: string;
          rates?: Record<string, number>;
        };

        if (!cancelled && data?.rates && typeof data.rates === 'object') {
          const mergedRates: Record<string, number> = {
            ...FALLBACK_RATES_FROM_CAD,
            ...data.rates,
            CAD: 1.0,
          };
          setRates(mergedRates);
          setIsUsingFallbackRates(false);
          try {
            sessionStorage.setItem(
              SESSION_RATES_KEY,
              JSON.stringify(mergedRates)
            );
          } catch {
            // Ignore session storage errors
          }
        }
      } catch {
        if (!cancelled) {
          setRates({ ...FALLBACK_RATES_FROM_CAD });
          setIsUsingFallbackRates(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRates(false);
        }
      }
    }

    fetchExchangeRates();
    return () => {
      cancelled = true;
    };
  }, []);

  // Detect visitor's country via IP (https://ipapi.co/json/) if no preference is saved yet
  useEffect(() => {
    let cancelled = false;

    async function detectVisitorCurrency() {
      const params = new URLSearchParams(window.location.search);
      const queryCountry = params.get('country')?.toUpperCase();
      if (queryCountry) {
        setDetectedCountry(queryCountry);
        const mapped = COUNTRY_TO_CURRENCY[queryCountry] || 'CAD';
        setCurrencyState(mapped);
        try {
          localStorage.setItem(STORAGE_CURRENCY_KEY, mapped);
        } catch {
          // Ignore
        }
        return;
      }

      // If the user already has a saved currency in localStorage, respect it
      try {
        const saved = localStorage.getItem(STORAGE_CURRENCY_KEY);
        if (saved && isSupportedCurrency(saved)) {
          return;
        }
      } catch {
        // Continue to IP detection
      }

      try {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 4500);

        const res = await fetch('https://ipapi.co/json/', {
          signal: controller.signal,
        });
        window.clearTimeout(timeoutId);

        if (!res.ok) return;
        const geo = (await res.json()) as {
          country_code?: string;
          currency?: string;
        };

        if (cancelled) return;

        const countryCode = geo?.country_code?.toUpperCase();
        if (countryCode) {
          setDetectedCountry(countryCode);
          const mappedCurrency =
            COUNTRY_TO_CURRENCY[countryCode] ||
            (geo.currency && isSupportedCurrency(geo.currency)
              ? (geo.currency.toUpperCase() as SupportedCurrencyCode)
              : 'CAD');

          setCurrencyState(mappedCurrency);
          try {
            localStorage.setItem(STORAGE_CURRENCY_KEY, mappedCurrency);
          } catch {
            // Ignore
          }
        }
      } catch {
        // Fallback to CAD silently if IP lookup is blocked or offline
      }
    }

    detectVisitorCurrency();
    return () => {
      cancelled = true;
    };
  }, []);

  // Convert a base CAD amount into the active currency as a number
  const convertPrice = useCallback(
    (cadAmount: number): number => {
      const cleanCad = Number(cadAmount) || 0;
      const rate = rates[currency] ?? FALLBACK_RATES_FROM_CAD[currency] ?? 1.0;
      const meta = SUPPORTED_CURRENCIES.find((c) => c.code === currency);
      const decimals = meta ? meta.decimals : 2;
      const rawConverted = cleanCad * rate;
      return decimals === 0
        ? Math.round(rawConverted)
        : Number(rawConverted.toFixed(decimals));
    },
    [currency, rates]
  );

  // Format a base CAD amount into a display string (e.g., "$51.09 USD", "€46.89 EUR", "$69.99 CAD")
  const formatPrice = useCallback(
    (cadAmount: number, includeCode = true): string => {
      const converted = convertPrice(cadAmount);
      const meta = SUPPORTED_CURRENCIES.find((c) => c.code === currency) || {
        code: currency,
        symbol: '$',
        decimals: 2,
      };

      const formattedNumber =
        meta.decimals === 0
          ? Math.round(converted).toLocaleString('en-US')
          : converted.toLocaleString('en-US', {
              minimumFractionDigits: meta.decimals,
              maximumFractionDigits: meta.decimals,
            });

      return includeCode
        ? `${meta.symbol}${formattedNumber} ${meta.code}`
        : `${meta.symbol}${formattedNumber}`;
    },
    [convertPrice, currency]
  );

  const contextValue = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      setCurrency,
      convertPrice,
      formatPrice,
      supportedCurrencies: SUPPORTED_CURRENCIES,
      rates,
      isLoadingRates,
      isUsingFallbackRates,
      detectedCountry,
      currencyToast,
      dismissCurrencyToast,
    }),
    [
      currency,
      setCurrency,
      convertPrice,
      formatPrice,
      rates,
      isLoadingRates,
      isUsingFallbackRates,
      detectedCountry,
      currencyToast,
      dismissCurrencyToast,
    ]
  );

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
};

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return ctx;
}
