
import { CONVERSION_RATES } from '../constants';
import type { Currency } from '../types';

/**
 * Convierte un valor monetario de una divisa a otra.
 * Utiliza USD como divisa base intermedia.
 */
export function convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: Currency
): number {
    if (!amount) return 0;
    
    // Normalizar códigos de divisa
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    if (from === to) return amount;

    // Obtener tasas (asegurando fallback a 1 si no existe, aunque debería existir)
    const fromRate = CONVERSION_RATES[from] || 1; // Rate to convert 1 USD to FromCurrency
    const toRate = CONVERSION_RATES[to] || 1;     // Rate to convert 1 USD to ToCurrency

    // Lógica: 
    // 1. Convertir 'amount' (en 'from') a USD.
    //    Si 1 USD = fromRate, entonces amount / fromRate = valor en USD.
    const amountInUSD = amount / fromRate;

    // 2. Convertir USD a 'to'.
    //    valor en USD * toRate = valor en 'to'.
    return amountInUSD * toRate;
}

/**
 * Formatea un número como moneda con la precisión adecuada según si es Crypto o Fiat.
 */
export function formatCurrency(value: number, currency: Currency): string {
    const isCrypto = currency === 'BTC';
    
    return value.toLocaleString('es-ES', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: isCrypto ? 6 : 2,
        maximumFractionDigits: isCrypto ? 8 : 2,
    });
}
