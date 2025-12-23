import React from 'react';
import { X, HelpCircle, ShieldCheck, Cpu, Zap, Database } from 'lucide-react';

interface ManualProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Manual: React.FC<ManualProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-gray-100 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-900 rounded-lg text-white">
              <HelpCircle size={24} />
            </div>
            <div>
              <h3 className="font-black text-gray-900 uppercase tracking-tighter text-xl leading-tight">Guía del Sistema</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Manual de Operaciones</p>
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
        <div className="p-8 overflow-y-auto space-y-10 custom-scrollbar">
          
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-gray-900 border-b border-gray-50 pb-2">
              < Zap size={20} className="text-red-700" />
              <h4 className="font-black uppercase text-xs tracking-[0.2em]">Propósito</h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Esta plataforma es un entorno avanzado diseñado para el <strong>análisis estratégico de activos Cripto, DeFi y Fiat</strong>. Permite la integración fluida de modelos de inteligencia artificial para procesar datos complejos y generar insights de mercado en tiempo real.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-gray-900 border-b border-gray-50 pb-2">
              <ShieldCheck size={20} className="text-red-700" />
              <h4 className="font-black uppercase text-xs tracking-[0.2em]">Seguridad Multicapa</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <h5 className="font-bold text-[10px] uppercase text-gray-900 mb-2 tracking-widest">Acceso PIN</h5>
                <p className="text-[11px] text-gray-500">Bloqueo de seguridad dinámico con teclado aleatorio para prevenir accesos no autorizados.</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <h5 className="font-bold text-[10px] uppercase text-gray-900 mb-2 tracking-widest">Whitelist IP</h5>
                <p className="text-[11px] text-gray-500">Permite saltar el login automáticamente si tu dirección IP está registrada en los ajustes de <strong>IPs Autorizadas</strong>.</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-gray-900 border-b border-gray-50 pb-2">
              <Cpu size={20} className="text-red-700" />
              <h4 className="font-black uppercase text-xs tracking-[0.2em]">Motor de IA</h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Utilizamos el modelo <strong>Gemini 3 Flash</strong> para el procesamiento de lenguaje natural y análisis técnico. Puedes configurar tu propia API Key en el panel de ajustes para personalizar la potencia de cálculo.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-gray-900 border-b border-gray-50 pb-2">
              <Database size={20} className="text-red-700" />
              <h4 className="font-black uppercase text-xs tracking-[0.2em]">Gestión de Datos</h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Toda la configuración es <strong>Local-First</strong>. No enviamos tus claves ni preferencias a servidores externos; todo reside en la memoria de tu navegador (LocalStorage). El botón de Reset elimina rastro alguno del sistema.
            </p>
          </section>

        </div>

        {/* Footer Modal */}
        <div className="p-6 border-t border-gray-100 bg-white">
          <button 
            onClick={onClose} 
            className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-[0.98] shadow-lg shadow-gray-200"
          >
            Cerrar Manual
          </button>
        </div>
      </div>
    </div>
  );
};