
import React from 'react';
import type { HistoryItem, Currency } from '../types';
import { SentimentBadge } from './SentimentBadge';

const AssetIcon: React.FC<{ type: HistoryItem['type'] }> = ({ type }) => {
    if (type === 'crypto') {
        return <i className="fa-brands fa-bitcoin text-orange-500" title="Criptomoneda"></i>;
    }
    return <i className="fa-solid fa-building-columns text-blue-600" title="Acción"></i>;
};

interface HistoryListProps {
    groupedHistory: Record<string, HistoryItem[]>;
    onClearHistory: () => void;
    onSelectHistoryItem: (item: HistoryItem) => void;
    currency: Currency;
}

export const HistoryList: React.FC<HistoryListProps> = React.memo(({ groupedHistory, onClearHistory, onSelectHistoryItem, currency }) => {
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Activos Analizados Recientemente</h3>
                <button
                    type="button"
                    onClick={onClearHistory}
                    className="text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 transition-colors duration-150 p-2 rounded-full -mr-2"
                    title="Borrar historial"
                    aria-label="Borrar historial de activos analizados"
                >
                    <i className="fas fa-trash-can"></i>
                </button>
            </div>
            <div className="space-y-6">
                {Object.entries(groupedHistory).map(([groupTitle, items]) => (
                     <div key={groupTitle}>
                        <h4 className="text-sm font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider pb-2 mb-2 border-b border-slate-200 dark:border-slate-700">{groupTitle}</h4>
                        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                            {/* FIX: Ensure 'items' is an array before calling .map() to prevent type errors. */}
                            {(Array.isArray(items) ? items : []).map(item => (
                                <li key={item.ticker}>
                                    <button
                                        type="button"
                                        onClick={() => onSelectHistoryItem(item)}
                                        className="w-full py-3 flex flex-wrap justify-between items-center gap-x-4 gap-y-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors duration-150"
                                        title={`Analizar de nuevo ${item.name}`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-grow">
                                            <AssetIcon type={item.type} />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-slate-900 dark:text-slate-100 truncate" title={item.name}>{item.name}</p>

                                                    <SentimentBadge score={item.sentiment} />
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                                <span className="flex-shrink-0">{item.ticker}</span>
                                                <span className="text-slate-400 dark:text-slate-600" aria-hidden="true">&bull;</span>
                                                <span className="flex-shrink-0">{item.date}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-baseline gap-4 flex-shrink-0">
                                            <p className="font-semibold text-slate-900 dark:text-slate-100 text-base">{item.lastClose.toLocaleString('es-ES', { style: 'currency', currency: currency })}</p>
                                            <div className={`flex items-center text-sm font-medium ${item.change >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                                                {item.change >= 0 ? 
                                                    <i className="fas fa-arrow-up mr-1"></i> : 
                                                    <i className="fas fa-arrow-down mr-1"></i>
                                                }
                                                <span>{item.change.toFixed(2)} ({item.changePercentage.toFixed(2)}%)</span>
                                            </div>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
});
