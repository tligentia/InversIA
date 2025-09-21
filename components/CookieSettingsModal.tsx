import React, { useState, useEffect } from 'react';
import { useCookieConsent } from '../context/CookieConsentContext';

interface CookieSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const Toggle: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-800 focus:ring-offset-2 ${
            checked ? 'bg-red-600' : 'bg-slate-300 dark:bg-slate-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={disabled}
    >
        <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                checked ? 'translate-x-5' : 'translate-x-0'
            }`}
        />
    </button>
);


export const CookieSettingsModal: React.FC<CookieSettingsModalProps> = ({ isOpen, onClose }) => {
    const { consent, savePreferences, acceptAll, rejectAll } = useCookieConsent();
    const [functional, setFunctional] = useState(consent.functional);

    useEffect(() => {
        setFunctional(consent.functional);
    }, [consent.functional, isOpen]);

    const handleSave = () => {
        savePreferences({ functional });
        onClose();
    };

    const handleAcceptAll = () => {
        acceptAll();
        onClose();
    }
    
    const handleRejectAll = () => {
        rejectAll();
        onClose();
    }

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center z-[110] transition-opacity" onClick={onClose} aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl m-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Centro de Preferencias</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        <i className="fas fa-times fa-lg"></i>
                    </button>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                    Gestiona tus preferencias de consentimiento. Habilita o deshabilita los distintos tipos de cookies y guarda tu selección.
                </p>

                <div className="space-y-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200">Cookies Estrictamente Necesarias</h3>
                            <Toggle checked={true} onChange={() => {}} disabled={true} />
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                            Estas cookies son esenciales para el funcionamiento del sitio. Se utilizan para mantener la configuración de tema (claro/oscuro) y para recordar tus preferencias de consentimiento. No se pueden desactivar.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200">Cookies Funcionales y de Preferencias</h3>
                            <Toggle checked={functional} onChange={setFunctional} />
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                            Estas cookies nos permiten guardar tus datos de sesión, como tu cartera, el historial de análisis, la moneda seleccionada o tu clave API. Si las desactivas, la aplicación funcionará, pero no recordará ninguna de tus configuraciones entre visitas.
                        </p>
                    </div>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
                     <div className="flex items-center gap-2">
                         <button onClick={handleAcceptAll} className="px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md">Aceptar Todas</button>
                         <button onClick={handleRejectAll} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md">Rechazar Todas</button>
                    </div>
                    <button
                        onClick={handleSave}
                        className="w-full sm:w-auto px-6 py-2 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 active:bg-slate-900 transition dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300"
                    >
                        Guardar Mis Preferencias
                    </button>
                </div>
            </div>
        </div>
    );
};
