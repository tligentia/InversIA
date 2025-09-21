

import React from 'react';

interface SearchBarProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    onSearch: () => void;
    isLoading: boolean;
    isApiBlocked?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ searchQuery, setSearchQuery, onSearch, isLoading, isApiBlocked }) => {
    
    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && !isLoading && !isApiBlocked) {
            onSearch();
        }
    };

    const isDisabled = isLoading || isApiBlocked;

    return (
        <div className="relative flex-grow group">
             <label htmlFor="asset-search" className="sr-only">
                Buscar acciones globales o criptomonedas
            </label>
            <div 
                className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none" 
                aria-hidden="true"
            >
                <i className={`fas fa-search transition-colors duration-300 ${isDisabled ? 'text-slate-400 dark:text-slate-500' : 'text-slate-500 group-focus-within:text-slate-800 dark:group-focus-within:text-slate-200'}`}></i>
            </div>
            <input
                type="text"
                id="asset-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar acciones (Apple, SAN.MC) o criptos (BTC)..."
                className="w-full h-11 pl-12 pr-14 py-3 border border-slate-300 rounded-lg 
                           dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200 dark:placeholder-slate-400
                           focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent
                           dark:focus:ring-slate-200
                           transition duration-150 ease-in-out
                           disabled:bg-white disabled:opacity-70 disabled:cursor-not-allowed
                           dark:disabled:bg-slate-800 dark:disabled:opacity-70"
                disabled={isDisabled}
                title={isApiBlocked ? "Las funciones de IA están desactivadas por límite de cuota" : "Buscar acciones o criptomonedas"}
                aria-describedby="search-status"
            />
             <div id="search-status" className="sr-only" aria-live="polite">
                {isLoading && "Buscando..."}
            </div>
            <div className="absolute inset-y-0 right-0 flex py-1.5 pr-1.5">
                 <button
                    type="button"
                    onClick={onSearch}
                    className="inline-flex items-center justify-center w-10 h-full rounded-md px-2 text-sm font-semibold
                               text-slate-600 bg-slate-100 hover:bg-slate-200
                               dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600
                               focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-800
                               transition-colors
                               disabled:bg-transparent disabled:text-slate-400 disabled:cursor-not-allowed
                               dark:disabled:bg-transparent dark:disabled:text-slate-500"
                    disabled={isDisabled}
                    aria-label="Buscar"
                >
                    {isLoading ? (
                        <svg className="animate-spin h-5 w-5 text-slate-600 dark:text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <i className="fas fa-arrow-right"></i>
                    )}
                </button>
            </div>
        </div>
    );
};