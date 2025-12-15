import React, { useState, useEffect, useRef } from 'react';
import { EngineSelector } from '../components/EngineSelector';
import type { Theme, View, TokenUsageRecord, Currency, Portfolio, PortfolioItem } from '../types';
import { TRUSTED_IP_PREFIXES } from '../constants';
import { TokenAccountingTable } from '../components/TokenAccountingTable';
import { getAssetInfo } from '../services/geminiService';

interface SettingsViewProps {
    availableEngines: string[];
    currentEngine: string;
    onEngineChange: (engine: string) => void;
    isApiBlocked: boolean;
    isBusy: boolean;
    onClearAllData: () => void;
    apiKey: string | null;
    setApiKey: (key: string | null) => void;
    userIp: string | null;
    setActiveView: (view: View) => void;
    tokenUsageHistory: TokenUsageRecord[];
    onClearAccountingHistory: () => void;
    currency: Currency;
    onImportPortfolio: (items: PortfolioItem[], portfolioName: string) => void;
    onTokenUsage: (usage: { promptTokens: number; candidateTokens: number; totalTokens: number; model: string; }) => void;
    onApiError: (e: unknown, title: string, message: string) => void;
}

const parseInvestingDate = (dateStr: string): string => { // e.g., "14/09/2025" or "ago 02, 2024"
    if (!dateStr) return new Date().toISOString().split('T')[0];
    const cleanedStr = dateStr.replace(/"/g, '').trim();

    // Handle "dd/mm/yyyy" format
    if (cleanedStr.includes('/')) {
        const parts = cleanedStr.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
            const year = parseInt(parts[2], 10);
            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                return new Date(year, month, day).toISOString().split('T')[0];
            }
        }
    }

    // Handle "Mon dd, yyyy" format
    const monthMap: { [key: string]: number } = {
        'ene': 0, 'jan': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'apr': 3, 'may': 4,
        'jun': 5, 'jul': 6, 'ago': 7, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10,
        'dic': 11, 'dec': 11
    };
    const parts = cleanedStr.replace(/,/g, '').split(' ');
    if (parts.length === 3) {
        const monthStr = parts[0].toLowerCase().substring(0, 3);
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        const month = monthMap[monthStr];

        if (!isNaN(day) && !isNaN(year) && month !== undefined) {
            return new Date(year, month, day).toISOString().split('T')[0];
        }
    }
    
    return new Date().toISOString().split('T')[0]; // Fallback
};

