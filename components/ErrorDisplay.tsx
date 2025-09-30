import React from 'react';
import type { AppError } from '../types';

interface ErrorDisplayProps {
    error: AppError | null;
    onDismiss: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onDismiss }) => {
    if (!error) return null;

    const isNotFound = error.title === 'Activo no Encontrado';

    const containerClasses = isNotFound
        ? "mt-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-600 dark:text-yellow-200 rounded-r-lg relative flex items-start gap-4 shadow-md"
        : "mt-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-800 dark:bg-red-900/30 dark:border-red-600 dark:text-red-200 rounded-r-lg relative flex items-start gap-4 shadow-md";

    const iconClasses = isNotFound
        ? "fas fa-search-minus text-yellow-500 dark:text-yellow-400 text-xl"
        : "fas fa-exclamation-circle text-red-500 dark:text-red-400 text-xl";

    const buttonClasses = isNotFound
        ? "ml-4 flex-shrink-0 text-yellow-600 hover:text-yellow-800 dark:text-yellow-300 dark:hover:text-yellow-100"
        : "ml-4 flex-shrink-0 text-red-600 hover:text-red-800 dark:text-red-300 dark:hover:text-red-100";


    return (
        <div 
            className={containerClasses}
            role="alert"
        >
            <div className="flex-shrink-0 pt-0.5">
                <i className={iconClasses}></i>
            </div>
            <div className="flex-grow">
                <h4 className="font-bold">{error.title}</h4>
                <p className="text-sm">{error.message}</p>
            </div>
            <button
                type="button"
                onClick={onDismiss}
                className={buttonClasses}
                aria-label="Cerrar alerta"
            >
                <i className="fas fa-times"></i>
            </button>
        </div>
    );
};