
import React, { useState, useCallback, useMemo } from 'react';
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, BarChart, Line, Brush, ReferenceLine } from 'recharts';
import type { MarketAnalysisResult, MarketAssetMetric, SectorAverage, Currency, View, MarketAnalysisState, MarketAnalysisResultWithCriterion } from '../types';
import { analyzeMarketSector } from '../services/geminiService';
import { MarketAnalysisAssistant } from '../components/MarketAnalysisAssistant';

interface MarketViewProps {
    currentEngine: string;
    onTokenUsage: (usage: { promptTokens: number; candidateTokens: number; totalTokens: number; model: string; }) => void;
    onApiError: (e: unknown, title: string, message: string) => void;
    isApiBlocked: boolean;
    currency: Currency;
    setSearchQuery: (query: string) => void;
    setActiveView: (view: View) => void;
    analysisState: MarketAnalysisState;
    setAnalysisState: React.Dispatch<React.SetStateAction<MarketAnalysisState>>;
}

const SentimentIndicator: React.FC<{ sentiment: 'Bullish' | 'Bearish' | 'Neutral' }> = ({ sentiment }) => {
    const styles: Record<string, { icon: string; color: string }> = {
        Bullish: { icon: 'fa-arrow-up', color: 'text-green-600' },
        Bearish: { icon: 'fa-arrow-down', color: 'text-red-700' },
        Neutral: { icon: 'fa-minus', color: 'text-gray-400' },
    };
    const style = styles[sentiment] || styles.Neutral;
    return (
        <div className="flex flex-col items-center">
            <i className={`fas ${style.icon} ${style.color} text-sm`}></i>
            <span className={`text-[8px] font-black uppercase mt-1 ${style.color}`}>{sentiment || 'Neutral'}</span>
        </div>
    );
};

const Metric: React.FC<{ label: string; value: string | number; accent?: boolean }> = ({ label, value, accent }) => (
    <div className="text-center">
        <p className="text-[8px] font-black uppercase text-gray-400 mb-0.5">{label}</p>
        <p className={`font-black tracking-tighter ${accent ? 'text-sm text-red-700' : 'text-xs text-black dark:text-gray-200'}`}>{value}</p>
    </div>
);

const AssetCard: React.FC<{ asset: MarketAssetMetric, currency: Currency, onSelect: (ticker: string) => void }> = ({ asset, currency, onSelect }) => (
    <button
        type="button"
        onClick={() => onSelect(asset.ticker)}
        className="w-full text-left bg-white dark:bg-neutral-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 flex flex-col gap-4 hover:border-red-700 hover:shadow-lg transition-all duration-300"
    >
        <div className="flex justify-between items-start">
            <h4 className="font-black text-black dark:text-white uppercase tracking-tighter">{asset.name}</h4>
            <span className="text-[9px] font-black bg-gray-100 dark:bg-neutral-800 text-gray-500 px-2 py-0.5 rounded-full">{asset.ticker}</span>
        </div>
        <div className="bg-gray-50 dark:bg-neutral-800/50 py-2 px-3 rounded-xl">
            <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest text-center">Cap. Mercado</p>
            <p className="text-xs font-black text-black dark:text-white text-center mt-0.5">{asset.marketCap}</p>
        </div>
        <div className="grid grid-cols-4 gap-2 items-end">
            <SentimentIndicator sentiment={asset.sentiment} />
            <Metric label="P/E" value={(asset.peRatio ?? 0).toFixed(1)} accent />
            <Metric label="BPA" value={(asset.eps ?? 0).toFixed(1)} />
            <Metric label="DIV" value={`${(asset.dividendYield ?? 0).toFixed(1)}%`} />
        </div>
    </button>
);

const SectorAverageCard: React.FC<{ sector: string, average: SectorAverage, currency: Currency }> = ({ sector, average, currency }) => (
    <div className="bg-red-50 dark:bg-red-950/20 p-5 rounded-2xl border-2 border-dashed border-red-200 dark:border-red-900/50 flex flex-col gap-4">
        <h4 className="font-black text-red-700 text-center uppercase tracking-tighter text-sm">Media Sector {sector}</h4>
        <div className="grid grid-cols-3 gap-2 items-end">
            <Metric label="P/E Med." value={(average.averagePeRatio ?? 0).toFixed(1)} accent />
            <Metric label="BPA Med." value={(average.averageEps ?? 0).toFixed(1)} />
            <Metric label="DIV Med." value={`${(average.averageDividendYield ?? 0).toFixed(1)}%`} />
        </div>
    </div>
);

