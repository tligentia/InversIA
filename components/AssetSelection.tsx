
import React from 'react';
import type { Asset } from '../types';

interface AssetSelectionProps {
    assets: Asset[];
    onSelect: (asset: Asset) => void;
}

const AssetIcon: React.FC<{ type: Asset['type'] }> = ({ type }) => {
    const iconClass = type === 'crypto' ? 'fa-brands fa-bitcoin' : 'fa-solid fa-building-columns';
    const colorClass = type === 'crypto' ? 'text-red-700' : 'text-black dark:text-white';
    return <i className={`${iconClass} ${colorClass} text-2xl`}></i>;
};


export const AssetSelection: React.FC<AssetSelectionProps> = ({ assets, onSelect }) => {
    return (
        <div className="mt-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-center text-gray-400 mb-6">Múltiples Coincidencias Detectadas</h3>
            <div className="grid grid-cols-1 gap-3">
                {assets.map((asset) => (
                    <button
                        type="button"
                        key={`${asset.ticker}-${asset.name}`}
                        onClick={() => onSelect(asset)}
                        className="w-full flex items-center gap-6 p-5 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl text-left hover:border-red-700 hover:shadow-xl hover:shadow-gray-100 dark:hover:shadow-none transition-all duration-300 group"
                    >
                        <div className="flex-shrink-0 w-10 text-center">
                            <AssetIcon type={asset.type} />
                        </div>
                        <div className="flex-grow">
                             <p className="font-black text-black dark:text-white uppercase tracking-tight text-lg">{asset.name} <span className="text-[10px] text-gray-400 ml-2 font-mono">{asset.ticker}</span></p>
                             <p className="text-xs text-gray-500 mt-1 line-clamp-1">{asset.description}</p>
                        </div>
                         <div className="flex-shrink-0 transition-transform group-hover:translate-x-1">
                             <i className="fas fa-arrow-right text-gray-200 group-hover:text-red-700"></i>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};
