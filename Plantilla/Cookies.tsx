import React from 'react';
import { X, ShieldCheck, Database, ServerOff, Lock } from 'lucide-react';
import { COLORS } from './Parameters';

interface CookiesProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Cookies: React.FC<CookiesProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg text-red-700">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="font-black text-gray-900 uppercase tracking-tighter text-xl leading-tight">Cookies y Privacidad</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Compromiso de Transparencia</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-700 transition-all active:scale-90"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-gray-900">
              <Database size={18} className="text-red-700" />
              <h4 className="font-black uppercase text-sm tracking-tight">Almacenamiento Local (LocalStorage)</h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Esta aplicación <strong>no utiliza cookies de rastreo</strong>. Toda la información sensible, como tu clave de API de Gemini y tus configuraciones personales, se almacena exclusivamente en el <code>LocalStorage</code> de tu navegador. Esto significa que los datos nunca salen de tu dispositivo hacia nuestros sistemas.
            </p>
          </section>

          <section className="space-y-3 border-t border-gray-50 pt-6">
            <div className="flex items-center gap-2 text-gray-900">
              <ServerOff size={18} className="text-red-700" />
              <h4 className="font-black uppercase text-sm tracking-tight">Arquitectura Sin Servidor Propio</h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              No disponemos de bases de datos centralizadas. El intercambio de información ocurre directamente entre tu navegador y la API oficial de Google Gemini. Cumplimos con el principio de <strong>Privacidad por Diseño</strong>, garantizando que el desarrollador no tiene acceso a tus consultas ni a tu actividad.
            </p>
          </section>

          <section className="space-y-3 border-t border-gray-50 pt-6">
            <div className="flex items-center gap-2 text-gray-900">
              <Lock size={18} className="text-red-700" />
              <h4 className="font-black uppercase text-sm tracking-tight">Cumplimiento Normativo</h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Diseñada bajo los estándares del <strong>RGPD (Reglamento General de Protección de Datos)</strong>. Tienes control total sobre tu información: al pulsar en el botón <span className="text-red-700 font-bold">"Reset System"</span> en el pie de página, se eliminarán instantáneamente todos los registros locales de forma irreversible.
            </p>
          </section>

          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <p className="text-[11px] text-gray-500 font-medium italic text-center">
              "Tu privacidad no es una opción, es la base de nuestra arquitectura."
            </p>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="p-6 border-t border-gray-100 bg-white">
          <button 
            onClick={onClose} 
            className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all active:scale-[0.98] shadow-lg shadow-gray-200"
          >
            Entendido y Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};