

import React from 'react';
import type { View } from '../types';

interface BottomNavBarProps {
    activeView: View;
    setActiveView: (view: View) => void;
}

const navItems: { view: View; label: string; icon: string }[] = [
    { view: 'market', label: 'Mercado', icon: 'fa-globe' },
    { view: 'analysis', label: 'Análisis', icon: 'fa-chart-pie' },
    { view: 'portfolio', label: 'Cartera', icon: 'fa-wallet' },
    { view: 'history', label: 'Historial', icon: 'fa-history' },
];

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeView, setActiveView }) => {
    return (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-lg flex justify-around items-center h-16 z-50">
            {navItems.map(({ view, label, icon }) => (
                <button
                    key={view}
                    type="button"
                    onClick={() => setActiveView(view)}
                    className={`flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ${
                        activeView === view ? 'text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                    aria-current={activeView === view ? 'page' : undefined}
                >
                    <i className={`fas ${icon} fa-lg`}></i>
                    <span className={`text-xs mt-1 font-semibold ${activeView === view ? 'font-bold' : ''}`}>{label}</span>
                </button>
            ))}
        </nav>
    );
};
