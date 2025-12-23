
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SearchBar } from './components/SearchBar';
import { AssetSelection } from './components/AssetSelection';
import { getAssetInfo, getAvailableTextModels } from './services/geminiService';
import { HistoryItem, AppError, QuotaExceededError, Asset, View, AnalysisSession, Theme, Currency, MarketAnalysisState, TokenUsageRecord } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { ErrorDisplay } from './components/ErrorDisplay';
import { HistoryView } from './views/HistoryView';
import { SettingsView } from './views/SettingsView';
import { AnalysisView } from './views/AnalysisView';
import { CalculatorView } from './views/CalculatorView';
import { AlternativesView } from './views/AlternativesView';
import { ChatView } from './views/ChatView';
import { BottomNavBar } from './components/BottomNavBar';
import { MarketView } from './views/MarketView';
import { PortfolioView } from './views/PortfolioView';
import { CurrencySelector } from './components/CurrencySelector';
import { AssetHeader } from './components/AssetHeader';
import { AssetHeaderSkeleton } from './components/skeletons';
import { Tabs } from './components/Tabs';
import { useCookieConsent } from './context/CookieConsentContext';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { CookieSettingsModal } from './components/CookieSettingsModal';
import { CookiePolicyView } from './views/CookiePolicyView';
import { TOKEN_PRICING_USD, APP_VERSION } from './constants';
import { ChartView } from './views/ChartView';
import { usePortfolios } from './hooks/usePortfolios';
import { AppMenu } from './Plantilla/AppMenu';

// Importaciones de Plantilla
import { Footer as TemplateFooter } from './Plantilla/Footer';
import { Ajustes as AjustesModal } from './Plantilla/Ajustes';
import { Cookies as CookiesModal } from './Plantilla/Cookies';

interface AppProps {
    userIp: string | null;
    theme: Theme;
    onThemeChange: (theme: Theme) => void;
}

const navItems: { view: View; label: string; icon: string }[] = [
    { view: 'market', label: 'Mercado', icon: 'fa-globe' },
    { view: 'analysis', label: 'Análisis', icon: 'fa-chart-pie' },
    { view: 'charts', label: 'Gráficos', icon: 'fa-chart-line' },
    { view: 'portfolio', label: 'Cartera', icon: 'fa-wallet' },
    { view: 'calculator', label: 'Calculadora', icon: 'fa-calculator' },
    { view: 'alternatives', label: 'Alternativos', icon: 'fa-users' },
    { view: 'chat', label: 'Chat IA', icon: 'fa-comments' },
    { view: 'history', label: 'Historial', icon: 'fa-history' },
    { view: 'settings', label: 'Ajustes', icon: 'fa-cog' },
];

