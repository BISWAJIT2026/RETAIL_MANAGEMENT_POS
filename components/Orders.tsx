
import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../store.tsx';
import { 
  ClipboardList, Plus, Search, ChevronRight, 
  CheckCircle2, Clock, XCircle, MoreVertical,
  Download, Image as ImageIcon, IndianRupee, User,
  ArrowRightCircle, Filter, Trash2, Minus, Wallet, 
  AlertCircle, History
} from 'lucide-react';
import { CustomerOrder, OrderStatus, OrderItem, Customer, Product, Category } from '../types.ts';
import * as htmlToImage from 'html-to-image';

// NewOrderModal is defined before Orders to ensure it's available for the Orders component's render cycle
const NewOrderModal: React.FC<{onClose: () => void, onSave: any}> = ({onClose, onSave}) => {
   const { inventory, customers } = useApp();
   const [cart, setCart] = useState<OrderItem[]>([]);
   const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
   const [advance, setAdvance] = useState<number | string>(0);
   const [search, setSearch] = useState('');

   const filteredProducts = useMemo(() => {
      const query = search.toLowerCase().trim();
      if (!query) return [];
      return inventory.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.barcode.includes(query) || 
        p.author.toLowerCase().includes(query)
      ).slice(0, 5);
   }, [inventory, search]);

   const total = useMemo(() => Math.round(cart.reduce((acc, curr) => acc + curr.subtotal, 0)), [cart]);
   const advanceNum = Math.round(parseFloat(advance.toString()) || 0);

   const addToCart = (product: Product) => {
      setCart(prev => {
         const existing = prev.find(p => p.productId === product.id);
         if (existing) {
            return prev.map(p => 
              p.productId === product.id 
                ? { ...p, quantity: p.quantity + 1, subtotal: Math.round((p.quantity + 1) * p.price) } 
                : p
            );
         }
         return [...prev, { 
           productId: product.id, 
           name: product.name, 
           quantity: 1, 
           mrp: Math.round(product.mrp), 
           discountRate: product.discountRate, 
           price: Math.round(product.customerPrice), 
           subtotal: Math.round(product.customerPrice),
           category: product.category,
           costPrice: product.costPrice
         }];
      });
      setSearch('');
   };

   const updateQuantity = (id: string, delta: number) => {
      setCart(prev => prev.map(item => {
        if (item.productId !== id) return item;
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty, subtotal: Math.round(newQty * item.price) };
      }));
   };

   const removeItem = (id: string) => {
      setCart(prev => prev.filter(item => item.productId !== id));
   };

   return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
         <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 h-full max-h-[85vh]">
            <div className="p-8 border-b flex justify-between items-center bg-slate-900 text-white flex-shrink-0">
               <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-500 rounded-xl">
                     <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                     <h2 className="text-xl font-black">Create Customer Pre-Order</h2>
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Reserve stock with advance payment</p>
                  </div>
               </div>
               <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <XCircle className="w-6 h-6 text-slate-400" />
               </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Link Customer Profile</label>
                     <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select 
                           className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm appearance-none focus:ring-4 focus:ring-orange-500/10 transition-all outline-none"
                           value={selectedCustomer?.id || ''}
                           onChange={(e) => setSelectedCustomer(customers.find(c => c.id === e.target.value) || null)}
                        >
                           <option value="">Search Existing Database...</option>
                           {customers.map(c => <option key={c.id} value={c.id}>{c.name} • {c.phone}</option>)}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none rotate-90" />
                     </div>
                  </div>
                  <div className="space-y-4">
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Initial Advance Payment (INR)</label>
                     <div className="relative group">
                        <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                        <input 
                           type="number" 
                           className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-emerald-600 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-xl"
                           placeholder="0"
                           value={advance}
                           onChange={(e) => setAdvance(e.target.value)}
                        />
                     </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">3. Select Items for Order</label>
                  <div className="relative">
                     <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                     <input 
                        type="text" 
                        placeholder="Search books, stationery or scan barcode..."
                        className="w-full pl-14 pr-4 py-5 bg-slate-50 border border-slate-200 rounded-3xl font-bold text-base focus:ring-4 focus:ring-orange-500/10 transition-all outline-none"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                     />
                     {filteredProducts.length > 0 && (
                        <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 mt-2 overflow-hidden animate-in fade-in slide-in-from-top-2">
                           <div className="p-3 bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest px-6">Top Matches</div>
                           {filteredProducts.map(p => (
                              <button 
                                 key={p.id} 
                                 onClick={() => addToCart(p)} 
                                 className="w-full text-left px-6 py-4 hover:bg-orange-50 flex justify-between items-center border-b last:border-0 transition-colors group"
                              >
                                 <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center">
                                       {p.image ? (
                                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                       ) : (
                                          <span className={`w-full h-full flex items-center justify-center font-black text-xs ${p.category === Category.BOOKS ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                             {p.name.charAt(0)}
                                          </span>
                                       )}
                                    </div>
                                    <div className="flex flex-col">
                                       <span className="font-black text-slate-900 group-hover:text-orange-600 transition-colors">{p.name}</span>
                                       <span className="text-[10px] font-bold text-slate-400 uppercase">{p.author} • Stock: {p.closingStock}</span>
                                    </div>
                                 </div>
                                 <div className="flex items-center space-x-3">
                                    <span className="text-xs font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">₹{Math.round(p.customerPrice)}</span>
                                    <Plus className="w-4 h-4 text-orange-500" />
                                 </div>
                              </button>
                           ))}
                        </div>
                     )}
                  </div>
               </div>

               <div className="border border-slate-100 rounded-[2rem] overflow-hidden bg-white shadow-sm flex flex-col min-h-[200px]">
                  <table className="w-full text-sm">
                     <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <tr>
                           <th className="px-8 py-4 text-left">Item Detail</th>
                           <th className="px-8 py-4 text-center">Qty Control</th>
                           <th className="px-8 py-4 text-right">Subtotal</th>
                           <th className="px-4 py-4 text-center"></th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {cart.map(item => (
                           <tr key={item.productId} className="group hover:bg-slate-50/50 transition-colors">
                              <td className="px-8 py-5">
                                 <div className="flex flex-col">
                                    <span className="font-black text-slate-900">{item.name}</span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Unit Price: ₹{Math.round(item.price)}</span>
                                 </div>
                              </td>
                              <td className="px-8 py-5">
                                 <div className="flex items-center justify-center space-x-3 bg-white border border-slate-100 rounded-xl p-1 w-fit mx-auto shadow-sm">
                                    <button 
                                      onClick={() => updateQuantity(item.productId, -1)}
                                      className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                       <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="font-black text-slate-900 w-6 text-center">{item.quantity}</span>
                                    <button 
                                      onClick={() => updateQuantity(item.productId, 1)}
                                      className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-emerald-500 transition-colors"
                                    >
                                       <Plus className="w-3 h-3" />
                                    </button>
                                 </div>
                              </td>
                              <td className="px-8 py-5 text-right font-black text-slate-900">₹{Math.round(item.subtotal)}</td>
                              <td className="px-4 py-5 text-center">
                                 <button 
                                   onClick={() => removeItem(item.productId)}
                                   className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                 >
                                    <Trash2 className="w-4 h-4" />
                                 </button>
                              </td>
                           </tr>
                        ))}
                        {cart.length === 0 && (
                           <tr>
                              <td colSpan={4} className="py-16 text-center">
                                 <div className="flex flex-col items-center opacity-20">
                                    <ArrowRightCircle className="w-10 h-10 mb-2" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Add items from the search bar above</p>
                                 </div>
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>

            <div className="p-8 bg-slate-50 border-t flex flex-col md:flex-row justify-between items-center gap-6 flex-shrink-0">
               <div className="flex space-x-8">
                  <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Order Value</p>
                     <p className="text-2xl font-black text-slate-900">₹{Math.round(total)}</p>
                  </div>
                  <div className="w-px h-10 bg-slate-200"></div>
                  <div>
                     <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Balance Due</p>
                     <p className="text-2xl font-black text-emerald-600">₹{Math.round(Math.max(0, total - advanceNum))}</p>
                  </div>
               </div>
               
               <div className="flex space-x-4 w-full md:w-auto">
                  <button 
                     onClick={onClose}
                     className="flex-1 px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                  >
                     Discard
                  </button>
                  <button 
                     disabled={!selectedCustomer || cart.length === 0}
                     onClick={() => {
                        onSave({ 
                           customerId: selectedCustomer?.id, 
                           customerName: selectedCustomer?.name, 
                           items: cart, 
                           totalAmount: total, 
                           advancePaid: advanceNum 
                        });
                        onClose();
                     }}
                     className="flex-[2] px-10 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-slate-900/20 active:scale-[0.98] disabled:opacity-30 disabled:grayscale transition-all"
                  >
                     Save & Dispatch Order
                  </button>
               </div>
            </div>
         </div>
      </div>
   );
};

// Main component for Order management
const Orders: React.FC = () => {
  const { orders, customers, addOrder, updateOrderAdvance, cancelOrder, businessConfig } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState<CustomerOrder | null>(null);
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<CustomerOrder | null>(null);

  const receiptRef = useRef<HTMLDivElement>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => 
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id.includes(searchTerm)
    );
  }, [orders, searchTerm]);

  const downloadAdvanceReceipt = async () => {
    if (!receiptRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(receiptRef.current, { 
        pixelRatio: 3, 
        backgroundColor: '#ffffff',
        style: {
          fontFamily: "sans-serif"
        }
      });
      const link = document.createElement('a');
      link.download = `Advance-Receipt-${selectedOrderForReceipt?.id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) { console.error(e); }
  };

  const getStatusStyle = (status: OrderStatus) => {
    switch(status) {
      case OrderStatus.COMPLETED: return "bg-emerald-100 text-emerald-700";
      case OrderStatus.PENDING: return "bg-slate-100 text-slate-700";
      case OrderStatus.PARTIAL: return "bg-orange-100 text-orange-700";
      case OrderStatus.CANCELLED: return "bg-red-100 text-red-700";
    }
  };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50/50">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 mb-1">
             <ClipboardList className="w-4 h-4 text-orange-500" />
             <p className="text-orange-500 font-black text-[10px] uppercase tracking-widest">Order Pipeline</p>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Customer Orders</h1>
          <p className="text-slate-500 text-sm font-medium">Manage pre-orders, partial payments, and reservations.</p>
        </div>
        <button 
          onClick={() => setShowOrderModal(true)}
          className="px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:shadow-xl hover:shadow-slate-900/20 transition-all active:scale-95 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2 text-orange-500" />
          Create New Order
        </button>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 mb-8 p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search orders by ID or customer..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 text-sm font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-2 pb-10">
        {filteredOrders.map(order => (
          <div key={order.id} className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl transition-all group">
             <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">OrderID: #{order.id.slice(-6)}</p>
                      <h3 className="font-black text-lg text-slate-900">{order.customerName}</h3>
                   </div>
                   <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getStatusStyle(order.status)}`}>
                      {order.status}
                   </span>
                </div>
                
                <div className="space-y-3 mb-6 bg-slate-50 p-5 rounded-2xl border border-slate-100 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-3 opacity-10">
                      <Wallet className="w-12 h-12 text-slate-900" />
                   </div>
                   <div className="flex justify-between text-xs font-bold text-slate-500">
                      <span>Total Value</span>
                      <span className="text-slate-900 font-bold">₹{Math.round(order.totalAmount)}</span>
                   </div>
                   <div className="flex justify-between text-xs font-black text-emerald-600">
                      <span>Total Paid So Far</span>
                      <span className="font-black">₹{Math.round(order.advancePaid)}</span>
                   </div>
                   <div className="pt-3 mt-1 border-t border-slate-200 border-dashed flex justify-between items-baseline">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Balance</span>
                      <span className="text-xl font-black text-orange-600">₹{Math.round(order.totalAmount - order.advancePaid)}</span>
                   </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                   {order.status !== OrderStatus.COMPLETED && order.status !== OrderStatus.CANCELLED && (
                     <>
                        <button 
                          onClick={() => setShowAdvanceModal(order)}
                          className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                        >
                          Record Payment
                        </button>
                        <button 
                          onClick={() => setSelectedOrderForReceipt(order)}
                          className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
                          title="Print Advance Receipt"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                     </>
                   )}
                   {order.status === OrderStatus.COMPLETED && (
                      <div className="w-full py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center">
                         <CheckCircle2 className="w-4 h-4 mr-2" />
                         Full Payment Received
                      </div>
                   )}
                </div>
             </div>
          </div>
        ))}
        {filteredOrders.length === 0 && (
          <div className="col-span-full py-20 text-center flex flex-col items-center opacity-30">
             <ClipboardList className="w-20 h-20 mb-4" />
             <p className="font-black text-slate-900 uppercase tracking-widest">No active orders found</p>
          </div>
        )}
      </div>

      {showAdvanceModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
           <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden p-8 animate-in zoom-in-95">
              <h3 className="text-xl font-black text-slate-900 mb-1">Add Partial Payment</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Order #{showAdvanceModal.id.slice(-6)} • Total: ₹{Math.round(showAdvanceModal.totalAmount)}</p>
              
              <div className="space-y-4">
                 <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Amount to pay now (INR)</label>
                    <div className="relative">
                       <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                       <input 
                          autoFocus
                          id="advance-payment-input"
                          type="number" 
                          className="w-full pl-11 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 font-black text-xl outline-none transition-all"
                          placeholder="0"
                          onKeyDown={(e) => {
                             if (e.key === 'Enter') {
                                updateOrderAdvance(showAdvanceModal.id, Math.round(Number((e.target as HTMLInputElement).value)));
                                setShowAdvanceModal(null);
                             }
                          }}
                       />
                    </div>
                 </div>
                 <button 
                    onClick={() => {
                       const val = (document.getElementById('advance-payment-input') as HTMLInputElement).value;
                       updateOrderAdvance(showAdvanceModal.id, Math.round(Number(val)));
                       setShowAdvanceModal(null);
                    }}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 active:scale-95 transition-all"
                 >
                    Confirm Payment
                 </button>
                 <button onClick={() => setShowAdvanceModal(null)} className="w-full py-3 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors">Discard</button>
              </div>
           </div>
        </div>
      )}

      {showOrderModal && (
         <NewOrderModal onClose={() => setShowOrderModal(false)} onSave={addOrder} />
      )}

      {selectedOrderForReceipt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
           <div className="flex flex-col items-center max-w-md w-full my-8">
              <div ref={receiptRef} className="bg-white p-10 w-full font-sans shadow-2xl rounded-sm">
                 <div className="text-center mb-8">
                    <h2 className="text-2xl font-black tracking-tight m-0 uppercase">{businessConfig.mailingName || businessConfig.name}</h2>
                    <p className="text-[9px] uppercase tracking-[4px] font-bold text-slate-400 mt-1">PAYMENT RECEIPT</p>
                    <div className="w-full h-px bg-slate-100 my-4"></div>
                    <p className="text-xs text-slate-500">Order ID: #{selectedOrderForReceipt.id}</p>
                    <p className="text-xs text-slate-500">{new Date().toLocaleString()}</p>
                 </div>

                 <div className="bg-slate-50 p-6 rounded-2xl mb-8 space-y-3">
                    <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                       <span>Customer</span>
                       <span className="text-slate-900 font-black">{selectedOrderForReceipt.customerName}</span>
                    </div>
                    <div className="flex justify-between items-baseline pt-4 border-t border-slate-200 border-dashed">
                       <span className="text-[10px] font-black text-slate-900 uppercase">TOTAL PAID</span>
                       <span className="text-3xl font-black text-slate-900">₹{Math.round(selectedOrderForReceipt.advancePaid)}</span>
                    </div>
                 </div>

                 <div className="space-y-4 mb-10 px-2">
                    <div className="flex justify-between text-xs font-bold text-slate-500">
                       <span>Grand Total Order Value</span>
                       <span className="font-black">₹{Math.round(selectedOrderForReceipt.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-black text-orange-600">
                       <span>REMAINING BALANCE</span>
                       <span className="font-black">₹{Math.round(selectedOrderForReceipt.totalAmount - selectedOrderForReceipt.advancePaid)}</span>
                    </div>
                 </div>

                 <div className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold leading-relaxed px-4 italic">
                       "Please present this digital receipt at the counter during final checkout to adjust your recorded payments."
                    </p>
                 </div>
              </div>
              
              <div className="flex gap-4 w-full mt-6">
                 <button 
                   onClick={downloadAdvanceReceipt}
                   className="flex-1 py-4 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-orange-500/20 flex items-center justify-center active:scale-95"
                 >
                    <ImageIcon className="w-5 h-5 mr-3" />
                    Download PNG
                 </button>
                 <button onClick={() => setSelectedOrderForReceipt(null)} className="p-4 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition-all"><XCircle className="w-6 h-6" /></button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
