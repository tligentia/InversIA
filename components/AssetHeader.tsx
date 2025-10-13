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
        return <i className="fa-brands fa-bitcoin text-orange-500 text-3xl" title="Criptomoneda"></i>;
    }
    return <i className="fa-solid fa-building-columns text-blue-600 text-3xl" title="Acción"></i>;
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
            className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-800 dark:hover:text-slate-100 transition-all duration-200"
            aria-label={`Consultar en ${platform.name}`}
        >
            <i className={`${brand ? 'fa-brands' : 'fa-solid'} ${platform.icon}`}></i>
        </a>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-slate-800 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
            {platform.name}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800"></div>
        </div>
    </div>
);

export const AssetHeader: React.FC<AssetHeaderProps> = ({ asset, currentPrice, changeValue, changePercentage, currency, onSendToPortfolio }) => {
    const isPositive = typeof changeValue === 'number' && changeValue >= 0;

    const expertPrompt = encodeURIComponent(
        `Tu nombre es InversIA. Actúa como un Asesor experto de InversIA y analista financiero. Realiza un análisis exhaustivo y profundo del activo financiero ${asset.name} (${asset.ticker}). Cubre los siguientes puntos clave, utilizando datos de mercado actualizados: 1. Análisis Fundamental (salud financiera, valoración, múltiplos clave). 2. Análisis Técnico (tendencias, niveles de soporte/resistencia, indicadores). 3. Análisis de Sentimiento de Mercado (noticias recientes, redes sociales). 4. Análisis Competitivo y de Sector. 5. Riesgos y Oportunidades. 6. Tesis de Inversión Final (conclusión clara y accionable). Estructura la respuesta de forma clara y profesional.`
    );

    return (
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
            <div className="grid grid-cols-[auto,1fr,auto] items-center gap-x-4 gap-y-1">
                {/* Col 1: Icon */}
                <div className="row-span-2 pr-2">
                    <AssetIcon type={asset.type} />
                </div>
                
                {/* Col 2: Name & Portfolio Button */}
                <div className="col-start-2 flex items-center gap-x-3">
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 leading-tight">{asset.name}</h2>
                    {onSendToPortfolio && (
                        <button
                            type="button"
                            onClick={() => onSendToPortfolio(asset, currentPrice)}
                            className="text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-500 transition-colors duration-150 p-2 rounded-full"
                            title="Añadir a la cartera"
                            aria-label="Añadir a la cartera"
                        >
                            <i className="fas fa-wallet fa-lg"></i>
                        </button>
                    )}
                </div>
                
                {/* Col 3: Price */}
                <div className="row-span-2 col-start-3 text-right">
                    {currentPrice !== null ? (
                        <>
                            <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{currentPrice.toLocaleString('es-ES', { style: 'currency', currency: currency })}</p>
                            {typeof changeValue === 'number' && typeof changePercentage === 'number' ? (
                                <div className={`flex items-center justify-end gap-2 text-lg font-medium ${isPositive ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                                    {isPositive ? <i className="fas fa-arrow-trend-up"></i> : <i className="fas fa-arrow-trend-down"></i>}
                                    <span>{changeValue.toFixed(2)} ({changePercentage.toFixed(2)}%)</span>
                                </div>
                            ) : null}
                        </>
                    ) : (
                         <p className="text-3xl font-semibold text-slate-400 dark:text-slate-500">Cargando...</p>
                    )}
                </div>

                {/* Row 2, Col 2: Ticker + Platforms */}
                <div className="col-start-2 flex items-center flex-wrap gap-x-4 gap-y-2">
                    <p className="text-lg text-slate-500 dark:text-slate-400 font-mono">{asset.ticker}</p>
                    
                    {/* Data Platforms */}
                    <div className="flex items-center gap-2">
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

                    {/* Separator */}
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-600"></div>

                     {/* AI Platforms */}
                    <div className="flex items-center gap-2">
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