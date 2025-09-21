import React from 'react';

export const Disclaimer: React.FC = () => {
    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 mt-12">
            <div className="text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="font-bold mb-1">
                    <i className="fas fa-exclamation-triangle mr-2 text-yellow-500"></i>
                    Aviso Legal
                </p>
                <p>
                    La información y los análisis generados por InversIA tienen un propósito puramente formativo y educativo. No constituyen en ningún caso asesoramiento financiero, recomendación de inversión, ni una oferta para comprar o vender activos. Las decisiones de inversión son personales y conllevan riesgos. Realice su propia investigación y consulte con un profesional cualificado antes de tomar cualquier decisión financiera.
                </p>
            </div>
        </div>
    );
};
