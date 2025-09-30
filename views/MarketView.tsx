


import React, { useState, useCallback, useMemo } from 'react';
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, BarChart, Line, Brush, ReferenceLine } from 'recharts';
import type { MarketAnalysisResult, MarketAssetMetric, SectorAverage, Currency, View, MarketAnalysisState, MarketAnalysisResultWithCriterion } from '../types';
import { analyzeMarketSector } from '../services/geminiService';
import { useLocalStorage } from '../hooks/useLocalStorage';
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

// Reusable Sub-components for Displaying Results
const SentimentIndicator: React.FC<{ sentiment: 'Bullish' | 'Bearish' | 'Neutral' }> = ({ sentiment }) => {
    const styles: Record<string, { icon: string; color: string }> = {
        Bullish: { icon: 'fa-arrow-up', color: 'text-green-600 dark:text-green-500' },
        Bearish: { icon: 'fa-arrow-down', color: 'text-red-600 dark:text-red-500' },
        Neutral: { icon: 'fa-minus', color: 'text-slate-500 dark:text-slate-400' },
    };
    const style = styles[sentiment] || styles.Neutral;
    return (
        <div className="flex flex-col items-center">
            <i className={`fas ${style.icon} ${style.color} text-lg`}></i>
            <span className={`text-xs font-bold ${style.color}`}>{sentiment || 'Neutral'}</span>
        </div>
    );
};

const Metric: React.FC<{ label: string; value: string | number; accent?: boolean }> = ({ label, value, accent }) => (
    <div className="text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className={`font-bold ${accent ? 'text-lg text-red-600' : 'text-md text-slate-800 dark:text-slate-200'}`}>{value}</p>
    </div>
);

const AssetCard: React.FC<{ asset: MarketAssetMetric, currency: Currency, onSelect: (ticker: string) => void }> = ({ asset, currency, onSelect }) => (
    <button
        type="button"
        onClick={() => onSelect(asset.ticker)}
        className="w-full text-left bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-3 hover:shadow-lg hover:border-red-500 dark:hover:border-red-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        title={`Analizar ${asset.name} (${asset.ticker})`}
    >
        <div className="flex justify-between items-start">
            <h4 className="font-bold text-slate-900 dark:text-slate-100">{asset.name}</h4>
            <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">{asset.ticker}</span>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-center">
            <p className="text-xs text-blue-800 dark:text-blue-300 font-semibold">Capitalización de mercado:</p>
            <p className="text-sm font-bold text-blue-900 dark:text-blue-200">{asset.marketCap}</p>
        </div>
        <div className="grid grid-cols-4 gap-2 items-center">
            <SentimentIndicator sentiment={asset.sentiment} />
            <Metric label="Ratio P/E" value={(asset.peRatio ?? 0).toFixed(2)} accent />
            <Metric label="BPA" value={`${(asset.eps ?? 0).toFixed(2)} ${currency}`} />
            <Metric label="Dividendo" value={`${(asset.dividendYield ?? 0).toFixed(2)}%`} />
        </div>
    </button>
);

const SectorAverageCard: React.FC<{ sector: string, average: SectorAverage, currency: Currency }> = ({ sector, average, currency }) => (
    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl shadow-md border-2 border-dashed border-red-300 dark:border-red-600 flex flex-col justify-between gap-3">
        <h4 className="font-bold text-red-800 dark:text-red-200 text-center">Promedio del Sector {sector}</h4>
        <div className="text-center">
            <p className="text-xs text-red-700 dark:text-red-300">Cap. de Mercado: {average.marketCap}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 items-center">
            <Metric label="Ratio P/E Prom." value={(average.averagePeRatio ?? 0).toFixed(2)} accent />
            <Metric label="BPA Prom." value={`${(average.averageEps ?? 0).toFixed(2)} ${currency}`} />
            <Metric label="Dividendo Prom." value={`${(average.averageDividendYield ?? 0).toFixed(2)}%`} />
        </div>
    </div>
);

