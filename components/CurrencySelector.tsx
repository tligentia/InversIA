
import React from 'react';
import type { Currency } from '../types';

interface CurrencySelectorProps {
    currency: Currency;
    setCurrency: (currency: Currency) => void;
}

const currencies: { value: Currency; label: string }[] = [
    { value: 'EUR', label: '€ EUR' },
    { value: 'USD', label: '$ USD' },
    { value: 'GBP', label: '£ GBP' },
    { value: 'JPY', label: '¥ JPY' },
    { value: 'BTC', label: '₿ BTC' },
];

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({ currency, setCurrency }) => {
    return (
        <div className="relative flex-shrink-0" title="Seleccionar Moneda">
            <i className="fas fa-coins absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10"></i>
            <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="h-11 w-32 appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-8 font-semibold text-slate-700 transition focus:outline-none focus:ring-2 focus:ring-slate-800 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200 dark:focus:ring-slate-200"
                aria-label="Selector de Moneda"
            >
                {currencies.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                ))}
            </select>
            <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
        </div>
    );
};