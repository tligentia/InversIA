


import React, { useMemo } from 'react';
import type { Currency } from '../types';
import { CONVERSION_RATES } from '../constants';

interface FooterProps {
    tokenCount: number;
    totalCostUSD: number;
    userIp: string | null;
    currency: Currency;
    onManageCookies: () => void;
}

const VerticalSeparator = () => (
    <div className="hidden sm:block w-px h-5 bg-slate-300 dark:bg-slate-600" aria-hidden="true"></div>
);

export const Footer: React.FC<FooterProps> = ({ tokenCount, totalCostUSD, userIp, currency, onManageCookies }) => {
    
    const estimatedCost = useMemo(() => {
        if (totalCostUSD === 0) return null;

        const rate = CONVERSION_RATES[currency] ?? 1;
        const costInSelectedCurrency = totalCostUSD * rate;

        // Use more precision for very small amounts to be informative
        const fractionDigits = costInSelectedCurrency > 0 && costInSelectedCurrency < 0.10 ? 4 : 2;

        return costInSelectedCurrency.toLocaleString('es-ES', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits,
        });

    }, [totalCostUSD, currency]);

    return (
        <footer className="w-full mt-12 py-4 border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-sm">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-y-4 sm:gap-x-6">
                
                {/* Group 1: Version & IP */}
                <div className="flex flex-col sm:flex-row items-center gap-y-2 sm:gap-x-4">
                    <span className="font-bold text-red-700">Versión 2025.v9U</span>
                    {userIp && (
                        <div className="flex items-baseline gap-1.5">
                            <span>IP:</span>
                            <span className="font-mono text-slate-800 dark:text-slate-200">{userIp}</span>
                        </div>
                    )}
                </div>
                
                <VerticalSeparator />

                {/* Group 2: AI Stats */}
                <div className="flex flex-col sm:flex-row items-center gap-y-2 sm:gap-x-4">
                    <div className="flex items-baseline gap-1.5">
                        <span>Tokens:</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {tokenCount.toLocaleString()}
                            {estimatedCost && (
                                <span className="ml-1 text-xs text-slate-500 dark:text-slate-400" title="Coste estimado basado en precios públicos y tipos de cambio aproximados.">
                                   ({estimatedCost})
                                </span>
                            )}
                        </span>
                    </div>
                </div>

                <VerticalSeparator />

                 {/* Group 3: Cookies & Credits */}
                <div className="flex flex-col sm:flex-row items-center gap-y-2 sm:gap-x-4 text-center sm:text-right">
                    <button type="button" onClick={onManageCookies} className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:underline transition">
                        Cookies y Privacidad
                    </button>
                    <VerticalSeparator />
                     <div>
                        <a href="https://jesus.depablos.es" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition">Jesus de Pablos</a>
                        <span className="mx-1">by</span>
                        <a href="https://www.tligent.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition">Tligent</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};