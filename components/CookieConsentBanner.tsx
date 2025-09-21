import React from 'react';
import { useCookieConsent } from '../context/CookieConsentContext';

interface CookieConsentBannerProps {
    onConfigure: () => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ onConfigure }) => {
    const { acceptAll, rejectAll } = useCookieConsent();

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-[0_-2px_15px_rgba(0,0,0,0.1)] p-4 z-[100]">
            <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-slate-700 dark:text-slate-300 flex-grow">
                    <h4 className="font-bold text-base">Este sitio web utiliza cookies</h4>
                    <p>
                        Usamos cookies y tecnologías similares para el funcionamiento esencial de la web y para guardar tus preferencias funcionales, como la cartera o el historial de análisis.
                    </p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2 flex-wrap justify-center">
                    <button
                        onClick={acceptAll}
                        className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-500 active:bg-red-700 transition text-sm"
                    >
                        Aceptar Todas
                    </button>
                    <button
                        onClick={rejectAll}
                        className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 active:bg-slate-300 transition text-sm dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                    >
                        Rechazar Todas
                    </button>
                    <button
                        onClick={onConfigure}
                        className="px-4 py-2 text-slate-600 font-semibold rounded-lg hover:bg-slate-100 active:bg-slate-200 transition text-sm underline dark:text-slate-400 dark:hover:bg-slate-700"
                    >
                        Configurar
                    </button>
                </div>
            </div>
        </div>
    );
};
