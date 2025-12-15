export class QuotaExceededError extends Error {
    engine: string;
    constructor(message: string, engine: string) {
        super(message);
        this.name = 'QuotaExceededError';
        this.engine = engine;
    }
}

export class ApiKeyNotSetError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ApiKeyNotSetError';
    }
}

export class AnomalousPriceError extends Error {
    price: number;
    constructor(message: string, price: number) {
        super(message);
        this.name = 'AnomalousPriceError';
        this.price = price;
    }
}

export interface Asset {
    name: string;
    ticker: string;
    type: 'stock' | 'crypto';
    description?: string;
    currentPrice?: number;
    change?: number;
    investingUrl?: string;
}

export interface Source {
    uri: string;
    title: string;
}

export interface AnalysisContent {
    summary: string;
    fullText: string;
    sentiment: number;
    limitBuyPrice?: number;
    currency?: string; // New field to track the currency of the limitBuyPrice
}

export interface AiAnswer {
    summary:string;
    fullText: string;
    sources?: Source[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: Source[];
  requiresWebSearch?: boolean;
  isError?: boolean;
}

export interface AnalysisVector {
    title:string;
    content: AnalysisContent | null;
    isLoading: boolean;
    error: string | null;
    sources?: Source[];
    isCustom?: boolean;
    isIncludedInGlobal?: boolean;
}

export interface HistoryItem {
    name: string;
    ticker: string;
    type: 'stock' | 'crypto';
    lastClose: number;
    change: number;
    changePercentage: number;
    date: string;
    sentiment: number;
}

export interface GlobalAnalysisState {
    content: AnalysisContent | null;
    isLoading: boolean;
    error: string | null;
    sources?: Source[];
    calculatedWithVectorCount?: number;
}

export interface AppError {
    title: string;
    message: string;
}

export interface ReportData {
    asset: Asset;
    globalAnalysis: GlobalAnalysisState;
    analyses: AnalysisVector[];
}

export type View = 'analysis' | 'market' | 'portfolio' | 'calculator' | 'alternatives' | 'chat' | 'history' | 'settings' | 'cookie-policy' | 'charts';
export type Theme = 'light' | 'dark' | 'system';
export type Currency = 'EUR' | 'USD' | 'GBP' | 'JPY' | 'BTC';

// FIX: Add missing Period type definition for chart period selection.
export type Period = '1D' | '1W' | '1M' | 'YTD' | '1Y' | '2Y' | '5Y';

// FIX: Add missing StockData interface definition for charting components.
export interface StockData {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface CalculatorState {
    investment: string;
    startDate: string;
    endDate: string;
    startPriceInput: string;
    endPriceInput: string;
    inflationRate: string;
    limitBuyPrice?: string;
}

export interface AnalysisSession {
    id: string;
    asset: Asset;
    isInitializing: boolean;
    initializationError?: string | null;
    currentPrice: number | null;
    changeValue: number | null;
    changePercentage: number | null;
    analysisVectors: AnalysisVector[];
    globalAnalysis: GlobalAnalysisState;
    alternativeAssets: Asset[];
    isLoadingAlternatives: boolean;
    haveAlternativesBeenFetched: boolean;
    isAnalyzingAll: boolean;
    chatHistory: ChatMessage[];
    calculatorState?: CalculatorState;
}

export interface MarketAssetMetric {
  name: string;
  ticker: string;
  marketCap: string;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  peRatio: number;
  eps: number; // Corresponds to BPA
  dividendYield: number; // Percentage
}

export interface SectorAverage {
  marketCap: string;
  averagePeRatio: number;
  averageEps: number;
  averageDividendYield: number; // Percentage
}

export interface MarketAnalysisResult {
  title: string;
  assets: MarketAssetMetric[];
  sectorAverage: SectorAverage;
}

export interface MarketAnalysisResultWithCriterion extends MarketAnalysisResult {
  criterion: string;
}

export interface MarketAnalysisState {
    results: Record<string, MarketAnalysisResultWithCriterion[]>;
    isLoading: boolean;
    error: string | null;
    openSectors: string[];
}

export interface PortfolioItem {
    ticker: string;
    name: string;
    type: 'stock' | 'crypto';
    quantity: number;
    purchasePrice: number;
    purchaseDate: string;
}

export interface Portfolio {
    id: string;
    name: string;
    items: PortfolioItem[];
}

export interface PortfolioItemWithMarketData extends PortfolioItem {
    currentPrice: number | null;
    marketValue: number | null;
    gainLoss: number | null;
    gainLossPercentage: number | null;
}

export interface TokenUsageRecord {
    timestamp: number;
    tokens: number;
    cost: number; // in USD
    model: string;
    view: View;
}