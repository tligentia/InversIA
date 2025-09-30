import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { AnalysisSession, Theme } from '../types';
import { TradingViewWidget } from '../components/TradingViewWidget';

interface ChartViewProps {
    activeSession: AnalysisSession | undefined;
    theme: Theme;
}

export const ChartView: React.FC<ChartViewProps> = ({ activeSession, theme }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [chartHeight, setChartHeight] = useState<number>(500); // Default height
    const isResizing = useRef<boolean>(false);
    const initialMouseY = useRef<number>(0);
    const initialHeight = useRef<number>(0);

    // Set initial height based on a 4:3 aspect ratio
    useEffect(() => {
        if (containerRef.current && activeSession) {
            const width = containerRef.current.clientWidth;
            const initialAspectRatioHeight = width * 0.75; // 4:3 ratio
            setChartHeight(Math.max(400, initialAspectRatioHeight)); // Ensure a minimum height of 400px
        }
    }, [activeSession]); // Recalculate if the session changes

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        isResizing.current = true;
        initialMouseY.current = e.clientY;
        initialHeight.current = chartHeight;
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
    }, [chartHeight]);

    const handleMouseUp = useCallback(() => {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing.current) return;
        
        const deltaY = e.clientY - initialMouseY.current;
        const newHeight = initialHeight.current + deltaY;

        // Constraints for resizing
        const minHeight = 300;
        const maxHeight = window.innerHeight * 0.9;
        const constrainedHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
        
        setChartHeight(constrainedHeight);
    }, []);

    // Effect to add and clean up global event listeners for resizing
    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);


    if (!activeSession) {
        return (
             <div className="text-center mt-12 py-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
                <i className="fas fa-chart-line text-5xl text-slate-300 dark:text-slate-600"></i>
                <h2 className="mt-4 text-2xl font-semibold text-slate-700 dark:text-slate-200">Gráficos Avanzados</h2>
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                    Primero, busca y selecciona un activo en la pestaña de 'Análisis' para ver sus gráficos en tiempo real.
                </p>
            </div>
        );
    }

    return (
        <div 
            ref={containerRef}
            className="mt-4 bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden flex flex-col"
            style={{ height: `${chartHeight}px` }}
        >
            <div className="flex-grow h-full w-full">
                <TradingViewWidget ticker={activeSession.asset.ticker} theme={theme} />
            </div>
            <div 
                onMouseDown={handleMouseDown}
                className="w-full h-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 cursor-ns-resize flex items-center justify-center group flex-shrink-0"
                title="Arrastra para cambiar el tamaño vertical"
            >
                 <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full group-hover:bg-slate-400 dark:group-hover:bg-slate-500 transition-colors"></div>
            </div>
        </div>
    );
};