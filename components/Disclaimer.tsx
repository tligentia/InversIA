import React, { useState, useEffect, useRef } from 'react';

export const Disclaimer: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const timerRef = useRef<number | null>(null);

    const handleClick = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        // Si ya está expandido, un clic lo contrae inmediatamente.
        if (isExpanded) {
            setIsExpanded(false);
            return;
        }

        setIsExpanded(true);

        // Se vuelve a contraer después de 8 segundos
        timerRef.current = window.setTimeout(() => {
            setIsExpanded(false);
            timerRef.current = null;
        }, 8000);
    };

    // Limpia el temporizador si el componente se desmonta
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    const longText = "La información y los análisis generados por InversIA tienen un propósito puramente formativo y educativo. No constituyen en ningún caso asesoramiento financiero, recomendación de inversión, ni una oferta para comprar o vender activos. Las decisiones de inversión son personales y conllevan riesgos. Realice su propia investigación y consulte con un profesional cualificado antes de tomar cualquier decisión financiera.";
    const shortText = "El contenido es puramente formativo, no es asesoramiento financiero. (Clic para leer más)";

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 mt-12">
            <button
                type="button"
                onClick={handleClick}
                className="w-full text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                aria-expanded={isExpanded}
                aria-live="polite"
            >
                {isExpanded ? (
                    <div>
                        <p className="font-bold mb-1">
                            <i className="fas fa-exclamation-triangle mr-2 text-yellow-500"></i>
                            Aviso Legal
                        </p>
                        <p>
                           {longText}
                        </p>
                    </div>
                ) : (
                    <p>
                        <span className="font-bold">
                            <i className="fas fa-exclamation-triangle mr-2 text-yellow-500"></i>
                            Aviso Legal:
                        </span>
                        <span className="ml-1">
                           {shortText}
                        </span>
                    </p>
                )}
            </button>
        </div>
    );
};
