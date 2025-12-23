
import React, { useState } from 'react';
import type { AnalysisVector, Currency } from '../types';
import { formatTextToHtml } from '../utils/formatter';
import { SentimentBadge } from './SentimentBadge';
import { VECTOR_DESCRIPTIONS } from '../constants';

interface AnalysisSectionProps {
    vector: AnalysisVector;
    onAnalyze: () => Promise<void> | void;
    onDelete: (title: string) => void;
    isApiBlocked?: boolean;
    onToggleInclusion: () => void;
    currency: Currency;
}

export const AnalysisSection: React.FC<AnalysisSectionProps> = ({ vector, onAnalyze, onDelete, isApiBlocked, onToggleInclusion, currency }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isSourcesOpen, setIsSourcesOpen] = useState(false);

    const canAnalyze = !vector.content && !vector.isLoading;
    const isDisabled = vector.isLoading || (canAnalyze && !!isApiBlocked);
    
    const description = VECTOR_DESCRIPTIONS[vector.title];

    const handleToggle = async () => {
        if (isDisabled) return;
        if (canAnalyze) {
            await onAnalyze();
        }
        setIsOpen(!isOpen);
    };

    return (
        <div className={`bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg transition-shadow ${isDisabled ? '' : 'hover:shadow-sm'}`}>
            <button
                type="button"
                onClick={handleToggle}
                className={`w-full flex justify-between items-center p-4 text-left transition ${isOpen ? 'rounded-t-lg' : 'rounded-lg'} ${isDisabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-gray-100 dark:hover:bg-neutral-800'}`}
                aria-expanded={isOpen}
                aria-busy={vector.isLoading}
                disabled={isDisabled}
            >
                <div className="flex items-center gap-3 flex-grow min-w-0">
                    <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            checked={vector.isIncludedInGlobal ?? true}
                            onChange={onToggleInclusion}
                            disabled={!vector.content}
                            className="h-5 w-5 rounded border-gray-300 text-red-700 focus:ring-red-700 disabled:opacity-50 dark:bg-neutral-950 dark:border-neutral-700"
                            aria-label={`Incluir ${vector.title}`}
                        />
                    </div>
                    <h4 className="text-lg font-bold text-black dark:text-white flex-1 text-left pr-2 truncate">
                        {vector.title}
                        {description && !vector.isCustom && (
                            <div className="relative group inline-flex items-center ml-2 align-middle" onClick={e => e.stopPropagation()}>
                                <i className="fas fa-info-circle text-gray-400 text-sm cursor-help"></i>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20">
                                    {description}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-gray-900"></div>
                                </div>
                            </div>
                        )}
                    </h4>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {vector.isCustom && !vector.isLoading && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(vector.title);
                            }}
                            className="text-gray-400 hover:text-red-700 transition w-6 h-6 rounded-full flex items-center justify-center -mr-1"
                        >
                            <i className="fas fa-times fa-sm"></i>
                        </button>
                    )}
                    {vector.content?.limitBuyPrice && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5" title="Precio Límite">
                            <i className="fas fa-bullseye text-red-700"></i>
                            <span className="font-bold">{vector.content.limitBuyPrice.toLocaleString('es-ES', { style: 'currency', currency: currency })}</span>
                        </div>
                    )}
                    {vector.content && !vector.isLoading && <SentimentBadge score={vector.content.sentiment} />}
                    {vector.isLoading && (
                         <svg className="animate-spin h-5 w-5 text-red-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    )}
                    <i className={`fas fa-chevron-down text-gray-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
                </div>
            </button>
            <div
                className={`transition-[max-height] duration-500 ease-in-out overflow-hidden ${
                    isOpen ? 'max-h-[2000px]' : 'max-h-0'
                }`}
            >
                <div className="p-4 border-t border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 rounded-b-lg">
                    {vector.error && <p className="text-red-700">{vector.error}</p>}
                    {vector.content && (
                        <>
                            <div className="flex items-start gap-3">
                                <p className="prose prose-sm max-w-none text-gray-600 dark:text-gray-400 italic flex-grow">{vector.content.summary}</p>
                                <button
                                    type="button"
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="flex-shrink-0 text-gray-400 hover:text-black dark:hover:text-white transition p-1"
                                >
                                    <i className={`fas ${isExpanded ? 'fa-compress-alt' : 'fa-expand-alt'}`}></i>
                                </button>
                            </div>

                            {isExpanded && (
                                <div 
                                    className="prose prose-sm max-w-none text-gray-800 dark:text-gray-300 mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-neutral-800"
                                    dangerouslySetInnerHTML={{ __html: formatTextToHtml(vector.content.fullText) }}
                                />
                            )}
                            
                            {vector.sources && vector.sources.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-neutral-900">
                                    <button
                                        type="button"
                                        onClick={() => setIsSourcesOpen(!isSourcesOpen)}
                                        className="w-full flex justify-between items-center text-xs font-black text-gray-400 uppercase tracking-widest hover:text-red-700 transition"
                                    >
                                        <span>Fuentes ({vector.sources.length})</span>
                                        <i className={`fas fa-chevron-down transform transition-transform ${isSourcesOpen ? 'rotate-180' : ''}`}></i>
                                    </button>
                                    {isSourcesOpen && (
                                        <ul className="space-y-1 mt-2">
                                            {vector.sources.map((source, index) => (
                                                <li key={index}>
                                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-red-700 hover:underline truncate block">
                                                       <i className="fas fa-link fa-xs mr-2"></i>{source.title}
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
};
