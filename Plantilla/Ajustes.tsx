
import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Globe, Plus, Trash2, RefreshCcw, AlertCircle, Zap } from 'lucide-react';
import { getAllowedIps, saveAllowedIps } from './Parameters';

interface AjustesProps {
  isOpen: boolean;
  onClose: () => void;
  userIp: string | null;
}

export const Ajustes: React.FC<AjustesProps> = ({ isOpen, onClose, userIp }) => {
  const [ips, setIps] = useState<string[]>(getAllowedIps());
  const [newIp, setNewIp] = useState('');

  useEffect(() => {
    if (userIp && isOpen) setNewIp(userIp);
  }, [userIp, isOpen]);

  if (!isOpen) return null;

  const handleAddIp = (ipToAdd: string) => {
    const cleanIp = ipToAdd.trim();
    if (cleanIp && !ips.includes(cleanIp)) {
      const updated = [...ips, cleanIp];
      setIps(updated);
      saveAllowedIps(updated);
      setNewIp('');
    }
  };

  const handleRemoveIp = (ipToRemove: string) => {
    const updated = ips.filter(ip => ip !== ipToRemove);
    setIps(updated);
    saveAllowedIps(updated);
  };

  const clearMemory = () => {
    const confirmMessage = `⚠️ ACCIÓN CRÍTICA: RESET TOTAL DEL SISTEMA\n\nEsta acción borrará PERMANENTEMENTE todos tus datos locales.`;
    
    if (confirm(confirmMessage)) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-900 rounded-lg text-white">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="font-black text-gray-900 uppercase tracking-tighter text-xl leading-tight">Panel de Ajustes</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Configuración del Sistema</p>
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
          
          {/* Memorizar IP Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-gray-900">
              <Globe size={18} className="text-red-700" />
              <h4 className="font-black uppercase text-xs tracking-widest">Memorizar esta IP</h4>
            </div>
            
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newIp} 
                onChange={(e) => setNewIp(e.target.value)} 
                placeholder="IP a memorizar..." 
                className="flex-1 bg-gray-50 border border-gray-200 p-3 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-gray-900"
              />
              <button 
                onClick={() => handleAddIp(newIp)}
                className="p-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-all active:scale-90 flex items-center gap-2"
              >
                <Plus size={20} />
                <span className="text-[10px] font-black uppercase hidden sm:inline">Añadir</span>
              </button>
            </div>

            {userIp && (
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-200 flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Detección Actual</p>
                  <p className="font-mono text-xs text-gray-900 font-bold">{userIp}</p>
                </div>
                {ips.includes(userIp) ? (
                   <span className="text-[9px] font-black uppercase text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                     <Zap size={10} fill="currentColor"/> Memorizada
                   </span>
                ) : (
                  <button 
                    onClick={() => setNewIp(userIp)}
                    className="text-[9px] font-black uppercase text-red-700 hover:underline"
                  >
                    Usar esta IP
                  </button>
                )}
              </div>
            )}
          </section>

          {/* System Reset Section */}
          <section className="space-y-4 border-t border-gray-50 pt-8 pb-4">
            <div className="flex items-center gap-2 text-gray-900">
              <RefreshCcw size={18} className="text-red-700" />
              <h4 className="font-black uppercase text-xs tracking-widest">Reset del Sistema</h4>
            </div>
            <div className="bg-red-50 p-6 rounded-3xl border border-red-100 space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={24} className="text-red-700 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-black text-[11px] uppercase text-red-900 mb-1 tracking-widest">Borrado Total de Memoria</h5>
                  <p className="text-[11px] text-red-800 leading-relaxed font-medium">
                    Al ejecutar el Reset, la aplicación olvidará instantáneamente todos tus datos locales.
                  </p>
                </div>
              </div>
              <button 
                onClick={clearMemory}
                className="w-full bg-red-700 hover:bg-red-800 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl shadow-red-200 flex items-center justify-center gap-3"
              >
                <RefreshCcw size={18} />
                Borrar todos los datos y reiniciar
              </button>
            </div>
          </section>

        </div>

        {/* Footer Modal */}
        <div className="p-6 border-t border-gray-100 bg-white">
          <button 
            onClick={onClose} 
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-[0.98]"
          >
            Cerrar Ajustes
          </button>
        </div>
      </div>
    </div>
  );
};