export default function App({ userIp, theme, onThemeChange }: AppProps): React.ReactNode {
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [analysisHistory, setAnalysisHistory] = useLocalStorage<HistoryItem[]>('assetAnalysisHistory', []);
    const [currentEngine, setCurrentEngine] = useLocalStorage<string>('selectedAiEngine', 'gemini-3-flash-preview');
    const [availableEngines, setAvailableEngines] = useState<string[]>([]);
    const [tokenUsageHistory, setTokenUsageHistory] = useLocalStorage<TokenUsageRecord[]>('tokenUsageHistory', []);
    const [sessions, setSessions] = useLocalStorage<AnalysisSession[]>('analysisSessions', []);
    const [activeSessionId, setActiveSessionId] = useLocalStorage<string | null>('activeAnalysisSessionId', null);
    const [showAjustesModal, setShowAjustesModal] = useState(false);
    const [showCookiesModal, setShowCookiesModal] = useState(false);

    const {
        portfolios,
        activePortfolio,
        activePortfolioId,
        setActivePortfolioId,
        addPortfolio,
        renamePortfolio,
        deletePortfolio,
        addAssetToPortfolio,
        removeAssetFromPortfolio,
        importAndMergePortfolio,
    } = usePortfolios();

    const [activeView, setActiveView] = useLocalStorage<View>('activeView', 'market');
    const [currency, setCurrency] = useLocalStorage<Currency>('userCurrency', 'EUR');
    const [marketAnalysisState, setMarketAnalysisState] = useState<MarketAnalysisState>({
        results: {},
        isLoading: false,
        error: null,
        openSectors: [],
    });
    const [assetForPortfolio, setAssetForPortfolio] = useState<{ asset: Asset; price: number | null } | null>(null);

    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [error, setError] = useState<AppError | null>(null);
    const [isQuotaExhausted, setIsQuotaExhausted] = useState<boolean>(false);
    const [suggestedAssets, setSuggestedAssets] = useState<Asset[] | null>(null);
    const { consent } = useCookieConsent();
    const [isCookieSettingsOpen, setIsCookieSettingsOpen] = useState(false);

    const isLoadingEngines = availableEngines.length === 0;
    const activeSession = useMemo(() => sessions.find(s => s.id === activeSessionId), [sessions, activeSessionId]);
    const showSearchBar = !['market', 'history', 'settings', 'cookie-policy'].includes(activeView);
    const isApiBlocked = isQuotaExhausted;

    useEffect(() => {
        const loadAndSetModels = async () => {
            try {
                const engines = await getAvailableTextModels();
                setAvailableEngines(engines);
                if (!engines.includes(currentEngine)) setCurrentEngine(engines[0]);
            } catch (err) {
                setAvailableEngines(['gemini-3-flash-preview']);
            }
        };
        loadAndSetModels();
    }, []);

    const handleTokenUsage = useCallback((usage: any) => {
        if (usage.totalTokens === 0) return;
        const pricing = TOKEN_PRICING_USD[usage.model] || TOKEN_PRICING_USD['default'];
        const costInUsd = (usage.promptTokens / 1_000_000) * pricing.input + (usage.candidateTokens / 1_000_000) * pricing.output;
        setTokenUsageHistory(prev => [...prev, { timestamp: Date.now(), tokens: usage.totalTokens, cost: costInUsd, model: usage.model, view: activeView }]);
    }, [activeView, setTokenUsageHistory]);

    const handleApiError = useCallback((e: any, title: string, message: string) => {
        if (e instanceof QuotaExceededError) {
            setIsQuotaExhausted(true);
            setError({ title: `Cuota Excedida`, message: e.message });
        } else {
            setError({ title, message: e instanceof Error ? e.message : message });
        }
    }, []);

    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        setError(null);
        setSuggestedAssets(null);
        try {
            const { data, usage } = await getAssetInfo(searchQuery, currentEngine);
            handleTokenUsage({ ...usage, model: currentEngine });
            if (data.length > 0) setSuggestedAssets(data);
            else setError({ title: 'Activo no Encontrado', message: 'No se detectaron coincidencias.' });
        } catch (e) {
            handleApiError(e, 'Error de Búsqueda', 'Fallo al buscar el activo.');
        } finally {
            setIsSearching(false);
        }
    }, [searchQuery, currentEngine, handleTokenUsage, handleApiError]);

    const handleAssetSelection = useCallback((asset: Asset) => {
        const existing = sessions.find(s => s.asset.ticker.toLowerCase() === asset.ticker.toLowerCase());
        if (existing) {
            setActiveSessionId(existing.id);
            setActiveView('analysis');
            setSuggestedAssets(null);
            setSearchQuery('');
            return;
        }
        const today = new Date().toISOString().split('T')[0];
        const future = new Date(); future.setFullYear(future.getFullYear() + 5);
        const newSession: AnalysisSession = {
            id: asset.ticker, asset, isInitializing: true, currentPrice: null, changeValue: null, changePercentage: null,
            analysisVectors: [], globalAnalysis: { content: null, isLoading: false, error: null }, alternativeAssets: [],
            isLoadingAlternatives: false, haveAlternativesBeenFetched: false, isAnalyzingAll: false, chatHistory: [],
            calculatorState: { investment: '1000', startDate: today, endDate: future.toISOString().split('T')[0], startPriceInput: '', endPriceInput: '', inflationRate: '3' }
        };
        setSessions(prev => [...prev, newSession]);
        setActiveSessionId(newSession.id);
        setActiveView('analysis');
        setSuggestedAssets(null);
        setSearchQuery('');
    }, [sessions, setActiveSessionId, setSessions, setActiveView]);

    const renderActiveView = () => {
        switch(activeView) {
            case 'analysis': return <AnalysisView sessions={sessions} activeSession={activeSession} onSessionChange={setSessions} onActiveSessionChange={setActiveSessionId} onCloseSession={(id) => setSessions(s => s.filter(x => x.id !== id))} onClearSessions={() => setSessions([])} suggestedAssets={suggestedAssets} onSelectAsset={handleAssetSelection} currentEngine={currentEngine} isQuotaExhausted={isApiBlocked} onApiError={handleApiError} onTokenUsage={handleTokenUsage} setHistory={setAnalysisHistory} currency={currency} onSendToPortfolio={(a, p) => { setAssetForPortfolio({ asset: a, price: p }); setActiveView('portfolio'); }} />;
            case 'market': return <MarketView currentEngine={currentEngine} onTokenUsage={handleTokenUsage} onApiError={handleApiError} isApiBlocked={isApiBlocked} currency={currency} setSearchQuery={setSearchQuery} setActiveView={setActiveView} analysisState={marketAnalysisState} setAnalysisState={setMarketAnalysisState} />;
            case 'portfolio': return <PortfolioView portfolios={portfolios} activePortfolio={activePortfolio} activePortfolioId={activePortfolioId} setActivePortfolioId={setActivePortfolioId} currency={currency} currentEngine={currentEngine} onTokenUsage={handleTokenUsage} onApiError={handleApiError} onSelectAsset={handleAssetSelection} isApiBlocked={isApiBlocked} assetForPortfolio={assetForPortfolio} onClearAssetForPortfolio={() => setAssetForPortfolio(null)} onNewPortfolio={addPortfolio} onRenamePortfolio={renamePortfolio} onDeletePortfolio={deletePortfolio} onAddAsset={addAssetToPortfolio} onRemoveAsset={removeAssetFromPortfolio} />;
            case 'charts': return <ChartView activeSession={activeSession} theme={theme} />;
            case 'calculator': return <CalculatorView activeSession={activeSession} onSessionChange={setSessions} currentEngine={currentEngine} onTokenUsage={handleTokenUsage} onApiError={handleApiError} currency={currency} />;
            case 'alternatives': return <AlternativesView activeSession={activeSession} onSessionChange={setSessions} currentEngine={currentEngine} onTokenUsage={handleTokenUsage} onApiError={handleApiError} onSelectAsset={handleAssetSelection} isApiBlocked={isApiBlocked} currency={currency} />;
            case 'chat': return <ChatView activeSession={activeSession} onSessionChange={setSessions} currentEngine={currentEngine} onTokenUsage={handleTokenUsage} onApiError={handleApiError} isApiBlocked={isApiBlocked} />;
            case 'history': return <HistoryView history={analysisHistory} onSelectHistoryItem={(item) => handleAssetSelection({ name: item.name, ticker: item.ticker, type: item.type })} onClearHistory={() => setAnalysisHistory([])} currency={currency} />;
            case 'settings': return <SettingsView availableEngines={availableEngines} currentEngine={currentEngine} onEngineChange={setCurrentEngine} isApiBlocked={isApiBlocked} isBusy={isSearching} onClearAllData={() => { localStorage.clear(); window.location.reload(); }} userIp={userIp} setActiveView={setActiveView} tokenUsageHistory={tokenUsageHistory} onClearAccountingHistory={() => setTokenUsageHistory([])} currency={currency} onImportPortfolio={importAndMergePortfolio} onTokenUsage={handleTokenUsage} onApiError={handleApiError} />;
            case 'cookie-policy': return <CookiePolicyView />;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-white text-black dark:bg-neutral-950 dark:text-gray-100 font-sans">
            <main className="flex-grow container mx-auto px-4 py-8">
                <header className="flex justify-between items-center mb-12">
                    <div className="flex-1 hidden md:block"></div>
                    <div className="text-center flex-[2]">
                        <h1 className="text-4xl font-black text-red-700 uppercase tracking-tighter">InversIA</h1>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mt-1">Sistemas de Análisis Estratégico</p>
                    </div>
                    <div className="flex-1 flex justify-end">
                        <AppMenu />
                    </div>
                </header>

                <nav className="hidden sm:flex justify-center mb-10 overflow-x-auto scrollbar-hide">
                    <div className="bg-gray-50 dark:bg-neutral-900 p-1.5 rounded-2xl flex space-x-1 border border-gray-100 dark:border-neutral-800">
                        {navItems.map(({ view, label, icon }) => (
                            <button key={view} type="button" onClick={() => setActiveView(view)} className={`flex items-center gap-3 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === view ? 'bg-black text-white dark:bg-red-700 shadow-xl' : 'text-gray-400 hover:text-black dark:hover:text-white'}`}>
                                <i className={`fas ${icon} text-xs`}></i>
                                <span className="hidden lg:inline">{label}</span>
                            </button>
                        ))}
                    </div>
                </nav>
                
                <div className="max-w-6xl mx-auto">
                     {showSearchBar && (
                        <div className="bg-white dark:bg-neutral-900 p-4 rounded-3xl shadow-2xl shadow-gray-100 dark:shadow-none border border-gray-50 dark:border-neutral-800 flex flex-wrap items-center gap-4 mb-8">
                            <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSearch={handleSearch} isLoading={isSearching || isLoadingEngines} isApiBlocked={isApiBlocked} />
                            <CurrencySelector currency={currency} setCurrency={setCurrency} />
                            { (sessions.length > 0) && (
                                <button type="button" onClick={() => { if(confirm("¿Cerrar todas?")) setSessions([]) }} className="h-11 w-11 flex items-center justify-center bg-gray-50 text-gray-300 rounded-xl hover:bg-red-700 hover:text-white transition-all"><i className="fas fa-times"></i></button>
                            )}
                        </div>
                    )}

                    {sessions.length > 0 && !['market', 'history', 'settings', 'cookie-policy'].includes(activeView) && (
                        <div className="mb-8">
                            <Tabs sessions={sessions} activeSessionId={activeSessionId} onSelectSession={setActiveSessionId} onCloseSession={(id) => setSessions(s => s.filter(x => x.id !== id))} />
                            {activeSession && (
                                <div className="mt-6">
                                    {activeSession.isInitializing ? <AssetHeaderSkeleton /> : <AssetHeader asset={activeSession.asset} currentPrice={activeSession.currentPrice} changeValue={activeSession.changeValue} changePercentage={activeSession.changePercentage} currency={currency} onSendToPortfolio={(a, p) => { setAssetForPortfolio({ asset: a, price: p }); setActiveView('portfolio'); }} />}
                                </div>
                            )}
                        </div>
                    )}
                    <ErrorDisplay error={error} onDismiss={() => setError(null)} />
                    {renderActiveView()}
                </div>
            </main>
            
            <TemplateFooter userIp={userIp} onShowCookies={() => setShowCookiesModal(true)} onShowAjustes={() => setShowAjustesModal(true)} />
            <BottomNavBar activeView={activeView} setActiveView={setActiveView} />
            <AjustesModal isOpen={showAjustesModal} onClose={() => setShowAjustesModal(false)} userIp={userIp} />
            <CookiesModal isOpen={showCookiesModal} onClose={() => setShowCookiesModal(false)} />
            {consent.status === 'pending' && <CookieConsentBanner onConfigure={() => setIsCookieSettingsOpen(true)} />}
            <CookieSettingsModal isOpen={isCookieSettingsOpen} onClose={() => setIsCookieSettingsOpen(false)} />
        </div>
    );
}
