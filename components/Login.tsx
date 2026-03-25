
import React, { useState } from 'react';
import { useApp } from '../store';
import { Lock, User as UserIcon, LogIn, AlertCircle, ShieldAlert, Building2, UserPlus } from 'lucide-react';

const Login: React.FC = () => {
  const { login, signup } = useApp();
  const [isSignup, setIsSignup] = useState(false);
  
  // Login State
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  
  // Signup State
  const [businessName, setBusinessName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPass, setAdminPass] = useState('');
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !password) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const success = await login(userId, password);
      if (!success) {
        setError('Incorrect User ID or Password. Access Denied.');
        setIsSubmitting(false);
      }
    } catch (err) {
      setError('A system error occurred during authentication. Please retry.');
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !adminName || !adminPass) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const success = await signup(businessName, adminName, adminPass);
      if (!success) {
        setError('Could not initialize business account. Please try again.');
        setIsSubmitting(false);
      }
    } catch (err) {
      setError('A system error occurred during signup.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-white/10">
          <div className="bg-slate-900 p-10 text-center relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <div className="w-16 h-16 bg-orange-500 rounded-3xl flex items-center justify-center font-black text-3xl text-white mx-auto mb-4 shadow-2xl shadow-orange-500/30 ring-4 ring-white/10 transition-transform hover:scale-110">
              {isSignup ? <Building2 className="w-8 h-8" /> : 'R'}
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">
              {isSignup ? 'Business Registration' : 'Retail Management POS'}
            </h1>
            <p className="text-slate-400 text-[10px] mt-2 font-bold uppercase tracking-[0.3em]">
              {isSignup ? 'Enterprise Initialization' : 'Secure Terminal Access'}
            </p>
          </div>
          
          <div className="p-10">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center text-xs font-black uppercase tracking-tight animate-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 mr-3 flex-shrink-0" />
                {error}
              </div>
            )}

            {!isSignup ? (
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Terminal ID</label>
                  <div className="relative group">
                    <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                    <input 
                      required
                      type="text"
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all outline-none text-slate-900 font-bold"
                      placeholder="Enter User ID (admin/staff)"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Access Key</label>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                    <input 
                      required
                      type="password"
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all outline-none text-slate-900 font-bold"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center hover:bg-slate-800 transition-all active:scale-[0.98] shadow-2xl shadow-slate-900/20 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-5 h-5 mr-3 text-orange-500" />
                      Initialize Session
                    </>
                  )}
                </button>
                
                <div className="text-center pt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsSignup(true)}
                    className="text-[9px] font-black text-slate-400 hover:text-orange-500 uppercase tracking-widest transition-colors"
                  >
                    Setup New Business Entity
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Business Identity</label>
                  <div className="relative group">
                    <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                    <input 
                      required
                      type="text"
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all outline-none text-slate-900 font-bold"
                      placeholder="e.g. Acme Bookstore"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Administrator Alias</label>
                  <div className="relative group">
                    <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                    <input 
                      required
                      type="text"
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all outline-none text-slate-900 font-bold"
                      placeholder="Manager Name"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Master Access Key</label>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                    <input 
                      required
                      type="password"
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all outline-none text-slate-900 font-bold"
                      placeholder="Minimum 8 characters"
                      value={adminPass}
                      onChange={(e) => setAdminPass(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center hover:bg-slate-800 transition-all active:scale-[0.98] shadow-2xl shadow-slate-900/20 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5 mr-3 text-orange-500" />
                      Provision Account
                    </>
                  )}
                </button>
                
                <div className="text-center pt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsSignup(false)}
                    className="text-[9px] font-black text-slate-400 hover:text-orange-500 uppercase tracking-widest transition-colors"
                  >
                    Return to Login
                  </button>
                </div>
              </form>
            )}
            
            <div className="mt-10 pt-8 border-t border-slate-100 text-center">
              <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.4em]">Proprietary POS Security Framework</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
