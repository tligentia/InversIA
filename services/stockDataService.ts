import type { StockData, Period, Asset } from '../types';

function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function generateAssetData(period: Period, type: Asset['type'], initialPrice: number): StockData[] {
    const data: StockData[] = [];
    const now = new Date();
    let days: number;
    let baseVolatility: number;
    
    switch (period) {
        case '1D': days = 1; baseVolatility = 0.005; break;
        case '1W': days = 7; baseVolatility = 0.01; break;
        case '1M': days = 30; baseVolatility = 0.015; break;
        case 'YTD':
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            days = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
            baseVolatility = 0.02;
            break;
        case '1Y': days = 365; baseVolatility = 0.02; break;
        case '2Y': days = 365 * 2; baseVolatility = 0.022; break;
        case '5Y': days = 365 * 5; baseVolatility = 0.025; break;
        default: days = 365; baseVolatility = 0.02;
    }

    const volatility = type === 'crypto' ? baseVolatility * 2.5 : baseVolatility;
    let lastClose = initialPrice;

    // Generate historical data backwards from the last close price
    const historicalData: StockData[] = [];
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - (days - 1 - i));
        
        const open = lastClose / (1 + (Math.random() - 0.5) * volatility);
        const high = Math.max(open, lastClose) * (1 + Math.random() * (volatility / 2));
        const low = Math.min(open, lastClose) * (1 - Math.random() * (volatility / 2));
        const volume = (Math.floor(Math.random() * 5000000) + 1000000) * (type === 'crypto' ? 5 : 1);

        historicalData.unshift({
            date: formatDate(date),
            open: parseFloat(open.toFixed(2)),
            high: parseFloat(high.toFixed(2)),
            low: parseFloat(low.toFixed(2)),
            close: parseFloat(lastClose.toFixed(2)),
            volume,
        });
        
        lastClose = open;
    }
    
    // Ensure the last entry matches the initial price
    if(historicalData.length > 0) {
        const lastEntry = historicalData[historicalData.length - 1];
        const secondToLast = historicalData.length > 1 ? historicalData[historicalData.length-2] : lastEntry;
        
        lastEntry.close = parseFloat(initialPrice.toFixed(2));
        lastEntry.open = parseFloat(secondToLast.close.toFixed(2));
        lastEntry.high = Math.max(lastEntry.open, lastEntry.close);
        lastEntry.low = Math.min(lastEntry.open, lastEntry.close);
    }


    return historicalData;
}
