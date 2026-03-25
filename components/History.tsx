import React, { useState } from 'react';
import { useApp } from '../store.tsx';
import { 
  Search, Calendar, FileText, ChevronRight, Filter, 
  Banknote, QrCode, CreditCard, Globe, Phone, X, 
  Download, Printer, User as UserIcon, Receipt, 
  Clock, Hash, ArrowLeft
} from 'lucide-react';
import { Bill } from '../types.ts';

const History: React.FC = () => {
  const { bills, customers, businessConfig } = useApp();
  const [search, setSearch] = useState('');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const filteredBills = bills.filter(b => 
    b.id.toLowerCase().includes(search.toLowerCase()) || 
    b.customerName?.toLowerCase().includes(search.toLowerCase())
  );

  const getCustomerPhone = (customerId?: string) => {
    if (!customerId) return null;
    return customers.find(c => c.id === customerId)?.phone;
  };

  const getMethodBadge = (method: string) => {
    switch(method) {
      case 'UPI': 
        return <span className="flex items-center px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-bold"><QrCode className="w-3 h-3 mr-1" /> UPI</span>;
      case 'Card':
        return <span className="flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold"><CreditCard className="w-3 h-3 mr-1" /> CARD</span>;
      case 'Online':
        return <span className="flex items-center px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-[10px] font-bold"><Globe className="w-3 h-3 mr-1" /> ONLINE</span>;
      default:
        return <span className="flex items-center px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold"><Banknote className="w-3 h-3 mr-1" /> CASH</span>;
    }
  };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50/50">
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-1">
          <HistoryIcon className="w-4 h-4 text-slate-400" />
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Audit Trail</p>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Sales History</h1>
        <p className="text-slate-500 text-sm font-medium">Comprehensive log of all transactions and invoices generated on this terminal.</p>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 mb-6 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by Invoice # or Customer Name..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 text-sm font-bold transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="px-6 py-3 bg-white border border-slate-200 rounded-xl flex items-center hover:bg-slate-50 text-[10px] font-black uppercase tracking-widest transition-all">
            <Calendar className="w-4 h-4 mr-2 text-orange-500" />
            Date Filter
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice ID</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Profile</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Method</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">SKUs</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Grand Total</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBills.map(bill => {
                const phone = getCustomerPhone(bill.customerId);
                return (
                  <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5 font-black text-xs text-blue-600 tracking-tighter">{bill.id}</td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900">{formatDate(bill.date)}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{formatTime(bill.date)}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                          <UserIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-sm">{bill.customerName || 'Walk-in Customer'}</p>
                          {phone && <p className="text-[10px] text-slate-400 font-bold flex items-center mt-0.5 tracking-tighter"><Phone className="w-2.5 h-2.5 mr-1" />{phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="inline-flex">
                        {getMethodBadge(bill.paymentMethod)}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-600 border border-slate-200">{bill.items.length}</span>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-slate-900 text-base">₹{Math.round(bill.grandTotal).toLocaleString()}</td>
                    <td className="px-8 py-5 text-center">
                      <button 
                        onClick={() => setSelectedBill(bill)}
                        className="inline-flex items-center px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all active:scale-95 shadow-md shadow-slate-900/10"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1.5" />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredBills.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 text-slate-400 opacity-20">
              <FileText className="w-20 h-20 mb-4" />
              <p className="font-black text-sm uppercase tracking-[0.3em]">No Transactions Found</p>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {selectedBill && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col my-8 animate-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="bg-slate-900 p-8 flex justify-between items-center text-white flex-shrink-0">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <Receipt className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">Invoice Details</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Digital Audit Copy • {selectedBill.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedBill(null)} 
                className="p-3 hover:bg-white/10 rounded-2xl transition-colors text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 space-y-8">
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-50 rounded-xl"><UserIcon className="w-4 h-4 text-indigo-600" /></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Info</span>
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-900">{selectedBill.customerName || 'Walk-in'}</p>
                    <p className="text-sm font-bold text-slate-500">{getCustomerPhone(selectedBill.customerId) || 'No Contact Provided'}</p>
                  </div>
                </div>
                <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-50 rounded-xl"><Clock className="w-4 h-4 text-emerald-600" /></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Metadata</span>
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-900">{formatDate(selectedBill.date)}</p>
                    <p className="text-sm font-bold text-slate-500">Terminal: {selectedBill.paymentMethod} • {formatTime(selectedBill.date)}</p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center">
                    <Hash className="w-3.5 h-3.5 mr-2 text-orange-500" /> 
                    Purchased Items ({selectedBill.items.length})
                  </h4>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-left">Item Name</th>
                      <th className="px-6 py-4 text-center">Qty</th>
                      <th className="px-6 py-4 text-right">Rate</th>
                      <th className="px-6 py-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {selectedBill.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4">
                          <p className="font-black text-slate-800">{item.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">MRP: ₹{Math.round(item.mrp)} • Disc: {item.discountRate}%</p>
                        </td>
                        <td className="px-6 py-4 text-center font-black text-slate-600">{item.quantity}</td>
                        <td className="px-6 py-4 text-right font-black text-slate-600 text-xs">₹{Math.round(item.price)}</td>
                        <td className="px-6 py-4 text-right font-black text-slate-900">₹{Math.round(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Reconciliation */}
              <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-4 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                   <Receipt className="w-24 h-24" />
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <span>Gross Total</span>
                  <span className="text-slate-300">₹{selectedBill.items.reduce((acc, curr) => acc + curr.subtotal, 0)}</span>
                </div>
                {selectedBill.advanceAdjusted ? (
                  <div className="flex justify-between items-center text-xs font-black text-orange-400 uppercase tracking-widest">
                    <span>Advance Payment Adjusted</span>
                    <span>- ₹{Math.round(selectedBill.advanceAdjusted)}</span>
                  </div>
                ) : null}
                <div className="pt-4 mt-2 border-t border-white/10 border-dashed flex justify-between items-baseline">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 mb-1">Total Net Realized</p>
                    <p className="text-4xl font-black tracking-tighter">₹{Math.round(selectedBill.grandTotal)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status</p>
                    <span className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/30">Verified</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-white border-t border-slate-100 flex flex-col sm:flex-row gap-4 flex-shrink-0">
               <button onClick={() => window.print()} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/10">
                  <Printer className="w-4 h-4 mr-2 text-orange-500" />
                  Print Physical Receipt
               </button>
               <button onClick={() => setSelectedBill(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center hover:bg-slate-200 transition-all active:scale-95">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Close Auditor
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Internal icon for consistency
const HistoryIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default History;