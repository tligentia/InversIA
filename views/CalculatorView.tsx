

import React, { useCallback, useMemo } from 'react';
import { ProfitabilityCalculator } from '../components/ProfitabilityCalculator';
import type { AnalysisSession, CalculatorState, Currency } from '../types';

interface CalculatorViewProps {
    activeSession: AnalysisSession | undefined;
    onSessionChange: React.Dispatch<React.SetStateAction<AnalysisSession[]>>;
    currentEngine: string;
    onTokenUsage: (usage: { promptTokens: number; candidateTokens: number; totalTokens: number; model: string; }) => void;
    onApiError: (e: unknown, title: string, message: string) => void;
    currency: Currency;
}

export const CalculatorView: React.FC<CalculatorViewProps> = ({
    activeSession,
    onSessionChange,
    currentEngine,
    onTokenUsage,
    onApiError,
    currency
}) => {

    const updateSession = useCallback((sessionId: string, updates: Partial<AnalysisSession>) => {
        onSessionChange(prev =>
            prev.map(s => s.id === sessionId ? { ...s, ...updates } : s)
        );
    }, [onSessionChange]);

    const handleCalculatorStateChange = useCallback((newState: CalculatorState) => {
        if (activeSession) {
            updateSession(activeSession.id, { calculatorState: newState });
        }
    }, [activeSession, updateSession]);

    const defaultCalculatorState = useMemo(() => {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        const fiveYearsFromNow = new Date(today);
        fiveYearsFromNow.setFullYear(fiveYearsFromNow.getFullYear() + 5);
        const fiveYearsFromNowStr = fiveYearsFromNow.toISOString().split('T')[0];

        return {
            investment: '1000',
            startDate: todayStr,
            endDate: fiveYearsFromNowStr,
            startPriceInput: '',
            endPriceInput: '',
            inflationRate: '3',
        };
    }, []);

    if (!activeSession) {
        return (
            <div className="text-center mt-12 py-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
                <i className="fas fa-calculator text-5xl text-slate-300 dark:text-slate-600"></i>
                <h2 className="mt-4 text-2xl font-semibold text-slate-700 dark:text-slate-200">Calculadora de Rentabilidad</h2>
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                    Primero, busca y selecciona un activo en la pestaña de 'Análisis' para poder usar la calculadora.
                </p>
            </div>
        );
    }
    
    return (
        <div className="">
             <ProfitabilityCalculator 
                asset={activeSession.asset}
                currentPrice={activeSession.currentPrice}
                currentEngine={currentEngine}
                onTokenUsage={onTokenUsage}
                onApiError={onApiError}
                initialState={activeSession.calculatorState ?? defaultCalculatorState}
                onStateChange={handleCalculatorStateChange}
                currency={currency}
            />
        </div>
    );
};