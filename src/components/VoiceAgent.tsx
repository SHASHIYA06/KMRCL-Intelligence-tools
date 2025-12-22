
import React, { useEffect, useRef, useState } from 'react';
import { X, Mic, MicOff, Volume2, Minimize2, Maximize2, Activity, CheckCircle, FileText, Mail } from 'lucide-react';
import { VoiceAgentService } from '../services/geminiService';
import { getAllKnownFiles, fetchDriveFiles } from '../services/driveService';

interface VoiceAgentProps {
  isOpen: boolean;
  onClose: () => void;
  onToolCall?: (name: string, args: any) => Promise<any>;
  userName?: string;
}

export const VoiceAgent: React.FC<VoiceAgentProps> = ({ isOpen, onClose, onToolCall, userName }) => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [transcription, setTranscription] = useState<{user: string, model: string}>({ user: '', model: '' });
  const [isMinimized, setIsMinimized] = useState(false);
  const [liveArtifact, setLiveArtifact] = useState<{title: string, content: string, type: 'email' | 'file' | 'analysis'} | null>(null);
  
  const serviceRef = useRef<VoiceAgentService | null>(null);

  useEffect(() => {
    if (isOpen) {
      startSession();
    } else {
      endSession();
    }
    return () => {
      endSession();
    };
  }, [isOpen]);

  const startSession = async () => {
    setStatus('connecting');
    serviceRef.current = new VoiceAgentService();
    
    try {
      // Refresh file list to ensure agent has latest context
      await fetchDriveFiles('root');
      const knownFiles = getAllKnownFiles().map(f => f.name);

      serviceRef.current.onStatusChange = (s) => setStatus(s as any);
      serviceRef.current.onTranscriptionUpdate = (u, m) => {
          setTranscription(prev => ({
              user: u || prev.user,
              model: m || prev.model
          }));
      };
      
      // Intercept tool calls to update the Live Artifact display
      const wrappedOnToolCall = async (name: string, args: any) => {
          if (name === 'draftEmail') {
              setLiveArtifact({
                  title: `Drafting Email to ${args.to}`,
                  content: `Subject: ${args.topic}\n\nPoints: ${args.keyPoints}`,
                  type: 'email'
              });
              setIsMinimized(false); // Pop up to show the artifact
          }
          if (name === 'selectDocument') {
              setLiveArtifact({
                  title: 'File Selected',
                  content: `Opening: ${args.fileName}`,
                  type: 'file'
              });
          }
          
          if (onToolCall) return onToolCall(name, args);
          return { status: 'ok' };
      };

      if (onToolCall) {
          serviceRef.current.onToolCall = wrappedOnToolCall;
      }

      await serviceRef.current.connect(userName || 'Engineer', knownFiles);
    } catch (e: any) {
      console.error("Voice agent connection error:", e);
      setStatus('error');
      
      // Show user-friendly error message
      if (e.message?.includes('Microphone')) {
        alert('Microphone access is required for the Voice Agent. Please allow microphone permissions and try again.');
      } else if (e.message?.includes('Audio not supported')) {
        alert('Your browser does not support the audio features required for the Voice Agent.');
      } else if (e.message?.includes('API Key')) {
        alert('API Key is missing or invalid. Please check your settings.');
      } else {
        alert(`Voice Agent connection failed: ${e.message}`);
      }
    }
  };

  const endSession = async () => {
    if (serviceRef.current) {
      await serviceRef.current.disconnect();
      serviceRef.current = null;
    }
    setStatus('idle');
    setLiveArtifact(null);
  };

  if (!isOpen) return null;

  // Minimized Floating Bubble
  if (isMinimized) {
      return (
          <div className="fixed bottom-4 right-4 z-[100] animate-float">
              <div className="bg-black/90 border border-neonPurple/50 rounded-full p-4 shadow-[0_0_20px_rgba(188,19,254,0.3)] flex items-center space-x-3 cursor-pointer" onClick={() => setIsMinimized(false)}>
                  <div className="relative">
                       <Mic className="w-6 h-6 text-neonPurple animate-pulse" />
                       <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></span>
                  </div>
                  <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">Agent Active</span>
                      <span className="text-[10px] text-gray-400">Click to expand</span>
                  </div>
              </div>
          </div>
      );
  }

  // Full Overlay
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
      <div className="relative w-full max-w-2xl p-6 rounded-3xl glass-panel border border-neonPurple/50 shadow-[0_0_50px_rgba(188,19,254,0.3)] flex gap-6">
        
        {/* Controls */}
        <div className="absolute top-4 right-4 flex space-x-2">
            <button 
                onClick={() => setIsMinimized(true)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                title="Minimize"
            >
                <Minimize2 className="w-5 h-5" />
            </button>
            <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-red-500/20 transition-colors text-gray-400 hover:text-red-400"
                title="End Session"
            >
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* Left Side: Agent Visuals */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neonBlue to-neonPurple">
              VOID AGENT
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Status: <span className={`font-bold ${
                status === 'connected' ? 'text-green-400' : 
                status === 'connecting' ? 'text-yellow-400' : 
                status === 'error' ? 'text-red-400' : 'text-gray-500'
              }`}>
                {status === 'connected' ? 'Connected & Listening' :
                 status === 'connecting' ? 'Connecting...' :
                 status === 'error' ? 'Connection Failed' : 'Disconnected'}
              </span>
            </p>
            {status === 'error' && (
              <p className="text-xs text-red-400 mt-1">
                Check microphone permissions and API key
              </p>
            )}
          </div>

          <div className="relative w-32 h-32 flex items-center justify-center">
            {status === 'connected' && (
              <>
                <div className="absolute inset-0 bg-neonPurple/30 rounded-full animate-ping"></div>
                <div className="absolute inset-4 bg-neonBlue/30 rounded-full animate-pulse"></div>
              </>
            )}
            <div className={`
              relative z-10 w-20 h-20 rounded-full flex items-center justify-center
              bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl
              ${status === 'connected' ? 'animate-pulse-slow' : 'opacity-50'}
            `}>
              <Mic className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        {/* Right Side: Live Context & Artifacts */}
        <div className="flex-[1.5] border-l border-white/10 pl-6 flex flex-col min-h-[300px]">
            
            {/* Live Artifact Panel */}
            {liveArtifact ? (
                <div className="mb-4 bg-white/5 rounded-xl border border-neonBlue/30 p-4 animate-fade-in">
                    <div className="flex items-center text-neonBlue text-sm font-bold mb-2">
                        {liveArtifact.type === 'email' && <Mail className="w-4 h-4 mr-2" />}
                        {liveArtifact.type === 'file' && <FileText className="w-4 h-4 mr-2" />}
                        {liveArtifact.title}
                        <span className="ml-auto text-[10px] bg-neonBlue/20 px-2 py-0.5 rounded-full">GENERATED</span>
                    </div>
                    <div className="text-xs text-gray-300 font-mono whitespace-pre-wrap bg-black/40 p-2 rounded">
                        {liveArtifact.content}
                    </div>
                    <div className="mt-2 text-[10px] text-gray-500 text-center">
                        Result visible in main dashboard.
                    </div>
                </div>
            ) : (
                <div className="mb-4 flex-1 flex flex-col items-center justify-center text-gray-500 border border-dashed border-white/5 rounded-xl">
                    <Activity className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-xs">Waiting for agent action...</p>
                </div>
            )}

            {/* Transcript Area */}
            <div className="h-32 overflow-y-auto space-y-3 text-left w-full pr-2 custom-scrollbar bg-black/20 rounded-lg p-2 border border-white/5">
                {transcription.user && (
                    <div className="text-right">
                        <span className="text-[10px] text-gray-500 uppercase">You</span>
                        <p className="text-sm text-gray-300 bg-white/5 p-2 rounded-lg rounded-tr-none border border-white/5">{transcription.user}</p>
                    </div>
                )}
                 {transcription.model && (
                    <div className="text-left">
                        <span className="text-[10px] text-neonPurple uppercase">Agent</span>
                        <p className="text-sm text-white bg-neonPurple/10 p-2 rounded-lg rounded-tl-none border border-neonPurple/20">{transcription.model}</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
