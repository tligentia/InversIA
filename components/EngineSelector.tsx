
import React from 'react';

interface EngineSelectorProps {
    availableEngines: string[];
    currentEngine: string;
    onEngineChange: (engine: string) => void;
    isApiBlocked: boolean;
    isBusy: boolean;
}

export const EngineSelector: React.FC<EngineSelectorProps> = ({ availableEngines, currentEngine, onEngineChange, isApiBlocked, isBusy }) => {
    const hasMultipleEngines = availableEngines.length > 1;
    const isDisabled = isApiBlocked || isBusy || !hasMultipleEngines;

    const getTitle = () => {
        if (isApiBlocked) return "Las funciones de IA están desactivadas por límite de cuota.";
        if (isBusy) return "No se puede cambiar el motor durante un análisis.";
        if (!hasMultipleEngines) return `Motor de IA actual: ${currentEngine}`;
        return "Seleccionar motor de IA";
    };

    return (
        <div className="relative flex-shrink-0" title={getTitle()}>
            <i className="fas fa-microchip absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10"></i>
            <select
                value={currentEngine}
                onChange={(e) => onEngineChange(e.target.value)}
                disabled={isDisabled}
                className="h-11 w-48 appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-8 font-semibold text-slate-700 transition focus:outline-none focus:ring-2 focus:ring-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                aria-label="Selector de motor de IA"
            >
                {availableEngines.map(engine => (
                    <option key={engine} value={engine}>{engine}</option>
                ))}
            </select>
            <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
        </div>
    );
};