const AssetsComparisonChart: React.FC<{ data: MarketAssetMetric[], currency: Currency, sectorAverage: SectorAverage }> = ({ data, currency, sectorAverage }) => {
    return (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 mt-8">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6">Comparativa de Métricas</h3>
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" vertical={false} />
                        <XAxis dataKey="ticker" tick={{ fontSize: 9, fontWeight: 900 }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="left" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                        <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: '900' }}
                            cursor={{ fill: '#f9f9f9' }}
                        />
                        <Bar yAxisId="left" dataKey="eps" name="BPA" fill="#000000" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="right" dataKey="peRatio" name="Ratio P/E" fill="#dc2626" radius={[4, 4, 0, 0]} />
                        <Line yAxisId="right" type="monotone" dataKey="dividendYield" name="Div. %" stroke="#666666" strokeWidth={3} dot={{ r: 4, fill: '#666666' }} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export const MarketView: React.FC<MarketViewProps> = ({ currentEngine, onTokenUsage, onApiError, isApiBlocked, currency, setSearchQuery, setActiveView, analysisState, setAnalysisState }) => {
    const [wizardVisible, setWizardVisible] = useState(Object.keys(analysisState.results).length === 0);
    const { results: analysisResults, isLoading, error, openSectors } = analysisState;

    const handleAnalyze = useCallback(async (sectorsForAnalysis: string[], criteriaForAnalysis: string[]) => {
        setWizardVisible(false);
        setAnalysisState({ isLoading: true, results: {}, error: null, openSectors: [] });

        try {
            // FIX: Explicitly typing the array of promises to ensure the resulting 'results' array is not inferred as 'unknown[]'.
            const analysesPromises: Promise<any>[] = sectorsForAnalysis.flatMap(sector =>
                criteriaForAnalysis.map(criterion =>
                    analyzeMarketSector(sector, criterion, currentEngine, currency)
                        .then(response => ({ status: 'fulfilled' as const, value: { ...response, sector, criterion } }))
                        .catch(reason => ({ status: 'rejected' as const, reason, sector, criterion }))
                )
            );

            const results = await Promise.all(analysesPromises);
            let totalUsage = { promptTokens: 0, candidateTokens: 0, totalTokens: 0 };
            const groupedResults: Record<string, MarketAnalysisResultWithCriterion[]> = {};

            // FIX: Ensuring 'result' is handled safely by the compiler despite any inference issues from Promise.all.
            results.forEach((result: any) => {
                if (result.status === 'fulfilled') {
                    totalUsage.promptTokens += result.value.usage.promptTokens;
                    totalUsage.candidateTokens += result.value.usage.candidateTokens;
                    totalUsage.totalTokens += result.value.usage.totalTokens;
                    if (result.value.data.assets.length > 0) {
                        if (!groupedResults[result.value.sector]) groupedResults[result.value.sector] = [];
                        groupedResults[result.value.sector].push({ ...result.value.data, criterion: result.value.criterion });
                    }
                }
            });
            
            if (totalUsage.totalTokens > 0) onTokenUsage({ ...totalUsage, model: currentEngine });
            setAnalysisState({ isLoading: false, results: groupedResults, error: null, openSectors: Object.keys(groupedResults).slice(0, 1) });

        } catch(e) {
            setAnalysisState({ isLoading: false, results: {}, error: 'Error en la conexión con la IA', openSectors: [] });
        }
    }, [currentEngine, currency, onTokenUsage, setAnalysisState]);

    if (wizardVisible) {
        return <MarketAnalysisAssistant onAnalyze={handleAnalyze} isApiBlocked={isApiBlocked} />;
    }

    return (
        <div className="mt-8">
            <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-black dark:text-white">Análisis de Mercado</h2>
                <button
                    onClick={() => setWizardVisible(true)}
                    className="px-6 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all active:scale-95"
                >
                    Nueva Consulta
                </button>
            </div>
            
            {isLoading && (
                <div className="text-center py-20">
                    <svg className="animate-spin h-10 w-10 text-red-700 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-6 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Procesando Inteligencia de Mercado</p>
                </div>
            )}
            
            {/* FIX: Explicitly typing the Object.entries callback parameters to avoid 'unknown' errors on 'results.map'. */}
            {!isLoading && Object.entries(analysisResults).map(([sector, results]: [string, MarketAnalysisResultWithCriterion[]]) => (
                <div key={sector} className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-px bg-gray-100 flex-grow"></div>
                        <h3 className="text-xs font-black uppercase tracking-[0.4em] text-red-700">{sector}</h3>
                        <div className="h-px bg-gray-100 flex-grow"></div>
                    </div>
                    {results.map((result, idx) => (
                        <div key={idx} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {result.assets.map(asset => (
                                    <AssetCard key={asset.ticker} asset={asset} currency={currency} onSelect={(t) => { setSearchQuery(t); setActiveView('analysis'); }} />
                                ))}
                                <SectorAverageCard sector={sector} average={result.sectorAverage} currency={currency} />
                            </div>
                            <AssetsComparisonChart data={result.assets} currency={currency} sectorAverage={result.sectorAverage} />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};
