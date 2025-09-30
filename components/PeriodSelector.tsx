import React from 'react';
import type { Period } from '../types';

interface PeriodSelectorProps {
    currentPeriod: Period;
    onPeriodChange: (period: Period) => void;
}

const periods: Period[] = ['1D', '1W', '1M', 'YTD', '1Y', '2Y', '5Y'];

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({ currentPeriod, onPeriodChange }) => {
    return (
        <div className="flex justify-center bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
            {periods.map(period => (
                <button
                    key={period}
                    type="button"
                    onClick={() => onPeriodChange(period)}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                        currentPeriod === period
                            ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                >
                    {period}
                </button>
            ))}
        </div>
    );
};