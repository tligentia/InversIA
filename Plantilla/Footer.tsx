
import React from 'react';
import { AlertTriangle, Settings } from 'lucide-react';
import { APP_VERSION } from '../constants';
import { getAllowedIps } from './Parameters';

interface FooterProps {
  userIp: string | null;
  onShowCookies: () => void;
  onShowAjustes: () => void;
}

export const Footer: React.FC<FooterProps> = ({ userIp, onShowCookies, onShowAjustes }) => {
  const isDevIp = userIp ? getAllowedIps().includes(userIp) : false;

  return (
    <footer className="mt-12 border-t border-gray-200 pt-8 pb-4 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-center mb-8 flex items-center justify-center gap-3 text-xs text-gray-500">
          <AlertTriangle size={16} className="text-red-700" />
          <span className="font-medium uppercase tracking-tight">Aviso Legal: El contenido es meramente informativo y educativo.</span>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          <div className="flex items-center gap-4">
            <span className="text-red-700 font-black">{APP_VERSION}</span>
            {userIp && (
              <span className={`font-mono px-2 py-1 rounded border transition-colors ${
                isDevIp 
                  ? 'bg-green-50 text-green-700 border-green-200' 
                  : 'bg-gray-100 text-gray-500 border-gray-200'
              }`}>
                {userIp}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-8">
            <button onClick={onShowCookies} className="hover:text-gray-900 transition-colors uppercase">Cookies y Privacidad</button>
            <button 
              onClick={onShowAjustes} 
              className="flex items-center gap-1.5 text-gray-900 hover:text-red-700 transition-all group"
            >
              <Settings size={14} className="group-hover:rotate-45 transition-transform" />
              <span className="uppercase">Ajustes</span>
            </button>
            
            <div className="flex gap-3 text-gray-900">
              <a href="https://jesus.depablos.es" target="_blank" className="hover:text-red-700 transition-colors">Jesús de Pablos</a>
              <span className="text-gray-200">/</span>
              <a href="https://www.tligent.com" target="_blank" className="hover:text-red-700 transition-colors">Tligent</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
