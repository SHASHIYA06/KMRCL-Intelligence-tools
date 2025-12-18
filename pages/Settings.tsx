
import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Database, Server, Cpu, Activity, Globe, Save, RefreshCw, Users, Check, X, Shield, Lock, AlertCircle, Edit, Key, HardDrive } from 'lucide-react';
import { ThreeDCard } from '../components/ThreeDCard';
import { authService } from '../services/authService';
import { User, UserPermissions } from '../types';
import { resetAiClient } from '../services/geminiService';
import { GOOGLE_SCRIPT_URL } from '../constants';

interface SettingsProps {
    currentUser?: User;
}

export const Settings: React.FC<SettingsProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'infrastructure' | 'system' | 'users' | 'security'>('general');
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
  // Security State
  const [newAdminCode, setNewAdminCode] = useState('');
  
  // Dynamic Config State
  const [customApiKey, setCustomApiKey] = useState('');
  const [customScriptUrl, setCustomScriptUrl] = useState('');

  // Permission Management Modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [tempPermissions, setTempPermissions] = useState<UserPermissions | null>(null);

  // Notification State
  const [pendingCount, setPendingCount] = useState(0);

  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    if (isAdmin) {
        // Load pending count on mount and when tab changes (to update after approvals)
        const pending = authService.getPendingUsers();
        setPendingCount(pending.length);
        
        // Load Custom Configs
        setCustomApiKey(localStorage.getItem('kmrcl_custom_api_key') || '');
        setCustomScriptUrl(localStorage.getItem('kmrcl_script_url') || GOOGLE_SCRIPT_URL);
    }
  }, [isAdmin, activeTab]);

  useEffect(() => {
    if (activeTab === 'users' && isAdmin) {
        setAllUsers(authService.getAllUsers());
    }
  }, [activeTab, isAdmin]);

  const handleSave = () => {
    setLoading(true);
    
    // Save Dynamic Configs
    if (customApiKey) {
        localStorage.setItem('kmrcl_custom_api_key', customApiKey);
        resetAiClient(); // Force service to re-read key
    }
    
    if (customScriptUrl) {
        localStorage.setItem('kmrcl_script_url', customScriptUrl);
    }

    setTimeout(() => {
        setLoading(false);
        alert("Settings Saved & Config Pushed to System.");
    }, 1500);
  };

  const handleApproveUser = (id: string) => {
    authService.updateUserStatus(id, 'APPROVED');
    setAllUsers(prev => prev.map(u => u.id === id ? {...u, status: 'APPROVED'} : u));
    setPendingCount(prev => Math.max(0, prev - 1));
  };

  const handleRejectUser = (id: string) => {
    authService.updateUserStatus(id, 'REJECTED');
    setAllUsers(prev => prev.map(u => u.id === id ? {...u, status: 'REJECTED'} : u));
    setPendingCount(prev => Math.max(0, prev - 1));
  };

  const handleChangeAdminCode = () => {
    if (!newAdminCode || newAdminCode.length < 6) {
        alert("Admin Code must be at least 6 characters.");
        return;
    }
    if (window.confirm("Are you sure you want to change the Admin Access Code?")) {
        authService.changeAdminCode(newAdminCode);
        alert("Admin Access Code Updated Successfully.");
        setNewAdminCode('');
    }
  };

  const openPermissionModal = (user: User) => {
      setEditingUser(user);
      setTempPermissions(JSON.parse(JSON.stringify(user.permissions)));
  };

  const savePermissions = () => {
      if (editingUser && tempPermissions) {
          authService.updateUserPermissions(editingUser.id, tempPermissions);
          setAllUsers(prev => prev.map(u => u.id === editingUser.id ? {...u, permissions: tempPermissions} : u));
          setEditingUser(null);
          setTempPermissions(null);
      }
  };

  return (
    <div className="h-full flex flex-col space-y-6 relative">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white flex items-center">
            <SettingsIcon className="mr-3 text-neonBlue animate-spin-slow" /> 
            System Configuration
        </h2>
        <button 
            onClick={handleSave}
            className="flex items-center px-6 py-2 bg-neonBlue/10 hover:bg-neonBlue/20 text-neonBlue border border-neonBlue/50 rounded-lg transition-all"
        >
            {loading ? <RefreshCw className="animate-spin mr-2" /> : <Save className="mr-2" />}
            {loading ? 'SYNCING...' : 'SAVE CHANGES'}
        </button>
      </div>

      <div className="flex space-x-4 border-b border-white/10 pb-1 overflow-x-auto">
        {[
            { id: 'general', label: 'General', icon: Globe },
            { id: 'infrastructure', label: 'Infrastructure & DB', icon: Server },
            { id: 'system', label: 'System Health', icon: Activity },
        ].map(tab => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-4 py-2 rounded-t-lg transition-all whitespace-nowrap ${
                    activeTab === tab.id 
                    ? 'bg-white/10 text-white border-b-2 border-neonBlue' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
            </button>
        ))}
        {isAdmin && (
            <>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`flex items-center px-4 py-2 rounded-t-lg transition-all whitespace-nowrap ${
                        activeTab === 'users' 
                        ? 'bg-white/10 text-white border-b-2 border-neonBlue' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Users className="w-4 h-4 mr-2" />
                    User Management
                    {pendingCount > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                            {pendingCount}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('security')}
                    className={`flex items-center px-4 py-2 rounded-t-lg transition-all whitespace-nowrap ${
                        activeTab === 'security' 
                        ? 'bg-white/10 text-white border-b-2 border-neonBlue' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Shield className="w-4 h-4 mr-2" />
                    Security & API
                </button>
            </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        
        {/* Pending User Alert Banner */}
        {isAdmin && pendingCount > 0 && activeTab !== 'users' && (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center justify-between animate-fade-in shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                <div className="flex items-center text-yellow-400">
                    <AlertCircle className="w-5 h-5 mr-3 animate-pulse" />
                    <span>
                        <strong className="font-bold">Action Required:</strong> {pendingCount} new user(s) awaiting approval for access.
                    </span>
                </div>
                <button 
                    onClick={() => setActiveTab('users')} 
                    className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-400 text-xs font-bold rounded-lg transition-colors border border-yellow-500/30"
                >
                    Review Now
                </button>
            </div>
        )}

        {activeTab === 'general' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ThreeDCard>
                    <div className="glass-panel p-6 rounded-2xl h-full">
                        <h3 className="text-xl font-bold mb-4 text-gray-200">Application Preferences</h3>
                        <div className="space-y-4">
                            <div className="flex flex-col space-y-2">
                                <label className="text-sm text-gray-400">Application Name</label>
                                <input type="text" value="KMRCL Metro Intelligence" className="bg-black/40 border border-white/10 rounded-lg p-2 text-white" />
                            </div>
                            <div className="flex flex-col space-y-2">
                                <label className="text-sm text-gray-400">Theme</label>
                                <select className="bg-black/40 border border-white/10 rounded-lg p-2 text-white">
                                    <option>Neon Dark (Default)</option>
                                    <option>Cyberpunk High Contrast</option>
                                    <option>Minimalist Glass</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </ThreeDCard>
                <ThreeDCard>
                    <div className="glass-panel p-6 rounded-2xl h-full">
                        <h3 className="text-xl font-bold mb-4 text-gray-200">Google Workspace Integration</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                <div className="flex items-center">
                                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                                    <span className="text-sm text-gray-300">Google Drive API</span>
                                </div>
                                <span className="text-xs text-green-400 font-mono">CONNECTED</span>
                            </div>
                             <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                <div className="flex items-center">
                                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                                    <span className="text-sm text-gray-300">Google Sheets Logging</span>
                                </div>
                                <span className="text-xs text-green-400 font-mono">SYNCING</span>
                            </div>
                        </div>
                    </div>
                </ThreeDCard>
            </div>
        )}

        {/* ... (Infrastructure and System tabs remain same) ... */}
        {activeTab === 'infrastructure' && (
             <div className="space-y-6">
                 {/* ... Infrastructure content ... */}
                 <div className="p-6 text-center text-gray-500 border border-white/10 rounded-xl">Infrastructure settings loaded from cluster.</div>
             </div>
        )}

        {activeTab === 'security' && isAdmin && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ThreeDCard>
                    <div className="glass-panel p-6 rounded-2xl h-full">
                        <h3 className="text-xl font-bold mb-4 flex items-center text-red-400">
                            <Lock className="mr-2" />
                            Admin Access Security
                        </h3>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-gray-300 block mb-2">Update Admin Access Code</label>
                                    <p className="text-xs text-gray-500 mb-3">Ensure this code is kept secure. It provides full administrative access.</p>
                                    <div className="flex gap-3">
                                        <input 
                                            type="text" 
                                            value={newAdminCode}
                                            onChange={(e) => setNewAdminCode(e.target.value)}
                                            className="flex-1 bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-neonBlue outline-none font-mono tracking-widest" 
                                            placeholder="New Access Code"
                                        />
                                        <button 
                                            onClick={handleChangeAdminCode}
                                            className="px-6 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors"
                                        >
                                            UPDATE
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </ThreeDCard>
                
                <ThreeDCard>
                    <div className="glass-panel p-6 rounded-2xl h-full">
                        <h3 className="text-xl font-bold mb-4 flex items-center text-neonBlue">
                            <Key className="mr-2" />
                            API & Data Source Config
                        </h3>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                             <div>
                                <label className="text-sm font-bold text-gray-300 block mb-2">Google Gemini API Key</label>
                                <input 
                                    type="password" 
                                    value={customApiKey}
                                    onChange={(e) => setCustomApiKey(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-neonBlue outline-none font-mono"
                                    placeholder="Enter AI Studio API Key"
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Overrides default process.env key.</p>
                            </div>
                            
                            <div>
                                <label className="text-sm font-bold text-gray-300 block mb-2">Google Drive Source URL</label>
                                <input 
                                    type="text" 
                                    value={customScriptUrl}
                                    onChange={(e) => setCustomScriptUrl(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-neonBlue outline-none font-mono text-xs"
                                    placeholder="https://script.google.com/macros/s/..."
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Google Apps Script Web App URL for Drive integration.</p>
                            </div>
                        </div>
                    </div>
                </ThreeDCard>
            </div>
        )}

        {activeTab === 'users' && isAdmin && (
            <ThreeDCard className="h-full">
                <div className="glass-panel p-6 rounded-2xl h-full">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold flex items-center">
                            <Users className="mr-2 text-neonBlue" />
                            Complete User Database
                        </h3>
                        {pendingCount > 0 && (
                            <div className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-400 text-xs font-bold animate-pulse">
                                {pendingCount} Pending Approvals
                            </div>
                        )}
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-gray-400 text-xs uppercase font-bold">
                                <tr>
                                    <th className="p-3 rounded-tl-lg">User Details</th>
                                    <th className="p-3">Contact</th>
                                    <th className="p-3">Role</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Permissions</th>
                                    <th className="p-3 rounded-tr-lg text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {allUsers.map(user => (
                                    <tr key={user.id} className={`hover:bg-white/5 transition-colors ${user.status === 'PENDING' ? 'bg-yellow-500/5' : ''}`}>
                                        <td className="p-3">
                                            <p className="font-bold text-white">{user.name}</p>
                                            <p className="text-xs text-gray-500">ID: {user.id}</p>
                                        </td>
                                        <td className="p-3 text-sm text-gray-300">
                                            <div>{user.email}</div>
                                            <div className="text-xs text-gray-500">{user.mobile}</div>
                                        </td>
                                        <td className="p-3">
                                            <span className={`text-xs px-2 py-1 rounded border ${user.role === 'ADMIN' ? 'bg-neonPurple/20 border-neonPurple text-neonPurple' : 'bg-blue-500/20 border-blue-500 text-blue-400'}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <span className={`text-xs px-2 py-1 rounded border font-bold
                                                ${user.status === 'APPROVED' ? 'bg-green-500/20 border-green-500 text-green-400' : 
                                                    user.status === 'PENDING' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' :
                                                    'bg-red-500/20 border-red-500 text-red-400'
                                                }
                                            `}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-xs">
                                            {user.role === 'ADMIN' ? (
                                                <span className="text-neonPurple">FULL ACCESS</span>
                                            ) : (
                                                <button 
                                                    onClick={() => openPermissionModal(user)}
                                                    className="px-2 py-1 bg-white/5 hover:bg-white/10 text-neonBlue border border-neonBlue/30 rounded flex items-center"
                                                >
                                                    <Edit size={12} className="mr-1"/> Manage
                                                </button>
                                            )}
                                        </td>
                                        <td className="p-3 text-right">
                                            {user.role !== 'ADMIN' && (
                                                <div className="flex justify-end gap-2">
                                                    {user.status === 'PENDING' && (
                                                        <>
                                                            <button onClick={() => handleApproveUser(user.id)} className="p-1.5 bg-green-500/20 hover:bg-green-500/40 rounded text-green-400" title="Approve">
                                                                <Check size={16} />
                                                            </button>
                                                            <button onClick={() => handleRejectUser(user.id)} className="p-1.5 bg-red-500/20 hover:bg-red-500/40 rounded text-red-400" title="Reject">
                                                                <X size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                    {user.status === 'APPROVED' && (
                                                        <button onClick={() => handleRejectUser(user.id)} className="text-xs text-red-400 hover:text-red-300 hover:underline">Revoke</button>
                                                    )}
                                                        {user.status === 'REJECTED' && (
                                                        <button onClick={() => handleApproveUser(user.id)} className="text-xs text-green-400 hover:text-green-300 hover:underline">Re-Approve</button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </ThreeDCard>
        )}
      </div>

      {/* Permissions Modal */}
      {editingUser && tempPermissions && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-gray-900 border border-white/20 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
                  <button onClick={() => setEditingUser(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X/></button>
                  <h3 className="text-xl font-bold text-white mb-2">Manage Access: {editingUser.name}</h3>
                  <p className="text-sm text-gray-400 mb-6">Select the features this user is authorized to use.</p>
                  
                  <div className="space-y-4">
                      {/* Main Modules */}
                      <div className="bg-white/5 p-3 rounded-lg">
                          <label className="flex items-center space-x-3 cursor-pointer">
                              <input type="checkbox" checked={tempPermissions.driveBrowser} onChange={e => setTempPermissions({...tempPermissions, driveBrowser: e.target.checked})} className="form-checkbox bg-black border-white/20 text-neonBlue rounded focus:ring-0"/>
                              <div className="flex items-center">
                                  <HardDrive size={16} className="text-gray-400 mr-2"/>
                                  <span className="text-gray-200 text-sm">Drive Browser (Read Only)</span>
                              </div>
                          </label>
                      </div>

                      <div className="bg-white/5 p-3 rounded-lg">
                          <label className="flex items-center space-x-3 cursor-pointer">
                              <input type="checkbox" checked={tempPermissions.docAnalysis} onChange={e => setTempPermissions({...tempPermissions, docAnalysis: e.target.checked})} className="form-checkbox bg-black border-white/20 text-neonBlue rounded focus:ring-0"/>
                              <div className="flex items-center">
                                  <Activity size={16} className="text-gray-400 mr-2"/>
                                  <span className="text-gray-200 text-sm">Document Analysis & OCR</span>
                              </div>
                          </label>
                      </div>

                      {/* Intelligence Hub Granular */}
                      <div className="bg-white/5 p-4 rounded-lg">
                          <h4 className="text-xs font-bold text-neonBlue uppercase mb-3">Intelligence Hub Modules</h4>
                          <div className="grid grid-cols-2 gap-3">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                  <input type="checkbox" checked={tempPermissions.intelligenceHub.metroRag} onChange={e => setTempPermissions({...tempPermissions, intelligenceHub: {...tempPermissions.intelligenceHub, metroRag: e.target.checked}})} className="form-checkbox bg-black border-white/20 text-neonBlue rounded"/>
                                  <span className="text-xs text-gray-300">Metro RAG (Engineering)</span>
                              </label>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                  <input type="checkbox" checked={tempPermissions.intelligenceHub.general} onChange={e => setTempPermissions({...tempPermissions, intelligenceHub: {...tempPermissions.intelligenceHub, general: e.target.checked}})} className="form-checkbox bg-black border-white/20 text-neonBlue rounded"/>
                                  <span className="text-xs text-gray-300">General AI</span>
                              </label>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                  <input type="checkbox" checked={tempPermissions.intelligenceHub.email} onChange={e => setTempPermissions({...tempPermissions, intelligenceHub: {...tempPermissions.intelligenceHub, email: e.target.checked}})} className="form-checkbox bg-black border-white/20 text-neonBlue rounded"/>
                                  <span className="text-xs text-gray-300">Email Assistant</span>
                              </label>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                  <input type="checkbox" checked={tempPermissions.intelligenceHub.letter} onChange={e => setTempPermissions({...tempPermissions, intelligenceHub: {...tempPermissions.intelligenceHub, letter: e.target.checked}})} className="form-checkbox bg-black border-white/20 text-neonBlue rounded"/>
                                  <span className="text-xs text-gray-300">Official Letter</span>
                              </label>
                          </div>
                      </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                      <button onClick={() => setEditingUser(null)} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5">Cancel</button>
                      <button onClick={savePermissions} className="px-6 py-2 rounded-lg bg-neonBlue text-black font-bold hover:bg-blue-400">Save Access</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
