import React from 'react';
import type { AppError } from '../types';

interface ErrorDisplayProps {
    error: AppError | null;
    onDismiss: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onDismiss }) => {
    if (!error) return null;

    return (
        <div 
            className="mt-4 p-4 bg-red-100 border border-red-400 text-red-800 rounded-lg relative flex items-start gap-4"
            role="alert"
        >
            <div className="flex-shrink-0">
                <i className="fas fa-exclamation-circle text-red-600 text-xl"></i>
            </div>
            <div className="flex-grow">
                <h4 className="font-bold">{error.title}</h4>
                <p className="text-sm">{error.message}</p>
            </div>
            <button
                type="button"
                onClick={onDismiss}
                className="ml-4 flex-shrink-0 text-red-600 hover:text-red-800"
                aria-label="Cerrar alerta"
            >
                <i className="fas fa-times"></i>
            </button>
        </div>
    );
};
