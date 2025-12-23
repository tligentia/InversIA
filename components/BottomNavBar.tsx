
import React from 'react';
import type { View } from '../types';

interface BottomNavBarProps {
    activeView: View;
    setActiveView: (view: View) => void;
}

const navItems: { view: View; label: string; icon: string }[] = [
    { view: 'market', label: 'Mercado', icon: 'fa-globe' },
    { view: 'analysis', label: 'Análisis', icon: 'fa-chart-pie' },
    { view: 'charts', label: 'Gráficos', icon: 'fa-chart-line' },
    { view: 'portfolio', label: 'Cartera', icon: 'fa-wallet' },
];

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeView, setActiveView }) => {
    return (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-800 shadow-lg flex justify-around items-center h-16 z-50">
            {navItems.map(({ view, label, icon }) => (
                <button
                    key={view}
                    type="button"
                    onClick={() => setActiveView(view)}
                    className={`flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ${
                        activeView === view ? 'text-red-700 dark:text-red-500 animate-pulse-active' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    aria-current={activeView === view ? 'page' : undefined}
                >
                    <i className={`fas ${icon} fa-xl`}></i>
                    <span className={`text-xs mt-1 font-semibold ${activeView === view ? 'font-bold' : ''}`}>{label}</span>
                </button>
            ))}
        </nav>
    );
};
