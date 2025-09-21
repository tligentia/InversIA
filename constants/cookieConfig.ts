export type CookieCategory = 'necessary' | 'functional';

export interface ConsentState {
    status: 'pending' | 'accepted' | 'rejected' | 'configured';
    functional: boolean;
}

// This map is crucial for the consent-aware useLocalStorage hook.
// It determines which category each piece of stored data belongs to.
export const LOCAL_STORAGE_COOKIE_MAP: Record<string, CookieCategory> = {
    // Necessary: Essential for core functionality and remembering consent.
    'cookieConsent': 'necessary',
    'appTheme': 'necessary', // Considered necessary to prevent Flash of Unstyled Content (FOUC).

    // Functional: Remembers user choices and state to enhance experience. Optional.
    'geminiApiKey': 'functional',
    'assetAnalysisHistory': 'functional',
    'selectedAiEngine': 'functional',
    'analysisSessions': 'functional',
    'activeAnalysisSessionId': 'functional',
    'activeView': 'functional',
    'userCurrency': 'functional',
    'userPortfolio': 'functional',
    'tokenUsageHistory': 'functional',
    'marketView_selectedSectors': 'functional',
    'marketView_criteriaList': 'functional',
};

// Function to clear all functional cookies from localStorage.
export const clearFunctionalCookies = () => {
    console.log("Clearing all functional cookies...");
    Object.keys(LOCAL_STORAGE_COOKIE_MAP).forEach(key => {
        if (LOCAL_STORAGE_COOKIE_MAP[key] === 'functional') {
            window.localStorage.removeItem(key);
            console.log(`Removed: ${key}`);
        }
    });
};
