
import React, { useState, useMemo } from 'react';
import { HistoryList } from '../components/HistoryList';
import { HistoryItem, Currency } from '../types';

interface HistoryViewProps {
    history: HistoryItem[];
    onSelectHistoryItem: (item: HistoryItem) => void;
    onClearHistory: () => void;
    currency: Currency;
}

const groupHistoryByDate = (history: HistoryItem[]): Record<string, HistoryItem[]> => {
    const groups: Record<string, HistoryItem[]> = {};
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    history.forEach(item => {
        const itemDateParts = item.date.split('/');
        // new Date(year, monthIndex, day)
        const itemDate = new Date(Number(itemDateParts[2]), Number(itemDateParts[1]) - 1, Number(itemDateParts[0]));
        const itemDateOnly = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());

        let groupKey: string;

        if (itemDateOnly.getTime() === today.getTime()) {
            groupKey = 'Hoy';
        } else if (itemDateOnly.getTime() === yesterday.getTime()) {
            groupKey = 'Ayer';
        } else if (itemDateOnly >= lastWeek) {
            groupKey = 'Últimos 7 días';
        } else {
            groupKey = itemDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            groupKey = groupKey.charAt(0).toUpperCase() + groupKey.slice(1);
        }

        if (!groups[groupKey]) {
            groups[groupKey] = [];
        }
        groups[groupKey].push(item);
    });
    return groups;
};

const FilterButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; }> = ({ label, isActive, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`px-3 py-1 text-sm font-semibold rounded-md transition ${
            isActive ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-sm' : 'text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
        }`}
    >
        {label}
    </button>
);


export const HistoryView: React.FC<HistoryViewProps> = ({ history, onSelectHistoryItem, onClearHistory, currency }) => {
    const [typeFilter, setTypeFilter] = useState<'all' | 'stock' | 'crypto'>('all');
    const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');

    const filteredHistory = useMemo(() => {
        return history.filter(item => {
            const typeMatch = typeFilter === 'all' || item.type === typeFilter;
            if (!typeMatch) return false;

            switch (sentimentFilter) {
                case 'positive': return item.sentiment > 0;
                case 'negative': return item.sentiment < 0;
                case 'neutral': return item.sentiment === 0;
                case 'all': default: return true;
            }
        });
    }, [history, typeFilter, sentimentFilter]);
    
    const groupedHistory = useMemo(() => groupHistoryByDate(filteredHistory), [filteredHistory]);
    const hasFiltersApplied = typeFilter !== 'all' || sentimentFilter !== 'all';

    const renderContent = () => {
        if (history.length === 0) {
            return (
                <div className="text-center mt-12 py-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
                    <i className="fas fa-history text-5xl text-slate-300 dark:text-slate-600"></i>
                    <h2 className="mt-4 text-2xl font-semibold text-slate-700 dark:text-slate-200">No hay historial reciente</h2>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">Los activos que analices aparecerán aquí para un acceso rápido.</p>
                </div>
            );
        }

        if (filteredHistory.length === 0 && hasFiltersApplied) {
            return (
                <div className="text-center mt-4 py-8 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <i className="fas fa-filter text-4xl text-slate-400 dark:text-slate-500"></i>
                    <h2 className="mt-4 text-xl font-semibold text-slate-600 dark:text-slate-300">No hay resultados</h2>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">Ningún activo en tu historial coincide con los filtros seleccionados.</p>
                </div>
            );
        }
        
        return (
            <HistoryList
                groupedHistory={groupedHistory}
                onClearHistory={onClearHistory}
                onSelectHistoryItem={onSelectHistoryItem}
                currency={currency}
            />
        );
    };

    return (
        <div className="mt-8">
            {history.length > 0 && (
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-bold text-slate-600 dark:text-slate-300 block mb-2">Filtrar por Tipo</label>
                            <div className="flex items-center space-x-2">
                                <FilterButton label="Todos" isActive={typeFilter === 'all'} onClick={() => setTypeFilter('all')} />
                                <FilterButton label="Acciones" isActive={typeFilter === 'stock'} onClick={() => setTypeFilter('stock')} />
                                <FilterButton label="Criptos" isActive={typeFilter === 'crypto'} onClick={() => setTypeFilter('crypto')} />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-600 dark:text-slate-300 block mb-2">Filtrar por Sentimiento</label>
                            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                                <FilterButton label="Todos" isActive={sentimentFilter === 'all'} onClick={() => setSentimentFilter('all')} />
                                <FilterButton label="Positivo" isActive={sentimentFilter === 'positive'} onClick={() => setSentimentFilter('positive')} />
                                <FilterButton label="Neutral" isActive={sentimentFilter === 'neutral'} onClick={() => setSentimentFilter('neutral')} />
                                <FilterButton label="Negativo" isActive={sentimentFilter === 'negative'} onClick={() => setSentimentFilter('negative')} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {renderContent()}
        </div>
    );
};
