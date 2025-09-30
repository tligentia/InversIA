import React, { useMemo } from 'react';
import {
    ResponsiveContainer,
    ComposedChart,
    BarChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Bar,
    Line,
    Cell,
    Brush,
    Legend
} from 'recharts';
import type { StockData, Currency } from '../types';

// SMA calculation utility
const calculateSMA = (data: StockData[], period: number): (number | null)[] => {
    if (period <= 0 || data.length < period) return Array(data.length).fill(null);

    const sma: (number | null)[] = Array(data.length).fill(null);
    let sum = 0;

    // Initial sum for the first window
    for (let i = 0; i < period; i++) {
        sum += data[i].close;
    }
    sma[period - 1] = sum / period;

    // Efficiently calculate subsequent SMAs
    for (let i = period; i < data.length; i++) {
        sum = sum - data[i - period].close + data[i].close;
        sma[i] = sum / period;
    }
    return sma;
};

// Custom Tooltip with more details
const CustomTooltip = ({ active, payload, label, currency }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const isUp = data.close >= data.open;
        const colorClass = isUp ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500';
        const currencyFormatter = (value: number) => value.toLocaleString('es-ES', { style: 'currency', currency: currency, minimumFractionDigits: 2, maximumFractionDigits: 4 });
        
        return (
            <div className="p-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg text-sm">
                <p className="font-bold text-slate-800 dark:text-slate-200">{label}</p>
                <div className={`grid grid-cols-2 gap-x-3 gap-y-1 mt-1 ${colorClass}`}>
                    <span className="font-semibold">Apertura:</span><span>{currencyFormatter(data.open)}</span>
                    <span className="font-semibold">Cierre:</span><span>{currencyFormatter(data.close)}</span>
                    <span className="font-semibold">Máximo:</span><span>{currencyFormatter(data.high)}</span>
                    <span className="font-semibold">Mínimo:</span><span>{currencyFormatter(data.low)}</span>
                </div>
                {data.sma20 && <p className="text-xs text-orange-500 mt-1">SMA 20: {currencyFormatter(data.sma20)}</p>}
                {data.sma50 && <p className="text-xs text-blue-500">SMA 50: {currencyFormatter(data.sma50)}</p>}
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 border-t border-slate-200 dark:border-slate-700 pt-1">Volumen: {data.volume.toLocaleString()}</p>
            </div>
        );
    }
    return null;
};

// Custom shape for the candlestick body
const CandlestickBody = (props: any) => {
    const { x, y, width, height, payload } = props;
    if (height === 0) return null; // Don't render flat candles
    const isUp = payload.close >= payload.open;
    const color = isUp ? '#16a34a' : '#dc2626';
    return <rect x={x} y={y} width={width} height={Math.max(1, height)} fill={color} />; // Ensure min height of 1px
};

interface CandlestickChartProps {
    data: StockData[];
    currency: Currency;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({ data, currency }) => {
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];
        const sma20 = calculateSMA(data, 20);
        const sma50 = calculateSMA(data, 50);
        return data.map((d, i) => ({
            ...d,
            wick: [d.low, d.high],
            body: d.open > d.close ? [d.close, d.open] : [d.open, d.close],
            sma20: sma20[i],
            sma50: sma50[i],
        }));
    }, [data]);

    if (chartData.length === 0) {
        return <div className="h-[550px] flex items-center justify-center text-center p-8 text-slate-500">No hay datos disponibles para mostrar el gráfico.</div>;
    }

    const domainMin = Math.min(...chartData.map(d => d.low)) * 0.98;
    const domainMax = Math.max(...chartData.map(d => d.high)) * 1.02;
    const volumeMax = Math.max(...chartData.map(d => d.volume)) * 1.1;

    return (
        <div className="w-full h-[550px]">
            <ResponsiveContainer width="100%" height="70%">
                <ComposedChart
                    data={chartData}
                    margin={{ top: 20, right: 20, bottom: 0, left: 20 }}
                    syncId="stockChart"
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis
                        orientation="right"
                        domain={[domainMin, domainMax]}
                        tickFormatter={(value) => value.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                        tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip currency={currency} />} />
                    <Legend />
                    
                    <Bar dataKey="wick" fill="#64748b" barSize={1} isAnimationActive={false} />
                    <Bar dataKey="body" shape={<CandlestickBody />} isAnimationActive={false} />

                    {chartData.some(d => d.sma20) && <Line type="monotone" dataKey="sma20" name="SMA 20" stroke="#f97316" strokeWidth={2} dot={false} isAnimationActive={false} />}
                    {chartData.some(d => d.sma50) && <Line type="monotone" dataKey="sma50" name="SMA 50" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />}
                </ComposedChart>
            </ResponsiveContainer>
            
            <ResponsiveContainer width="100%" height="30%">
                <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 20, bottom: 20, left: 20 }}
                    syncId="stockChart"
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis
                        orientation="right"
                        domain={[0, volumeMax]}
                        tickFormatter={(value) => `${(value / 1e6).toFixed(1)}M`}
                        tick={{ fontSize: 12 }}
                    />
                     <Tooltip wrapperStyle={{ display: 'none' }} />
                    <Bar dataKey="volume" name="Volumen" isAnimationActive={false}>
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.close >= entry.open ? 'rgba(22, 163, 74, 0.5)' : 'rgba(220, 38, 38, 0.5)'} />
                        ))}
                    </Bar>
                    <Brush dataKey="date" height={30} stroke="#8884d8" y={0} travellerWidth={20} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};