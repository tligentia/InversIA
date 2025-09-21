import React from 'react';
import type { Asset, Currency } from '../types';
import { AlternativesSkeleton } from './skeletons';

interface AlternativeCompaniesProps {
    companies: Asset[];
    isLoading: boolean;
    onSelectCompany: (asset: Asset) => void;
    onFetchAlternatives: () => void;
    hasBeenFetched: boolean;
    isApiBlocked: boolean;
    currency: Currency;
    assetName?: string;
}

interface TrendIconProps {
    change: number;
    price: number;
}

const TrendIcon: React.FC<TrendIconProps> = ({ change, price }) => {
    const isPositive = change >= 0;
    const colorClass = isPositive ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500';
    const iconClass = isPositive ? 'fa-arrow-up' : 'fa-arrow-down';

    const previousPrice = price - change;
    const percentageChange = previousPrice !== 0 ? (change / previousPrice) * 100 : 0;

    return (
        <span className={`font-medium ${colorClass}`}>
            <i className={`fas ${iconClass} fa-xs mr-1`}></i>
            {change.toFixed(2)} ({percentageChange.toFixed(2)}%)
        </span>
    );
};


export const AlternativeCompanies: React.FC<AlternativeCompaniesProps> = ({ companies, isLoading, onSelectCompany, onFetchAlternatives, hasBeenFetched, isApiBlocked, currency, assetName }) => {
    
    const renderContent = () => {
        if (isLoading) {
            return <AlternativesSkeleton />;
        }

        if (!hasBeenFetched) {
            return (
                <div className="text-center py-4">
                    <button
                        type="button"
                        onClick={onFetchAlternatives}
                        disabled={isApiBlocked}
                        className="px-6 py-2 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 active:bg-slate-900 transition text-sm flex items-center justify-center gap-2 disabled:bg-slate-400 disabled:cursor-not-allowed mx-auto dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300 dark:active:bg-slate-400"
                        title={isApiBlocked ? "Las funciones de IA están desactivadas por límite de cuota." : "Buscar activos similares"}
                    >
                        <i className="fas fa-users"></i>
                        <span>Buscar Alternativas</span>
                    </button>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Esto consumirá créditos de la API de IA.</p>
                </div>
            );
        }

        if (companies.length > 0) {
            return (
                <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {companies.map(c => (
                        <li key={c.ticker}>
                            <button
                                type="button"
                                onClick={() => onSelectCompany(c)}
                                className="w-full h-full p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-left border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-slate-800 dark:hover:border-slate-300 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-800 dark:focus:ring-slate-200 flex flex-col justify-between"
                            >
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight">
                                        {c.name}
                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono ml-1.5 font-normal">({c.ticker})</span>
                                    </p>
                                </div>
                                {(c.currentPrice !== undefined && c.change !== undefined) ? (
                                    <div className="mt-3 text-sm">
                                        <p className="font-semibold text-slate-800 dark:text-slate-200">{c.currentPrice.toLocaleString('es-ES', { style: 'currency', currency: currency })}</p>
                                        <TrendIcon change={c.change} price={c.currentPrice} />
                                    </div>
                                ) : <div className="mt-3 h-9"></div> 
                                }
                            </button>
                        </li>
                    ))}
                </ul>
            );
        }

        return <p className="text-slate-500 dark:text-slate-400 italic text-center py-4">No se encontraron alternativas relevantes.</p>;
    };

    return (
         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Activos Alternativos Sugeridos{assetName && ` para ${assetName}`}</h3>
            {renderContent()}
         </div>
    )
}