const CustomAssetTooltip = ({ active, payload, label, currency }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg text-sm">
                <p className="font-bold text-slate-800 dark:text-slate-200 mb-2">{label}</p>
                {payload.map((p: any) => (
                    <div key={p.name} className="flex justify-between items-center gap-4">
                        <span style={{ color: p.stroke || p.fill }}>{p.name}:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {p.name === 'BPA' ? `${p.value.toFixed(2)} ${currency}` : ''}
                            {p.name === 'Ratio P/E' ? p.value.toFixed(2) : ''}
                            {p.name.includes('Dividendo') ? `${p.value.toFixed(2)}%` : ''}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const AssetsComparisonChart: React.FC<{ data: MarketAssetMetric[], currency: Currency, sectorAverage: SectorAverage }> = ({ data, currency, sectorAverage }) => {
    const avgDividendYield = sectorAverage.averageDividendYield;
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg mt-8">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Comparación de Métricas de Activos</h3>
            <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                         <defs>
                            <linearGradient id="colorBpa" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
                            </linearGradient>
                            <linearGradient id="colorPe" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                        <XAxis dataKey="ticker" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="left" label={{ value: `BPA (${currency})`, angle: -90, position: 'insideLeft', offset: 10 }} tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="middle" orientation="left" hide={true} />
                        <YAxis yAxisId="right" orientation="right" label={{ value: 'Ratio P/E | Div. (%)', angle: -90, position: 'insideRight', offset: 10 }} tick={{ fontSize: 10 }} />
                        <Tooltip content={<CustomAssetTooltip currency={currency} />} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="eps" name="BPA" fill="url(#colorBpa)" />
                        <Bar yAxisId="right" dataKey="peRatio" name="Ratio P/E" fill="url(#colorPe)" />
                        <Line yAxisId="right" type="monotone" dataKey="dividendYield" name="Rendimiento de Dividendo (%)" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        {avgDividendYield > 0 && (
                             <ReferenceLine yAxisId="right" y={avgDividendYield} label={{ value: `Promedio Div. (${avgDividendYield.toFixed(2)}%)`, position: 'insideTopLeft' }} stroke="#16a34a" strokeDasharray="3 3" />
                        )}
                        {data.length > 5 && (
                            <Brush dataKey="ticker" height={30} stroke="#8884d8" />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const CustomAnalysisTooltip = ({ active, payload, label }: any) => {
     if (active && payload && payload.length) {
        return (
            <div className="p-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg text-sm">
                <p className="font-bold text-slate-800 dark:text-slate-200 mb-2">{label}</p>
                {payload.map((p: any) => (
                    <div key={p.name} className="flex justify-between items-center gap-4">
                        <span style={{ color: p.fill }}>{p.name}:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                           {p.name.includes('Dividendo') ? `${p.value.toFixed(2)}%` : p.value.toFixed(2)}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
}

const AnalysisComparisonChart: React.FC<{ results: Record<string, MarketAnalysisResultWithCriterion[]> }> = ({ results }) => {
    const chartData = useMemo(() => {
        return Object.entries(results).flatMap(([sector, analyses]) =>
            (Array.isArray(analyses) ? analyses : []).map(analysis => ({
                name: `${sector} (${analysis.criterion.substring(0, 15)}...)`,
                peRatio: analysis.sectorAverage.averagePeRatio,
                dividendYield: analysis.sectorAverage.averageDividendYield,
                eps: analysis.sectorAverage.averageEps
            }))
        );
    }, [results]);

    if (chartData.length <= 1) return null;

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg mt-8">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Comparación de Promedios Sectoriales</h3>
            <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip content={<CustomAnalysisTooltip />} />
                        <Legend />
                        <Bar dataKey="peRatio" name="Ratio P/E Promedio" fill="#ef4444" />
                        <Bar dataKey="dividendYield" name="Dividendo Promedio (%)" fill="#16a34a" />
                        <Bar dataKey="eps" name="BPA Promedio" fill="#3b82f6" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// --- Main Market View Component ---
export const MarketView: React.FC<MarketViewProps> = ({ currentEngine, onTokenUsage, onApiError, isApiBlocked, currency, setSearchQuery, setActiveView, analysisState, setAnalysisState }) => {
    const [wizardVisible, setWizardVisible] = useState(Object.keys(analysisState.results).length === 0);
    const { results: analysisResults, isLoading, error, openSectors } = analysisState;

    const handleAnalyze = useCallback(async (sectorsForAnalysis: string[], criteriaForAnalysis: string[]) => {
        if (isApiBlocked) {
            setAnalysisState(s => ({ ...s, error: "Las funciones de IA están desactivadas por límite de cuota." }));
            return;
        }

        if (criteriaForAnalysis.length === 0) {
            setAnalysisState(s => ({ ...s, error: "Por favor, defina al menos un criterio de análisis." }));
            return;
        }

        setWizardVisible(false);
        setAnalysisState({ isLoading: true, results: {}, error: null, openSectors: [] });

        try {
            const analysesPromises = sectorsForAnalysis.flatMap(sector =>
                criteriaForAnalysis.map(criterion =>
                    analyzeMarketSector(sector, criterion, currentEngine, currency)
                        .then(response => ({ status: 'fulfilled' as const, value: { ...response, sector, criterion } }))
                        .catch(reason => ({ status: 'rejected' as const, reason, sector, criterion }))
                )
            );

            const results = await Promise.all(analysesPromises);
            
            const successfulResults: { data: MarketAnalysisResult; usage: any; sector: string; criterion: string }[] = [];
            const failedAnalyses: { sector: string; criterion: string; reason: any }[] = [];
            
            let totalUsage = { promptTokens: 0, candidateTokens: 0, totalTokens: 0 };

            for (const result of results) {
                if (result.status === 'fulfilled') {
                    successfulResults.push(result.value);
                    totalUsage.promptTokens += result.value.usage.promptTokens;
                    totalUsage.candidateTokens += result.value.usage.candidateTokens;
                    totalUsage.totalTokens += result.value.usage.totalTokens;
                } else {
                    failedAnalyses.push({ sector: result.sector, criterion: result.criterion, reason: result.reason });
                }
            }
            
            if (totalUsage.totalTokens > 0) {
                onTokenUsage({ ...totalUsage, model: currentEngine });
            }

            let finalError: string | null = null;
            if (failedAnalyses.length > 0) {
                const errorMessages = failedAnalyses.map(f => `Error en ${f.sector} (${f.criterion.substring(0, 20)}...): ${f.reason.message || 'Error desconocido'}`).join('; ');
                finalError = `Algunos análisis fallaron: ${errorMessages}`;
                failedAnalyses.forEach(f => onApiError(f.reason, `Error de Análisis de Mercado: ${f.sector}`, f.reason.message));
            }

            const groupedResults: Record<string, MarketAnalysisResultWithCriterion[]> = {};
            successfulResults.forEach(({ data, sector, criterion }) => {
                if (data.assets.length > 0) { // Only include results with assets
                    if (!groupedResults[sector]) groupedResults[sector] = [];
                    groupedResults[sector].push({ ...data, criterion });
                }
            });
            
            const newOpenSectors = Object.keys(groupedResults).length > 0 ? [Object.keys(groupedResults)[0]] : [];
            
            setAnalysisState({ isLoading: false, results: groupedResults, error: finalError, openSectors: newOpenSectors });

        } catch(e) {
            const errorMessage = e instanceof Error ? e.message : 'Ocurrió un error inesperado.';
            onApiError(e, 'Error General de Análisis', errorMessage);
            setAnalysisState({ isLoading: false, results: {}, error: errorMessage, openSectors: [] });
        }
    }, [isApiBlocked, currentEngine, currency, onTokenUsage, onApiError, setAnalysisState]);

    const handleSelectAsset = (ticker: string) => {
        setSearchQuery(ticker);
        setActiveView('analysis');
    };
    
    const handleStartNewAnalysis = () => {
        setAnalysisState({ isLoading: false, results: {}, error: null, openSectors: [] });
        setWizardVisible(true);
    };

    if (wizardVisible) {
        return <MarketAnalysisAssistant onAnalyze={handleAnalyze} isApiBlocked={isApiBlocked} />;
    }

    return (
        <div className="mt-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Resultados del Análisis de Mercado</h2>
                <button
                    onClick={handleStartNewAnalysis}
                    className="px-4 py-2 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 active:bg-slate-900 transition text-sm flex items-center justify-center gap-2 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300"
                >
                    <i className="fas fa-arrow-left"></i>
                    <span>Nuevo Análisis</span>
                </button>
            </div>
            
            {isLoading && (
                <div className="text-center p-8">
                    <svg className="animate-spin h-8 w-8 text-red-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="http://www.w3.org/2000/svg">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-4 text-lg font-semibold text-slate-600 dark:text-slate-300">Analizando el mercado...</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Esto puede tardar unos segundos.</p>
                </div>
            )}
            
            {error && <p className="mt-4 text-center text-red-600 dark:text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{error}</p>}
            
            {!isLoading && Object.keys(analysisResults).length > 0 && (
                <div>
                    <AnalysisComparisonChart results={analysisResults} />

                    <div className="space-y-4 mt-8">
                        {Object.entries(analysisResults).map(([sector, resultsForSector]) => (
                             <div key={sector} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg transition-shadow hover:shadow-sm">
                                <button
                                    onClick={() => setAnalysisState(s => ({...s, openSectors: s.openSectors.includes(sector) ? s.openSectors.filter(s_ => s_ !== sector) : [...s.openSectors, sector]}))}
                                    className="w-full flex justify-between items-center p-4 text-left bg-white dark:bg-slate-800 shadow-md rounded-lg"
                                >
                                    <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">{sector}</h3>
                                    <i className={`fas fa-chevron-down transform transition-transform ${openSectors.includes(sector) ? 'rotate-180' : ''}`}></i>
                                </button>
                                {openSectors.includes(sector) && (
                                     <div className="p-4 space-y-6">
                                        {(Array.isArray(resultsForSector) ? resultsForSector : []).map(result => (
                                            <div key={result.criterion}>
                                                <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-300 text-center mb-4">{result.title}</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {(result.assets || []).map(asset => <AssetCard key={asset.ticker} asset={asset} currency={currency} onSelect={handleSelectAsset} />)}
                                                    <SectorAverageCard sector={sector} average={result.sectorAverage} currency={currency} />
                                                </div>
                                                {result.assets.length > 0 && <AssetsComparisonChart data={result.assets} currency={currency} sectorAverage={result.sectorAverage} />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
             {!isLoading && Object.keys(analysisResults).length === 0 && !error && (
                 <div className="text-center mt-12 py-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
                    <i className="fas fa-search text-5xl text-slate-300 dark:text-slate-600"></i>
                    <h2 className="mt-4 text-2xl font-semibold text-slate-700 dark:text-slate-200">Análisis Completado Sin Resultados</h2>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">La IA no encontró activos que coincidieran con los criterios especificados. Intenta con una selección diferente.</p>
                </div>
            )}
        </div>
    );
};