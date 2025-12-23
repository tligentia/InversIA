
import React from 'react';
import type { HistoryItem, Currency } from '../types';
import { SentimentBadge } from './SentimentBadge';

const AssetIcon: React.FC<{ type: HistoryItem['type'] }> = ({ type }) => {
    if (type === 'crypto') {
        return <i className="fa-brands fa-bitcoin text-red-700" title="Criptomoneda"></i>;
    }
    return <i className="fa-solid fa-building-columns text-black dark:text-white" title="Acción"></i>;
};

interface HistoryListProps {
    groupedHistory: Record<string, HistoryItem[]>;
    onClearHistory: () => void;
    onSelectHistoryItem: (item: HistoryItem) => void;
    currency: Currency;
}

export const HistoryList: React.FC<HistoryListProps> = React.memo(({ groupedHistory, onClearHistory, onSelectHistoryItem, currency }) => {
    return (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">Terminal de Historial</h3>
                <button
                    type="button"
                    onClick={onClearHistory}
                    className="text-gray-300 hover:text-red-700 transition-colors duration-150 p-2 rounded-full"
                    title="Limpiar Registros"
                >
                    <i className="fas fa-trash-can text-sm"></i>
                </button>
            </div>
            <div className="space-y-8">
                {Object.entries(groupedHistory).map(([groupTitle, items]) => (
                     <div key={groupTitle}>
                        <h4 className="text-[10px] font-black uppercase text-red-700 tracking-widest pb-2 mb-4 border-b border-gray-50 dark:border-neutral-800">{groupTitle}</h4>
                        <ul className="space-y-2">
                            {(Array.isArray(items) ? items : []).map(item => (
                                <li key={item.ticker}>
                                    <button
                                        type="button"
                                        onClick={() => onSelectHistoryItem(item)}
                                        className="w-full py-4 px-4 flex justify-between items-center bg-gray-50 dark:bg-neutral-800/50 hover:bg-black hover:text-white dark:hover:bg-red-700 transition-all duration-300 rounded-xl group"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <AssetIcon type={item.type} />
                                            <div className="text-left">
                                                <div className="flex items-center gap-3">
                                                    <p className="font-black uppercase tracking-tight text-sm truncate">{item.name}</p>
                                                    <SentimentBadge score={item.sentiment} />
                                                </div>
                                                <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest mt-1">{item.ticker} &bull; {item.date}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-sm tracking-tighter">{item.lastClose.toLocaleString('es-ES', { style: 'currency', currency: currency })}</p>
                                            <div className={`text-[10px] font-bold mt-1 ${item.change >= 0 ? 'text-green-600 group-hover:text-white' : 'text-red-700 group-hover:text-white'}`}>
                                                {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)} ({item.changePercentage.toFixed(2)}%)
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
