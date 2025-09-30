import React, { useState, useEffect, useRef } from 'react';

interface InputDialogProps {
    isOpen: boolean;
    title: string;
    label: string;
    initialValue?: string;
    confirmText?: string;
    onConfirm: (value: string) => void;
    onClose: () => void;
}

export const InputDialog: React.FC<InputDialogProps> = ({
    isOpen,
    title,
    label,
    initialValue = '',
    confirmText = 'Confirmar',
    onConfirm,
    onClose,
}) => {
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue);
            // Focus the input when the dialog opens
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, initialValue]);

    if (!isOpen) {
        return null;
    }

    const handleConfirm = () => {
        if (value.trim()) {
            onConfirm(value.trim());
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleConfirm();
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center z-50 transition-opacity" onClick={onClose} aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">{title}</h2>
                <div>
                    <label htmlFor="dialog-input" className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 block">{label}</label>
                    <input
                        id="dialog-input"
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full h-11 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800 transition bg-white dark:bg-slate-900 dark:border-slate-600"
                    />
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 active:bg-slate-300 transition text-sm dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-500 active:bg-red-700 transition text-sm"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};