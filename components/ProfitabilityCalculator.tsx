

import React, { useState, useCallback, useEffect } from 'react';
import type { Asset, CalculatorState, Currency } from '../types';
import { getAssetPriceOnDate, getAssetFuturePricePrediction } from '../services/geminiService';
import { AnomalousPriceError } from '../types';

interface ProfitabilityCalculatorProps {
    asset: Asset;
    currentPrice: number | null;
    currentEngine: string;
    onTokenUsage: (usage: { promptTokens: number; candidateTokens: number; totalTokens: number; model: string; }) => void;
    onApiError: (e: unknown, title: string, message: string) => void;
    initialState: CalculatorState;
    onStateChange: (newState: CalculatorState) => void;
    currency: Currency;
}

interface CalculationResult {
    initialValue: number;
    finalValue: number;
    nominalProfit: number;
    nominalRoi: number;
    realProfit: number;
    realRoi: number;
    startPrice: number;
    endPrice: number;
    shares: number;
    inflationUsed: number;
    annualizedNominalRoi: number;
    annualizedRealRoi: number;
}

export const ProfitabilityCalculator: React.FC<ProfitabilityCalculatorProps> = ({
    asset,
    currentPrice,
    currentEngine,
    onTokenUsage,
    onApiError,
    initialState,
    onStateChange,
    currency
}) => {
    const [result, setResult] = useState<CalculationResult | null>(null);
    const [isFetchingPrices, setIsFetchingPrices] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setResult(null);
        setError(null);
    }, [asset.ticker, currency]);

    const {
        investment,
        startDate,
        endDate,
        startPriceInput,
        endPriceInput,
        inflationRate
    } = initialState;

    const handleChange = (field: keyof CalculatorState, value: string) => {
        onStateChange({ ...initialState, [field]: value });
    };

    const handleFetchPrices = async () => {
        setIsFetchingPrices(true);
        setError(null);
        setResult(null);
        try {
            if (!startDate || !endDate || new Date(startDate) >= new Date(endDate)) {
                throw new Error('Por favor, selecciona un rango de fechas válido.');
            }

            const todayStr = new Date().toISOString().split('T')[0];
            
            const startPricePromise = startDate > todayStr
                ? getAssetFuturePricePrediction(asset, startDate, currentEngine, currency)
                : getAssetPriceOnDate(asset, startDate, currentEngine, currentPrice, currency);

            const endPricePromise = endDate > todayStr
                ? getAssetFuturePricePrediction(asset, endDate, currentEngine, currency)
                : getAssetPriceOnDate(asset, endDate, currentEngine, currentPrice, currency);
            
            const [startPriceResponse, endPriceResponse] = await Promise.all([
                startPricePromise,
                endPricePromise
            ]);

            const combinedUsage = {
                promptTokens: (startPriceResponse?.usage.promptTokens ?? 0) + (endPriceResponse?.usage.promptTokens ?? 0),
                candidateTokens: (startPriceResponse?.usage.candidateTokens ?? 0) + (endPriceResponse?.usage.candidateTokens ?? 0),
                totalTokens: (startPriceResponse?.usage.totalTokens ?? 0) + (endPriceResponse?.usage.totalTokens ?? 0),
            };

            if (combinedUsage.totalTokens > 0) {
                onTokenUsage({ ...combinedUsage, model: currentEngine });
            }
            
            const fetchedStartPrice = startPriceResponse?.data?.price;
            const fetchedEndPrice = endPriceResponse?.data?.price;

            if (fetchedStartPrice === null || fetchedStartPrice === undefined || fetchedStartPrice <= 0) {
                throw new Error(`No se pudo obtener el precio para la fecha de inicio (${startDate}).`);
            }
             if (fetchedEndPrice === null || fetchedEndPrice === undefined) {
                throw new Error(`No se pudo obtener el precio para la fecha de fin (${endDate}).`);
            }
            
            onStateChange({
                ...initialState,
                startPriceInput: fetchedStartPrice.toString(),
                endPriceInput: fetchedEndPrice.toString()
            });

        } catch (e) {
            if (e instanceof AnomalousPriceError) {
                const updatedState = { ...initialState };
                if (e.message.includes(startDate)) {
                    updatedState.startPriceInput = e.price.toString();
                } else {
                    updatedState.endPriceInput = e.price.toString();
                }
                onStateChange(updatedState);
                setError(e.message);
            } else {
                const errorMessage = e instanceof Error ? e.message : 'Ocurrió un error al obtener los precios.';
                setError(errorMessage);
                onApiError(e, 'Error en Obtención de Precios', errorMessage);
            }
        } finally {
            setIsFetchingPrices(false);
        }
    };

    const handleCalculate = useCallback(() => {
        setIsCalculating(true);
        setError(null);
        setResult(null);

        const investmentAmount = parseFloat(investment);
        const inflation = parseFloat(inflationRate);
        const startPrice = parseFloat(startPriceInput);
        const endPrice = parseFloat(endPriceInput);

        if (isNaN(investmentAmount) || investmentAmount <= 0) {
            setError('Por favor, introduce un importe de inversión válido.');
            setIsCalculating(false);
            return;
        }
        if (isNaN(inflation) || inflation < 0) {
            setError('Por favor, introduce una tasa de inflación válida.');
            setIsCalculating(false);
            return;
        }
        if (isNaN(startPrice) || startPrice <= 0) {
            setError('Introduce un precio inicial válido.');
            setIsCalculating(false);
            return;
        }
        if (isNaN(endPrice) || endPrice < 0) {
            setError('Introduce un precio final válido.');
            setIsCalculating(false);
            return;
        }
        
        try {
            const shares = investmentAmount / startPrice;
            const finalValue = shares * endPrice;
            const nominalProfit = finalValue - investmentAmount;
            const nominalRoi = (nominalProfit / investmentAmount) * 100;
            
            const start = new Date(startDate);
            const end = new Date(endDate);
            const days = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 3600 * 24));
            const years = days / 365.25;

            const inflationAdjustedInitialValue = investmentAmount * Math.pow((1 + inflation / 100), years);
            const realProfit = finalValue - inflationAdjustedInitialValue;
            const realRoi = inflationAdjustedInitialValue > 0 ? (realProfit / inflationAdjustedInitialValue) * 100 : 0;
            
            const annualizedNominalRoi = years > 0 ? (Math.pow(finalValue / investmentAmount, 1 / years) - 1) * 100 : nominalRoi;
            const annualizedRealRoi = years > 0 ? (Math.pow(finalValue / inflationAdjustedInitialValue, 1 / years) - 1) * 100 : realRoi;

            setResult({
                initialValue: investmentAmount,
                finalValue,
                nominalProfit,
                nominalRoi,
                realProfit,
                realRoi,
                startPrice,
                endPrice,
                shares,
                inflationUsed: inflation,
                annualizedNominalRoi,
                annualizedRealRoi,
            });

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Ocurrió un error al calcular la rentabilidad.';
            setError(errorMessage);
            onApiError(e, 'Error en Calculadora de Rentabilidad', errorMessage);
        } finally {
            setIsCalculating(false);
        }
    }, [
        investment, inflationRate, startPriceInput, endPriceInput, startDate, endDate, onApiError
    ]);

    const inputClasses = "h-10 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-800 transition bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200 dark:focus:ring-slate-200";
    const labelClasses = "text-sm font-medium text-slate-600 dark:text-slate-300 mb-1";
    const currencyFormatter = (value: number) => value.toLocaleString('es-ES', { style: 'currency', currency: currency });

    return (
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Calculadora de Rentabilidad de {asset.name}</h3>
            
            <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-1 flex flex-col">
                        <label htmlFor="investment" className={labelClasses}>{`Inversión (${currency})`}</label>
                        <input type="number" id="investment" value={investment} onChange={(e) => handleChange('investment', e.target.value)} placeholder="Ej: 1000" className={inputClasses} />
                    </div>
                     <div className="sm:col-span-1 flex flex-col">
                        <label htmlFor="inflation" className={labelClasses}>Inflación Anual (%)</label>
                        <input type="number" id="inflation" value={inflationRate} onChange={(e) => handleChange('inflationRate', e.target.value)} placeholder="Ej: 3" className={inputClasses} />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div className="flex flex-col">
                        <label htmlFor="start-date" className={labelClasses}>Fecha Inicio</label>
                        <input type="date" id="start-date" value={startDate} onChange={(e) => handleChange('startDate', e.target.value)} className={inputClasses} />
                    </div>
                    <div className="flex flex-col">
                        <label htmlFor="end-date" className={labelClasses}>Fecha Fin</label>
                        <input type="date" id="end-date" value={endDate} onChange={(e) => handleChange('endDate', e.target.value)} className={inputClasses} />
                    </div>
                     <button
                        type="button"
                        onClick={handleFetchPrices}
                        disabled={isFetchingPrices || isCalculating}
                        className="h-10 w-full flex items-center justify-center bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 active:bg-slate-300 transition disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed border border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 dark:border-slate-600 dark:disabled:bg-slate-700/50"
                    >
                        {isFetchingPrices ? (
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="http://www.w3.org/2000/svg"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            <><i className="fas fa-download mr-2"></i>Obtener Precios</>
                        )}
                    </button>
                </div>

                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div className="flex flex-col">
                        <label htmlFor="start-price" className={labelClasses}>{`Precio Inicial (${currency})`}</label>
                        <input type="number" id="start-price" value={startPriceInput} onChange={(e) => handleChange('startPriceInput', e.target.value)} placeholder="Precio de compra" className={inputClasses} />
                    </div>
                    <div className="flex flex-col">
                        <label htmlFor="end-price" className={labelClasses}>{`Precio Final (${currency})`}</label>
                        <input type="number" id="end-price" value={endPriceInput} onChange={(e) => handleChange('endPriceInput', e.target.value)} placeholder="Precio de venta" className={inputClasses} />
                    </div>
                    <button
                        type="button"
                        onClick={handleCalculate}
                        disabled={isCalculating || isFetchingPrices || !startPriceInput || !endPriceInput}
                        className="h-10 w-full flex items-center justify-center bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 active:bg-slate-900 transition disabled:bg-slate-400 disabled:cursor-not-allowed dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300 dark:active:bg-slate-400"
                    >
                        {isCalculating ? (
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="http://www.w3.org/2000/svg"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            <><i className="fas fa-calculator mr-2"></i>Calcular</>
                        )}
                    </button>
                </div>
            </div>
            
            {error && <p className="text-red-600 dark:text-red-500 mt-4 text-center font-semibold bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-500/30">{error}</p>}
            
            {result && !isCalculating && (
                <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200 text-center mb-4">Resultado de la Inversión</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-2 text-center">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Ganancia/Pérdida Total</p>
                            <p className={`font-bold text-xl ${result.nominalProfit >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                                {currencyFormatter(result.nominalProfit)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Rentabilidad Total (ROI)</p>
                            <p className={`font-bold text-xl ${result.nominalRoi >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                                {result.nominalRoi.toFixed(2)}%
                            </p>
                        </div>
                         <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Rentabilidad Anual (TIR)</p>
                             <p className={`font-bold text-xl ${result.annualizedNominalRoi >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                                {result.annualizedNominalRoi.toFixed(2)}%
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Valor Final Estimado</p>
                            <p className="font-bold text-xl text-slate-900 dark:text-slate-100">{currencyFormatter(result.finalValue)}</p>
                        </div>
                         <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">ROI Real (vs Inflación)</p>
                             <p className={`font-bold text-xl ${result.realRoi >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                                {result.realRoi.toFixed(2)}%
                            </p>
                        </div>
                         <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">ROI Real Anualizado</p>
                             <p className={`font-bold text-xl ${result.annualizedRealRoi >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                                {result.annualizedRealRoi.toFixed(2)}%
                            </p>
                        </div>
                    </div>
                     <div className="text-xs text-slate-500 dark:text-slate-400 text-center mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        Inversión de {currencyFormatter(result.initialValue)} (~{result.shares.toFixed(4)} uds) entre el {startDate} y el {endDate}. Precio inicial: {currencyFormatter(result.startPrice)}, final: {currencyFormatter(result.endPrice)}. Inflación anual considerada: {result.inflationUsed}%.
                    </div>
                </div>
            )}
        </div>
    );
};