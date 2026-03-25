
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../store.tsx';
import { 
  Database, Download, ShieldCheck, AlertCircle, Loader2, FileJson, 
  Archive, Save, Smartphone, X, Plus, Tags, RefreshCw, Zap, Upload,
  CheckCircle2, HardDrive, Cloud, CloudOff, Globe, ExternalLink,
  Building2, MapPin, Phone, Hash, Receipt, User as UserIcon, Percent,
  Lock, Key, ShieldAlert, Tag, Edit2, Check, Radio, Terminal, Info,
  Settings2
} from 'lucide-react';

const SystemSettings: React.FC = () => {
  const { 
    exportData, user, terminalId, updateTerminalId, clearAllLocalData,
    categories, targetClasses, updateTaxonomy, forceCloudSync, connectionStatus,
    importData, lastBackupDate, businessConfig, updateBusinessConfig, updateAdminProfile,
    isGDriveConnected, gDriveClientId, setGDriveClientId, connectGDrive, disconnectGDrive, syncToGDrive, loadFromGDrive,
    updatePasswords, testWebhook
  } = useApp();
  
  const [localTerminalId, setLocalTerminalId] = useState(terminalId);
  const [localDriveClientId, setLocalDriveClientId] = useState(gDriveClientId);
  
  // Business Master Data State
  const [bizName, setBizName] = useState(businessConfig.name);
  const [bizMailingName, setBizMailingName] = useState(businessConfig.mailingName || '');
  const [bizSubHeader, setBizSubHeader] = useState(businessConfig.subHeader || '');
  const [bizAddr, setBizAddr] = useState(businessConfig.address);
  const [bizPhone, setBizPhone] = useState(businessConfig.phone);
  const [gstEnabled, setGstEnabled] = useState(businessConfig.isGstEnabled);
  const [gstNo, setGstNo] = useState(businessConfig.gstNumber || '');
  const [gstRate, setGstRate] = useState(businessConfig.gstRate || 18);
  
  // Automation State
  const [webhookUrl, setWebhookUrl] = useState(businessConfig.webhookUrl || '');
  const [webhookSecret, setWebhookSecret] = useState(businessConfig.webhookSecret || '');
  const [bypassPreflight, setBypassPreflight] = useState(businessConfig.webhookBypassPreflight || false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  // Admin Profile State
  const [adminName, setAdminName] = useState(user?.name || '');

  // Security State
  const [newAdminPass, setNewAdminPass] = useState('');
  const [newStaffPass, setNewStaffPass] = useState('');

  // Taxonomy Editing State
  const [newCat, setNewCat] = useState('');
  const [newClass, setNewClass] = useState('');
  const [editingTax, setEditingTax] = useState<{ type: 'categories' | 'classes', original: string, current: string } | null>(null);

  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = user?.role === 'ADMIN';

  const handleGlobalSync = async () => {
    if (!window.confirm("Broadcast force re-index? All staff terminals will refresh data immediately.")) return;
    await forceCloudSync();
  };

  const handleUpdateBusiness = () => {
    updateBusinessConfig({
      ...businessConfig,
      name: bizName,
      mailingName: bizMailingName,
      subHeader: bizSubHeader,
      address: bizAddr,
      phone: bizPhone,
      isGstEnabled: gstEnabled,
      gstNumber: gstNo,
      gstRate: Number(gstRate),
      webhookUrl: webhookUrl,
      webhookSecret: webhookSecret,
      webhookBypassPreflight: bypassPreflight
    });
    setImportStatus({ type: 'success', text: "Business Master Data updated successfully." });
    setTimeout(() => setImportStatus(null), 3000);
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl) return;
    setIsTestingWebhook(true);
    const res = await testWebhook(webhookUrl);
    setImportStatus({ type: res.success ? 'success' : 'error', text: `Webhook Test: ${res.message}` });
    setIsTestingWebhook(false);
  };

  const handleUpdateAdmin = () => {
    updateAdminProfile(adminName);
    setImportStatus({ type: 'success', text: "Admin Profile updated." });
    setTimeout(() => setImportStatus(null), 3000);
  };

  const handleUpdateSecurity = () => {
    if (!newAdminPass && !newStaffPass) {
      alert("Please enter at least one new password.");
      return;
    }
    const finalAdminPass = newAdminPass || localStorage.getItem('vmd_admin_pass') || 'admin123';
    const finalStaffPass = newStaffPass || localStorage.getItem('vmd_staff_pass') || 'staff123';
    
    updatePasswords(finalAdminPass, finalStaffPass);
    setImportStatus({ type: 'success', text: "Access Credentials Updated." });
    setNewAdminPass('');
    setNewStaffPass('');
    setTimeout(() => setImportStatus(null), 3000);
  };

  const addTaxonomy = (type: 'categories' | 'classes') => {
    if (type === 'categories' && newCat) {
      if (categories.includes(newCat)) return;
      const updated = [...categories, newCat];
      updateTaxonomy('categories', updated);
      setNewCat('');
    } else if (type === 'classes' && newClass) {
      if (targetClasses.includes(newClass)) return;
      const updated = [...targetClasses, newClass];
      updateTaxonomy('classes', updated);
      setNewClass('');
    }
  };

  const removeTaxonomy = (type: 'categories' | 'classes', item: string) => {
    if (window.confirm(`Delete ${item}? This may affect existing inventory labels.`)) {
      const list = type === 'categories' ? categories : targetClasses;
      updateTaxonomy(type, list.filter(i => i !== item));
    }
  };

  const saveTaxonomyEdit = () => {
    if (!editingTax || !editingTax.current.trim()) {
      setEditingTax(null);
      return;
    }

    const list = editingTax.type === 'categories' ? categories : targetClasses;
    const isDuplicate = list.some(item => item === editingTax.current && item !== editingTax.original);
    
    if (isDuplicate) {
      alert("This entry already exists.");
      return;
    }

    const updatedList = list.map(item => item === editingTax.original ? editingTax.current.trim() : item);
    updateTaxonomy(editingTax.type, updatedList);
    setEditingTax(null);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus(null);
    
    const result = await importData(file);
    if (result.success) {
      setImportStatus({ type: 'success', text: result.message });
    } else {
      setImportStatus({ type: 'error', text: result.message });
    }
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveGDriveClientId = () => {
    setGDriveClientId(localDriveClientId);
    setImportStatus({ type: 'success', text: "Client ID Updated. You can now try connecting." });
  };

  const handleGDriveSync = async () => {
    setIsSyncing(true);
    const result = await syncToGDrive();
    setImportStatus({ type: result.success ? 'success' : 'error', text: result.message });
    setIsSyncing(false);
  };

  const handleGDriveLoad = async () => {
    if (!window.confirm("Restore entire system state from Google Drive? Local changes will be overwritten.")) return;
    setIsSyncing(true);
    const result = await loadFromGDrive();
    setImportStatus({ type: result.success ? 'success' : 'error', text: result.message });
    setIsSyncing(false);
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-slate-50/50 pb-24">
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-1">
          <Database className="w-4 h-4 text-slate-400" />
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Core Engine</p>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">System Configuration</h1>
      </div>

      {importStatus && (
        <div className={`mb-8 p-4 rounded-2xl flex items-center shadow-lg animate-in fade-in slide-in-from-top-4 ${importStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {importStatus.type === 'success' ? <CheckCircle2 className="w-5 h-5 mr-3" /> : <AlertCircle className="w-5 h-5 mr-3" />}
          <p className="text-xs font-black uppercase tracking-tight">{importStatus.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10">
        <div className="lg:col-span-8 space-y-8">
          
          {isAdmin && (
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-10">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 shadow-sm"><Building2 className="w-6 h-6" /></div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Business Identity & Tax</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Enterprise Master Data</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">Business Name (Footer Text)</label>
                    <div className="relative">
                       <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                       <input type="text" className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-all" value={bizName} onChange={(e) => setBizName(e.target.value)} placeholder="Store Name" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">Mailing Name (Invoice Header)</label>
                    <div className="relative">
                       <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                       <input type="text" className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-all" value={bizMailingName} onChange={(e) => setBizMailingName(e.target.value)} placeholder="Mailing Name" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">Contact Number</label>
                    <div className="relative">
                       <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                       <input type="text" className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-all" value={bizPhone} onChange={(e) => setBizPhone(e.target.value)} placeholder="Phone" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">Nature of Business (Invoice Sub-Header)</label>
                  <div className="relative">
                     <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                     <input type="text" className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-all" value={bizSubHeader} onChange={(e) => setBizSubHeader(e.target.value)} placeholder="e.g. Educational Books & Stationery" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">Business Address</label>
                  <div className="relative">
                     <MapPin className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
                     <textarea className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-all resize-none h-24" value={bizAddr} onChange={(e) => setBizAddr(e.target.value)} placeholder="Full Address for Invoice Header"></textarea>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200 space-y-6">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                         <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                            <Receipt className="w-5 h-5" />
                         </div>
                         <div>
                            <p className="text-sm font-black text-slate-900">GST Applicability</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Enable Tax Calculation on Invoices</p>
                         </div>
                      </div>
                      <button 
                        onClick={() => setGstEnabled(!gstEnabled)}
                        className={`w-14 h-8 rounded-full transition-all flex items-center px-1 ${gstEnabled ? 'bg-orange-500' : 'bg-slate-300'}`}
                      >
                         <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${gstEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                      </button>
                   </div>

                   {gstEnabled && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-300">
                        <div>
                           <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">GST Registration No.</label>
                           <div className="relative">
                              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input type="text" className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-black focus:ring-4 focus:ring-orange-500/10 outline-none transition-all" value={gstNo} onChange={(e) => setGstNo(e.target.value)} placeholder="GSTIN-000XXX" />
                           </div>
                        </div>
                        <div>
                           <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">Applicable GST Rate (%)</label>
                           <div className="relative">
                              <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input type="number" className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-black focus:ring-4 focus:ring-orange-500/10 outline-none transition-all" value={gstRate} onChange={(e) => setGstRate(Number(e.target.value))} />
                           </div>
                        </div>
                     </div>
                   )}
                </div>

                {/* Webhook Automation Section */}
                <div className="p-8 bg-slate-900 rounded-[2rem] border border-white/5 space-y-6 relative overflow-hidden group">
                   <div className="absolute -right-8 -top-8 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all duration-500"></div>
                   
                   <div className="flex items-center space-x-4 relative z-10">
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-orange-500 shadow-xl border border-white/10">
                         <Terminal className="w-6 h-6" />
                      </div>
                      <div>
                         <h3 className="text-xl font-black text-white">Webhook Automation</h3>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Connect Vidyamandir to External Apps</p>
                      </div>
                   </div>

                   <div className="space-y-4 relative z-10">
                      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start space-x-3">
                        <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div className="text-[10px] font-medium text-amber-200/80 leading-relaxed">
                          <p className="mb-2"><span className="font-black text-amber-400">Fixed "Failed to fetch":</span> If your destination server is behind strict CORS or doesn't support preflight, enable <span className="text-white">Compatibility Mode</span> below.</p>
                          <p>Use <span className="text-white">https://</span> for production security.</p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">Endpoint Webhook URL</label>
                        <div className="relative">
                           <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                           <input 
                              type="url" 
                              className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:ring-4 focus:ring-orange-500/10 outline-none transition-all placeholder:text-slate-600" 
                              value={webhookUrl} 
                              onChange={(e) => setWebhookUrl(e.target.value)} 
                              placeholder="https://api.yourserver.com/webhooks/pos" 
                           />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1">Webhook Signing Secret</label>
                            <div className="relative">
                               <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                               <input 
                                  type="password" 
                                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:ring-4 focus:ring-orange-500/10 outline-none transition-all placeholder:text-slate-600" 
                                  value={webhookSecret} 
                                  onChange={(e) => setWebhookSecret(e.target.value)} 
                                  placeholder="••••••••••••" 
                               />
                            </div>
                         </div>

                         <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                               <Settings2 className="w-4 h-4 text-indigo-400" />
                               <div>
                                  <p className="text-[10px] font-black text-white uppercase tracking-tight">CORS Compatibility</p>
                                  <p className="text-[8px] font-bold text-slate-500">Bypass Preflight (Simple POST)</p>
                               </div>
                            </div>
                            <button 
                               onClick={() => setBypassPreflight(!bypassPreflight)}
                               className={`w-10 h-5 rounded-full transition-all flex items-center px-0.5 ${bypassPreflight ? 'bg-indigo-500' : 'bg-slate-700'}`}
                            >
                               <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${bypassPreflight ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </button>
                         </div>
                      </div>

                      <div className="flex items-end">
                         <button 
                           onClick={handleTestWebhook}
                           disabled={!webhookUrl || isTestingWebhook}
                           className="w-full py-4 bg-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/10 hover:bg-white/20 transition-all flex items-center justify-center disabled:opacity-30 active:scale-95"
                         >
                            {isTestingWebhook ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Radio className="w-4 h-4 mr-2 text-orange-500" />}
                            Test Real-time Ping
                         </button>
                      </div>

                      <p className="text-[9px] font-medium text-slate-500 italic px-1">
                         Fires POST requests for: <span className="text-slate-300">SALE_COMPLETED, ORDER_CREATED, PRODUCT_ADDED, BULK_IMPORT, CUSTOMER_ADDED.</span>
                      </p>
                   </div>
                </div>

                <button 
                  onClick={handleUpdateBusiness}
                  className="w-full py-4.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:shadow-slate-900/20 active:scale-[0.98] transition-all flex items-center justify-center"
                >
                  <Save className="w-5 h-5 mr-3 text-orange-500" /> Update Business Master Data
                </button>
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-10">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm"><Tags className="w-6 h-6" /></div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Taxonomy & Metadata</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Global Master Lists</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Stock Categories Section */}
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-2"></div> Stock Categories</h4>
                  <div className="flex space-x-2">
                    <input type="text" placeholder="New Category..." className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-orange-500/20 outline-none" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
                    <button onClick={() => addTaxonomy('categories')} className="p-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all"><Plus className="w-4 h-4" /></button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categories.length > 0 ? categories.map(cat => (
                      <div key={cat} className={`flex items-center px-3 py-1.5 rounded-lg group border transition-all ${editingTax?.type === 'categories' && editingTax.original === cat ? 'bg-orange-50 border-orange-200' : 'bg-slate-100 border-slate-200'}`}>
                        {editingTax?.type === 'categories' && editingTax.original === cat ? (
                          <div className="flex items-center space-x-1.5">
                            <input 
                              autoFocus 
                              type="text" 
                              className="bg-white border border-orange-300 rounded px-1.5 py-0.5 text-[10px] font-black text-slate-700 outline-none w-24" 
                              value={editingTax.current} 
                              onChange={(e) => setEditingTax({ ...editingTax, current: e.target.value })}
                              onKeyDown={(e) => e.key === 'Enter' && saveTaxonomyEdit()}
                            />
                            <button onClick={saveTaxonomyEdit} className="text-emerald-600 hover:text-emerald-700"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditingTax(null)} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <>
                            <span className="text-[10px] font-black text-slate-700 mr-2">{cat}</span>
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setEditingTax({ type: 'categories', original: cat, current: cat })} className="text-slate-400 hover:text-blue-600 transition-colors"><Edit2 className="w-3 h-3" /></button>
                              <button onClick={() => removeTaxonomy('categories', cat)} className="text-slate-400 hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                            </div>
                          </>
                        )}
                      </div>
                    )) : <p className="text-[10px] font-bold text-slate-300 italic">No categories defined</p>}
                  </div>
                </div>

                {/* Academic Classes Section */}
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></div> Academic Classes</h4>
                  <div className="flex space-x-2">
                    <input type="text" placeholder="New Class..." className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none" value={newClass} onChange={(e) => setNewClass(e.target.value)} />
                    <button onClick={() => addTaxonomy('classes')} className="p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all"><Plus className="w-4 h-4" /></button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {targetClasses.length > 0 ? targetClasses.map(cl => (
                      <div key={cl} className={`flex items-center px-3 py-1.5 rounded-lg group border transition-all ${editingTax?.type === 'classes' && editingTax.original === cl ? 'bg-blue-50 border-blue-200' : 'bg-slate-100 border-slate-200'}`}>
                        {editingTax?.type === 'classes' && editingTax.original === cl ? (
                          <div className="flex items-center space-x-1.5">
                            <input 
                              autoFocus 
                              type="text" 
                              className="bg-white border border-blue-300 rounded px-1.5 py-0.5 text-[10px] font-black text-slate-700 outline-none w-20" 
                              value={editingTax.current} 
                              onChange={(e) => setEditingTax({ ...editingTax, current: e.target.value })}
                              onKeyDown={(e) => e.key === 'Enter' && saveTaxonomyEdit()}
                            />
                            <button onClick={saveTaxonomyEdit} className="text-emerald-600 hover:text-emerald-700"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditingTax(null)} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <>
                            <span className="text-[10px] font-black text-slate-700 mr-2">{cl}</span>
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setEditingTax({ type: 'classes', original: cl, current: cl })} className="text-slate-400 hover:text-blue-600 transition-colors"><Edit2 className="w-3 h-3" /></button>
                              <button onClick={() => removeTaxonomy('classes', cl)} className="text-slate-400 hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                            </div>
                          </>
                        )}
                      </div>
                    )) : <p className="text-[10px] font-bold text-slate-300 italic">No classes defined</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm"><Archive className="w-6 h-6" /></div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Backup & Recovery Vault</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Backup: {lastBackupDate ? new Date(lastBackupDate).toLocaleString() : 'Never'}</p>
                </div>
              </div>
              <button 
                onClick={handleGlobalSync}
                disabled={connectionStatus === 'syncing'}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center shadow-lg active:scale-95 disabled:opacity-50"
              >
                {connectionStatus === 'syncing' ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                Sync Global DB
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <button onClick={exportData} className="w-full py-6 bg-slate-900 text-white rounded-3xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center shadow-xl hover:bg-slate-800 transition-all border border-white/10">
                  <Download className="w-5 h-5 mr-3 text-orange-500" /> 
                  Generate System Snapshot
               </button>
               <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-white hover:border-orange-200 transition-all group"
               >
                  {isImporting ? <Loader2 className="w-6 h-6 text-orange-500 animate-spin" /> : <Upload className="w-6 h-6 text-slate-300 group-hover:text-orange-500 transition-colors mb-1" />}
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-600">Restore from File</p>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileImport} />
               </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
           <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm"><UserIcon className="w-6 h-6" /></div>
                <h3 className="text-xl font-black text-slate-900">Admin Profile</h3>
              </div>
              <div className="space-y-6">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Administrator Name</label>
                    <input type="text" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
                 </div>
                 <button onClick={handleUpdateAdmin} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all">Update Name</button>
              </div>
           </div>

           {isAdmin && (
             <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 shadow-sm"><ShieldAlert className="w-6 h-6" /></div>
                  <h3 className="text-xl font-black text-slate-900">Security Management</h3>
                </div>
                <div className="space-y-6">
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Admin Access Key</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="password" placeholder="New Admin Pass" className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-red-500/10" value={newAdminPass} onChange={(e) => setNewAdminPass(e.target.value)} />
                      </div>
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Staff Access Key</label>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="password" placeholder="New Staff Pass" className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-red-500/10" value={newStaffPass} onChange={(e) => setNewStaffPass(e.target.value)} />
                      </div>
                   </div>
                   <button onClick={handleUpdateSecurity} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">Re-Secure Terminal</button>
                </div>
             </div>
           )}

           <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 shadow-sm"><Smartphone className="w-6 h-6" /></div>
                <h3 className="text-xl font-black text-slate-900">Identity</h3>
              </div>
              <div className="space-y-6">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Terminal Handle</label>
                    <input type="text" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-orange-500/10" value={localTerminalId} onChange={(e) => setLocalTerminalId(e.target.value)} />
                 </div>
                 <button onClick={() => updateTerminalId(localTerminalId)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:shadow-orange-500/20 active:scale-95 transition-all">Update Alias</button>
              </div>
           </div>
           
           <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm"><HardDrive className="w-6 h-6" /></div>
                <h3 className="text-xl font-black text-slate-900">Health</h3>
              </div>
              <div className="space-y-3">
                 <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Auto-Backup</span>
                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">Enabled</span>
                 </div>
                 <p className="text-[10px] font-bold text-slate-400 leading-relaxed px-1">A background snapshot is taken every 5 minutes to ensure zero data loss during sessions.</p>
              </div>
           </div>

           <div className="bg-red-50 rounded-[2.5rem] border border-red-100 p-8 group overflow-hidden relative">
              <div className="absolute -right-8 -top-8 w-24 h-24 bg-red-100 rounded-full blur-2xl group-hover:bg-red-200 transition-colors"></div>
              <h3 className="text-lg font-black text-red-700 mb-2 relative z-10">Danger Zone</h3>
              <p className="text-xs font-bold text-red-500 uppercase tracking-tight mb-6 relative z-10 italic">Wipe all local session data permanently.</p>
              <button onClick={clearAllLocalData} className="w-full py-4 bg-white border-2 border-red-200 text-red-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all relative z-10">Destroy Local Store</button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
