import React, { useState } from 'react';

interface LockScreenProps {
    onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const [isUnlocking, setIsUnlocking] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Clave: STAR (insensible a mayúsculas/minúsculas)
        if (password.trim().toUpperCase() === 'STAR') {
            setIsUnlocking(true);
            // Pequeño retardo para la animación de salida
            setTimeout(() => {
                onUnlock();
            }, 600);
        } else {
            setError(true);
            // Vibración y reset del estado de error
            setTimeout(() => {
                setError(false);
                setPassword('');
            }, 500);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-500">
            {/* Decoración de fondo sutil */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-red-600/5 blur-[120px]"></div>
                <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-slate-400/5 blur-[120px]"></div>
            </div>

            <div className={`relative w-full max-w-sm p-8 transition-all duration-700 ${isUnlocking ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100'}`}>
                
                {/* Cabecera */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-xl mb-6 ring-1 ring-slate-900/5 dark:ring-white/10">
                        <i className="fas fa-chart-pie text-3xl text-red-600"></i>
                    </div>
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                        InversIA
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                        Acceso Restringido
                    </p>
                </div>

                {/* Formulario de Contraseña */}
                <form onSubmit={handleLogin} className={`relative group ${error ? 'animate-shake' : ''}`}>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <i className={`fas fa-lock transition-colors duration-300 ${error ? 'text-red-500' : 'text-slate-400 group-focus-within:text-red-600'}`}></i>
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`block w-full pl-11 pr-12 py-4 bg-white dark:bg-slate-800 border-2 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-0 transition-all duration-300 shadow-lg ${
                                error 
                                    ? 'border-red-500 focus:border-red-500' 
                                    : 'border-transparent focus:border-red-600 hover:border-slate-200 dark:hover:border-slate-700'
                            }`}
                            placeholder="Introduce la contraseña"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={!password}
                            className="absolute right-2 top-2 bottom-2 aspect-square bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg flex items-center justify-center hover:bg-red-600 dark:hover:bg-red-600 dark:hover:text-white transition-all duration-300 disabled:opacity-0 disabled:scale-75"
                        >
                            <i className="fas fa-arrow-right"></i>
                        </button>
                    </div>
                    
                    {error && (
                        <div className="absolute -bottom-8 left-0 right-0 text-center">
                            <p className="text-red-500 text-sm font-semibold animate-pulse">
                                Contraseña incorrecta
                            </p>
                        </div>
                    )}
                </form>

                {/* Pie */}
                <div className="mt-12 text-center">
                    <p className="text-xs text-slate-400 dark:text-slate-600 font-mono">
                        System v2025.v12A
                    </p>
                </div>
            </div>
        </div>
    );
};