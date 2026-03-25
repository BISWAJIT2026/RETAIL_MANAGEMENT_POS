
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, History, LogOut, ShieldCheck, 
  UserCircle, Users, Database, ClipboardList, Menu, X, Maximize2, 
  Minimize2, Smartphone, Landmark, Cloud, CloudOff, RefreshCw, Signal,
  Layers
} from 'lucide-react';
import { useApp } from '../store.tsx';
import AIAgent from './AIAgent.tsx';

interface LayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ activeTab, setActiveTab, children }) => {
  const { user, logout, terminalId, connectionStatus, lastCloudSync, isGDriveConnected, businessConfig } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'STAFF'] },
    { id: 'inventory', label: 'Inventory', icon: Package, roles: ['ADMIN', 'STAFF'] },
    { id: 'pos', label: 'Billing/POS', icon: ShoppingCart, roles: ['ADMIN', 'STAFF'] },
    { id: 'orders', label: 'Customer Orders', icon: ClipboardList, roles: ['ADMIN', 'STAFF'] },
    { id: 'customers', label: 'Customers', icon: Users, roles: ['ADMIN', 'STAFF'] },
    { id: 'history', label: 'Sales History', icon: History, roles: ['ADMIN', 'STAFF'] },
    { id: 'payment-mgmt', label: 'Payments & Data', icon: Landmark, roles: ['ADMIN'] },
    { id: 'subscription', label: 'Subscription', icon: Layers, roles: ['ADMIN'] },
    { id: 'system', label: 'System Settings', icon: Database, roles: ['ADMIN'] },
  ].filter(item => user && item.roles.includes(user.role));

  const getActiveTerminalName = () => {
    const activeItem = menuItems.find(item => item.id === activeTab);
    if (!activeItem) return 'Billing';
    if (activeItem.id === 'pos') return 'Billing';
    return activeItem.label;
  };

  const getTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  // Extract smart initials from business name (e.g. "Vidyamandir Retail" -> "VR")
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-[100] w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 transform lg:translate-x-0 lg:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center font-black text-xl text-white flex-shrink-0 transition-all duration-500 shadow-lg shadow-orange-500/20">
              {getInitials(businessConfig.name)}
            </div>
            <h1 className="text-xl font-bold tracking-tight truncate">{businessConfig.name}</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
        </div>
        <nav className="flex-1 mt-4">
          {menuItems.map((item) => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center px-8 py-4 transition-all duration-200 ${activeTab === item.id ? 'bg-orange-500/10 border-r-4 border-orange-500 text-orange-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <item.icon className={`w-5 h-5 mr-3 ${activeTab === item.id ? 'text-orange-500' : ''}`} />
              <span className="font-semibold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-slate-800">
          <div className="flex items-center p-3 rounded-2xl bg-white/5 mb-4 border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center mr-3">
              {user?.role === 'ADMIN' ? <ShieldCheck className="w-5 h-5 text-orange-400" /> : <UserCircle className="w-5 h-5 text-blue-400" />}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate text-white">{user?.name}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{user?.role}</p>
            </div>
          </div>
          <button onClick={logout} className="w-full flex items-center justify-center p-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl font-bold text-sm transition-all">
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 flex items-center justify-between z-50">
          <div className="flex items-center space-x-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><Menu className="w-6 h-6" /></button>
            <div className="flex flex-col items-start">
               <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Session Active</p>
               <div className="flex items-center space-x-2 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-100">
                  <Smartphone className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{getActiveTerminalName()} Terminal: {terminalId}</span>
               </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 md:space-x-6">
            <div className="flex items-center space-x-3 group cursor-default">
              <div className="text-right hidden sm:block">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter leading-none">Cloud Reconciliation</p>
                <div className="flex items-center justify-end space-x-1">
                  {isGDriveConnected && <Signal className="w-2.5 h-2.5 text-emerald-500" />}
                  <p className={`text-[10px] font-bold leading-tight ${isGDriveConnected ? 'text-emerald-600' : 'text-slate-600'}`}>
                    {isGDriveConnected ? `Auto-Synced ${getTimeAgo(lastCloudSync)}` : `Local Mode`}
                  </p>
                </div>
              </div>
              <div className={`p-2 rounded-xl border transition-all duration-300 ${
                connectionStatus === 'online' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                connectionStatus === 'syncing' ? 'bg-amber-50 border-amber-100 text-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.2)]' :
                'bg-red-50 border-red-100 text-red-600'
              }`}>
                {connectionStatus === 'syncing' ? <RefreshCw className="w-4 h-4 animate-spin" /> : 
                 isGDriveConnected ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4 opacity-50" />}
              </div>
            </div>
            
            <button onClick={toggleFullscreen} className="p-2.5 bg-slate-50 text-slate-400 hover:text-orange-500 rounded-xl border border-slate-100 transition-all hover:shadow-sm">
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto relative">
          {children}
          {/* AI Data Intelligence Agent */}
          <AIAgent />
        </div>
      </main>
    </div>
  );
};

export default Layout;
