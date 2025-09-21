import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ConsentState, clearFunctionalCookies } from '../constants/cookieConfig';

interface CookieConsentContextType {
    consent: ConsentState;
    acceptAll: () => void;
    rejectAll: () => void;
    savePreferences: (newPreferences: { functional: boolean }) => void;
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

const CONSENT_STORAGE_KEY = 'cookieConsent';

export const CookieConsentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [consent, setConsent] = useState<ConsentState>({ status: 'pending', functional: false });
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        try {
            const storedConsent = window.localStorage.getItem(CONSENT_STORAGE_KEY);
            if (storedConsent) {
                setConsent(JSON.parse(storedConsent));
            }
        } catch (error) {
            console.error("Error reading cookie consent from localStorage", error);
        }
        setIsInitialized(true);
    }, []);

    const updateConsent = useCallback((newConsent: ConsentState) => {
        setConsent(newConsent);
        try {
            window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(newConsent));
        } catch (error) {
            console.error("Error saving cookie consent to localStorage", error);
        }
    }, []);

    const acceptAll = useCallback(() => {
        updateConsent({ status: 'accepted', functional: true });
    }, [updateConsent]);

    const rejectAll = useCallback(() => {
        clearFunctionalCookies();
        updateConsent({ status: 'rejected', functional: false });
        // Force reload to ensure all states using useLocalStorage are reset
        window.location.reload();
    }, [updateConsent]);

    const savePreferences = useCallback((newPreferences: { functional: boolean }) => {
        if (!newPreferences.functional) {
            clearFunctionalCookies();
        }
        updateConsent({ status: 'configured', ...newPreferences });
        if (!newPreferences.functional) {
             // Force reload to ensure all states using useLocalStorage are reset
            window.location.reload();
        }
    }, [updateConsent]);
    
    if (!isInitialized) {
        return null; // or a loading spinner
    }

    return (
        <CookieConsentContext.Provider value={{ consent, acceptAll, rejectAll, savePreferences }}>
            {children}
        </CookieConsentContext.Provider>
    );
};

export const useCookieConsent = (): CookieConsentContextType => {
    const context = useContext(CookieConsentContext);
    if (context === undefined) {
        throw new Error('useCookieConsent must be used within a CookieConsentProvider');
    }
    return context;
};
