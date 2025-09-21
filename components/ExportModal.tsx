import React, { useState } from 'react';
import type { ReportData } from '../types';
import * as exportService from '../services/exportService';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    reportData: ReportData;
}

const exportOptions = [
    { format: 'pdf', label: 'PDF', icon: 'fa-file-pdf', color: 'text-red-600' },
    { format: 'docx', label: 'Word', icon: 'fa-file-word', color: 'text-blue-600' },
    { format: 'html', label: 'HTML', icon: 'fa-file-code', color: 'text-orange-600' },
    { format: 'md', label: 'Markdown', icon: 'fa-brands fa-markdown', color: 'text-slate-800' },
    { format: 'txt', label: 'Texto', icon: 'fa-file-alt', color: 'text-slate-500' },
    { format: 'clipboard', label: 'Copiar', icon: 'fa-copy', color: 'text-green-600' },
];

const LoadingSpinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-slate-100" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, reportData }) => {
    const [loading, setLoading] = useState<Record<string, boolean>>({});
    const [copySuccess, setCopySuccess] = useState(false);

    const handleExport = async (format: string) => {
        setLoading(prev => ({ ...prev, [format]: true }));
        setCopySuccess(false);

        try {
            switch (format) {
                case 'pdf': await exportService.exportAsPdf(reportData); break;
                case 'docx': await exportService.exportAsDocx(reportData); break;
                case 'html': await exportService.exportAsHtml(reportData); break;
                case 'md': await exportService.exportAsMarkdown(reportData); break;
                case 'txt': await exportService.exportAsTxt(reportData); break;
                case 'clipboard':
                    await exportService.copyToClipboard(reportData);
                    setCopySuccess(true);
                    setTimeout(() => setCopySuccess(false), 2500);
                    break;
            }
        } catch (error) {
            console.error(`Error exporting as ${format}:`, error);
            alert(`Hubo un error al exportar el informe como ${format}. Por favor, revisa la consola.`);
        } finally {
            setLoading(prev => ({ ...prev, [format]: false }));
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center z-50 transition-opacity" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-lg m-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">Exportar Informe</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <i className="fas fa-times fa-lg"></i>
                    </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {exportOptions.map(({ format, label, icon, color }) => (
                        <button
                            key={format}
                            onClick={() => handleExport(format)}
                            disabled={loading[format]}
                            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-800 ${
                                loading[format]
                                    ? 'bg-slate-500 border-slate-500 text-white cursor-wait'
                                    : `bg-slate-50 border-slate-200 hover:border-slate-800 hover:bg-white hover:shadow-lg`
                            }`}
                        >
                            {loading[format] ? (
                                <LoadingSpinner />
                            ) : (
                                <i className={`fas ${icon} fa-3x ${color}`}></i>
                            )}
                            <span className="mt-3 font-semibold text-sm text-center">
                                {copySuccess && format === 'clipboard' ? '¡Copiado!' : label}
                            </span>
                        </button>
                    ))}
                </div>
                <p className="text-xs text-slate-500 text-center mt-6">
                    Los formatos PDF y Word son ideales para informes formales. HTML preserva el estilo en la web. Markdown y Texto son para máxima compatibilidad.
                </p>
            </div>
        </div>
    );
};