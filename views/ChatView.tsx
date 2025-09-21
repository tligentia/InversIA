

import React, { useMemo, useCallback } from 'react';
import { AssetChat } from '../components/AssetChat';
import type { AnalysisSession, ChatMessage } from '../types';

interface ChatViewProps {
    activeSession: AnalysisSession | undefined;
    onSessionChange: React.Dispatch<React.SetStateAction<AnalysisSession[]>>;
    currentEngine: string;
    onTokenUsage: (usage: { promptTokens: number; candidateTokens: number; totalTokens: number; model: string; }) => void;
    onApiError: (e: unknown, title: string, message: string) => void;
    isApiBlocked: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({
    activeSession,
    onSessionChange,
    currentEngine,
    onTokenUsage,
    onApiError,
    isApiBlocked,
}) => {
    const updateSession = useCallback((sessionId: string, updates: Partial<AnalysisSession>) => {
        onSessionChange(prev =>
            prev.map(s => s.id === sessionId ? { ...s, ...updates } : s)
        );
    }, [onSessionChange]);

    const handleChatHistoryChange = useCallback((newHistory: ChatMessage[]) => {
        if (activeSession) {
            updateSession(activeSession.id, { chatHistory: newHistory });
        }
    }, [activeSession, updateSession]);

    const analyzedVectorsCount = useMemo(() => {
        if (!activeSession) return 0;
        return activeSession.analysisVectors.filter(v => v.content).length;
    }, [activeSession]);

    const analysisContext = useMemo(() => {
        if (!activeSession || analyzedVectorsCount === 0) return '';
        return activeSession.analysisVectors
            .filter(v => v.content)
            .map(v => `## ${v.title}\n${v.content!.fullText}`)
            .join('\n\n---\n\n');
    }, [activeSession, analyzedVectorsCount]);

    if (!activeSession) {
        return (
            <div className="text-center mt-12 py-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
                <i className="fas fa-comments text-5xl text-slate-300 dark:text-slate-600"></i>
                <h2 className="mt-4 text-2xl font-semibold text-slate-700 dark:text-slate-200">Chat con la IA</h2>
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                    Primero, busca y selecciona un activo en la pestaña de 'Análisis' para poder chatear.
                </p>
            </div>
        );
    }
    
    return (
        <div className="">
            <AssetChat
                asset={activeSession.asset}
                analysisContext={analysisContext}
                currentEngine={currentEngine}
                onTokenUsage={onTokenUsage}
                onApiError={onApiError}
                isApiBlocked={isApiBlocked}
                analyzedVectorsCount={analyzedVectorsCount}
                chatHistory={activeSession.chatHistory}
                onChatHistoryChange={handleChatHistoryChange}
            />
        </div>
    );
};