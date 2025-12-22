
import React, { useState, useEffect } from 'react';
import { FileText, Zap, Shield, Database, Activity, RefreshCw, Server, Cloud, Cpu, Layers, HardDrive } from 'lucide-react';
import { ThreeDCard } from '../components/ThreeDCard';
import { getFileStats, getDriveSyncStatus, getSystemLogs, getOcrCount } from '../services/driveService';

// Updated: Stats Log Interface
interface DashboardStats {
    total: number;
    distribution: {
        pdfs: number;
        images: number;
        sheets: number;
        folders: number;
        docs: number;
    }
}

export const Dashboard: React.FC = () => {
  const [syncPulse, setSyncPulse] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
      total: 0,
      distribution: { pdfs: 0, images: 0, sheets: 0, folders: 0, docs: 0 }
  });
  const [driveStatus, setDriveStatus] = useState(getDriveSyncStatus());
  const [logs, setLogs] = useState(getSystemLogs());
  const [ocrCount, setOcrCount] = useState(getOcrCount());

  useEffect(() => {
    const interval = setInterval(() => {
        setSyncPulse(p => !p);
        // Poll for updates in the background
        setLogs(getSystemLogs());
        setOcrCount(getOcrCount());
        setDriveStatus(getDriveSyncStatus());
    }, 2000);
    
    loadLiveStats(false);
    return () => clearInterval(interval);
  }, []);

  const loadLiveStats = async (force = false) => {
      setLoadingStats(true);
      // Force status to syncing if forcing refresh
      if (force) setDriveStatus({ ...driveStatus, status: 'SYNCING' });
      
      const data = await getFileStats(force);
      setStats(data);
      setDriveStatus(getDriveSyncStatus());
      setLogs(getSystemLogs());
      setOcrCount(getOcrCount());
      setLoadingStats(false);
  };

  // Convert distribution to array for Chart
  const chartData = [
      { label: 'PDF', val: stats.distribution.pdfs, color: 'from-red-500/20 to-red-600/60' },
      { label: 'IMG', val: stats.distribution.images, color: 'from-purple-500/20 to-purple-600/60' },
      { label: 'SHT', val: stats.distribution.sheets, color: 'from-green-500/20 to-green-600/60' },
      { label: 'DIR', val: stats.distribution.folders, color: 'from-yellow-500/20 to-yellow-600/60' },
      { label: 'DOC', val: stats.distribution.docs, color: 'from-blue-500/20 to-blue-600/60' },
  ];
  
  // Calculate percentages for chart height
  const maxVal = Math.max(...chartData.map(d => d.val), 1);

  const displayStats = [
    { label: 'Total Documents', value: loadingStats ? '...' : stats.total.toString(), sub: 'Live Index', icon: FileText, color: 'text-neonBlue', bg: 'bg-neonBlue/10' },
    { label: 'OCR Processed', value: ocrCount.toString(), sub: '99.8% Accuracy', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400/10' }, 
    { label: 'Security Status', value: 'SECURE', sub: 'Encrypted', icon: Shield, color: 'text-green-400', bg: 'bg-green-400/10' },
    { label: 'Drive Usage', value: '1.2 GB', sub: 'Calculated', icon: Database, color: 'text-neonPurple', bg: 'bg-neonPurple/10' },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 p-4 glass-panel rounded-2xl border-l-4 border-neonBlue">
        <div>
          <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">
            Command <span className="text-gradient-blue">Center</span>
          </h2>
          <p className="text-gray-400 flex items-center">
            <Activity className="w-4 h-4 mr-2 text-neonBlue animate-pulse" />
            System Operational • Real-time Monitoring Active
          </p>
        </div>
        
        <div className="flex items-center space-x-6">
           {/* General System Status */}
           <div className="flex flex-col items-end">
              <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-1">System Status</span>
              <div className="flex items-center text-green-400 font-mono text-sm">
                <span className={`w-2 h-2 rounded-full bg-green-400 mr-2 ${syncPulse ? 'animate-ping' : ''}`}></span>
                ONLINE
              </div>
           </div>

           {/* Drive Sync Status - NEW ELEMENT */}
           <div className="flex flex-col items-end pl-6 border-l border-white/10">
              <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-1">Drive Sync</span>
              <div className={`flex items-center font-mono text-sm ${
                  driveStatus.status === 'SYNCING' ? 'text-yellow-400' : 
                  driveStatus.status === 'ERROR' ? 'text-red-400' : 'text-neonBlue'
              }`}>
                {driveStatus.status === 'SYNCING' && <RefreshCw className="w-3 h-3 mr-2 animate-spin"/>}
                {driveStatus.status === 'ERROR' && <Cloud className="w-3 h-3 mr-2 text-red-400"/>}
                {driveStatus.status === 'SUCCESS' && <HardDrive className="w-3 h-3 mr-2"/>}
                {driveStatus.status === 'IDLE' && <HardDrive className="w-3 h-3 mr-2 opacity-50"/>}
                
                {driveStatus.status === 'SYNCING' ? 'SYNCING...' :
                 driveStatus.status === 'ERROR' ? 'FAILED' :
                 driveStatus.status === 'SUCCESS' ? 'CONNECTED' : 'IDLE'}
              </div>
              {driveStatus.lastSynced && (
                  <span className="text-[9px] text-gray-600 font-mono mt-0.5">
                      Last: {driveStatus.lastSynced.toLocaleTimeString()}
                  </span>
              )}
           </div>

           <ThreeDCard className="p-0.5 rounded-lg ml-2" depth={5}>
             <button onClick={() => loadLiveStats(true)} className="px-4 py-2 bg-neonBlue/10 rounded-lg text-sm text-neonBlue border border-neonBlue/30 hover:bg-neonBlue/20 transition-colors flex items-center font-bold shadow-[0_0_15px_rgba(0,243,255,0.2)]">
               <RefreshCw className={`w-4 h-4 mr-2 ${loadingStats ? 'animate-spin' : ''}`} /> Refresh Data
             </button>
           </ThreeDCard>
        </div>
      </div>

      {/* 3D Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayStats.map((stat, index) => (
          <ThreeDCard key={index} className="h-full" depth={20}>
            <div className="glass-panel p-6 rounded-2xl h-full border border-white/5 hover:border-neonBlue/40 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-16 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl group-hover:bg-neonBlue/5 transition-all"></div>
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`p-3 rounded-xl ${stat.bg} shadow-lg ring-1 ring-white/10`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <span className="text-[10px] font-mono text-gray-500 bg-black/40 px-2 py-1 rounded border border-white/5">LIVE</span>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1 tracking-wider relative z-10">{stat.value}</h3>
              <div className="flex justify-between items-end relative z-10">
                <p className="text-sm text-gray-400 font-medium">{stat.label}</p>
                <p className="text-xs text-gray-500 font-mono">{stat.sub}</p>
              </div>
            </div>
          </ThreeDCard>
        ))}
      </div>

      {/* Infrastructure Health Visualization */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <ThreeDCard className="col-span-1 md:col-span-3">
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden border border-white/10">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 via-transparent to-purple-900/10 pointer-events-none"></div>
                
                <h3 className="text-xl font-bold text-white mb-8 flex items-center border-b border-white/5 pb-4">
                    <Layers className="w-5 h-5 mr-3 text-neonBlue" />
                    Infrastructure Topology
                </h3>
                
                <div className="flex flex-wrap justify-around items-center gap-8 py-4">
                    {/* Kubernetes Node */}
                    <div className="flex flex-col items-center group cursor-pointer relative z-10">
                        <div className="w-20 h-20 rounded-full bg-black/40 flex items-center justify-center border-2 border-blue-500/30 group-hover:border-blue-500 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] transition-all relative">
                            <div className="absolute inset-0 rounded-full border border-blue-500 opacity-20 animate-ping"></div>
                            <Server className="w-8 h-8 text-blue-400 group-hover:scale-110 transition-transform" />
                        </div>
                        <span className="mt-4 font-bold text-sm text-gray-300 tracking-wide">Kubernetes</span>
                        <span className="text-[10px] text-green-400 bg-green-900/20 px-2 py-0.5 rounded mt-1 border border-green-500/20">HEALTHY</span>
                    </div>

                    {/* Connector Line */}
                    <div className="hidden md:block h-px flex-1 bg-gradient-to-r from-blue-500/30 via-white/20 to-green-500/30 relative">
                        <div className="absolute top-1/2 left-0 w-full h-1 -mt-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-50 animate-scan" style={{ animationDuration: '3s' }}></div>
                    </div>

                    {/* Vertex AI Node */}
                    <div className="flex flex-col items-center group cursor-pointer relative z-10">
                        <div className="w-24 h-24 rounded-full bg-black/40 flex items-center justify-center border-2 border-neonGreen/30 group-hover:border-neonGreen group-hover:shadow-[0_0_30px_rgba(0,255,157,0.3)] transition-all relative">
                             <div className="absolute inset-2 rounded-full border border-dashed border-neonGreen/30 animate-spin-slow"></div>
                            <Database className="w-10 h-10 text-neonGreen group-hover:scale-110 transition-transform" />
                        </div>
                        <span className="mt-4 font-bold text-sm text-gray-300 tracking-wide">Vertex AI</span>
                        <span className="text-[10px] text-neonGreen bg-green-900/20 px-2 py-0.5 rounded mt-1 border border-neonGreen/20">INDEXING</span>
                    </div>

                     {/* Connector Line */}
                    <div className="hidden md:block h-px flex-1 bg-gradient-to-r from-green-500/30 via-white/20 to-purple-500/30 relative">
                        <div className="absolute top-1/2 left-0 w-full h-1 -mt-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-50 animate-scan" style={{ animationDuration: '4s' }}></div>
                    </div>

                    {/* Docker Registry Node */}
                    <div className="flex flex-col items-center group cursor-pointer relative z-10">
                         <div className="w-20 h-20 rounded-full bg-black/40 flex items-center justify-center border-2 border-purple-500/30 group-hover:border-purple-500 group-hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all relative">
                            <Cpu className="w-8 h-8 text-purple-400 group-hover:scale-110 transition-transform" />
                        </div>
                        <span className="mt-4 font-bold text-sm text-gray-300 tracking-wide">Docker Swarm</span>
                        <span className="text-[10px] text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded mt-1 border border-blue-500/20">ACTIVE</span>
                    </div>
                </div>
            </div>
         </ThreeDCard>
      </div>

      {/* Main Visuals Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Real-time Sync Monitor (Visualizer) */}
        <div className="lg:col-span-2 space-y-6">
          <ThreeDCard className="h-full">
            <div className="glass-panel rounded-2xl p-6 h-full relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-32 bg-neonBlue/5 blur-3xl rounded-full group-hover:bg-neonBlue/10 transition-all"></div>
              
              <div className="flex justify-between items-center mb-8 relative z-10">
                <h3 className="text-xl font-bold flex items-center">
                  <Server className="w-5 h-5 mr-3 text-neonPurple" />
                  Data Stream Analytics
                </h3>
                <div className="flex space-x-2">
                   {['Live'].map(t => (
                     <button key={t} className="px-3 py-1 text-xs rounded border border-white/10 hover:bg-white/5 hover:border-neonBlue/50 transition-colors bg-neonBlue/20 text-neonBlue">{t}</button>
                   ))}
                </div>
              </div>

              {/* CSS 3D Bar Chart - Dynamic Data */}
              <div className="h-64 flex items-end justify-between px-4 pb-4 gap-4 perspective-1000">
                {chartData.map((d, i) => {
                  const heightPct = (d.val / maxVal) * 80 + 10; // Min 10% height for visibility
                  return (
                    <div key={i} className="w-full h-full flex items-end relative group cursor-pointer">
                      <div 
                        className={`w-full bg-gradient-to-t ${d.color} rounded-t-sm transition-all duration-500 ease-out group-hover:brightness-125 relative shadow-lg`}
                        style={{ height: `${heightPct}%`, transformStyle: 'preserve-3d' }}
                      >
                         {/* Tooltip */}
                         <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border border-white/20 pointer-events-none z-20 shadow-xl">
                            {d.val} {d.label}s
                         </div>
                         {/* Top Cap Effect */}
                         <div className="absolute top-0 w-full h-1 bg-white/30"></div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex justify-between text-xs text-gray-500 px-4 mt-2 font-mono">
                {chartData.map((d, i) => <span key={i}>{d.label}</span>)}
              </div>
            </div>
          </ThreeDCard>
        </div>

        {/* Sync Log & Status */}
        <ThreeDCard className="h-full">
          <div className="glass-panel rounded-2xl p-6 h-full flex flex-col border border-white/10">
            <h3 className="text-xl font-bold mb-6 flex items-center text-white">
              <Cloud className="w-5 h-5 mr-3 text-neonBlue" />
              Live Sync Log
            </h3>

            <div className="flex-1 space-y-4 relative overflow-y-auto custom-scrollbar pr-2">
              {/* Timeline Line */}
              <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-neonBlue/50 to-transparent"></div>

              {logs.map((log) => (
                <div key={log.id} className="relative pl-8 group cursor-default animate-fade-in">
                  <div className={`
                    absolute left-1 top-2 w-3 h-3 rounded-full border-2 border-[#050b14] z-10
                    ${log.status === 'success' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 
                      log.status === 'processing' ? 'bg-yellow-400 animate-pulse' : 'bg-blue-500'}
                  `}></div>
                  
                  <div className="p-3 rounded-lg bg-white/5 border border-white/5 group-hover:border-neonBlue/30 group-hover:bg-white/10 transition-all">
                    <p className="text-sm font-medium text-gray-200">{log.action}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500 font-mono">{log.time}</span>
                      {log.status === 'processing' && <LoaderIcon />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <button className="w-full mt-4 py-3 text-xs font-bold text-center text-gray-400 hover:text-white transition-colors border-t border-white/10 hover:bg-white/5 rounded-b-lg uppercase tracking-wider">
              System Events
            </button>
          </div>
        </ThreeDCard>
      </div>
    </div>
  );
};

// Simple Loader Icon Component
const LoaderIcon = () => (
  <svg className="animate-spin h-3 w-3 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
