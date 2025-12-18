
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Activity } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050b14] flex items-center justify-center p-4 relative overflow-hidden font-sans text-gray-200">
          {/* Background Ambience */}
          <div className="absolute inset-0 pointer-events-none">
             <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-neonPurple/10 to-transparent"></div>
             <div className="absolute bottom-0 left-0 w-1/2 h-full bg-gradient-to-t from-neonBlue/10 to-transparent"></div>
          </div>

          <div className="relative z-10 max-w-lg w-full">
            <div className="glass-panel p-8 rounded-3xl border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.2)] text-center backdrop-blur-xl">
              
              <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                <AlertTriangle className="w-10 h-10 text-red-500 animate-pulse" />
              </div>

              <h1 className="text-3xl font-bold text-white mb-2">System Critical Error</h1>
              <p className="text-gray-400 mb-6">
                The Intelligence Hub encountered an unexpected runtime exception.
              </p>

              {this.state.error && (
                <div className="bg-black/40 rounded-xl p-4 mb-6 text-left border border-white/5 overflow-auto max-h-40 custom-scrollbar">
                  <p className="text-red-400 font-mono text-xs break-all">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                     <pre className="text-gray-500 font-mono text-[10px] mt-2 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                     </pre>
                  )}
                </div>
              )}

              <div className="flex gap-4 justify-center">
                <button
                  onClick={this.handleReload}
                  className="px-6 py-3 bg-gradient-to-r from-neonBlue to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Reboot System
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center text-xs text-gray-500">
                <Activity className="w-3 h-3 mr-2" /> KMRCL Recovery Protocol v2.1
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
