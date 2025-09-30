import React, { useEffect, useRef, memo } from 'react';
import type { Theme } from '../types';

interface TradingViewWidgetProps {
    ticker: string;
    theme: Theme;
}

// Global script loaded flag to prevent multiple script injections
let tvScriptLoadingPromise: Promise<void> | null = null;

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = memo(({ ticker, theme }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetRef = useRef<any>(null);

    const getSystemTheme = () => 
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    const getEffectiveTheme = () => (theme === 'system' ? getSystemTheme() : theme);

    const createWidget = () => {
        if (containerRef.current && 'TradingView' in window && (window as any).TradingView) {
            // Clear any previous widget
            containerRef.current.innerHTML = '';

            const effectiveTheme = getEffectiveTheme();
            
            // Map common Yahoo Finance tickers (e.g., 'SAN.MC') to TradingView format ('BCBA:SAN')
            let tradingViewTicker = ticker;
            if (ticker.includes('.')) {
                const parts = ticker.split('.');
                const exchangeMap: Record<string, string> = {
                    'MC': 'BMEX', // Madrid
                    'AS': 'EURONEXT', // Amsterdam
                    'PA': 'EURONEXT', // Paris
                    'DE': 'XETR', // XETRA
                    'L': 'LSE', // London Stock Exchange
                    'LS': 'EURONEXT', // Lisbon
                    'MI': 'MIL', // Milan
                    'BR': 'EURONEXT', // Brussels
                };
                const exchange = exchangeMap[parts[1].toUpperCase()];
                if (exchange) {
                    tradingViewTicker = `${exchange}:${parts[0]}`;
                }
            } else if (ticker.toUpperCase().endsWith('-USD')) {
                // Common crypto format for tickers like BTC-USD
                tradingViewTicker = ticker.replace('-', '');
            }

            widgetRef.current = new (window as any).TradingView.widget({
                width: "100%",
                height: "100%",
                symbol: tradingViewTicker,
                interval: "D",
                timezone: "Etc/UTC",
                theme: effectiveTheme,
                style: "1",
                locale: "es",
                enable_publishing: false,
                allow_symbol_change: true,
                container_id: containerRef.current.id,
                autosize: true,
            });
        }
    };

    useEffect(() => {
        if (!tvScriptLoadingPromise) {
            tvScriptLoadingPromise = new Promise((resolve) => {
                const script = document.createElement('script');
                script.id = 'tradingview-widget-script';
                script.src = 'https://s3.tradingview.com/tv.js';
                script.type = 'text/javascript';
                script.async = true;
                script.onload = () => resolve();
                document.head.appendChild(script);
            });
        }
        
        tvScriptLoadingPromise.then(() => {
            if (containerRef.current) {
                createWidget();
            }
        });

        // Cleanup function for when the component unmounts
        return () => {
            if (widgetRef.current && containerRef.current) {
                // TradingView widget doesn't have a public `destroy` method.
                // The safest way to clean up is to remove the container's content.
                containerRef.current.innerHTML = '';
                widgetRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ticker, theme]); // Re-create widget when ticker or theme changes

    // Use a unique ID for the container to avoid conflicts
    const widgetId = `tradingview_widget_container_${ticker}`;

    return <div ref={containerRef} id={widgetId} style={{ width: '100%', height: '100%' }} />;
});