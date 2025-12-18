
import React, { useState } from 'react';
import { Shield, User, Key, ArrowRight, Loader2, Activity } from 'lucide-react';
import { authService } from '../services/authService';
import { UserRole } from '../types';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'ADMIN' | 'USER_LOGIN' | 'SIGNUP'>('USER_LOGIN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form States
  const [adminCode, setAdminCode] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');

  const handleAdminLogin = async () => {
    setLoading(true);
    setError('');
    const res = await authService.loginAsAdmin(adminCode);
    setLoading(false);
    if (res.success && res.user) {
        onLoginSuccess(res.user);
    } else {
        setError(res.error || 'Login failed');
    }
  };

  const handleUserLogin = async () => {
    setLoading(true);
    setError('');
    const res = await authService.loginAsUser(email);
    setLoading(false);
    if (res.success && res.user) {
        onLoginSuccess(res.user);
    } else {
        setError(res.error || 'Login failed');
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    setError('');
    const res = await authService.signup(fullName, email, mobile);
    setLoading(false);
    if (res.success) {
        alert("Registration Successful! Please wait for Admin approval.");
        setMode('USER_LOGIN');
    } else {
        setError(res.error || 'Signup failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#050b14] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 z-0">
             <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-neonPurple/10 to-transparent"></div>
             <div className="absolute bottom-0 left-0 w-1/2 h-full bg-gradient-to-t from-neonBlue/10 to-transparent"></div>
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100"></div>
        </div>

        <div className="w-full max-w-md relative z-10 perspective-1000">
            <div className="glass-panel p-8 rounded-3xl shadow-[0_0_50px_rgba(0,243,255,0.1)] border border-white/10 backdrop-blur-xl transform transition-all hover:scale-[1.01]">
                
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-neonBlue to-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-neonBlue/20">
                        <Activity className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">KMRCL <span className="text-neonBlue">INTELLIGENCE</span></h1>
                    <p className="text-gray-400 text-sm mt-2">Secure Metro Document Access</p>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-black/40 rounded-xl mb-6 border border-white/10">
                    <button 
                        onClick={() => { setMode('USER_LOGIN'); setError(''); }}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'USER_LOGIN' ? 'bg-neonBlue text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        USER LOGIN
                    </button>
                    <button 
                        onClick={() => { setMode('SIGNUP'); setError(''); }}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'SIGNUP' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        SIGN UP
                    </button>
                    <button 
                        onClick={() => { setMode('ADMIN'); setError(''); }}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'ADMIN' ? 'bg-neonPurple text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        ADMIN
                    </button>
                </div>

                {/* Forms */}
                <div className="space-y-4 animate-fade-in">
                    {mode === 'ADMIN' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs text-neonPurple font-bold ml-1">ADMIN ACCESS CODE</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                                    <input 
                                        type="password" 
                                        value={adminCode}
                                        onChange={(e) => setAdminCode(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-neonPurple outline-none transition-colors"
                                        placeholder="Enter Secure Code"
                                    />
                                </div>
                            </div>
                            <button 
                                onClick={handleAdminLogin}
                                disabled={loading || !adminCode}
                                className="w-full py-3 bg-neonPurple hover:bg-purple-600 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] flex items-center justify-center"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <span className="flex items-center">ACCESS DASHBOARD <ArrowRight className="ml-2 w-4 h-4"/></span>}
                            </button>
                        </div>
                    )}

                    {mode === 'USER_LOGIN' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs text-neonBlue font-bold ml-1">REGISTERED EMAIL</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                                    <input 
                                        type="email" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-neonBlue outline-none transition-colors"
                                        placeholder="name@kmrcl.com"
                                    />
                                </div>
                            </div>
                            <button 
                                onClick={handleUserLogin}
                                disabled={loading || !email}
                                className="w-full py-3 bg-neonBlue hover:bg-blue-500 text-black font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(0,243,255,0.3)] flex items-center justify-center"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : 'LOGIN'}
                            </button>
                        </div>
                    )}

                    {mode === 'SIGNUP' && (
                        <div className="space-y-3">
                            <input 
                                type="text" 
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-white outline-none"
                                placeholder="Full Name"
                            />
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-white outline-none"
                                placeholder="Email Address"
                            />
                            <input 
                                type="tel" 
                                value={mobile}
                                onChange={(e) => setMobile(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-white outline-none"
                                placeholder="Mobile Number"
                            />
                            <button 
                                onClick={handleSignup}
                                disabled={loading || !email || !fullName}
                                className="w-full py-3 bg-white hover:bg-gray-200 text-black font-bold rounded-xl transition-all mt-2"
                            >
                                {loading ? <Loader2 className="animate-spin mx-auto" /> : 'REQUEST APPROVAL'}
                            </button>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center animate-pulse">
                        {error}
                    </div>
                )}
                
                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-500">Restricted Access System. All activities logged.</p>
                </div>
            </div>
        </div>
    </div>
  );
};