const parseInvestingNumber = (numStr: string): number => {
    if (typeof numStr !== 'string') return NaN;
    // Remove currency symbols, quotes, and whitespace
    const cleanedStr = numStr.replace(/"/g, '').replace(/€|\$|£|¥/g, '').trim();
    if (!cleanedStr) return NaN;

    const hasComma = cleanedStr.includes(',');
    const hasDot = cleanedStr.includes('.');

    // Check if the last separator is a comma, indicating European format
    if (hasComma && (!hasDot || cleanedStr.lastIndexOf(',') > cleanedStr.lastIndexOf('.'))) {
        // European format (e.g., "1.234,56" or "123,45")
        // Remove all dots (thousand separators), then replace comma with dot (decimal separator)
        return parseFloat(cleanedStr.replace(/\./g, '').replace(',', '.'));
    }
    
    // US/Invariant format (e.g., "1,234.56", "1234.56", or "1234")
    // Remove all commas (thousand separators)
    return parseFloat(cleanedStr.replace(/,/g, ''));
};


export const SettingsView: React.FC<SettingsViewProps> = ({
    availableEngines, currentEngine, onEngineChange, isApiBlocked, isBusy, onClearAllData,
    apiKey, setApiKey, userIp, setActiveView, tokenUsageHistory, onClearAccountingHistory, currency,
    onImportPortfolio, onTokenUsage, onApiError
}) => {
    const [keyInput, setKeyInput] = useState('');
    const [saveMessage, setSaveMessage] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    
    // Obfuscated key construction to prevent simple string scraping
    const specialKey = ['AIzaSyAGl8', 'QkAD-aQo0b', 'QTK37C5MT', 'kqhhRdKU50'].join('');

    // Portfolio Importer State
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importStatus, setImportStatus] = useState('');
    const [importError, setImportError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Automatically apply dev key for trusted IPs if no key is set when view loads
        if (!apiKey && userIp && TRUSTED_IP_PREFIXES.some(prefix => userIp.startsWith(prefix))) {
            setApiKey(specialKey);
            setKeyInput(specialKey);
            setSaveMessage('Clave de desarrollador aplicada automáticamente.');
            const timer = setTimeout(() => setSaveMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [apiKey, userIp, setApiKey, specialKey]);

    useEffect(() => {
        setKeyInput(apiKey || '');
    }, [apiKey]);
    
    const handleSaveApiKey = () => {
        setSaveMessage('');
        
        if (keyInput.toLowerCase() === 'ok') {
            setApiKey(specialKey);
            setKeyInput(specialKey);
            setSaveMessage('Clave especial de desarrollador aplicada.');
        } else {
            setApiKey(keyInput.trim() || null);
            setSaveMessage('Clave API guardada.');
        }

        setTimeout(() => setSaveMessage(''), 3000);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setImportFile(e.target.files[0]);
            setImportStatus('');
            setImportError('');
        }
    };

    const handleImportPortfolio = async () => {
        if (!importFile) {
            setImportError("Por favor, selecciona un archivo CSV.");
            return;
        }
        setIsImporting(true);
        setImportStatus("Leyendo archivo...");
        setImportError('');

        const parseCsvRow = (row: string): string[] => {
            const values = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            return values.map(value => {
                const trimmed = value.trim();
                if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                    return trimmed.slice(1, -1).replace(/""/g, '"');
                }
                return trimmed;
            });
        };

        try {
            const csvText = await importFile.text();
            const allLines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
            if (allLines.length < 2) throw new Error("El archivo CSV está vacío o solo contiene cabeceras.");

            const headerMappings = {
                symbol: ['símbolo', 'symbol', 'ticker'],
                name: ['descripción', 'description', 'nombre', 'name'],
                quantity: ['cantidad', 'quantity', 'cant.', 'qty.'],
                price: ['precio medio apertura', 'avg. price', 'precio medio', 'avg. open price', 'average price', 'precio', 'precio entrada'],
                date: ['fecha', 'date', 'fecha apertura']
            };

            let headerRowIndex = -1;
            let headers: string[] = [];
            let bestHeaderMatch = -1; // 0=no match, 1=symbol+qty, 2=symbol+qty+date

            // Search for the best header row (prioritizing one with a date column)
            for (let i = 0; i < allLines.length; i++) {
                const potentialHeadersRaw = parseCsvRow(allLines[i]);
                const potentialHeaders = potentialHeadersRaw.map(h => h.trim().toLowerCase());
                
                const hasSymbol = headerMappings.symbol.some(alias => potentialHeaders.includes(alias));
                const hasQuantity = headerMappings.quantity.some(alias => potentialHeaders.includes(alias));
                const hasDate = headerMappings.date.some(alias => potentialHeaders.includes(alias));

                if (hasSymbol && hasQuantity) {
                    if (hasDate && bestHeaderMatch < 2) { // Found a header with a date, this is the best
                        headerRowIndex = i;
                        headers = potentialHeaders;
                        bestHeaderMatch = 2;
                    } else if (!hasDate && bestHeaderMatch < 1) { // Found a header without a date
                        headerRowIndex = i;
                        headers = potentialHeaders;
                        bestHeaderMatch = 1;
                    }
                }
            }
            
            if (headerRowIndex === -1) {
                throw new Error("No se pudo encontrar una fila de cabeceras válida. Asegúrate de que el archivo CSV contiene columnas como 'Símbolo' y 'Cantidad'.");
            }

            const findHeaderIndex = (aliases: string[]): number => {
                for (const alias of aliases) {
                    const index = headers.indexOf(alias);
                    if (index !== -1) return index;
                }
                return -1;
            };

            const symbolIdx = findHeaderIndex(headerMappings.symbol);
            const nameIdx = findHeaderIndex(headerMappings.name);
            const quantityIdx = findHeaderIndex(headerMappings.quantity);
            const priceIdx = findHeaderIndex(headerMappings.price);
            const dateIdx = findHeaderIndex(headerMappings.date);

            const missingHeaders = [];
            if (symbolIdx === -1) missingHeaders.push('Símbolo/Ticker');
            if (nameIdx === -1) missingHeaders.push('Descripción/Nombre');
            if (quantityIdx === -1) missingHeaders.push('Cantidad');
            if (priceIdx === -1) missingHeaders.push('Precio');

            if (missingHeaders.length > 0) {
                throw new Error(`El archivo CSV no tiene el formato esperado. Faltan las siguientes cabeceras: ${missingHeaders.join(', ')}.`);
            }

            const rows = allLines.slice(headerRowIndex + 1);
            
            const parsedRows: any[] = [];
            const failedRows: any[] = [];
            
            rows.forEach((row, index) => {
                const values = parseCsvRow(row);
                if (values.length < headers.length * 0.7) return; // Skip malformed/summary lines

                const rowData = {
                    ticker: values[symbolIdx],
                    name: values[nameIdx],
                    quantity: parseInvestingNumber(values[quantityIdx] ?? '0'),
                    purchasePrice: parseInvestingNumber(values[priceIdx] ?? '0'),
                    purchaseDate: dateIdx !== -1 && values[dateIdx] ? parseInvestingDate(values[dateIdx]) : new Date().toISOString().split('T')[0],
                    originalRow: index + headerRowIndex + 2
                };

                if (rowData.ticker && !isNaN(rowData.quantity) && rowData.quantity > 0 && !isNaN(rowData.purchasePrice)) {
                    parsedRows.push(rowData);
                } else {
                    failedRows.push(rowData);
                }
            });
            
            if(parsedRows.length === 0){
                throw new Error("No se encontraron registros de activos válidos en el archivo después de la fila de cabeceras.");
            }

            setImportStatus(`Encontrados ${parsedRows.length} registros válidos. Obteniendo tipos de activos... (esto puede tardar)`);

            const uniqueTickers = [...new Set(parsedRows.map(r => r.ticker))];
            const assetTypeMap = new Map<string, 'stock' | 'crypto'>();
            
            const tickerPromises = uniqueTickers.map(async (ticker) => {
                try {
                    const { data, usage } = await getAssetInfo(String(ticker), currentEngine);
                    if (usage.totalTokens > 0) onTokenUsage({ ...usage, model: currentEngine });
                    if (data && data.length > 0) {
                        const match = data.find(d => d.ticker.toLowerCase() === String(ticker).toLowerCase()) || data[0];
                        assetTypeMap.set(String(ticker), match.type);
                    }
                } catch (e) {
                    console.warn(`No se pudo obtener información para el ticker ${ticker}`, e);
                }
            });
            await Promise.all(tickerPromises);

            const importedItems: PortfolioItem[] = parsedRows.map(row => {
                const type = assetTypeMap.get(row.ticker);
                if (!type) return null; // Ticker not found by API, will be skipped
                return { ...row, type };
            }).filter((item): item is PortfolioItem => item !== null);

            const totalSkipped = failedRows.length + (parsedRows.length - importedItems.length);

            let successMessage = `¡Éxito! ${importedItems.length} registros importados.`;
            if (totalSkipped > 0) {
                successMessage += ` ${totalSkipped} registros fueron omitidos por datos inválidos o tickers no encontrados.`;
            }
            setImportStatus(successMessage);
            
            if (importedItems.length > 0) {
                 onImportPortfolio(importedItems, importFile?.name.replace(/\.csv$/i, '') || 'Cartera Importada');
            }
            
            setImportFile(null);
            if(fileInputRef.current) fileInputRef.current.value = "";
            setTimeout(() => setActiveView('portfolio'), 1500);

        } catch (e) {
            let msg = 'Error desconocido durante la importación.';
            if (e instanceof DOMException && e.name === 'NotReadableError') {
                 msg = 'No se pudo leer el archivo. Por favor, selecciónalo de nuevo y asegúrate de que no ha sido movido o sus permisos no han cambiado.';
            } else if (e instanceof Error) {
                msg = e.message;
            }
            setImportError(msg);
            
            if (!(e instanceof DOMException && e.name === 'NotReadableError')) {
                 onApiError(e, 'Error de Importación de Cartera', msg);
            }
        } finally {
            setIsImporting(false);
        }
    };


    return (
        <div className="mt-8 p-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg space-y-6 divide-y divide-slate-200 dark:divide-slate-700">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 -mb-3">Configuración</h2>
            
             <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between pt-6">
                <div className="mb-2 sm:mb-0">
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Clave API de Gemini</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                        Introduce tu clave API para usar las funciones de IA. Si eres el desarrollador, puedes escribir "ok" para usar la clave de desarrollo.
                    </p>
                </div>
                <div className="flex-shrink-0 sm:w-96 text-right">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-grow">
                            <input
                                type={showApiKey ? "text" : "password"}
                                value={keyInput}
                                onChange={(e) => setKeyInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
                                placeholder="AIza..."
                                className="h-11 w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800 transition bg-white dark:bg-slate-900 dark:border-slate-600"
                                aria-label="Clave API de Gemini"
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                title={showApiKey ? "Ocultar clave" : "Mostrar clave"}
                            >
                                <i className={`fas ${showApiKey ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={handleSaveApiKey}
                            className="h-11 px-4 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 active:bg-slate-900 transition dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300"
                        >
                            Guardar
                        </button>
                    </div>
                     {saveMessage && <p className="text-sm text-green-600 dark:text-green-400 mt-2 text-right">{saveMessage}</p>}
                </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-6">
                <div className="mb-2 sm:mb-0">
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Motor de Inteligencia Artificial</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Selecciona el modelo de IA para realizar los análisis.</p>
                </div>
                <EngineSelector
                    availableEngines={availableEngines}
                    currentEngine={currentEngine}
                    onEngineChange={onEngineChange}
                    isApiBlocked={isApiBlocked}
                    isBusy={isBusy}
                />
            </div>

             <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between pt-6">
                <div className="mb-3 sm:mb-0">
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Importar Cartera (CSV)</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                        Importa tu cartera desde un archivo CSV con el formato de Investing.com. Los activos se añadirán o se combinarán con tu cartera actual.
                    </p>
                </div>
                <div className="flex-shrink-0 sm:w-96 text-right space-y-2">
                    <div className="flex items-center gap-2">
                         <label className="flex-grow">
                            <span className="sr-only">Elegir archivo CSV</span>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                ref={fileInputRef}
                                className="block w-full text-sm text-slate-500 dark:text-slate-400
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-lg file:border-0
                                file:text-sm file:font-semibold
                                file:bg-slate-100 file:text-slate-700
                                hover:file:bg-slate-200
                                dark:file:bg-slate-700 dark:file:text-slate-300 dark:hover:file:bg-slate-600
                                file:cursor-pointer"
                                disabled={isImporting}
                            />
                        </label>
                        <button
                            type="button"
                            onClick={handleImportPortfolio}
                            disabled={!importFile || isImporting || isApiBlocked}
                            className="h-11 w-32 flex items-center justify-center bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 active:bg-slate-900 transition dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300 disabled:bg-slate-400"
                        >
                            {isImporting ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="http://www.w3.org/2000/svg"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> : "Importar"}
                        </button>
                    </div>
                     {importStatus && <p className="text-sm text-green-600 dark:text-green-400 text-right">{importStatus}</p>}
                     {importError && <p className="text-sm text-red-600 dark:text-red-500 text-right">{importError}</p>}
                </div>
            </div>
            
            <div className="pt-6">
                 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div className="mb-3 sm:mb-0">
                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Contabilidad de Tokens</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Historial de consumo de la API y coste estimado.</p>
                    </div>
                     <button
                        type="button"
                        onClick={onClearAccountingHistory}
                        disabled={tokenUsageHistory.length === 0}
                        className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 active:bg-slate-300 transition text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                    >
                        <i className="fas fa-broom"></i>
                        <span>Limpiar Historial</span>
                    </button>
                </div>
                <TokenAccountingTable history={tokenUsageHistory} currency={currency} />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-6">
                <div className="mb-3 sm:mb-0">
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Política de Cookies y Privacidad</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Consulta los detalles sobre cómo gestionamos los datos.</p>
                </div>
                <button
                    type="button"
                    onClick={() => setActiveView('cookie-policy')}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 active:bg-slate-300 transition text-sm flex items-center justify-center gap-2 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                >
                    <i className="fas fa-cookie-bite"></i>
                    <span>Ver Política de Cookies</span>
                </button>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-6">
                <div className="mb-3 sm:mb-0">
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Gestión de Datos</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Borra todos los datos almacenados en tu navegador.</p>
                </div>
                <button
                    type="button"
                    onClick={onClearAllData}
                    className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 active:bg-red-800 transition text-sm flex items-center justify-center gap-2"
                >
                    <i className="fas fa-eraser"></i>
                    <span>Borrar todos los datos locales</span>
                </button>
            </div>

        </div>
    );
};