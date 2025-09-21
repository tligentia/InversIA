import React from 'react';
import type { Asset } from '../types';

interface AssetSelectionProps {
    assets: Asset[];
    onSelect: (asset: Asset) => void;
}

const AssetIcon: React.FC<{ type: Asset['type'] }> = ({ type }) => {
    const iconClass = type === 'crypto' ? 'fa-brands fa-bitcoin' : 'fa-solid fa-building-columns';
    const colorClass = type === 'crypto' ? 'text-orange-500' : 'text-blue-600';
    return <i className={`${iconClass} ${colorClass} text-2xl`}></i>;
};


export const AssetSelection: React.FC<AssetSelectionProps> = ({ assets, onSelect }) => {
    return (
        <div className="mt-6">
            <h3 className="text-lg font-semibold text-center text-slate-800 dark:text-slate-200 mb-4">Hemos encontrado varias coincidencias. ¿Cuál quieres analizar?</h3>
            <div className="space-y-3">
                {assets.map((asset) => (
                    <button
                        type="button"
                        key={`${asset.ticker}-${asset.name}`}
                        onClick={() => onSelect(asset)}
                        className="w-full flex items-center gap-4 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-left hover:bg-slate-50 hover:border-slate-300 dark:hover:bg-slate-700 dark:hover:border-slate-500 transition duration-200 hover:shadow-sm"
                    >
                        <div className="flex-shrink-0 w-8 text-center">
                            <AssetIcon type={asset.type} />
                        </div>
                        <div className="flex-grow">
                             <p className="font-bold text-slate-900 dark:text-slate-100">{asset.name} <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">({asset.ticker})</span></p>
                             <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{asset.description}</p>
                        </div>
                         <div className="flex-shrink-0">
                             <i className="fas fa-chevron-right text-slate-400 dark:text-slate-500"></i>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};