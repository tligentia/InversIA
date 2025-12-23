
import React, { useState, useEffect } from 'react';
import { Security } from '../Plantilla/Seguridad';
import App from '../App';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Theme } from '../types';
import { getAllowedIps } from '../Plantilla/Parameters';

export const AuthenticationProvider: React.FC = () => {
    const [isLocked, setIsLocked] = useState<boolean>(true);
    const [isAuthenticating, setIsAuthenticating] = useState<boolean>(true);
    const [userIp, setUserIp] = useState<string | null>(null);
    const [theme, setTheme] = useLocalStorage<Theme>('appTheme', 'system');

    useEffect(() => {
        const root = window.document.documentElement;
        const isDark =
            theme === 'dark' ||
            (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        root.classList.toggle('dark', isDark);

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            if (theme === 'system') root.classList.toggle('dark', mediaQuery.matches);
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    useEffect(() => {
        const checkAccess = async () => {
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                if (!response.ok) throw new Error();
                const { ip: fetchedIp } = await response.json();
                setUserIp(fetchedIp);
                const allowedIps = getAllowedIps();
                if (allowedIps.some(ip => fetchedIp === ip || fetchedIp.startsWith(ip))) {
                    setIsLocked(false);
                }
            } catch (error) {
                console.warn("Bypass IP fallido, usando pantalla de PIN.");
            } finally {
                setIsAuthenticating(false);
            }
        };
        checkAccess();
    }, []);

    if (isAuthenticating) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-neutral-950">
                <svg className="animate-spin h-10 w-10 text-red-700" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Verificando Identidad</p>
            </div>
        );
    }

    if (isLocked) return <Security onLogin={() => setIsLocked(false)} />;

    return <App userIp={userIp} theme={theme} onThemeChange={setTheme} />;
};
