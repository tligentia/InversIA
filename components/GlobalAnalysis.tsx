import React, { useState, useEffect } from 'react';
import type { GlobalAnalysisState, Currency } from '../types';
import { formatTextToHtml } from '../utils/formatter';
import { SentimentBadge } from './SentimentBadge';

interface GlobalAnalysisProps {
    analysis: GlobalAnalysisState;
    onCalculate: () => void;
    isStale: boolean;
    isApiBlocked: boolean;
    totalAnalyzedCount: number;
    includedAnalyzedCount: number;
    onDownloadReport: () => void;
    isAnyVectorLoading?: boolean;
    currency: Currency;
}

export const GlobalAnalysis: React.FC<GlobalAnalysisProps> = ({ 
    analysis, onCalculate, isStale, isApiBlocked, totalAnalyzedCount, 
    includedAnalyzedCount, onDownloadReport, isAnyVectorLoading, currency
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isSourcesOpen, setIsSourcesOpen] = useState(false);

    useEffect(() => {
        if (analysis.content && !isOpen) setIsOpen(true);
    }, [analysis.content, isOpen]);

    const canCalculate = includedAnalyzedCount > 0 && !analysis.isLoading;
    const isDisabled = analysis.isLoading || isApiBlocked || isAnyVectorLoading;

    const handleToggle = () => {
        if (!analysis.content && !analysis.isLoading && canCalculate) {
            onCalculate();
            return;
        }
        if (analysis.content || analysis.error) {
            setIsOpen(!isOpen);
        }
    };
    
    const getCalculateButtonTitle = () => {
        if (isAnyVectorLoading) return "Espera a que terminen los análisis de vectores actuales.";
        if (isApiBlocked) return "Las funciones de IA están desactivadas por límite de cuota.";
        if (analysis.isLoading) return "Calculando...";
        if (totalAnalyzedCount === 0) return "Genere al menos un análisis de vector para habilitar esta función.";
        if (includedAnalyzedCount === 0) return "Seleccione al menos un vector analizado para calcular la visión global.";
        if (isStale) return "Actualizar la visión global con los nuevos análisis o selecciones";
        return "Calcular visión global del activo";
    };

    const baseButtonClasses = "flex-shrink-0 px-3 py-1 text-sm font-semibold rounded-lg transition disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-2";

    return (
        <div className="bg-slate-50/70 dark:bg-slate-800/50 rounded-lg transition-shadow hover:shadow-sm">
            <div className={`w-full flex justify-between items-center p-4 text-left transition bg-white dark:bg-slate-800 shadow-lg ${isOpen ? 'rounded-t-lg' : 'rounded-lg'}`}>
                <div className="flex-grow flex items-center gap-3 text-left">
                    <button
                        type="button"
                        onClick={handleToggle}
                        className="flex items-center gap-3 text-left"
                        aria-expanded={isOpen}
                        disabled={analysis.isLoading}
                    >
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Visión Global IA</h3>
                        {analysis.content && !analysis.isLoading && <SentimentBadge score={analysis.content.sentiment} />}
                        {analysis.content && <span className="text-xs text-slate-500 dark:text-slate-400">(Calculado con {analysis.calculatedWithVectorCount} vectores)</span>}
                    </button>
                    {analysis.content?.limitBuyPrice && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 ml-3" title="Precio Límite de Compra Sugerido por la IA">
                            <i className="fas fa-bullseye text-orange-500"></i>
                            <span className="font-semibold">Límite:</span>
                            <span className="font-mono">{analysis.content.limitBuyPrice.toLocaleString('es-ES', { style: 'currency', currency: currency })}</span>
                        </div>
                    )}
                </div>
                 <div className="flex items-center gap-2 flex-shrink-0">
                    <button 
                        type="button"
                        onClick={onCalculate} 
                        disabled={!canCalculate || isDisabled}
                        title={getCalculateButtonTitle()}
                        className={`${baseButtonClasses} w-44 justify-center ${isStale && !isDisabled ? 'bg-red-100 text-red-800 border-2 border-red-400 animate-pulse-red hover:bg-red-200' : 'bg-slate-100 text-slate-700 border-2 border-transparent hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'}`}
                    >
                        {analysis.isLoading ? (
                            <>
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="http://www.w3.org/2000/svg">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Calculando...</span>
                            </>
                        ) : (
                            <>
                               <i className={`fas ${isStale ? 'fa-sync-alt' : 'fa-brain'}`}></i>
                                <span>{isStale ? 'Actualizar' : 'Calcular'} ({includedAnalyzedCount})</span>
                            </>
                        )}
                    </button>
                    <button
                        id="download-report-button"
                        type="button"
                        onClick={onDownloadReport}
                        disabled={!analysis.content}
                        className={`${baseButtonClasses} bg-slate-800 text-white hover:bg-slate-700 disabled:bg-slate-400 disabled:cursor-wait w-44 justify-center dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300 dark:disabled:bg-slate-500`}
                    >
                        <i className="fas fa-download"></i>
                        <span>Descargar Informe</span>
                    </button>
                    {(analysis.content || analysis.error) && (
                        <button
                            type="button"
                            onClick={handleToggle}
                            className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                            title={isOpen ? "Colapsar" : "Expandir"}
                        >
                            <i className={`fas fa-chevron-down transform transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
                        </button>
                    )}
                 </div>
            </div>
             <div
                className={`transition-[max-height] duration-500 ease-in-out overflow-hidden ${
                    isOpen ? 'max-h-[2000px]' : 'max-h-0'
                }`}
            >
                <div className="p-4 border-t border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 rounded-b-lg">
                    {analysis.error && <p className="text-red-600 dark:text-red-500">{analysis.error}</p>}
                    {!analysis.content && !analysis.isLoading && !analysis.error && 
                        <p className="text-slate-500 dark:text-slate-400 text-center py-4">
                            {totalAnalyzedCount > 0 
                                ? "Calcula la Visión Global para obtener una tesis de inversión consolidada."
                                : "Analiza algunos vectores para poder generar una Visión Global del activo."
                            }
                        </p>
                    }
                    {analysis.content && (
                        <>
                            <div className="flex items-start gap-3">
                                <p className="prose prose-sm max-w-none text-slate-600 dark:text-slate-400 italic flex-grow">{analysis.content.summary}</p>
                                <button
                                    type="button"
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="flex-shrink-0 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition p-1"
                                    title={isExpanded ? "Mostrar menos" : "Mostrar más"}
                                    aria-expanded={isExpanded}
                                >
                                    <i className={`fas ${isExpanded ? 'fa-compress-alt' : 'fa-expand-alt'}`}></i>
                                </button>
                            </div>

                            {isExpanded && (
                                <div 
                                    className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300 mt-4 pt-4 border-t border-dashed dark:border-slate-600"
                                    dangerouslySetInnerHTML={{ __html: formatTextToHtml(analysis.content.fullText) }}
                                />
                            )}
                            
                            {analysis.sources && analysis.sources.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => setIsSourcesOpen(!isSourcesOpen)}
                                        className="w-full flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-slate-800 dark:hover:text-slate-200 transition p-2 -m-2 rounded-md hover:bg-slate-100/50 dark:hover:bg-slate-700/50"
                                        aria-expanded={isSourcesOpen}
                                    >
                                        <span>Fuentes Consultadas ({analysis.sources.length})</span>
                                        <i className={`fas fa-chevron-down transform transition-transform ${isSourcesOpen ? 'rotate-180' : ''}`}></i>
                                    </button>
                                    {isSourcesOpen && (
                                        <ul className="space-y-1 mt-2">
                                            {analysis.sources.map((source, index) => (
                                                <li key={index}>
                                                    <a 
                                                        href={source.uri} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline truncate block"
                                                        title={source.title}
                                                    >
                                                       <i className="fas fa-link fa-xs mr-2"></i>
                                                        {source.title}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}