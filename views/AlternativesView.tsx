import React, { useCallback } from 'react';
import { AlternativeCompanies } from '../components/AlternativeCompanies';
import type { AnalysisSession, Asset, Currency } from '../types';
import { QuotaExceededError } from '../types';
import { getAlternativeAssets } from '../services/geminiService';

interface AlternativesViewProps {
    activeSession: AnalysisSession | undefined;
    onSessionChange: React.Dispatch<React.SetStateAction<AnalysisSession[]>>;
    currentEngine: string;
    onTokenUsage: (usage: { promptTokens: number; candidateTokens: number; totalTokens: number; model: string; }) => void;
    onApiError: (e: unknown, title: string, message: string) => void;
    onSelectAsset: (asset: Asset) => void;
    isApiBlocked: boolean;
    currency: Currency;
}

export const AlternativesView: React.FC<AlternativesViewProps> = ({
    activeSession,
    onSessionChange,
    currentEngine,
    onTokenUsage,
    onApiError,
    onSelectAsset,
    isApiBlocked,
    currency,
}) => {
    const updateSession = useCallback((sessionId: string, updates: Partial<AnalysisSession>) => {
        onSessionChange(prev =>
            prev.map(s => s.id === sessionId ? { ...s, ...updates } : s)
        );
    }, [onSessionChange]);
    
    const fetchAlternatives = useCallback(async () => {
        if (!activeSession) return;
        updateSession(activeSession.id, { isLoadingAlternatives: true, haveAlternativesBeenFetched: true });
        try {
            const { data: assets, usage } = await getAlternativeAssets(activeSession.asset, currentEngine, currency);
            onTokenUsage({ ...usage, model: currentEngine });
            updateSession(activeSession.id, { alternativeAssets: assets ?? [], isLoadingAlternatives: false });
        } catch (e) {
            console.error("Error fetching alternative assets:", e);
            // FIX: QuotaExceededError is used as a value in an instanceof check, so it must be imported as a value, not a type.
            if (e instanceof QuotaExceededError) {
                onApiError(e, '', '');
            }
            updateSession(activeSession.id, { isLoadingAlternatives: false });
        }
    }, [activeSession, updateSession, currentEngine, onTokenUsage, onApiError, currency]);

    const handleSelectAlternative = useCallback((asset: Asset) => {
        onSelectAsset(asset);
    }, [onSelectAsset]);

    if (!activeSession) {
        return (
            <div className="text-center mt-12 py-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
                <i className="fas fa-users text-5xl text-slate-300 dark:text-slate-600"></i>
                <h2 className="mt-4 text-2xl font-semibold text-slate-700 dark:text-slate-200">Activos Alternativos</h2>
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                    Primero, busca y selecciona un activo en la pestaña de 'Análisis' para encontrar competidores.
                </p>
            </div>
        );
    }
    
    return (
        <div className="">
            <AlternativeCompanies 
                companies={activeSession.alternativeAssets} 
                isLoading={activeSession.isLoadingAlternatives} 
                onSelectCompany={handleSelectAlternative}
                onFetchAlternatives={fetchAlternatives}
                hasBeenFetched={activeSession.haveAlternativesBeenFetched}
                isApiBlocked={isApiBlocked}
                currency={currency}
                assetName={activeSession.asset.name}
            />
        </div>
    );
};