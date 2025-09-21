

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AssetSelection } from '../components/AssetSelection';
import { AnalysisSection } from '../components/AnalysisSection';
import { getAssetAnalysis, getAnalysisVectorsForAsset, getAssetCurrentPrice, getGlobalAnalysis } from '../services/geminiService';
import { generateAssetData } from '../services/stockDataService';
import { Asset, HistoryItem, AnalysisVector, AppError, ReportData, AnalysisSession, GlobalAnalysisState, Currency } from '../types';
import { ExportModal } from '../components/ExportModal';
import { GlobalAnalysis } from '../components/GlobalAnalysis';

interface AnalysisViewProps {
    sessions: AnalysisSession[];
    activeSession: AnalysisSession | undefined;
    onSessionChange: React.Dispatch<React.SetStateAction<AnalysisSession[]>>;
    onActiveSessionChange: (id: string | null) => void;
    onCloseSession: (id: string) => void;
    onClearSessions: () => void;
    suggestedAssets: Asset[] | null;
    onSelectAsset: (asset: Asset) => void;
    currentEngine: string;
    isQuotaExhausted: boolean;
    onApiError: (e: unknown, title: string, message: string) => void;
    onTokenUsage: (usage: { promptTokens: number; candidateTokens: number; totalTokens: number; model: string; }) => void;
    setHistory: React.Dispatch<React.SetStateAction<HistoryItem[]>>;
    currency: Currency;
    onSendToPortfolio: (asset: Asset, price: number | null) => void;
}


