

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
        <div className="border-b border-slate-200 dark:border-slate-700">
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
                                        ? 'border-slate-800 dark:border-slate-200 text-slate-800 dark:text-slate-200 font-semibold bg-white dark:bg-slate-800'
                                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
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
                            className="w-5 h-5 rounded-full text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
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