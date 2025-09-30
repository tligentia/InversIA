import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Portfolio, PortfolioItem, Currency, Asset, PortfolioItemWithMarketData } from '../types';
import { getAssetQuote, getAssetInfo } from '../services/geminiService';
import { InputDialog } from '../components/InputDialog';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface PortfolioViewProps {
    portfolios: Portfolio[];
    activePortfolio: Portfolio | undefined;
    activePortfolioId: string | null;
    setActivePortfolioId: (id: string | null) => void;
    currency: Currency;
    currentEngine: string;
    onTokenUsage: (usage: { promptTokens: number; candidateTokens: number; totalTokens: number; model: string; }) => void;
    onApiError: (e: unknown, title: string, message: string) => void;
    onSelectAsset: (asset: Asset) => void;
    isApiBlocked: boolean;
    assetForPortfolio: { asset: Asset; price: number | null } | null;
    onClearAssetForPortfolio: () => void;
    onNewPortfolio: (name: string) => void;
    onRenamePortfolio: (id: string, newName: string) => void;
    onDeletePortfolio: (id: string) => void;
    onAddAsset: (portfolioId: string, assetInfo: { ticker: string, name: string, type: 'stock' | 'crypto' }, quantity: number, purchasePrice: number, purchaseDate: string) => void;
    onRemoveAsset: (portfolioId: string, ticker: string) => void;
}

const COLORS = ['#3b82f6', '#16a34a', '#ef4444', '#f97316', '#8b5cf6', '#eab308', '#14b8a6', '#64748b'];