export const AnalysisView: React.FC<AnalysisViewProps> = ({
    sessions, activeSession, onSessionChange, onActiveSessionChange, onCloseSession,
    suggestedAssets, onSelectAsset, currentEngine, isQuotaExhausted, onApiError, onTokenUsage, setHistory,
    currency, onSendToPortfolio
}) => {
    const [customVector, setCustomVector] = useState('');
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [reportDataForModal, setReportDataForModal] = useState<ReportData | null>(null);
    const [localError, setLocalError] = useState<AppError | null>(null);

    const updateSession = useCallback((sessionId: string, updates: Partial<AnalysisSession>) => {
        onSessionChange(prev =>
            prev.map(s => s.id === sessionId ? { ...s, ...updates } : s)
        );
    }, [onSessionChange]);

     const unanalyzedVectorsCount = useMemo(() => {
        if (!activeSession) return 0;
        return activeSession.analysisVectors.filter(v => !v.content).length;
    }, [activeSession]);
    
    const analyzedVectorsCount = useMemo(() => {
        if (!activeSession) return 0;
        return activeSession.analysisVectors.filter(v => v.content).length;
    }, [activeSession]);

    const isAnyVectorLoading = useMemo(() => {
        if (!activeSession) return false;
        return activeSession.isAnalyzingAll || activeSession.analysisVectors.some(v => v.isLoading);
    }, [activeSession]);

    // Effect to initialize a new session
    useEffect(() => {
        const sessionToInitialize = sessions.find(s => s.isInitializing);
        if (!sessionToInitialize) return;

        const initialize = async (session: AnalysisSession) => {
            try {
                const { data: priceData, usage: priceUsage } = await getAssetCurrentPrice(session.asset, currentEngine, currency);
                onTokenUsage({ ...priceUsage, model: currentEngine });
                const realPrice = priceData?.price ?? (session.asset.type === 'crypto' ? 50000 : 150);
                
                const newData = generateAssetData(session.currentPeriod, session.asset.type, realPrice);
                
                const previousPrice = newData.length > 1 ? newData[newData.length - 2].close : realPrice;
                const change = realPrice - previousPrice;
                const changePercentage = previousPrice !== 0 ? (change / previousPrice) * 100 : 0;

                const newHistoryItem: HistoryItem = {
                    name: session.asset.name, ticker: session.asset.ticker, type: session.asset.type,
                    lastClose: realPrice, change: change, changePercentage: changePercentage,
                    date: new Date().toLocaleDateString('es-ES'), sentiment: 0,
                };
                setHistory(prevHistory => {
                    const filteredHistory = prevHistory.filter(item => item.ticker !== newHistoryItem.ticker);
                    return [newHistoryItem, ...filteredHistory].slice(0, 5);
                });

                const { data: vectors, usage: vectorUsage } = await getAnalysisVectorsForAsset(session.asset, currentEngine);
                onTokenUsage({ ...vectorUsage, model: currentEngine });

                const defaultVectors: AnalysisVector[] = vectors
                    ? vectors.map(title => ({ title, content: null, isLoading: false, error: null, sources: [] }))
                    : [];
                
                let savedCustomVectorTitles: string[] = [];
                 try {
                    const saved = localStorage.getItem(`customVectors_${session.asset.ticker}`);
                    if (saved) savedCustomVectorTitles = JSON.parse(saved);
                } catch (e) { console.error("Failed to load/parse custom vectors", e); }
                
                const customVectors: AnalysisVector[] = savedCustomVectorTitles
                    .filter(title => !defaultVectors.some(v => v.title.toLowerCase() === title.toLowerCase()))
                    .map(title => ({ title, content: null, isLoading: false, error: null, sources: [], isCustom: true }));
                
                updateSession(session.id, {
                    isInitializing: false,
                    currentPrice: realPrice,
                    stockData: newData,
                    analysisVectors: [...defaultVectors, ...customVectors],
                    initializationError: null,
                });

            } catch (e) {
                 const errorMessage = e instanceof Error ? e.message : 'Ocurrió un error inesperado al cargar los datos iniciales del activo. Por favor, inténtalo de nuevo.';
                updateSession(session.id, {
                    isInitializing: false,
                    initializationError: errorMessage,
                });
            }
        };

        initialize(sessionToInitialize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessions, currency]); // This effect should run when a new session is added or currency changes.
    
    // Effect for saving custom vectors
    useEffect(() => {
        if (activeSession && activeSession.asset && activeSession.analysisVectors.length > 0) {
            const customVectorTitles = activeSession.analysisVectors
                .filter(v => v.isCustom)
                .map(v => v.title);

            if (customVectorTitles.length > 0) {
                try {
                    localStorage.setItem(`customVectors_${activeSession.asset.ticker}`, JSON.stringify(customVectorTitles));
                } catch (e) {
                    console.error("Failed to save custom vectors to localStorage", e);
                }
            }
        }
    }, [activeSession]);


    const updateHistorySentiment = useCallback((ticker: string, sentiment: number) => {
        setHistory(prevHistory => 
            prevHistory.map(item => 
                item.ticker === ticker ? { ...item, sentiment } : item
            )
        );
    }, [setHistory]);
    
    const handleRetryInitialization = useCallback((sessionId: string) => {
        if (!sessionId) return;
        updateSession(sessionId, {
            isInitializing: true,
            initializationError: null,
        });
    }, [updateSession]);

    const runAnalysis = async (vectorTitle: string): Promise<boolean> => {
        if (!activeSession) return false;

        const { id: sessionId, asset } = activeSession;
        
        const setAnalysisVectors = (updater: (prev: AnalysisVector[]) => AnalysisVector[]) => {
            onSessionChange(sessions => sessions.map(s => s.id === sessionId ? {...s, analysisVectors: updater(s.analysisVectors)} : s))
        };
        
        setAnalysisVectors(prev => prev.map(v => v.title === vectorTitle ? { ...v, isLoading: true, content: null, error: null, sources: [] } : v));

        try {
            const { data: analysisData, usage } = await getAssetAnalysis(asset, vectorTitle, currentEngine);
            onTokenUsage({ ...usage, model: currentEngine });

            setAnalysisVectors(prev =>
                prev.map(v => v.title === vectorTitle ? { ...v, isLoading: false, content: analysisData.content, sources: analysisData.sources } : v)
            );
            return true;
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'No se pudo generar el análisis. Inténtalo de nuevo.';
            onApiError(e, `Error en: ${vectorTitle}`, errorMessage);
            setAnalysisVectors(prev => prev.map(v => v.title === vectorTitle ? { ...v, isLoading: false, error: errorMessage } : v));
            return false;
        }
    };

    const handleRunSingleAnalysis = async (vectorTitle: string) => {
        await runAnalysis(vectorTitle);
    };
    
    const handleAnalyzeAll = async () => {
        if (!activeSession || activeSession.isAnalyzingAll) return;
    
        const vectorsToAnalyze = activeSession.analysisVectors.filter(v => !v.content && !v.isLoading);
        if (vectorsToAnalyze.length === 0) return;
    
        updateSession(activeSession.id, { isAnalyzingAll: true });
    
        const analysisPromises = vectorsToAnalyze.map(vector => runAnalysis(vector.title));
    
        // We wait for all analyses to complete.
        // The individual loading states within each vector are handled by runAnalysis.
        await Promise.all(analysisPromises);
    
        updateSession(activeSession.id, { isAnalyzingAll: false });
    };

    const handleCalculateGlobalAnalysis = async () => {
        if (!activeSession) return;

        const { id: sessionId, asset, analysisVectors } = activeSession;

        updateSession(sessionId, {
            globalAnalysis: { ...activeSession.globalAnalysis, isLoading: true, error: null }
        });

        try {
            const analysesContext = analysisVectors
                .filter(v => v.content)
                .map(v => `## ${v.title}\n${v.content!.fullText}`).join('\n\n');
            
            const { data: globalData, usage } = await getGlobalAnalysis(asset, analysesContext, currentEngine);
            onTokenUsage({ ...usage, model: currentEngine });
            
            const newGlobalAnalysisState: GlobalAnalysisState = {
                content: globalData.content,
                sources: globalData.sources,
                isLoading: false,
                error: null,
                calculatedWithVectorCount: analyzedVectorsCount,
            };
            updateSession(sessionId, { globalAnalysis: newGlobalAnalysisState });

            if (globalData.content) {
                updateHistorySentiment(asset.ticker, globalData.content.sentiment);
            }

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'No se pudo generar la Visión Global.';
            onApiError(e, `Error en Visión Global`, errorMessage);
            
            updateSession(sessionId, {
                globalAnalysis: { ...activeSession.globalAnalysis, isLoading: false, error: errorMessage }
            });
        }
    };

    const handleAddCustomVector = () => {
        if (!activeSession) return;
        const newVectorTitle = customVector.trim();
        if (!newVectorTitle) return;

        if (activeSession.analysisVectors.some(v => v.title.toLowerCase() === newVectorTitle.toLowerCase())) {
            setLocalError({ title: 'Vector Duplicado', message: `El vector de análisis "${newVectorTitle}" ya existe.` });
            setTimeout(() => setLocalError(null), 3000);
            setCustomVector('');
            return;
        }

        const newVector: AnalysisVector = { 
            title: newVectorTitle, content: null, isLoading: false, error: null, 
            sources: [], isCustom: true 
        };
        
        updateSession(activeSession.id, { analysisVectors: [...activeSession.analysisVectors, newVector] });
        handleRunSingleAnalysis(newVectorTitle);
        setCustomVector('');
    };

    const handleDeleteCustomVector = useCallback((titleToDelete: string) => {
        if (!activeSession) return;
        
        const updatedVectors = activeSession.analysisVectors.filter(v => v.title !== titleToDelete);
        updateSession(activeSession.id, { analysisVectors: updatedVectors });

        try {
            const storageKey = `customVectors_${activeSession.asset.ticker}`;
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const savedCustomVectorTitles: string[] = JSON.parse(saved);
                const updatedTitles = savedCustomVectorTitles.filter(title => title !== titleToDelete);
                localStorage.setItem(storageKey, JSON.stringify(updatedTitles));
            }
        } catch (e) {
            console.error("Failed to update custom vectors in localStorage", e);
        }
    }, [activeSession, updateSession]);

    const handleOpenExportModal = () => {
        if (!activeSession) return;

        const completedAnalyses = activeSession.analysisVectors.filter(v => v.content);

        if (completedAnalyses.length === 0 && !activeSession.globalAnalysis.content) {
            setLocalError({ title: "Informe Vacío", message: "No hay datos para descargar. Genere al menos un análisis."});
            setTimeout(() => setLocalError(null), 4000);
            return;
        }
        
        const dataForReport: ReportData = {
            asset: activeSession.asset, 
            globalAnalysis: activeSession.globalAnalysis,
            analyses: completedAnalyses
        };
        
        setReportDataForModal(dataForReport);
        setIsExportModalOpen(true);
    };


    if (suggestedAssets) {
        return (
            <div className="mt-6 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                <AssetSelection assets={suggestedAssets} onSelect={onSelectAsset} />
            </div>
        );
    }
    
    if (sessions.length > 0) {
        return (
             <>
                {activeSession && !activeSession.isInitializing && (
                     <>
                        {activeSession.initializationError ? (
                            <div className="mt-8 p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl text-center shadow-lg">
                                <i className="fas fa-exclamation-triangle text-4xl text-red-500 dark:text-red-400 mb-4"></i>
                                <h3 className="text-xl font-bold text-red-800 dark:text-red-200">Error al Cargar el Activo</h3>
                                <p className="text-red-700 dark:text-red-300 mt-2 mb-6">{activeSession.initializationError}</p>
                                <button
                                    type="button"
                                    onClick={() => handleRetryInitialization(activeSession.id)}
                                    className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 active:bg-red-800 transition shadow-md"
                                >
                                    <i className="fas fa-sync-alt mr-2"></i>
                                    Reintentar
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-8" aria-live="polite" aria-busy="false">
                                    <GlobalAnalysis
                                        analysis={activeSession.globalAnalysis}
                                        onCalculate={handleCalculateGlobalAnalysis}
                                        isStale={analyzedVectorsCount > (activeSession.globalAnalysis.calculatedWithVectorCount ?? 0)}
                                        isApiBlocked={isQuotaExhausted}
                                        analyzedVectorsCount={analyzedVectorsCount}
                                        onDownloadReport={handleOpenExportModal}
                                        isAnyVectorLoading={isAnyVectorLoading}
                                    />
                                    <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                                        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 flex-wrap gap-2">
                                            <h3 className="text-2xl font-semibold text-slate-800 dark:text-slate-200">Vectores de Análisis</h3>
                                            <button
                                                type="button"
                                                onClick={handleAnalyzeAll}
                                                disabled={activeSession.isAnalyzingAll || unanalyzedVectorsCount === 0 || isQuotaExhausted}
                                                className="px-4 py-2 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 active:bg-slate-900 transition text-sm flex items-center justify-center gap-2 disabled:bg-slate-400 disabled:cursor-not-allowed dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300 dark:active:bg-slate-400"
                                                title={unanalyzedVectorsCount > 0 ? `Analizar los ${unanalyzedVectorsCount} vectores restantes` : "Todos los vectores han sido analizados"}
                                            >
                                                {activeSession.isAnalyzingAll ? (
                                                    <>
                                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="http://www.w3.org/2000/svg">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        <span>Analizando...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="fas fa-bolt"></i>
                                                        <span>Analizar Todos ({unanalyzedVectorsCount})</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {activeSession.analysisVectors.map(vector => (
                                                <AnalysisSection
                                                    key={vector.title}
                                                    vector={vector}
                                                    onAnalyze={() => handleRunSingleAnalysis(vector.title)}
                                                    onDelete={handleDeleteCustomVector}
                                                    isApiBlocked={isQuotaExhausted}
                                                />
                                            ))}
                                            <div className="md:col-span-2 bg-slate-50/70 dark:bg-slate-800/50 rounded-lg p-4 flex items-center gap-3 border-2 border-dashed border-slate-300 dark:border-slate-600">
                                                <input
                                                    type="text"
                                                    value={customVector}
                                                    onChange={(e) => setCustomVector(e.target.value)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter' && customVector.trim()) handleAddCustomVector(); }}
                                                    placeholder={isQuotaExhausted ? "Funciones de IA desactivadas" : "Añadir vector de análisis personalizado..."}
                                                    className="flex-grow h-10 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-800 transition bg-white disabled:bg-slate-100 dark:bg-slate-900 dark:border-slate-500 dark:text-slate-200 dark:focus:ring-slate-200 dark:disabled:bg-slate-800"
                                                    aria-label="Añadir vector de análisis personalizado"
                                                    disabled={isQuotaExhausted}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddCustomVector}
                                                    disabled={!customVector.trim() || isQuotaExhausted}
                                                    className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 active:bg-slate-900 transition disabled:bg-slate-400 disabled:cursor-not-allowed dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300 dark:active:bg-slate-400"
                                                    title="Añadir y analizar vector"
                                                    aria-label="Añadir y analizar vector personalizado"
                                                >
                                                    <i className="fas fa-arrow-right"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {isExportModalOpen && reportDataForModal && (
                                    <ExportModal
                                        isOpen={isExportModalOpen}
                                        onClose={() => setIsExportModalOpen(false)}
                                        reportData={reportDataForModal}
                                    />
                                )}
                            </>
                        )}
                    </>
                )}
            </>
        )
    }

    return (
        <div className="text-center mt-12">
            <i className="fas fa-search-dollar text-5xl text-slate-300 dark:text-slate-600"></i>
            <h2 className="mt-4 text-2xl font-semibold text-slate-700 dark:text-slate-200">Comienza tu análisis</h2>
            <p className="mt-2 text-slate-500 dark:text-slate-400">Usa la barra de búsqueda superior para encontrar una acción o criptomoneda.</p>
        </div>
    );
};