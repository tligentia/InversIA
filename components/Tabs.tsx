
import React from 'react';
import type { AnalysisSession } from '../types';

interface TabsProps {
    sessions: AnalysisSession[];
    activeSessionId: string | null;
    onSelectSession: (sessionId: string) => void;
    onCloseSession: (sessionId: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ sessions, activeSessionId, onSelectSession, onCloseSession }) => {
    if (sessions.length === 0) {
        return null;
    }

    return (
        <div className="border-b border-gray-200 dark:border-neutral-800">
            <div className="flex items-center space-x-1" role="tablist" aria-label="Activos analizados">
                {sessions.map(session => (
                    <div
                        key={session.id}
                        onClick={() => onSelectSession(session.id)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                onSelectSession(session.id);
                            }
                        }}
                        className={`flex items-center gap-2 cursor-pointer py-2 px-4 border-b-2 -mb-px
                                    ${activeSessionId === session.id
                                        ? 'border-red-700 text-red-700 font-bold bg-white dark:bg-neutral-900 dark:text-red-500 dark:border-red-500'
                                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800/50'
                                    }
                                    transition-colors duration-200 rounded-t-md`}
                        role="tab"
                        aria-selected={activeSessionId === session.id}
                        tabIndex={0}
                    >
                        <span>{session.asset.ticker}</span>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onCloseSession(session.id);
                            }}
                            className="w-5 h-5 rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-neutral-700 hover:text-red-700 dark:hover:text-red-400 flex items-center justify-center transition-colors"
                            aria-label={`Cerrar análisis de ${session.asset.name}`}
                        >
                            <i className="fas fa-times fa-xs"></i>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
