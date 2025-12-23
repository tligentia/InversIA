
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SearchBar } from './components/SearchBar';
import { AssetSelection } from './components/AssetSelection';
import { getAssetInfo, getAvailableTextModels } from './services/geminiService';
import { HistoryItem, AppError, QuotaExceededError, Asset, View, AnalysisSession, Theme, Currency, Portfolio, PortfolioItem, MarketAnalysisState, TokenUsageRecord } from './types';
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
import { Disclaimer } from './components/Disclaimer';
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
    // --- State Management ---
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [analysisHistory, setAnalysisHistory] = useLocalStorage<HistoryItem[]>('assetAnalysisHistory', []);
    const [currentEngine, setCurrentEngine] = useLocalStorage<string>('selectedAiEngine', 'gemini-3-flash-preview');
    const [availableEngines, setAvailableEngines] = useState<string[]>([]);
    const [tokenUsageHistory, setTokenUsageHistory] = useLocalStorage<TokenUsageRecord[]>('tokenUsageHistory', []);
    const [sessions, setSessions] = useLocalStorage<AnalysisSession[]>('analysisSessions', []);
    const [activeSessionId, setActiveSessionId] = useLocalStorage<string | null>('activeAnalysisSessionId', null);
    
    // Modales de Plantilla
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

    const [activeView, setActiveView] = useLocalStorage<View>('activeView', 'analysis');
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
            let engines: string[] = [];
            try {
                const fetchedModels = await getAvailableTextModels();
                if (fetchedModels && fetchedModels.length > 0) {
                    engines = fetchedModels;
                } else {
                    throw new Error("No models returned from service.");
                }
            } catch (err) {
                console.error("Failed to load models from service, using fallback.", err);
                engines = ['gemini-3-flash-preview'];
            }
            setAvailableEngines(engines);
            if (!engines.includes(currentEngine)) {
                setCurrentEngine(engines[0]);
            }
        };
        loadAndSetModels();
    }, [currentEngine, setCurrentEngine]);

    const handleTokenUsage = useCallback((usage: {
        promptTokens: number;
        candidateTokens: number;
        totalTokens: number;
        model: string;
    }) => {
        if (usage.totalTokens === 0) return;
        const pricing = TOKEN_PRICING_USD[usage.model] || TOKEN_PRICING_USD['default'];
        const inputCost = (usage.promptTokens / 1_000_000) * pricing.input;
        const outputCost = (usage.candidateTokens / 1_000_000) * pricing.output;
        const costInUsd = inputCost + outputCost;
        const newRecord: TokenUsageRecord = {
            timestamp: Date.now(),
            tokens: usage.totalTokens,
            cost: costInUsd,
            model: usage.model,
            view: activeView,
        };
        setTokenUsageHistory(prev => [...prev, newRecord]);
    }, [setTokenUsageHistory, activeView]);

    const clearSearchState = useCallback(() => {
        setSearchQuery('');
        setError(null);
        setSuggestedAssets(null);
    }, []);
    
    const handleApiError = useCallback((e: unknown, title: string, message: string) => {
        if (e instanceof QuotaExceededError) {
            setIsQuotaExhausted(true);
            const quotaMessage = e.message || `Se ha excedido la cuota para el motor de IA subyacente (${e.engine}).`;
            setError({ title: `Cuota Excedida (${e.engine})`, message: quotaMessage });
        } else {
            console.error(e);
            const finalMessage = e instanceof Error ? e.message : message;
            setError({ title, message: finalMessage });
        }
    }, []);

    const handleSearch = useCallback(async (queryOverride?: string) => {
        const finalQuery = queryOverride || searchQuery;
        if (!finalQuery.trim()) {
            setError({ title: 'Entrada Inválida', message: 'Por favor, introduce un nombre o ticker para buscar.' });
            return;
        }
        setIsSearching(true);
        setError(null);
        setSuggestedAssets(null);
        try {
            const { data: assetInfo, usage } = await getAssetInfo(finalQuery, currentEngine);
            handleTokenUsage({ ...usage, model: currentEngine });
            if (assetInfo && assetInfo.length > 0) {
                setSuggestedAssets(assetInfo);
            } else {
                setError({ title: 'Activo no Encontrado', message: 'No se pudo encontrar el activo. Inténtalo de nuevo con otro nombre o ticker.' });
            }
        } catch (e) {
            handleApiError(e, 'Error de Búsqueda', 'Ocurrió un error al buscar el activo.');
        } finally {
            setIsSearching(false);
        }
    }, [searchQuery, handleApiError, currentEngine, handleTokenUsage]);

    const handleCreateNewSession = useCallback((asset: Asset) => {
        if (!asset || !asset.ticker?.trim() || !asset.name?.trim()) {
            handleApiError(new Error("El activo seleccionado no es válido."), "Error de Sesión", "No se puede iniciar el análisis.");
            return;
        }
        const existingSession = sessions.find(s => s.asset.ticker.toLowerCase() === asset.ticker.toLowerCase());
        if (existingSession) {
            setActiveSessionId(existingSession.id);
            setActiveView('analysis');
            clearSearchState();
            return;
        }
        const todayStr = new Date().toISOString().split('T')[0];
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 5);
        const futureStr = futureDate.toISOString().split('T')[0];
        const newSession: AnalysisSession = {
            id: asset.ticker, 
            asset: asset,
            isInitializing: true,
            currentPrice: null,
            changeValue: null,
            changePercentage: null,
            analysisVectors: [],
            globalAnalysis: { content: null, isLoading: false, error: null, sources: [], calculatedWithVectorCount: 0 },
            alternativeAssets: [],
            isLoadingAlternatives: false,
            haveAlternativesBeenFetched: false,
            isAnalyzingAll: false,
            chatHistory: [],
            calculatorState: { investment: '1000', startDate: todayStr, endDate: futureStr, startPriceInput: '', endPriceInput: '', inflationRate: '3', limitBuyPrice: '' },
        };
        setSessions(prev => [...prev, newSession]);
        setActiveSessionId(newSession.id);
        setActiveView('analysis');
        clearSearchState();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [sessions, setActiveSessionId, setSessions, clearSearchState, setActiveView, handleApiError]);

    const handleAssetSelection = useCallback(async (asset: Asset) => {
        handleCreateNewSession(asset);
    }, [handleCreateNewSession]);

    const handleSelectHistoryItem = useCallback(async (item: HistoryItem) => {
        handleCreateNewSession({ name: item.name, ticker: item.ticker, type: item.type });
    }, [handleCreateNewSession]);

    const handleCloseSession = useCallback((sessionId: string) => {
        setSessions(prevSessions => {
            const closingIndex = prevSessions.findIndex(s => s.id === sessionId);
            if (closingIndex === -1) return prevSessions;
            const remainingSessions = prevSessions.filter(s => s.id !== sessionId);
            if (activeSessionId === sessionId) {
                if (remainingSessions.length > 0) {
                    const newActiveIndex = closingIndex > 0 ? closingIndex - 1 : 0;
                    setActiveSessionId(remainingSessions[newActiveIndex].id);
                } else {
                    setActiveSessionId(null);
                }
            }
            return remainingSessions;
        });
    }, [activeSessionId, setSessions, setActiveSessionId]);
    
    const handleSendToPortfolio = (asset: Asset, price: number | null) => {
        setAssetForPortfolio({ asset, price });
        setActiveView('portfolio');
    };

    const handleClearState = () => {
        if (window.confirm("¿Estás seguro de que deseas cerrar todas las pestañas de análisis?")) {
            setSessions([]);
            setActiveSessionId(null);
            clearSearchState();
        }
    };

    const handleClearLocalStorage = () => {
        if (window.confirm("¿Estás seguro de que deseas borrar TODOS los datos?")) {
            window.localStorage.clear();
            window.location.reload();
        }
    };

    const isUiBusy = isSearching || isLoadingEngines || (activeSession?.isAnalyzingAll ?? false);

    const renderActiveView = () => {
        switch(activeView) {
            case 'analysis':
                return <AnalysisView sessions={sessions} activeSession={activeSession} onSessionChange={setSessions} onActiveSessionChange={setActiveSessionId} onCloseSession={handleCloseSession} onClearSessions={handleClearState} suggestedAssets={suggestedAssets} onSelectAsset={handleAssetSelection} currentEngine={currentEngine} isQuotaExhausted={isApiBlocked} onApiError={handleApiError} onTokenUsage={handleTokenUsage} setHistory={setAnalysisHistory} currency={currency} onSendToPortfolio={handleSendToPortfolio} />;
            case 'market':
                return <MarketView currentEngine={currentEngine} onTokenUsage={handleTokenUsage} onApiError={handleApiError} isApiBlocked={isApiBlocked} currency={currency} setSearchQuery={setSearchQuery} setActiveView={setActiveView} analysisState={marketAnalysisState} setAnalysisState={setMarketAnalysisState} />;
             case 'portfolio':
                return <PortfolioView portfolios={portfolios} activePortfolio={activePortfolio} activePortfolioId={activePortfolioId} setActivePortfolioId={setActivePortfolioId} currency={currency} currentEngine={currentEngine} onTokenUsage={handleTokenUsage} onApiError={handleApiError} onSelectAsset={handleAssetSelection} isApiBlocked={isApiBlocked} assetForPortfolio={assetForPortfolio} onClearAssetForPortfolio={() => setAssetForPortfolio(null)} onNewPortfolio={addPortfolio} onRenamePortfolio={renamePortfolio} onDeletePortfolio={deletePortfolio} onAddAsset={addAssetToPortfolio} onRemoveAsset={removeAssetFromPortfolio} />;
            case 'charts':
                return <ChartView activeSession={activeSession} theme={theme} />;
            case 'calculator':
                return <CalculatorView activeSession={activeSession} onSessionChange={setSessions} currentEngine={currentEngine} onTokenUsage={handleTokenUsage} onApiError={handleApiError} currency={currency} />;
            case 'alternatives':
                return <AlternativesView activeSession={activeSession} onSessionChange={setSessions} currentEngine={currentEngine} onTokenUsage={handleTokenUsage} onApiError={handleApiError} onSelectAsset={handleAssetSelection} isApiBlocked={isApiBlocked} currency={currency} />;
            case 'chat':
                return <ChatView activeSession={activeSession} onSessionChange={setSessions} currentEngine={currentEngine} onTokenUsage={handleTokenUsage} onApiError={handleApiError} isApiBlocked={isApiBlocked} />;
            case 'history':
                return <HistoryView history={analysisHistory} onSelectHistoryItem={handleSelectHistoryItem} onClearHistory={() => setAnalysisHistory([])} currency={currency} />;
            case 'settings':
                return <SettingsView availableEngines={availableEngines} currentEngine={currentEngine} onEngineChange={setCurrentEngine} isApiBlocked={isApiBlocked} isBusy={isUiBusy} onClearAllData={handleClearLocalStorage} userIp={userIp} setActiveView={setActiveView} tokenUsageHistory={tokenUsageHistory} onClearAccountingHistory={() => setTokenUsageHistory([])} currency={currency} onImportPortfolio={importAndMergePortfolio} onTokenUsage={handleTokenUsage} onApiError={handleApiError} />;
            case 'cookie-policy':
                return <CookiePolicyView />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen flex flex-col text-slate-800 dark:text-slate-200">
             {isQuotaExhausted && error?.title?.startsWith("Cuota Excedida") && (
                <div className="bg-red-700 text-white text-center p-2 font-semibold sticky top-0 z-[60] shadow-lg">
                    <i className="fas fa-exclamation-triangle mr-2"></i>
                    {error.message}
                </div>
            )}
            <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
                <header className="flex justify-between items-start mb-6 gap-4">
                    <div className="flex-1 hidden md:block"></div>
                    <div className="text-center flex-[2]">
                        <h1 className="text-4xl font-bold text-red-700">InversIA</h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400 mt-2">Tu Analista de Inversiones con Inteligencia Artificial</p>
                    </div>
                    <div className="flex-1 flex justify-end">
                        <AppMenu />
                    </div>
                </header>

                <nav className="hidden sm:flex justify-center mb-6" aria-label="Navegación principal">
                    <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex space-x-1 flex-wrap justify-center">
                        {navItems.map(({ view, label, icon }) => (
                            <button key={view} type="button" onClick={() => setActiveView(view)} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${activeView === view ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/50'}`}>
                                <i className={`fas ${icon}`}></i>
                                <span>{label}</span>
                            </button>
                        ))}
                    </div>
                </nav>
                
                <div className="max-w-5xl mx-auto">
                     {showSearchBar && (
                        <div className="relative z-10 bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-xl shadow-lg flex flex-wrap items-center gap-3">
                            <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSearch={() => handleSearch()} isLoading={isSearching || isLoadingEngines} isApiBlocked={isApiBlocked} />
                            <CurrencySelector currency={currency} setCurrency={setCurrency} />
                            { (sessions.length > 0) && (
                                <button type="button" onClick={handleClearState} className="flex-shrink-0 h-11 w-11 flex items-center justify-center bg-red-600 text-white font-semibold rounded-lg hover:bg-red-500 active:bg-red-700 transition" title="Cerrar todas las pestañas de análisis"><i className="fas fa-times"></i></button>
                            )}
                        </div>
                    )}

                    {sessions.length > 0 && !['market', 'history', 'settings', 'cookie-policy'].includes(activeView) && (
                        <>
                            <div className="mt-4">
                                <Tabs sessions={sessions} activeSessionId={activeSessionId} onSelectSession={setActiveSessionId} onCloseSession={handleCloseSession} />
                            </div>
                            {activeSession && (
                                <div className="mt-4">
                                    {activeSession.isInitializing ? <AssetHeaderSkeleton /> : activeSession.initializationError ? (
                                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl shadow-md">
                                            <div className="flex items-center gap-4">
                                                <i className="fas fa-exclamation-triangle text-2xl text-red-500 dark:text-red-400"></i>
                                                <div>
                                                    <h3 className="text-lg font-bold text-red-800 dark:text-red-200">Error al cargar {activeSession.asset.name} ({activeSession.asset.ticker})</h3>
                                                    <p className="text-red-700 dark:text-red-300 text-sm">{activeSession.initializationError}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : <AssetHeader asset={activeSession.asset} currentPrice={activeSession.currentPrice} changeValue={activeSession.changeValue} changePercentage={activeSession.changePercentage} currency={currency} onSendToPortfolio={handleSendToPortfolio} />}
                                </div>
                            )}
                        </>
                    )}
                    <ErrorDisplay error={error} onDismiss={() => setError(null)} />
                    {renderActiveView()}
                </div>
            </main>
            <Disclaimer />
            
            {/* SUSTITUCIÓN DEL FOOTER ORIGINAL POR EL DE PLANTILLA */}
            <TemplateFooter 
                userIp={userIp} 
                onShowCookies={() => setShowCookiesModal(true)} 
                onShowAjustes={() => setShowAjustesModal(true)} 
            />

            <BottomNavBar activeView={activeView} setActiveView={setActiveView} />
            
            {/* MODALES DE PLANTILLA */}
            <AjustesModal isOpen={showAjustesModal} onClose={() => setShowAjustesModal(false)} userIp={userIp} />
            <CookiesModal isOpen={showCookiesModal} onClose={() => setShowCookiesModal(false)} />

            {consent.status === 'pending' && <CookieConsentBanner onConfigure={() => setIsCookieSettingsOpen(true)} />}
            <CookieSettingsModal isOpen={isCookieSettingsOpen} onClose={() => setIsCookieSettingsOpen(false)} />
        </div>
    );
}
