
import React, { useState } from 'react';
import { LayoutGrid, HardDrive, Search, Settings, Menu, Mic, Activity, FileText, LogOut, Copyright } from 'lucide-react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onToggleVoice: () => void;
  currentUser?: User;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, onToggleVoice, currentUser, onLogout }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // Filter Nav Items based on Role and Permissions
  const isAdmin = currentUser?.role === 'ADMIN';
  const perms = currentUser?.permissions;

  const allNavItems = [
    { 
        id: 'dashboard', 
        label: 'Dashboard', 
        icon: LayoutGrid, 
        isVisible: isAdmin // Only admin sees full dashboard
    },
    { 
        id: 'drive', 
        label: 'Drive Browser', 
        icon: HardDrive, 
        isVisible: isAdmin || perms?.driveBrowser 
    }, 
    { 
        id: 'intelligence', 
        label: 'Intelligence Hub', 
        icon: Search, 
        isVisible: isAdmin || (perms?.intelligenceHub.email || perms?.intelligenceHub.general || perms?.intelligenceHub.letter || perms?.intelligenceHub.metroRag)
    },
    { 
        id: 'analysis', 
        label: 'Doc Analysis', 
        icon: FileText, 
        isVisible: isAdmin || perms?.docAnalysis 
    },
    { 
        id: 'settings', 
        label: 'Settings', 
        icon: Settings, 
        isVisible: true // Everyone has settings, but content differs
    },
  ];

  const navItems = allNavItems.filter(item => item.isVisible);

  return (
    <div className="flex h-screen bg-[#050b14] text-white overflow-hidden relative font-sans">
      
      {/* 3D Isometric Background Grid */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
         <div className="iso-grid opacity-20"></div>
         <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-neonPurple/5 to-transparent"></div>
         <div className="absolute bottom-0 left-0 w-1/2 h-full bg-gradient-to-t from-neonBlue/5 to-transparent"></div>
      </div>

      {/* Floating Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-neonPurple/10 rounded-full blur-[100px] animate-blob filter mix-blend-screen"></div>
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-neonBlue/10 rounded-full blur-[100px] animate-blob animation-delay-2000 filter mix-blend-screen"></div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full h-16 glass-panel z-50 flex items-center justify-between px-4">
        <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-neonBlue to-neonPurple">KMRCL AI</span>
        <button onClick={() => setSidebarOpen(!isSidebarOpen)}>
          <Menu className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 glass-panel transform transition-transform duration-300 ease-in-out border-r border-white/5
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0
        flex flex-col
      `}>
        <div className="h-20 flex items-center px-6 border-b border-white/10 bg-black/20">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-neonBlue to-blue-600 flex items-center justify-center mr-3 shadow-[0_0_15px_rgba(0,243,255,0.3)]">
             <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
             <h1 className="text-lg font-bold tracking-wider leading-none">KMRCL</h1>
             <span className="text-[10px] text-neonBlue tracking-[0.2em]">INTELLIGENCE</span>
          </div>
        </div>

        {/* User Info */}
        <div className="px-6 py-4 border-b border-white/5">
            <p className="text-xs text-gray-500 uppercase">Logged in as</p>
            <p className="text-sm font-bold text-white truncate">{currentUser?.name}</p>
            <p className="text-[10px] text-neonPurple border border-neonPurple/30 inline-block px-1 rounded bg-neonPurple/10 mt-1">{currentUser?.role}</p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden
                ${activeTab === item.id 
                  ? 'text-white shadow-[0_0_20px_rgba(0,243,255,0.15)]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              {activeTab === item.id && (
                <div className="absolute inset-0 bg-gradient-to-r from-neonBlue/20 to-transparent opacity-100 transition-opacity"></div>
              )}
              <item.icon className={`w-5 h-5 mr-3 relative z-10 transition-transform group-hover:scale-110 ${activeTab === item.id ? 'text-neonBlue drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]' : ''}`} />
              <span className="font-medium relative z-10">{item.label}</span>
              {activeTab === item.id && <div className="absolute right-0 w-1 h-full bg-neonBlue shadow-[0_0_10px_#00f3ff]"></div>}
            </button>
          ))}
        </nav>

        {/* Void Agent Trigger */}
        <div className="p-6 border-t border-white/10 bg-gradient-to-t from-neonPurple/10 to-transparent space-y-3">
          <button 
            onClick={onToggleVoice}
            className="group w-full relative overflow-hidden rounded-xl py-4 px-4 flex items-center justify-center space-x-2 transition-all transform hover:scale-[1.02]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-neonPurple to-pink-600 opacity-80 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] opacity-20"></div>
            
            <Mic className="w-5 h-5 text-white relative z-10 animate-pulse" />
            <span className="font-bold text-sm text-white relative z-10 tracking-wider">ACTIVATE AGENT</span>
          </button>

          <button 
             onClick={onLogout}
             className="w-full py-2 flex items-center justify-center text-xs text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
             <LogOut className="w-4 h-4 mr-2" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative z-10 overflow-y-auto pt-20 md:pt-0 scrollbar-hide perspective-1000 flex flex-col">
        <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
           {children}
        </div>
        
        {/* Footer Credit */}
        <footer className="w-full py-4 border-t border-white/5 bg-black/40 text-center">
             <p className="text-[10px] text-gray-500 flex items-center justify-center uppercase tracking-widest font-mono">
                <Copyright className="w-3 h-3 mr-1" /> Created by SHASHI SHEKHAR MISHRA
             </p>
        </footer>
      </main>
    </div>
  );
};
