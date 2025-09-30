// FIX: Import Dispatch and SetStateAction from react to be used in the hook's return type.
import { useState, useEffect, useContext, Dispatch, SetStateAction } from 'react';
import { useCookieConsent } from '../context/CookieConsentContext';
import { LOCAL_STORAGE_COOKIE_MAP, CookieCategory } from '../constants/cookieConfig';

export function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
    const { consent } = useCookieConsent();
    
    const getCategory = (k: string): CookieCategory => LOCAL_STORAGE_COOKIE_MAP[k] ?? 'functional';
    
    const canAccessStorage = () => {
        const category = getCategory(key);
        return category === 'necessary' || (category === 'functional' && consent.functional);
    };

    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined' || !canAccessStorage()) {
            return initialValue;
        }
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    // Effect to update localStorage when state changes
    useEffect(() => {
        if (!canAccessStorage()) {
            // If consent is revoked, we don't write to localStorage.
            // The value in the component's state will persist until reload.
            // To force a reset, we can do this:
            if (storedValue !== initialValue) {
                setStoredValue(initialValue);
            }
            return;
        }
        try {
            const valueToStore = typeof storedValue === 'function' 
                ? (storedValue as (val: T) => T)(storedValue)
                : storedValue;
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, storedValue, consent]); // Re-run if consent changes

    // Effect to listen for changes from other tabs
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === key && canAccessStorage()) {
                if (e.newValue) {
                    try {
                        setStoredValue(JSON.parse(e.newValue));
                    } catch (error) {
                        console.error(`Error parsing storage change for key "${key}":`, error);
                    }
                } else {
                    setStoredValue(initialValue);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [key, initialValue, consent]); // Re-run if consent changes

    return [storedValue, setStoredValue];
}