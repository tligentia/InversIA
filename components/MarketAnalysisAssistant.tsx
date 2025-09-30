
import React, { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface MarketAnalysisAssistantProps {
    onAnalyze: (sectors: string[], criteria: string[]) => void;
    isApiBlocked: boolean;
}

const SECTORS_DATA = [
    { name: 'Technology', icon: 'fa-laptop-code' },
    { name: 'Healthcare', icon: 'fa-briefcase-medical' },
    { name: 'Financials', icon: 'fa-landmark' },
    { name: 'Consumer Discretionary', icon: 'fa-shopping-cart' },
    { name: 'Communication Services', icon: 'fa-satellite-dish' },
    { name: 'Industrials', icon: 'fa-industry' },
    { name: 'Consumer Staples', icon: 'fa-leaf' },
    { name: 'Energy', icon: 'fa-gas-pump' },
    { name: 'Utilities', icon: 'fa-lightbulb' },
    { name: 'Real Estate', icon: 'fa-city' },
    { name: 'Materials', icon: 'fa-gem' },
    { name: 'ETF', icon: 'fa-cubes' },
    { name: 'Cryptocurrencies', icon: 'fa-bitcoin', brand: true },
];

const EXCHANGES_DATA = [
    { name: 'Wall Street (NYSE)', icon: 'fa-university' },
    { name: 'Nasdaq', icon: 'fa-chart-line' },
    { name: 'IBEX 35', icon: 'fa-chart-bar' },
    { name: 'Bolsa de Tokio (TSE)', icon: 'fa-yen-sign' },
    { name: 'Bolsa de Fráncfort (DAX)', icon: 'fa-euro-sign' },
    { name: 'Bolsa de Londres (LSE)', icon: 'fa-pound-sign' },
];

const ALL_SECTORS_AND_EXCHANGES = [...SECTORS_DATA.map(s => s.name), ...EXCHANGES_DATA.map(e => e.name)];

const CRITERIA_SUGGESTIONS = [
    'Mayor capitalización de mercado',
    'Mayor crecimiento reciente',
    'Mejor rendimiento por dividendo'
];

const ProgressBar: React.FC<{ step: number; totalSteps: number }> = ({ step, totalSteps }) => (
    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mb-6">
        <div className="bg-red-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
    </div>
);

const WizardStep: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({ title, description, children }) => (
    <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{title}</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 mb-6">{description}</p>
        {children}
    </div>
);

const SelectionCard: React.FC<{ name: string; icon: string; brand?: boolean; isSelected: boolean; onSelect: () => void; }> = ({ name, icon, brand, isSelected, onSelect }) => (
    <button
        type="button"
        onClick={onSelect}
        className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 flex flex-col items-center justify-center gap-2 aspect-square ${isSelected ? 'bg-red-50 dark:bg-red-900/30 border-red-500 shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-red-400 dark:hover:border-red-500'}`}
    >
        {isSelected && <div className="absolute top-2 right-2 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-xs"><i className="fas fa-check"></i></div>}
        <i className={`${brand ? 'fab' : 'fas'} ${icon} text-3xl ${isSelected ? 'text-red-600' : 'text-slate-500 dark:text-slate-400'}`}></i>
        <span className="text-sm font-semibold text-center text-slate-700 dark:text-slate-300">{name}</span>
    </button>
);


export const MarketAnalysisAssistant: React.FC<MarketAnalysisAssistantProps> = ({ onAnalyze, isApiBlocked }) => {
    const [step, setStep] = useState(1);
    const [selectedSectors, setSelectedSectors] = useLocalStorage<string[]>('marketView_selectedSectors', []);
    const [criteriaList, setCriteriaList] = useLocalStorage<string[]>('marketView_criteriaList', ['Mayor rentabilidad total']);
    const [newCriterion, setNewCriterion] = useState('');

    const handleToggleSector = (sector: string) => {
        setSelectedSectors(prev => prev.includes(sector) ? prev.filter(s => s !== sector) : [...prev, sector]);
    };

    const handleAddCriterion = () => {
        if (newCriterion.trim() && !criteriaList.includes(newCriterion.trim())) {
            setCriteriaList([...criteriaList, newCriterion.trim()]);
            setNewCriterion('');
        }
    };
    
    const handleRemoveCriterion = (criterionToRemove: string) => {
        setCriteriaList(criteriaList.filter(c => c !== criterionToRemove));
    };

    const handleAnalyzeClick = () => {
        const sectorsForAnalysis = selectedSectors.length > 0 ? selectedSectors : ALL_SECTORS_AND_EXCHANGES;
        onAnalyze(sectorsForAnalysis, criteriaList);
    };

    return (
        <div className="mt-8 bg-slate-50 dark:bg-slate-800/50 p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
            <ProgressBar step={step} totalSteps={4} />

            {step === 1 && (
                <WizardStep title="Bienvenido al Asistente de Mercado" description="Vamos a descubrir oportunidades de inversión. Primero, ¿cuál es tu objetivo principal?">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button onClick={() => setStep(2)} className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow hover:shadow-lg transition text-left">
                            <i className="fas fa-search-dollar text-2xl text-red-600 mb-2"></i>
                            <h3 className="font-bold text-slate-800 dark:text-slate-200">Exploración General</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Quiero ver una visión amplia del mercado y comparar diferentes sectores.</p>
                        </button>
                        <button onClick={() => setStep(2)} className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow hover:shadow-lg transition text-left">
                           <i className="fas fa-bullseye text-2xl text-red-600 mb-2"></i>
                            <h3 className="font-bold text-slate-800 dark:text-slate-200">Búsqueda Específica</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Estoy buscando activos que cumplan con criterios muy concretos.</p>
                        </button>
                         <button onClick={() => setStep(2)} className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow hover:shadow-lg transition text-left">
                           <i className="fas fa-lightbulb text-2xl text-red-600 mb-2"></i>
                            <h3 className="font-bold text-slate-800 dark:text-slate-200">Encontrar Ideas</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">No estoy seguro, ¡sorpréndeme con los datos más relevantes!</p>
                        </button>
                    </div>
                </WizardStep>
            )}

            {step === 2 && (
                <WizardStep title="Paso 2: Elige Sectores y Bolsas" description="Selecciona las áreas que te interesan. Si no eliges ninguna, se analizarán todas.">
                     <div className="space-y-4">
                        <div>
                             <h4 className="text-sm font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-2">Sectores</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
                                {SECTORS_DATA.map(sector => <SelectionCard key={sector.name} {...sector} isSelected={selectedSectors.includes(sector.name)} onSelect={() => handleToggleSector(sector.name)} />)}
                            </div>
                        </div>
                        <div>
                             <h4 className="text-sm font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-2">Bolsas Principales</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                                {EXCHANGES_DATA.map(exchange => <SelectionCard key={exchange.name} {...exchange} isSelected={selectedSectors.includes(exchange.name)} onSelect={() => handleToggleSector(exchange.name)} />)}
                            </div>
                        </div>
                    </div>
                </WizardStep>
            )}
            
            {step === 3 && (
                <WizardStep title="Paso 3: Define Criterios de Análisis" description="Indica a la IA qué buscar. Puedes añadir sugerencias o escribir tus propios criterios.">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Sugerencias:</div>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {CRITERIA_SUGGESTIONS.map(c => (
                            <button key={c} type="button" onClick={() => { if (!criteriaList.includes(c)) setCriteriaList(prev => [...prev, c]) }} disabled={criteriaList.includes(c)} className="px-2.5 py-1 text-xs font-semibold rounded-full border transition disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-700/50 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-500">
                                + {c}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                        <input type="text" value={newCriterion} onChange={e => setNewCriterion(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCriterion()} placeholder="Ej: Mayor crecimiento de ingresos" className="flex-grow h-10 px-3 py-2 border border-slate-300 rounded-lg bg-white dark:bg-slate-900 dark:border-slate-600" />
                        <button onClick={handleAddCriterion} className="h-10 px-4 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600">&uarr; Añadir</button>
                    </div>
                    <div className="flex flex-wrap gap-2 bg-white dark:bg-slate-800 p-3 rounded-lg min-h-[4rem]">
                        {(Array.isArray(criteriaList) ? criteriaList : []).map(c => (
                            <div key={c} className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-medium pl-3 pr-1 py-1 rounded-full animate-in fade-in">
                                <span>{c}</span>
                                <button onClick={() => handleRemoveCriterion(c)} className="w-5 h-5 rounded-full hover:bg-red-200 dark:hover:bg-red-800/50 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">&times;</button>
                            </div>
                        ))}
                    </div>
                </WizardStep>
            )}

            {step === 4 && (
                <WizardStep title="Paso 4: Resumen y Lanzamiento" description="Revisa tu configuración. Cuando estés listo, pulsa 'Analizar Mercado'.">
                    <div className="space-y-4 bg-white dark:bg-slate-800 p-4 rounded-lg">
                        <div>
                            <h4 className="font-bold text-slate-700 dark:text-slate-300">Sectores y Bolsas Seleccionados</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {selectedSectors.length > 0 ? selectedSectors.join(', ') : 'Todos los sectores y bolsas'}
                            </p>
                        </div>
                         <div>
                            <h4 className="font-bold text-slate-700 dark:text-slate-300">Criterios de Análisis</h4>
                            <ul className="list-disc list-inside text-sm text-slate-500 dark:text-slate-400">
                                {(Array.isArray(criteriaList) ? criteriaList : []).map(c => <li key={c}>{c}</li>)}
                            </ul>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-center">
                        <button 
                            onClick={handleAnalyzeClick} 
                            disabled={isApiBlocked || criteriaList.length === 0} 
                            className="h-14 px-12 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-500 active:bg-red-700 transition flex items-center justify-center disabled:bg-red-300 dark:disabled:bg-red-800 disabled:cursor-not-allowed text-lg shadow-lg hover:shadow-xl"
                            title={criteriaList.length === 0 ? "Añade al menos un criterio para analizar" : (isApiBlocked ? "Funciones de IA desactivadas" : "Iniciar análisis")}
                        >
                            <i className="fas fa-rocket mr-3"></i>
                            Analizar Mercado
                        </button>
                    </div>
                </WizardStep>
            )}

            <div className="mt-8 flex justify-between items-center">
                <button onClick={() => setStep(s => s - 1)} disabled={step === 1} className="px-4 py-2 text-sm font-semibold rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50">
                    <i className="fas fa-arrow-left mr-2"></i>
                    Atrás
                </button>
                {step < 4 ? (
                    <button onClick={() => setStep(s => s + 1)} className="px-6 py-2 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 transition text-sm flex items-center justify-center gap-2 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300">
                        <span>Siguiente</span>
                        <i className="fas fa-arrow-right"></i>
                    </button>
                ) : (
                    <div></div> // Placeholder for spacing
                )}
            </div>
        </div>
    );
};