export const PortfolioView: React.FC<PortfolioViewProps> = ({
    portfolios,
    activePortfolio,
    activePortfolioId,
    setActivePortfolioId,
    currency,
    currentEngine,
    onTokenUsage,
    onApiError,
    onSelectAsset,
    isApiBlocked,
    assetForPortfolio,
    onClearAssetForPortfolio,
    onNewPortfolio,
    onRenamePortfolio,
    onDeletePortfolio,
    onAddAsset,
    onRemoveAsset,
}) => {
    const [marketData, setMarketData] = useState<Record<string, number | null>>({});
    const [isLoadingPrices, setIsLoadingPrices] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [grouping, setGrouping] = useState<'all' | 'stock' | 'crypto'>('all');

    // Dialogs state
    const [dialogState, setDialogState] = useState<{
        type: 'new' | 'rename' | 'delete' | null;
        data?: any;
    }>({ type: null });

    // Form state
    const [ticker, setTicker] = useState('');
    const [quantity, setQuantity] = useState('');
    const [purchasePrice, setPurchasePrice] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    
    const quantityInputRef = useRef<HTMLInputElement>(null);
    
    const portfolioItems = useMemo(() => activePortfolio?.items ?? [], [activePortfolio]);


    useEffect(() => {
        if (assetForPortfolio) {
            setTicker(assetForPortfolio.asset.ticker);
            setPurchasePrice(assetForPortfolio.price ? assetForPortfolio.price.toString() : '');
            setQuantity('');
            setPurchaseDate(new Date().toISOString().split('T')[0]);
            quantityInputRef.current?.focus();
            onClearAssetForPortfolio();
        }
    }, [assetForPortfolio, onClearAssetForPortfolio]);

    const fetchPrices = useCallback(async () => {
        if (portfolioItems.length === 0) return;
        setIsLoadingPrices(true);
        const prices: Record<string, number | null> = {};
        const promises = portfolioItems.map(item =>
            getAssetQuote({ name: item.name, ticker: item.ticker, type: item.type }, currentEngine, currency)
                .then(response => {
                    if (response) {
                        onTokenUsage({ ...response.usage, model: currentEngine });
                        prices[item.ticker] = response.data?.price ?? null;
                    } else {
                        prices[item.ticker] = null;
                    }
                })
                .catch(e => {
                    console.error(`Failed to fetch price for ${item.ticker}`, e);
                    prices[item.ticker] = null;
                })
        );
        await Promise.all(promises);
        setMarketData(prices);
        setIsLoadingPrices(false);
    }, [portfolioItems, currency, currentEngine, onTokenUsage]);

    useEffect(() => {
        fetchPrices();
    }, [fetchPrices]);

    const handleAddAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        const numQuantity = parseFloat(quantity);
        const numPurchasePrice = parseFloat(purchasePrice);

        if (!ticker.trim() || !purchaseDate || isNaN(numQuantity) || numQuantity <= 0 || isNaN(numPurchasePrice) || numPurchasePrice < 0) {
            setError('Por favor, completa todos los campos con valores válidos.');
            return;
        }

        setIsAdding(true);
        setError(null);

        try {
            if (!activePortfolioId) {
                throw new Error("No hay una cartera activa seleccionada.");
            }
            const { data: assetInfo, usage } = await getAssetInfo(ticker, currentEngine);
            onTokenUsage({ ...usage, model: currentEngine });

            if (!assetInfo || assetInfo.length === 0) {
                throw new Error(`No se encontró ningún activo con el ticker '${ticker}'.`);
            }

            const asset = assetInfo[0];
            
            onAddAsset(activePortfolioId, { ticker: asset.ticker, name: asset.name, type: asset.type }, numQuantity, numPurchasePrice, purchaseDate);

            setTicker('');
            setQuantity('');
            setPurchasePrice('');
            setPurchaseDate(new Date().toISOString().split('T')[0]);

        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Ocurrió un error al añadir el activo.';
            setError(msg);
            onApiError(err, 'Error al Añadir Activo', msg);
        } finally {
            setIsAdding(false);
        }
    };
    
    const handleRemoveAsset = (tickerToRemove: string) => {
        if (activePortfolioId) {
            onRemoveAsset(activePortfolioId, tickerToRemove);
        }
    };

    const handleNewPortfolio = () => {
        setDialogState({ type: 'new' });
    };

    const handleRenamePortfolio = () => {
        if (activePortfolio) {
            setDialogState({ type: 'rename', data: { id: activePortfolio.id, name: activePortfolio.name } });
        }
    };
    
    const handleDeletePortfolio = () => {
        if (!activePortfolio || portfolios.length <= 1) {
            alert("No puedes eliminar la última cartera.");
            return;
        }
        setDialogState({ type: 'delete', data: { id: activePortfolio.id, name: activePortfolio.name } });
    };
    
    const closeDialogs = () => {
        setDialogState({ type: null });
    };

    const portfolioWithMarketData = useMemo((): PortfolioItemWithMarketData[] => {
        return portfolioItems.map(item => {
            const currentPrice = marketData[item.ticker] ?? null;
            const marketValue = typeof currentPrice === 'number' ? item.quantity * currentPrice : null;
            const costBasis = item.quantity * item.purchasePrice;
            const gainLoss = marketValue !== null ? marketValue - costBasis : null;
            const gainLossPercentage = gainLoss !== null && costBasis > 0 ? (gainLoss / costBasis) * 100 : null;

            return {
                ...item,
                currentPrice,
                marketValue,
                gainLoss,
                gainLossPercentage
            };
        });
    }, [portfolioItems, marketData]);

    const totals = useMemo(() => {
        const initial = { totalValue: 0, totalCost: 0, hasValue: false };
        const result = portfolioWithMarketData.reduce((acc, item) => {
            if (item.marketValue !== null) {
                acc.totalValue += item.marketValue;
                acc.totalCost += item.quantity * item.purchasePrice;
                acc.hasValue = true;
            }
            return acc;
        }, initial);
        
        if (!result.hasValue && portfolioWithMarketData.length > 0) return { totalValue: 0, totalGainLoss: 0, totalGainLossPercentage: 0 };
        if (!result.hasValue) return null;


        const totalGainLoss = result.totalValue - result.totalCost;
        const totalGainLossPercentage = result.totalCost > 0 ? (totalGainLoss / result.totalCost) * 100 : 0;
        
        return {
            totalValue: result.totalValue,
            totalGainLoss,
            totalGainLossPercentage
        };
    }, [portfolioWithMarketData]);
    
    const chartData = useMemo(() => {
        return portfolioWithMarketData
            .filter(item => item.marketValue && item.marketValue > 0)
            .map(item => ({ name: item.name, value: item.marketValue! }))
            .sort((a, b) => b.value - a.value);
    }, [portfolioWithMarketData]);

    const displayedPortfolio = useMemo(() => {
        if (grouping === 'all') {
            return portfolioWithMarketData;
        }
        return portfolioWithMarketData.filter(item => item.type === grouping);
    }, [portfolioWithMarketData, grouping]);

    const currencyFormatter = (value: number) => value.toLocaleString('es-ES', { style: 'currency', currency: currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const FilterButton: React.FC<{ label: string; group: 'all' | 'stock' | 'crypto' }> = ({ label, group }) => (
        <button
            onClick={() => setGrouping(group)}
            className={`px-3 py-1 text-sm font-semibold rounded-md transition ${
                grouping === group
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-6">
             <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-grow">
                    <label htmlFor="portfolio-select" className="text-sm font-bold text-slate-600 dark:text-slate-300 flex-shrink-0">Cartera:</label>
                    <select id="portfolio-select" value={activePortfolioId ?? ''} onChange={e => setActivePortfolioId(e.target.value)} className="h-9 w-full sm:w-auto flex-grow appearance-none rounded-lg border border-slate-300 bg-white py-1 pl-3 pr-8 font-semibold text-slate-700 transition focus:outline-none focus:ring-2 focus:ring-slate-800 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200 dark:focus:ring-slate-200">
                        {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={handleNewPortfolio} className="px-3 py-1.5 text-sm font-semibold rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"><i className="fas fa-plus mr-1.5"></i>Nueva</button>
                    <button onClick={handleRenamePortfolio} disabled={!activePortfolio} className="px-3 py-1.5 text-sm font-semibold rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"><i className="fas fa-pen mr-1.5"></i>Renombrar</button>
                    <button onClick={handleDeletePortfolio} disabled={!activePortfolio || portfolios.length <= 1} className="px-3 py-1.5 text-sm font-semibold rounded-md text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-400 dark:hover:bg-red-900/60 disabled:opacity-50"><i className="fas fa-trash-alt mr-1.5"></i>Eliminar</button>
                </div>
            </div>

            {totals && (
                <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                    <div className="flex justify-between items-center mb-4 flex-wrap gap-y-2">
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Resumen de Cartera</h3>
                        <button
                            type="button"
                            onClick={fetchPrices}
                            disabled={isLoadingPrices || isApiBlocked || portfolioItems.length === 0}
                            className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 active:bg-slate-300 transition text-sm flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed border border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 dark:border-slate-600 dark:disabled:bg-slate-700/50"
                            title="Actualizar precios de mercado"
                        >
                            {isLoadingPrices ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="http://www.w3.org/2000/svg"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    <span>Actualizando...</span>
                                </>
                            ) : (
                                <><i className="fas fa-sync-alt"></i><span>Actualizar Precios</span></>
                            )}
                        </button>
                    </div>
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                        <div className="space-y-4 lg:col-span-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center sm:text-left">
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Valor Total de la Cartera</p>
                                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{currencyFormatter(totals.totalValue)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Ganancia/Pérdida Total</p>
                                    <p className={`text-2xl font-bold ${totals.totalGainLoss >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>{currencyFormatter(totals.totalGainLoss)}</p>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-baseline mb-1">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Indicador de Rendimiento</p>
                                    <p className={`text-lg font-bold ${totals.totalGainLossPercentage >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>{totals.totalGainLossPercentage.toFixed(2)}%</p>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                                    <div 
                                        className={`${totals.totalGainLossPercentage >= 0 ? 'bg-green-500' : 'bg-red-500'} h-2.5 rounded-full transition-all duration-500`}
                                        style={{ width: `${Math.min(Math.abs(totals.totalGainLossPercentage), 100)}%` }}
                                        title={`Rendimiento: ${totals.totalGainLossPercentage.toFixed(2)}%`}
                                    ></div>
                                </div>
                            </div>
                        </div>
                        <div className="h-56 w-full lg:col-span-1">
                             <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                        nameKey="name"
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number) => [currencyFormatter(value), 'Valor']}
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                            backdropFilter: 'blur(5px)',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '0.5rem',
                                        }}
                                        wrapperClassName="dark:!bg-slate-800/80 dark:!border-slate-600"
                                    />
                                    <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: '12px'}} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
             <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold mb-4">Añadir Activo a la Cartera</h3>
                <form onSubmit={handleAddAsset} className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
                    <div className="sm:col-span-1">
                        <label htmlFor="ticker" className="text-sm font-medium text-slate-600 dark:text-slate-300">Ticker</label>
                        <input id="ticker" type="text" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="AAPL, BTC..." className="mt-1 w-full h-10 px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-900 dark:border-slate-600" />
                    </div>
                     <div className="sm:col-span-1">
                        <label htmlFor="quantity" className="text-sm font-medium text-slate-600 dark:text-slate-300">Cantidad</label>
                        <input id="quantity" ref={quantityInputRef} type="number" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="10" className="mt-1 w-full h-10 px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-900 dark:border-slate-600" />
                    </div>
                    <div className="sm:col-span-1">
                        <label htmlFor="purchasePrice" className="text-sm font-medium text-slate-600 dark:text-slate-300">{`Precio Compra (${currency})`}</label>
                        <input id="purchasePrice" type="number" step="any" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} placeholder="150.00" className="mt-1 w-full h-10 px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-900 dark:border-slate-600" />
                    </div>
                     <div className="sm:col-span-1">
                        <label htmlFor="purchaseDate" className="text-sm font-medium text-slate-600 dark:text-slate-300">Fecha Compra</label>
                        <input id="purchaseDate" type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="mt-1 w-full h-10 px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-900 dark:border-slate-600" />
                    </div>
                    <button type="submit" disabled={isAdding || isApiBlocked} className="w-full h-10 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 disabled:bg-slate-400 flex items-center justify-center dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300">
                         {isAdding ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="http://www.w3.org/2000/svg"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> : "Añadir"}
                    </button>
                </form>
                 {error && <p className="mt-3 text-sm text-red-600 text-center">{error}</p>}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-x-auto">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300 mr-2">Agrupar por:</span>
                    <FilterButton label="Todos" group="all" />
                    <FilterButton label="Acciones" group="stock" />
                    <FilterButton label="Criptomonedas" group="crypto" />
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-600 dark:text-slate-400 uppercase">
                        <tr>
                            <th scope="col" className="px-6 py-3">Activo</th>
                            <th scope="col" className="px-6 py-3 text-right">Cantidad</th>
                            <th scope="col" className="px-6 py-3 text-right">Precio Compra</th>
                            <th scope="col" className="px-6 py-3 text-right">Fecha Compra</th>
                            <th scope="col" className="px-6 py-3 text-right">Precio Actual</th>
                            <th scope="col" className="px-6 py-3 text-right">Valor Mercado</th>
                            <th scope="col" className="px-6 py-3 text-right">G/P</th>
                            <th scope="col" className="px-6 py-3 text-right">% G/P</th>
                            <th scope="col" className="px-1 py-3 text-center">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedPortfolio.map(item => (
                             <tr key={item.ticker} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                    <button onClick={() => onSelectAsset(item)} className="hover:underline" title={`Analizar ${item.name}`}>
                                        {item.name} <span className="font-normal text-slate-500">{item.ticker}</span>
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-right">{item.quantity}</td>
                                <td className="px-6 py-4 text-right">{currencyFormatter(item.purchasePrice)}</td>
                                <td className="px-6 py-4 text-right">{new Date(item.purchaseDate).toLocaleDateString('es-ES')}</td>
                                <td className="px-6 py-4 text-right font-semibold">
                                     {item.currentPrice !== null ? currencyFormatter(item.currentPrice) : <span className="text-slate-400">Cargando...</span>}
                                </td>
                                <td className="px-6 py-4 text-right font-semibold">
                                     {item.marketValue !== null ? currencyFormatter(item.marketValue) : <span className="text-slate-400">...</span>}
                                </td>
                                 <td className={`px-6 py-4 text-right font-bold ${item.gainLoss === null ? '' : item.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {item.gainLoss !== null ? currencyFormatter(item.gainLoss) : <span className="text-slate-400 font-normal">...</span>}
                                </td>
                                 <td className={`px-6 py-4 text-right font-bold ${item.gainLossPercentage === null ? '' : item.gainLossPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {item.gainLossPercentage !== null ? `${item.gainLossPercentage.toFixed(2)}%` : <span className="text-slate-400 font-normal">...</span>}
                                </td>
                                <td className="px-1 py-4 text-center">
                                    <button onClick={() => handleRemoveAsset(item.ticker)} className="w-8 h-8 rounded-full text-slate-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50" title="Eliminar activo">
                                        <i className="fas fa-trash-can fa-sm"></i>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {portfolioItems.length === 0 && (
                    <p className="text-center text-slate-500 py-8">Tu cartera está vacía. Añade tu primer activo usando el formulario de arriba.</p>
                )}
                 {portfolioItems.length > 0 && displayedPortfolio.length === 0 && (
                     <p className="text-center text-slate-500 py-8">No hay activos del tipo seleccionado en tu cartera.</p>
                )}
            </div>
            <InputDialog
                isOpen={dialogState.type === 'new' || dialogState.type === 'rename'}
                title={dialogState.type === 'new' ? 'Nueva Cartera' : 'Renombrar Cartera'}
                label="Nombre de la cartera"
                initialValue={dialogState.type === 'rename' ? dialogState.data?.name : `Cartera ${portfolios.length + 1}`}
                confirmText={dialogState.type === 'new' ? 'Crear' : 'Renombrar'}
                onConfirm={(name) => {
                    if (dialogState.type === 'new') {
                        onNewPortfolio(name);
                    } else if (dialogState.type === 'rename' && dialogState.data) {
                        onRenamePortfolio(dialogState.data.id, name);
                    }
                    closeDialogs();
                }}
                onClose={closeDialogs}
            />
            <ConfirmationModal
                isOpen={dialogState.type === 'delete'}
                title="Eliminar Cartera"
                message={`¿Estás seguro de que quieres eliminar la cartera "${dialogState.data?.name}"? Esta acción es irreversible.`}
                onConfirm={() => {
                    if (dialogState.type === 'delete' && dialogState.data) {
                        onDeletePortfolio(dialogState.data.id);
                    }
                    closeDialogs();
                }}
                onClose={closeDialogs}
                confirmText="Eliminar"
            />
        </div>
    );
};