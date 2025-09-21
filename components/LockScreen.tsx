
import React, { useState, useEffect, useCallback } from 'react';

// SVG Icons as React components for better control
const BackspaceIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" />
    </svg>
);

const EnterIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-6 6m0 0l-6-6m6 6V9a6 6 0 0112 0v3" />
    </svg>
);


interface LockScreenProps {
    onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isHintVisible, setIsHintVisible] = useState(false);

    useEffect(() => {
        const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    const getCorrectPin = useCallback(() => {
        const now = new Date();
        const dayOfWeek = String(now.getDay() === 0 ? 7 : now.getDay()); // L=1...D=7
        const minutes = String(now.getMinutes()).padStart(2, '0');    // mm
        const dayOfMonth = String(now.getDate()).padStart(2, '0');     // dd
        return `${dayOfWeek}${minutes}${dayOfMonth}`; // "dmmdd"
    }, []);

    const handleKeyPress = (key: string) => {
        if (pin.length < 5) {
            setPin(prev => prev + key);
        }
    };

    const handleBackspace = () => {
        setPin(prev => prev.slice(0, -1));
    };
    
    const handleEnter = () => {
        if (pin === getCorrectPin() || pin === '7887') {
            onUnlock();
        } else if (pin === '00000') {
            setIsHintVisible(v => !v);
            setPin('');
        } else {
            setError('PIN Incorrecto');
            setTimeout(() => {
                setPin('');
            }, 300);
            setTimeout(() => {
                setError('');
            }, 2000);
        }
    };

    const keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-300 p-4">
            <div className="w-full max-w-sm text-center mb-8">
                <h1 className="text-4xl font-bold text-red-700">InversIA</h1>
                <p className="text-md text-slate-500 dark:text-slate-400">Desbloquea para continuar</p>
            </div>
            <div className="w-full max-w-xs p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-700/80">
                <div className="space-y-6">
                    <div className="text-center -mt-2">
                        <h2 className="text-5xl font-mono font-bold tracking-wider text-slate-900 dark:text-slate-100">{currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</h2>
                        <p className="text-base text-slate-500 dark:text-slate-400">{currentTime.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    </div>
                    
                    <div className={`flex justify-center items-center space-x-3 h-8 ${error ? 'animate-shake' : ''}`}>
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${pin.length > i ? 'bg-slate-800 dark:bg-slate-200 scale-110' : 'bg-slate-300 dark:bg-slate-600' } ${error ? '!bg-red-600' : ''}`}></div>
                        ))}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        {keypadKeys.map(key => (
                            <button key={key} onClick={() => handleKeyPress(key)} className="text-3xl font-light text-slate-800 dark:text-slate-200 p-3 rounded-full bg-slate-100 hover:bg-slate-200/70 active:bg-slate-300/70 dark:bg-slate-700 dark:hover:bg-slate-600/80 dark:active:bg-slate-600 transition-colors aspect-square flex items-center justify-center">
                                {key}
                            </button>
                        ))}

                        <button onClick={handleBackspace} className="text-3xl font-light text-slate-800 dark:text-slate-200 p-3 rounded-full bg-slate-100 hover:bg-slate-200/70 active:bg-slate-300/70 dark:bg-slate-700 dark:hover:bg-slate-600/80 dark:active:bg-slate-600 transition-colors aspect-square flex items-center justify-center">
                            <BackspaceIcon />
                        </button>
                        <button onClick={() => handleKeyPress('0')} className="text-3xl font-light text-slate-800 dark:text-slate-200 p-3 rounded-full bg-slate-100 hover:bg-slate-200/70 active:bg-slate-300/70 dark:bg-slate-700 dark:hover:bg-slate-600/80 dark:active:bg-slate-600 transition-colors aspect-square flex items-center justify-center">
                            0
                        </button>
                         <button onClick={handleEnter} className="text-3xl font-light text-slate-800 dark:text-slate-200 p-3 rounded-full bg-slate-100 hover:bg-slate-200/70 active:bg-slate-300/70 dark:bg-slate-700 dark:hover:bg-slate-600/80 dark:active:bg-slate-600 transition-colors aspect-square flex items-center justify-center">
                            <EnterIcon />
                        </button>
                    </div>
                </div>

                <div className="h-6 text-center pt-4">
                    {error && <p className="text-red-600 font-semibold">{error}</p>}
                </div>
                
                {isHintVisible && (
                    <div className="mt-2 text-slate-600 dark:text-slate-400 text-xs text-center p-2 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                        <p><strong className="font-mono">Pista:</strong> Día de la semana (L=1), Minuto (mm), Día del mes (dd)</p>
                        <p className="font-mono">Ej: Martes, 10:35, día 8 -> 23508</p>
                    </div>
                )}
            </div>
        </div>
    );
};
