import React, { useState, useEffect, useRef } from 'react';
import { LayoutGrid, Inbox, ArrowUpRight, Loader2, Square } from 'lucide-react';

// --- TYPES ---
export interface AppItem {
  name: string;
  url: string;
  visible: boolean;
}

// --- CONSTANTS ---
const SHEET_ID = '1wJkM8rmiXCrnB0K4h9jtme0m7f5I3y1j1PX5nmEaTII';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

// --- UTILS ---
const isValidUrl = (urlString: string): boolean => {
  if (!urlString) return false;
  try {
    new URL(urlString.trim());
    return true;
  } catch (e) {
    return false;
  }
};

const parseCSVLine = (line: string): string[] => {
  const columns: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) {
      columns.push(current.trim());
      current = '';
    } else current += char;
  }
  columns.push(current.trim());
  return columns.map(col => col.replace(/^"|"$/g, '').trim());
};

const getSafeHostname = (url: string) => {
  try {
    const hostname = new URL(url).hostname;
    return hostname.startsWith('www.') ? hostname.slice(4) : hostname;
  } catch (e) {
    return 'enlace externo';
  }
};

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const fetchAppData = async (): Promise<AppItem[]> => {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error('Error al cargar datos');
    const text = await response.text();
    const rows = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (rows.length < 2) return [];

    const header = parseCSVLine(rows[0]).map(h => h.toLowerCase());
    const idx = {
      nombre: header.findIndex(h => h.includes('nombre') || h.includes('name')),
      url: header.findIndex(h => h.includes('url') || h.includes('link')),
      visible: header.findIndex(h => h.includes('visible') || h.includes('mostrar'))
    };

    return rows.slice(1).map(row => {
      const cols = parseCSVLine(row);
      const name = cols[idx.nombre !== -1 ? idx.nombre : 0] || '';
      const url = cols[idx.url !== -1 ? idx.url : 2] || '';
      const visibleStr = cols[idx.visible !== -1 ? idx.visible : 3] || '';
      
      let isVisible = true;
      if (idx.visible !== -1 && visibleStr !== '') {
        isVisible = ['sí', 'si', 'yes', 'true', '1', 's'].includes(visibleStr.toLowerCase());
      }
      return { name, url, visible: isVisible };
    }).filter(app => app.name && isValidUrl(app.url) && app.visible);
  } catch (error) {
    console.error('Error fetching apps:', error);
    return [];
  }
};

// --- COMPONENT ---

export const AppMenu: React.FC = () => {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentUrl = window.location.href.replace(/\/$/, '');

  useEffect(() => {
    fetchAppData().then(data => {
      setApps(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isSameUrl = (appUrl: string) => appUrl.replace(/\/$/, '') === currentUrl;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 font-bold focus:outline-none group ${
          isOpen 
            ? 'bg-gray-900 text-white shadow-lg shadow-black/10' 
            : 'bg-white text-gray-900 border border-gray-100 hover:border-gray-900'
        }`}
      >
        <div className="relative flex items-center justify-center">
            <LayoutGrid size={16} className={`transition-transform duration-500 ${isOpen ? 'rotate-90 text-red-500' : 'text-gray-400 group-hover:text-gray-900'}`} />
        </div>
        <span className="text-[10px] uppercase tracking-widest">App</span>
        {!loading && apps.length > 0 && (
          <span className={`px-1.5 py-0.5 text-[9px] rounded-md font-black transition-colors ${
            isOpen ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-900 group-hover:text-white'
          }`}>
            {apps.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-72 bg-white border border-gray-100 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[100] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 ring-1 ring-black/5">
          <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Ecosistema Tligent</h3>
            <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500/20"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>
            </div>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-200">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center space-y-3">
                <Loader2 size={24} className="text-red-700 animate-spin" />
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sincronizando</p>
              </div>
            ) : apps.length === 0 ? (
              <div className="p-12 text-center text-gray-300">
                <Inbox size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Sin Aplicaciones</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1">
                {apps.map((app, i) => {
                  const active = isSameUrl(app.url);
                  const hostname = getSafeHostname(app.url);
                  
                  return active ? (
                    <div key={i} className="flex items-center p-3 rounded-xl bg-gray-50/50 border border-transparent opacity-40 cursor-not-allowed select-none transition-all">
                      <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center text-[10px] font-black text-gray-400 flex-shrink-0">
                        {getInitials(app.name)}
                      </div>
                      <div className="ml-3 overflow-hidden">
                        <p className="text-sm font-bold text-gray-500 truncate leading-none mb-1">{app.name}</p>
                        <p className="text-[10px] text-gray-400 truncate pl-3 flex items-center">
                           <span className="w-1 h-1 rounded-full bg-red-400 mr-2 animate-pulse"></span>
                           {hostname}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <a
                      key={i}
                      href={app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center p-3 rounded-xl hover:bg-gray-900 hover:shadow-lg hover:shadow-black/5 transition-all duration-200 border border-transparent active:scale-[0.98]"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-900 flex-shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors duration-200">
                        {getInitials(app.name)}
                      </div>
                      <div className="ml-3 flex-1 overflow-hidden">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-gray-900 group-hover:text-white truncate leading-none transition-colors duration-200">
                                {app.name}
                            </p>
                            <ArrowUpRight size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 group-hover:text-red-500 transition-all transform translate-y-1 group-hover:translate-y-0" />
                        </div>
                        <p className="text-[10px] text-gray-400 group-hover:text-white/40 truncate mt-1.5 pl-3 transition-colors duration-200">
                          {hostname}
                        </p>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-gray-50 bg-gray-50/30 flex justify-center">
            <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.3em]">Gestión Centralizada</p>
          </div>
        </div>
      )}
    </div>
  );
};