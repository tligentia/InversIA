import { useMemo, useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Portfolio, PortfolioItem } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function usePortfolios() {
    const [portfolios, setPortfolios] = useLocalStorage<Portfolio[]>('userPortfolios', []);
    const [activePortfolioId, setActivePortfolioId] = useLocalStorage<string | null>('activePortfolioId', null);

    // Effect to ensure there's always at least one portfolio and an active one
    // This runs implicitly via useLocalStorage's initial state and updates.
    // We add an explicit check to handle edge cases on first load or data corruption.
    useEffect(() => {
        if (portfolios.length === 0) {
            const defaultPortfolio: Portfolio = { id: uuidv4(), name: 'Cartera Principal', items: [] };
            setPortfolios([defaultPortfolio]);
            setActivePortfolioId(defaultPortfolio.id);
        } else if (!activePortfolioId || !portfolios.some(p => p.id === activePortfolioId)) {
            setActivePortfolioId(portfolios[0].id);
        }
    }, [portfolios, activePortfolioId, setPortfolios, setActivePortfolioId]);

    const activePortfolio = useMemo(() => portfolios.find(p => p.id === activePortfolioId), [portfolios, activePortfolioId]);

    const addPortfolio = useCallback((name: string) => {
        const newPortfolio: Portfolio = { id: uuidv4(), name, items: [] };
        setPortfolios(prev => [...prev, newPortfolio]);
        setActivePortfolioId(newPortfolio.id);
    }, [setPortfolios, setActivePortfolioId]);

    const renamePortfolio = useCallback((id: string, newName: string) => {
        setPortfolios(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
    }, [setPortfolios]);

    const deletePortfolio = useCallback((id: string) => {
        setPortfolios(prev => {
            if (prev.length <= 1) {
                console.warn("Cannot delete the last portfolio.");
                return prev;
            }
            const remainingPortfolios = prev.filter(p => p.id !== id);
            if (activePortfolioId === id) {
                setActivePortfolioId(remainingPortfolios[0]?.id ?? null);
            }
            return remainingPortfolios;
        });
    }, [activePortfolioId, setPortfolios, setActivePortfolioId]);
    
    const addAssetToPortfolio = useCallback((portfolioId: string, assetInfo: { ticker: string, name: string, type: 'stock' | 'crypto' }, quantity: number, purchasePrice: number, purchaseDate: string) => {
        setPortfolios(prev => prev.map(p => {
            if (p.id !== portfolioId) return p;

            const updatedItems = [...p.items];
            const existingIndex = updatedItems.findIndex(item => item.ticker.toLowerCase() === assetInfo.ticker.toLowerCase());

            if (existingIndex > -1) {
                // Update existing asset
                const existingItem = updatedItems[existingIndex];
                const totalQuantity = existingItem.quantity + quantity;
                const newPurchasePrice = ((existingItem.quantity * existingItem.purchasePrice) + (quantity * purchasePrice)) / totalQuantity;
                updatedItems[existingIndex] = {
                    ...existingItem,
                    quantity: totalQuantity,
                    purchasePrice: newPurchasePrice,
                    purchaseDate: purchaseDate > existingItem.purchaseDate ? purchaseDate : existingItem.purchaseDate,
                };
            } else {
                // Add new asset
                const newItem: PortfolioItem = {
                    ...assetInfo,
                    quantity: quantity,
                    purchasePrice: purchasePrice,
                    purchaseDate: purchaseDate,
                };
                updatedItems.push(newItem);
            }
            return { ...p, items: updatedItems };
        }));
    }, [setPortfolios]);

    const removeAssetFromPortfolio = useCallback((portfolioId: string, ticker: string) => {
        setPortfolios(prev => prev.map(p => {
            if (p.id !== portfolioId) return p;
            return { ...p, items: p.items.filter(item => item.ticker !== ticker) };
        }));
    }, [setPortfolios]);

    const importAndMergePortfolio = useCallback((importedItems: PortfolioItem[], portfolioName: string) => {
        setPortfolios(prev => {
            if (prev.length === 0 || !activePortfolioId) {
                const newPortfolioId = uuidv4();
                setActivePortfolioId(newPortfolioId);
                return [{ id: newPortfolioId, name: portfolioName, items: importedItems }];
            }

            return prev.map(p => {
                if (p.id !== activePortfolioId) return p;

                const updatedItems = [...p.items];
                importedItems.forEach(newItem => {
                    const existingIndex = updatedItems.findIndex(item => item.ticker.toLowerCase() === newItem.ticker.toLowerCase());
                    if (existingIndex > -1) {
                        const existingItem = updatedItems[existingIndex];
                        const totalQuantity = existingItem.quantity + newItem.quantity;
                        const newAvgPrice = ((existingItem.quantity * existingItem.purchasePrice) + (newItem.quantity * newItem.purchasePrice)) / totalQuantity;
                        updatedItems[existingIndex] = {
                            ...existingItem,
                            quantity: totalQuantity,
                            purchasePrice: newAvgPrice,
                            purchaseDate: newItem.purchaseDate > existingItem.purchaseDate ? newItem.purchaseDate : existingItem.purchaseDate,
                        };
                    } else {
                        updatedItems.push(newItem);
                    }
                });
                return { ...p, items: updatedItems };
            });
        });
    }, [activePortfolioId, setPortfolios, setActivePortfolioId]);

    return {
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
    };
}