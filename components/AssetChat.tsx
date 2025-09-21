

import React, { useState, useEffect, useRef } from 'react';
import type { Asset, Source, ChatMessage } from '../types';
import { formatTextToHtml } from '../utils/formatter';
import { askAboutAnalysis, askWithWebSearch } from '../services/geminiService';
import { v4 as uuidv4 } from 'uuid';

interface AssetChatProps {
    asset: Asset;
    analysisContext: string;
    currentEngine: string;
    onTokenUsage: (usage: { promptTokens: number; candidateTokens: number; totalTokens: number; model: string; }) => void;
    onApiError: (e: unknown, title: string, message: string) => void;
    isApiBlocked: boolean;
    analyzedVectorsCount: number;
    chatHistory: ChatMessage[];
    onChatHistoryChange: (newHistory: ChatMessage[]) => void;
}

export const AssetChat: React.FC<AssetChatProps> = ({ 
    asset, analysisContext, currentEngine, onTokenUsage, onApiError, isApiBlocked, analyzedVectorsCount,
    chatHistory, onChatHistoryChange
}) => {
    const [userMessage, setUserMessage] = useState('');
    const [isResponding, setIsResponding] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory, isResponding]);

    const handleSendMessage = async () => {
        const question = userMessage.trim();
        if (!question || isResponding || isApiBlocked) return;

        const newUserMessage: ChatMessage = { id: uuidv4(), role: 'user', text: question };
        onChatHistoryChange([...chatHistory, newUserMessage]);
        setUserMessage('');
        setIsResponding(true);

        // Pass the full history to maintain complete context.
        const apiHistory = chatHistory;

        try {
            const { data: answerData, usage } = await askAboutAnalysis(asset.name, analysisContext, question, apiHistory, currentEngine);
            onTokenUsage({ ...usage, model: currentEngine });
            
            const assistantMessage: ChatMessage = {
                id: uuidv4(),
                role: 'assistant',
                text: answerData.summary,
                sources: answerData.sources,
                requiresWebSearch: !answerData.answerFound
            };
            onChatHistoryChange([...chatHistory, newUserMessage, assistantMessage]);

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'No se pudo procesar la pregunta.';
            onApiError(e, `Error en Pregunta a IA`, errorMessage);
            const errorResponseMessage: ChatMessage = {
                id: uuidv4(),
                role: 'assistant',
                text: `Lo siento, ocurrió un error: ${errorMessage}`,
                isError: true,
            };
            onChatHistoryChange([...chatHistory, newUserMessage, errorResponseMessage]);
        } finally {
            setIsResponding(false);
        }
    };

    const handleWebSearch = async () => {
        if (isResponding || isApiBlocked) return;
        
        const lastUserMessage = [...chatHistory].reverse().find(m => m.role === 'user');
        if (!lastUserMessage) return;

        setIsResponding(true);
        const historyWithoutSearchPrompt = chatHistory.filter(m => !m.requiresWebSearch);
        onChatHistoryChange(historyWithoutSearchPrompt);

        // Pass the full history to maintain complete context.
        const apiHistory = historyWithoutSearchPrompt;

        try {
            const { data: answer, usage } = await askWithWebSearch(asset.name, lastUserMessage.text, apiHistory, currentEngine);
            onTokenUsage({ ...usage, model: currentEngine });
            const assistantMessage: ChatMessage = {
                id: uuidv4(),
                role: 'assistant',
                text: answer.fullText || answer.summary,
                sources: answer.sources,
            };
            onChatHistoryChange([...historyWithoutSearchPrompt, assistantMessage]);

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'No se pudo procesar la búsqueda web.';
            onApiError(e, `Error en Búsqueda Web`, errorMessage);
             const errorResponseMessage: ChatMessage = {
                id: uuidv4(),
                role: 'assistant',
                text: `Lo siento, ocurrió un error durante la búsqueda: ${errorMessage}`,
                isError: true,
            };
            onChatHistoryChange([...historyWithoutSearchPrompt, errorResponseMessage]);
        } finally {
            setIsResponding(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Habla con la IA sobre {asset.name}</h3>
            {analyzedVectorsCount > 0 ? (
                <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-lg shadow-inner flex flex-col h-96">
                    <div ref={chatContainerRef} className="flex-1 p-4 space-y-4 overflow-y-auto">
                        {chatHistory.map((msg) => (
                            <div key={msg.id} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'assistant' && <i className="fas fa-robot text-slate-400 dark:text-slate-500 text-xl self-start flex-shrink-0"></i>}
                                <div className={`prose prose-sm max-w-lg rounded-xl px-4 py-2.5 ${
                                    msg.role === 'user' ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' : 
                                    msg.isError ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                                }`}>
                                    <div dangerouslySetInnerHTML={{ __html: formatTextToHtml(msg.text) }}></div>
                                    {msg.requiresWebSearch && !isResponding && (
                                        <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-600/80">
                                            <button onClick={handleWebSearch} disabled={isApiBlocked} className="px-3 py-1.5 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 active:bg-slate-400 transition text-xs flex items-center justify-center gap-2 disabled:bg-slate-100 disabled:text-slate-400 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">
                                                <i className="fas fa-globe"></i>
                                                <span>Buscar en la web</span>
                                            </button>
                                        </div>
                                    )}
                                    {msg.sources && msg.sources.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                                             <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                                Fuentes
                                            </h5>
                                            <ul className="space-y-1">
                                                {msg.sources.map((source, index) => (
                                                    <li key={index}>
                                                        <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline truncate block" title={source.title}>
                                                            <i className="fas fa-link fa-xs mr-1.5"></i>{source.title}
                                                        </a>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                                {msg.role === 'user' && <i className="fas fa-user-circle text-slate-400 dark:text-slate-500 text-xl self-start flex-shrink-0"></i>}
                            </div>
                        ))}
                        {isResponding && (
                            <div className="flex items-end gap-2 justify-start">
                                <i className="fas fa-robot text-slate-400 dark:text-slate-500 text-xl self-start"></i>
                                <div className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl px-4 py-3 max-w-lg flex items-center gap-2">
                                    <span className="h-2 w-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="h-2 w-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="h-2 w-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"></span>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 rounded-b-lg">
                        <div className="flex items-center gap-3">
                            <input
                                type="text"
                                value={userMessage}
                                onChange={(e) => setUserMessage(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                                placeholder="Escribe tu pregunta..."
                                className="flex-grow h-10 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-800 transition bg-white disabled:bg-slate-100 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200 dark:focus:ring-slate-200"
                                disabled={isResponding || isApiBlocked}
                                aria-label="Escribe tu pregunta para la IA"
                            />
                            <button
                                type="button"
                                onClick={handleSendMessage}
                                disabled={!userMessage.trim() || isResponding || isApiBlocked}
                                className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 active:bg-slate-900 transition disabled:bg-slate-400 disabled:cursor-not-allowed dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300 dark:active:bg-slate-400"
                                title="Enviar mensaje"
                                aria-label="Enviar mensaje a la IA"
                            >
                                <i className="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <p className="text-slate-500 dark:text-slate-400 text-sm italic text-center py-4">Analiza al menos un vector para poder chatear con la IA sobre este activo.</p>
            )}
        </div>
    );
};