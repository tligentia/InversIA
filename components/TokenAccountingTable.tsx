import React, { useMemo } from 'react';
import type { TokenUsageRecord, Currency } from '../types';
import { CONVERSION_RATES } from '../constants';

interface TokenAccountingTableProps {
    history: TokenUsageRecord[];
    currency: Currency;
}

const VIEW_LABELS: Record<string, string> = {
    'analysis': 'Análisis',
    'market': 'Mercado',
    'portfolio': 'Cartera',
    'calculator': 'Calculadora',
    'alternatives': 'Alternativos',
    'chat': 'Chat IA',
    'history': 'Historial',
    'settings': 'Ajustes',
    'cookie-policy': 'Política Cookies',
};


export const TokenAccountingTable: React.FC<TokenAccountingTableProps> = ({ history, currency }) => {
    
    const groupedHistory = useMemo(() => {
        const groups: Record<string, TokenUsageRecord[]> = {};
        const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);

        sortedHistory.slice(0, 20).forEach(record => { // Limit to last 20 records for performance
            const date = new Date(record.timestamp);
            const groupKey = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(record);
        });
        return groups;
    }, [history]);

    const totals = useMemo(() => {
        const totalTokens = history.reduce((sum, record) => sum + record.tokens, 0);
        const totalCostUSD = history.reduce((sum, record) => sum + record.cost, 0);
        return { totalTokens, totalCostUSD };
    }, [history]);

    const costInSelectedCurrency = useMemo(() => {
        const rate = CONVERSION_RATES[currency] ?? 1;
        return totals.totalCostUSD * rate;
    }, [totals.totalCostUSD, currency]);

    const formatCost = (costInUsd: number) => {
        const rate = CONVERSION_RATES[currency] ?? 1;
        const cost = costInUsd * rate;
        return cost.toLocaleString('es-ES', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 4,
            maximumFractionDigits: 4,
        });
    }

    if (history.length === 0) {
        return (
            <div className="text-center p-6 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <p className="text-slate-500 dark:text-slate-400">No hay registros de consumo de tokens todavía.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg max-h-96 overflow-y-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-600 dark:text-slate-400 uppercase sticky top-0">
                        <tr>
                            <th scope="col" className="px-4 py-3">Fecha y Hora</th>
                            <th scope="col" className="px-4 py-3">Vista</th>
                            <th scope="col" className="px-4 py-3">Modelo</th>
                            <th scope="col" className="px-4 py-3 text-right">Tokens</th>
                            <th scope="col" className="px-4 py-3 text-right">Coste Estimado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {Object.entries(groupedHistory).map(([groupTitle, records]) => (
                            <React.Fragment key={groupTitle}>
                                <tr className="bg-slate-100 dark:bg-slate-700">
                                    <td colSpan={5} className="px-4 py-2 font-bold text-slate-700 dark:text-slate-300">{groupTitle}</td>
                                </tr>
                                {records.map(record => (
                                    <tr key={record.timestamp}>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                            {new Date(record.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </td>
                                        <td className="px-4 py-3">{VIEW_LABELS[record.view] ?? record.view}</td>
                                        <td className="px-4 py-3 font-mono text-xs">{record.model}</td>
                                        <td className="px-4 py-3 text-right font-semibold">{record.tokens.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">{formatCost(record.cost)}</td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-900/50 rounded-lg flex justify-between items-center">
                <h4 className="font-bold text-slate-800 dark:text-slate-200">Totales</h4>
                <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{totals.totalTokens.toLocaleString()} Tokens</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        ~{costInSelectedCurrency.toLocaleString('es-ES', {
                            style: 'currency',
                            currency: currency,
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                    </p>
                </div>
            </div>
        </div>
    );
};
