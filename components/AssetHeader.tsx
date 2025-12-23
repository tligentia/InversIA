
import React from 'react';
import type { Asset, Currency } from '../types';

interface AssetHeaderProps {
    asset: Asset;
    currentPrice: number | null;
    changeValue: number | null;
    changePercentage: number | null;
    currency: Currency;
    onSendToPortfolio?: (asset: Asset, price: number | null) => void;
}

const AssetIcon: React.FC<{ type: Asset['type'] }> = ({ type }) => {
    if (type === 'crypto') {
        return <i className="fa-brands fa-bitcoin text-red-700 text-3xl" title="Criptomoneda"></i>;
    }
    return <i className="fa-solid fa-building-columns text-black text-3xl dark:text-white" title="Acción"></i>;
};

const dataPlatforms = [
    { name: 'TradingView', icon: 'fa-solid fa-chart-line', urlTemplate: (ticker: string) => `https://www.tradingview.com/chart/?symbol=${ticker}`, types: ['stock', 'crypto'] },
    { name: 'Yahoo Finanzas', icon: 'fa-brands fa-yahoo', urlTemplate: (ticker: string) => `https://finance.yahoo.com/quote/${ticker}`, types: ['stock', 'crypto'] },
    { name: 'Investing.com', icon: 'fa-solid fa-dollar-sign', urlTemplate: (ticker: string) => `https://www.investing.com/search/?q=${ticker}`, types: ['stock', 'crypto'] },
    { name: 'Koyfin', icon: 'fa-solid fa-magnifying-glass-chart', urlTemplate: (ticker: string) => `https://app.koyfin.com/search?q=${ticker}`, types: ['stock', 'crypto'] },
    { name: 'Morningstar', icon: 'fa-solid fa-star', urlTemplate: (ticker: string) => `https://www.morningstar.com/search?query=${ticker}`, types: ['stock'] }
];

const aiPlatforms = [
    { name: 'ChatGPT', brand: false, icon: 'fa-robot', urlTemplate: (prompt: string) => `https://chat.openai.com/?q=${prompt}`, types: ['stock', 'crypto'] },
    { name: 'Grok', brand: false, icon: 'fa-bolt', urlTemplate: (prompt: string) => `https://grok.com/?q=${prompt}`, types: ['stock', 'crypto'] },
    { name: 'Perplexity', brand: false, icon: 'fa-infinity', urlTemplate: (prompt: string) => `https://www.perplexity.ai/?q=${prompt}`, types: ['stock', 'crypto'] }
];

const PlatformIcon: React.FC<{ platform: any, url: string, brand?: boolean }> = ({ platform, url, brand }) => (
    <div className="relative group flex items-center">
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 flex items-center justify-center bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-gray-500 hover:text-red-700 hover:border-red-700 transition-all duration-200"
            aria-label={`Consultar en ${platform.name}`}
        >
            <i className={`${brand ? 'fa-brands' : 'fa-solid'} ${platform.icon} text-xs`}></i>
        </a>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
            {platform.name}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-black"></div>
        </div>
    </div>
);

export const AssetHeader: React.FC<AssetHeaderProps> = ({ asset, currentPrice, changeValue, changePercentage, currency, onSendToPortfolio }) => {
    const isPositive = typeof changeValue === 'number' && changeValue >= 0;

    const expertPrompt = encodeURIComponent(
        `Analiza de forma experta el activo ${asset.name} (${asset.ticker}).`
    );

    return (
        <div className="bg-white dark:bg-neutral-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800">
            <div className="grid grid-cols-[auto,1fr,auto] items-center gap-x-6 gap-y-1">
                <div className="row-span-2 pr-2">
                    <AssetIcon type={asset.type} />
                </div>
                
                <div className="col-start-2 flex items-center gap-x-3">
                    <h2 className="text-2xl font-black text-black dark:text-white uppercase tracking-tighter leading-tight">{asset.name}</h2>
                    {onSendToPortfolio && (
                        <button
                            type="button"
                            onClick={() => onSendToPortfolio(asset, currentPrice)}
                            className="text-gray-300 hover:text-red-700 transition-colors duration-150 p-2 rounded-full"
                            title="Añadir a la cartera"
                        >
                            <i className="fas fa-wallet"></i>
                        </button>
                    )}
                </div>
                
                <div className="row-span-2 col-start-3 text-right">
                    {currentPrice !== null ? (
                        <>
                            <p className="text-3xl font-black text-black dark:text-white tracking-tighter">{currentPrice.toLocaleString('es-ES', { style: 'currency', currency: currency })}</p>
                            {typeof changeValue === 'number' && typeof changePercentage === 'number' ? (
                                <div className={`flex items-center justify-end gap-2 text-xs font-bold uppercase tracking-widest ${isPositive ? 'text-green-600' : 'text-red-700'}`}>
                                    {isPositive ? <i className="fas fa-arrow-up"></i> : <i className="fas fa-arrow-down"></i>}
                                    <span>{changeValue.toFixed(2)} ({changePercentage.toFixed(2)}%)</span>
                                </div>
                            ) : null}
                        </>
                    ) : (
                         <p className="text-xl font-bold text-gray-200 uppercase tracking-widest animate-pulse">Cargando</p>
                    )}
                </div>

                <div className="col-start-2 flex items-center flex-wrap gap-x-4 gap-y-2 mt-1">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">{asset.ticker}</p>
                    <div className="h-4 w-px bg-gray-100 dark:bg-neutral-800"></div>
                    <div className="flex items-center gap-1.5">
                        {dataPlatforms
                            .filter(p => p.types.includes(asset.type))
                            .map(platform => {
                                let url = platform.urlTemplate(asset.ticker);
                                if (platform.name === 'Investing.com') {
                                    url = (asset.investingUrl && asset.investingUrl.startsWith('http')) 
                                        ? asset.investingUrl 
                                        : `https://es.investing.com/search/?q=${asset.ticker}`;
                                }
                                return <PlatformIcon key={platform.name} platform={platform} url={url} brand={platform.name === 'Yahoo Finanzas'} />;
                        })}
                    </div>
                    <div className="h-4 w-px bg-gray-100 dark:bg-neutral-800"></div>
                    <div className="flex items-center gap-1.5">
                        {aiPlatforms
                            .filter(p => p.types.includes(asset.type))
                            .map(platform => (
                                <PlatformIcon key={platform.name} platform={platform} url={platform.urlTemplate(expertPrompt)} brand={platform.brand} />
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
