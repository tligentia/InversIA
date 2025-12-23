
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
                <i className={`fas fa-search transition-colors duration-300 ${isDisabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 group-focus-within:text-gray-800 dark:group-focus-within:text-gray-200'}`}></i>
            </div>
            <input
                type="text"
                id="asset-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar acciones (Apple, SAN.MC) o criptos (BTC)..."
                className="w-full h-11 pl-12 pr-14 py-3 border border-gray-300 rounded-lg 
                           dark:bg-neutral-900 dark:border-neutral-700 dark:text-gray-200 dark:placeholder-gray-500
                           focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-transparent
                           transition duration-150 ease-in-out
                           disabled:bg-gray-50 disabled:opacity-70 disabled:cursor-not-allowed"
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
                               text-gray-600 bg-gray-100 hover:bg-gray-200
                               dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700
                               focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-700
                               transition-colors
                               disabled:bg-transparent disabled:text-gray-400 disabled:cursor-not-allowed"
                    disabled={isDisabled}
                    aria-label="Buscar"
                >
                    {isLoading ? (
                        <svg className="animate-spin h-5 w-5 text-gray-600 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
