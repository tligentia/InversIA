import React from 'react';
import { LOCAL_STORAGE_COOKIE_MAP } from '../constants/cookieConfig';

export const CookiePolicyView: React.FC = () => {
    
    const necessaryCookies = Object.entries(LOCAL_STORAGE_COOKIE_MAP).filter(([, category]) => category === 'necessary');
    const functionalCookies = Object.entries(LOCAL_STORAGE_COOKIE_MAP).filter(([, category]) => category === 'functional');

    return (
        <div className="mt-8 p-6 sm:p-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg prose prose-sm max-w-none dark:prose-invert">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Política de Cookies y Almacenamiento Local</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Última actualización: 1 de Agosto de 2024</p>
            
            <h3>¿Qué son las "Cookies"?</h3>
            <p>
                Cuando hablamos de "cookies" en esta aplicación, nos referimos a datos que se guardan en el almacenamiento local (<code>localStorage</code>) de tu navegador. Esta tecnología nos permite recordar información y preferencias entre tus visitas para mejorar tu experiencia, sin necesidad de un registro de usuario.
            </p>

            <h3>¿Cómo utilizamos el Almacenamiento Local?</h3>
            <p>
                Utilizamos el almacenamiento local para dos propósitos principales, que puedes gestionar en cualquier momento:
            </p>

            <h4>1. Almacenamiento Estrictamente Necesario</h4>
            <p>
                Estos datos son esenciales para el funcionamiento básico del sitio y no se pueden desactivar. No almacenan información personal identificable.
            </p>
            <ul>
                {necessaryCookies.map(([key]) => (
                     <li key={key}><strong><code>{key}</code></strong>: {key === 'cookieConsent' ? 'Guarda tu elección sobre el consentimiento de cookies.' : 'Almacena tu preferencia de tema (claro/oscuro) para evitar parpadeos visuales al cargar la página.'}</li>
                ))}
            </ul>
            
            <h4>2. Almacenamiento Funcional y de Preferencias</h4>
            <p>
                Estos datos se utilizan para recordar tus elecciones y personalizar tu experiencia. Son opcionales y puedes desactivarlos en cualquier momento. Si los desactivas, la aplicación seguirá funcionando, pero no recordará tus datos entre sesiones.
            </p>
            <ul>
                 {functionalCookies.map(([key]) => (
                     <li key={key}><strong><code>{key}</code></strong>: Almacena datos como tu cartera, historial de análisis, sesiones activas, moneda preferida y clave de API para que no tengas que introducirlos cada vez que visitas la aplicación.</li>
                ))}
            </ul>

            <h3>Cumplimiento de LOPD, GDPR y AI Act</h3>
            <p>
                Esta aplicación está diseñada pensando en la privacidad:
            </p>
            <ul>
                <li><strong>No Recopilamos Datos Personales</strong>: No requerimos registro y no recopilamos información personal identificable (nombre, email, etc.). Tu dirección IP puede ser utilizada para aplicar una clave de desarrollador si corresponde, pero no se almacena ni se asocia con tu actividad.</li>
                <li><strong>Consentimiento Granular</strong>: Te ofrecemos control total sobre el almacenamiento de datos funcionales. Tu elección es respetada en todo momento.</li>
                <li><strong>Transparencia</strong>: Esta política detalla exactamente qué datos se guardan y por qué.</li>
            </ul>

            <h3>Cómo Gestionar tus Preferencias</h3>
            <p>
                Puedes cambiar tu configuración de consentimiento en cualquier momento haciendo clic en el enlace "Gestionar Cookies" en el pie de página del sitio. También puedes borrar el almacenamiento de tu navegador a través de la configuración del mismo.
            </p>
        </div>
    );
};
