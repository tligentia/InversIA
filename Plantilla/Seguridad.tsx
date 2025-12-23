import React, { useState, useEffect, useCallback, useMemo } from 'react';

interface Props {
  onLogin: () => void;
}

export const Security: React.FC<Props> = ({ onLogin }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const gridChars = useMemo(() => {
    const required = ['7', '8', 'S', 'T', 'A', 'R'];
    const filler = 'BCDEFGHIJKMNOPQUVWXYZ01234569'.split('');
    let combined = [...required];
    while (combined.length < 16) {
      const char = filler[Math.floor(Math.random() * filler.length)];
      if (!combined.includes(char)) combined.push(char);
    }
    return combined.sort(() => Math.random() - 0.5);
  }, []);

  const handleInput = useCallback((char: string) => {
    if (error) return;
    if (pin.length < 4) setPin(prev => prev + char.toUpperCase());
  }, [pin, error]);

  const handleBackspace = () => setPin(prev => prev.slice(0, -1));

  useEffect(() => {
    if (pin.length === 4) {
      if (['7887', 'STAR'].includes(pin)) onLogin();
      else {
        setError(true);
        setTimeout(() => { setPin(''); setError(false); }, 800);
      }
    }
  }, [pin, onLogin]);

  return (
    <div className="fixed inset-0 bg-white z-[999] flex flex-col justify-center items-center font-sans">
      <div className={`max-w-xs w-full px-6 flex flex-col items-center transition-transform ${error ? 'animate-shake' : ''}`}>
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border-2 border-red-700 mb-4">
             <span className="text-red-700 font-black text-xl">GO</span>
          </div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Seguridad</h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Acceso restringido</p>
        </div>

        <div className="flex justify-center gap-3 mb-10">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`w-12 h-14 flex items-center justify-center text-3xl font-black border-b-4 transition-all 
                ${error ? 'border-red-600 text-red-600' : (pin[i] ? 'border-gray-900 text-gray-900' : 'border-gray-100 text-gray-200')}`}>
              {pin[i] ? '*' : '•'}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2 w-full mb-8">
          {gridChars.map((char, idx) => (
            <button key={idx} onClick={() => handleInput(char)} disabled={pin.length >= 4 || error}
              className="aspect-square flex items-center justify-center text-3xl font-black text-gray-900 border border-gray-100 rounded-2xl hover:bg-gray-900 hover:text-white transition-all active:scale-95 disabled:opacity-30">
              {char}
            </button>
          ))}
        </div>

        <button onClick={handleBackspace} className="text-[10px] font-bold text-gray-400 hover:text-red-700 uppercase tracking-wider transition-colors">Borrar Entrada</button>
      </div>
      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); } 20%, 40%, 60%, 80% { transform: translateX(6px); } }
        .animate-shake { animation: shake 0.6s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>
    </div>
  );
};