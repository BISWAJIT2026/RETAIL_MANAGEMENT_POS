
import React, { useState, useRef } from 'react';
import { useApp } from '../store.tsx';
import { 
  CreditCard, QrCode, Download, FileText, Database, Package, Users, 
  ClipboardList, History, CheckCircle2, Save, ImageIcon, Trash2,
  TrendingUp, Table, Smartphone, Landmark, LayoutGrid, Loader2
} from 'lucide-react';

const PaymentDataManager: React.FC = () => {
  const { 
    upiId, upiQrCode, updateUpiSettings, exportToCSV, user
  } = useApp();
  
  const [localUpiId, setLocalUpiId] = useState(upiId);
  const [localUpiQr, setLocalUpiQr] = useState<string | null>(upiQrCode);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const upiQrInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === 'ADMIN';

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLocalUpiQr(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveUpi = () => {
    setSaveStatus('saving');
    updateUpiSettings(localUpiId, localUpiQr);
    setTimeout(() => {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  const removeUpiQr = () => setLocalUpiQr(null);

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-slate-50/50">
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-1">
          <Landmark className="w-4 h-4 text-orange-500" />
          <p className="text-orange-500 font-black text-[10px] uppercase tracking-widest">Administration</p>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Payments & Data Management</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
        {/* UPI Configuration Section */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-10 flex flex-col">
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">UPI Terminal Settings</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configure Digital Payment Gateway</p>
            </div>
          </div>

          <div className="space-y-8 flex-1">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Merchant UPI ID</label>
              <div className="relative group">
                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text" 
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none font-bold text-sm"
                  placeholder="e.g. merchant@upi"
                  value={localUpiId}
                  onChange={(e) => setLocalUpiId(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">QR Code Display</label>
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="w-full sm:w-48 aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center overflow-hidden relative group">
                  {localUpiQr ? (
                    <>
                      <img src={localUpiQr} className="w-full h-full object-contain" />
                      <button onClick={removeUpiQr} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-slate-300">
                      <ImageIcon className="w-8 h-8 mb-2" />
                      <span className="text-[10px] font-black uppercase">No Image</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-center space-y-4">
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Upload your UPI QR code image (PNG/JPG). This will be shown to customers during the checkout process.
                  </p>
                  <button 
                    onClick={() => upiQrInputRef.current?.click()}
                    className="w-full py-4 bg-white border-2 border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:border-indigo-200 transition-all flex items-center justify-center"
                  >
                    <Download className="w-4 h-4 mr-2 rotate-180" />
                    Upload QR Image
                  </button>
                  <input ref={upiQrInputRef} type="file" className="hidden" accept="image/*" onChange={handleQrUpload} />
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSaveUpi}
            disabled={saveStatus !== 'idle'}
            className="w-full mt-10 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center"
          >
            {/* Added Loader2 to lucide-react imports above to resolve "Cannot find name" error */}
            {saveStatus === 'saving' ? <Loader2 className="w-5 h-5 animate-spin" /> : 
             saveStatus === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
             <><Save className="w-5 h-5 mr-3" /> Commit Settings</>}
          </button>
        </div>

        {/* Data Analytics & Export Section */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-10">
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 shadow-sm">
              <Table className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Advanced Data Analytics</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Export Core Modules for Reporting</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ExportCard 
              icon={<Package className="text-blue-500" />} 
              label="Inventory DB" 
              sub="Master Stock List"
              onClick={() => exportToCSV('inventory')}
              disabled={!isAdmin}
            />
            <ExportCard 
              icon={<TrendingUp className="text-emerald-500" />} 
              label="Sales Ledger" 
              sub="Transaction History"
              onClick={() => exportToCSV('sales')}
              disabled={!isAdmin}
            />
            <ExportCard 
              icon={<Users className="text-indigo-500" />} 
              label="Customer Base" 
              sub="Loyalty Profiles"
              onClick={() => exportToCSV('customers')}
              disabled={!isAdmin}
            />
            <ExportCard 
              icon={<ClipboardList className="text-orange-500" />} 
              label="Order Queue" 
              sub="Pending Reserves"
              onClick={() => exportToCSV('orders')}
              disabled={!isAdmin}
            />
          </div>

          <div className="mt-8 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
            <div className="flex items-center space-x-3 mb-3">
              <LayoutGrid className="w-4 h-4 text-slate-400" />
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Export Protocol</h4>
            </div>
            <p className="text-[10px] font-medium text-slate-500 leading-relaxed italic">
              Data exports are generated in RFC-4180 compliant CSV format. These files can be opened directly in Microsoft Excel, Google Sheets, or imported into advanced BI tools for deep store analytics. Only administrators can initiate global exports.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ExportCard = ({ icon, label, sub, onClick, disabled }: any) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className="flex items-center p-5 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-white hover:shadow-lg hover:border-orange-200 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <div className="p-3 bg-white rounded-2xl shadow-sm mr-4 group-hover:scale-110 transition-transform">{icon}</div>
    <div className="flex-1 overflow-hidden">
      <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{label}</p>
      <p className="text-[9px] font-bold text-slate-400 uppercase truncate">{sub}</p>
    </div>
    <Download className="w-4 h-4 text-slate-300 group-hover:text-orange-500 transition-colors ml-2" />
  </button>
);

export default PaymentDataManager;
