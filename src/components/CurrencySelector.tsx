import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import {
  useCurrency,
  SupportedCurrencyCode,
} from '../context/CurrencyContext';

interface CurrencySelectorProps {
  variant?: 'header' | 'mobile-menu';
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  variant = 'header',
}) => {
  const { currency, setCurrency, supportedCurrencies } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeMeta =
    supportedCurrencies.find((c) => c.code === currency) ||
    supportedCurrencies[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (variant === 'mobile-menu') {
    return (
      <div className="space-y-2">
        <label
          htmlFor="mobile-currency-select"
          className="flex items-center gap-2 text-xs font-bold text-[#FFA500]"
        >
          <Globe className="h-3.5 w-3.5" />
          <span>Display Currency</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {supportedCurrencies.map((item) => {
            const isSelected = item.code === currency;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => setCurrency(item.code)}
                className={`min-h-[42px] flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-[#FFA500] bg-[#FFA500] text-[#1A2A3A]'
                    : 'border-white/15 bg-white/5 text-slate-200 hover:border-white/30'
                }`}
              >
                <span>{item.flag}</span>
                <span>{item.code}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Select display currency"
        aria-expanded={isOpen}
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-bold text-white backdrop-blur-xs transition-colors hover:border-[#FFA500] hover:bg-white/15 whitespace-nowrap cursor-pointer"
      >
        <Globe className="h-3.5 w-3.5 text-[#FFA500] shrink-0" />
        <span>{activeMeta.code}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-300 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-[#FFA500]' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Supported currencies"
          className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/15 bg-[#1A2A3A] p-1.5 text-white shadow-2xl z-50"
        >
          <div className="px-3 py-2 border-b border-white/10 text-[11px] font-semibold text-slate-300">
            Select Currency (Base: CAD)
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {supportedCurrencies.map((item) => {
              const isSelected = item.code === currency;
              return (
                <button
                  key={item.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setCurrency(item.code as SupportedCurrencyCode);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs sm:text-sm transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#FFA500] text-[#1A2A3A] font-extrabold'
                      : 'text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{item.flag}</span>
                    <span className="font-bold">{item.code}</span>
                    <span
                      className={`text-xs ${
                        isSelected ? 'text-[#1A2A3A]/80' : 'text-slate-400'
                      }`}
                    >
                      {item.label}
                    </span>
                  </span>
                  {isSelected && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
