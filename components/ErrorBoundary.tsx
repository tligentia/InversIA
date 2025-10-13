import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  // FIX: The previous implementation was causing a TypeScript error where `this.props` was not
  // recognized. Reverting to a standard constructor-based class component and explicitly
  // calling `super(props)` is the most robust way to ensure component properties are initialized correctly.
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-300 p-8 text-center">
            <div className="max-w-md">
                <i className="fas fa-bomb text-5xl text-red-500 mb-6"></i>
                <h1 className="text-3xl font-bold text-red-700 dark:text-red-500 mb-2">¡Ups! Algo ha ido muy mal.</h1>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                    La aplicación ha encontrado un error crítico y no puede continuar. Esto suele ser un problema temporal.
                </p>
                
                {this.state.error && (
                    <details className="mb-6 text-left bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-xs">
                        <summary className="cursor-pointer font-semibold">Detalles técnicos del error</summary>
                        <pre className="mt-2 whitespace-pre-wrap break-words">
                            <code>{this.state.error.toString()}</code>
                        </pre>
                    </details>
                )}
                
                <button
                    type="button"
                    onClick={this.handleReload}
                    className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-500 active:bg-red-700 transition shadow-lg text-lg"
                >
                    <i className="fas fa-sync-alt mr-2"></i>
                    Recargar la aplicación
                </button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
