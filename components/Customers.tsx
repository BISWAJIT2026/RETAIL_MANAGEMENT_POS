import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../store.tsx';
import { Search, UserPlus, Edit3, Trash2, Phone, MapPin, History, X, Save, User as UserIcon, ExternalLink } from 'lucide-react';
import { Customer, Bill } from '../types.ts';

const Customers: React.FC = () => {
  const { customers, bills, addCustomer, updateCustomer, deleteCustomer, user } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);
  const [selectedCustomerBills, setSelectedCustomerBills] = useState<{customer: Customer, bills: Bill[]} | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm)
    );
  }, [customers, searchTerm]);

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowModal(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (!isAdmin) return;
    if (window.confirm(`Are you sure you want to delete customer "${name}"? All transaction links will be lost.`)) {
      deleteCustomer(id);
    }
  };

  const viewHistory = (customer: Customer) => {
    const custBills = bills.filter(b => b.customerId === customer.id);
    setSelectedCustomerBills({ customer, bills: custBills });
  };

  return (
    <div className="p-8 h-full flex flex-col relative">
      {showModal && (
        <CustomerModal 
          onClose={() => setShowModal(false)}
          onSave={(data) => {
            if (editingCustomer) {
              updateCustomer(editingCustomer.id, data);
            } else {
              addCustomer(data);
            }
            setShowModal(false);
          }}
          initialData={editingCustomer}
        />
      )}

      {selectedCustomerBills && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-slate-900 text-white">
              <div className="flex items-center space-x-3">
                <History className="w-5 h-5 text-orange-500" />
                <h2 className="text-xl font-bold">Purchase History: {selectedCustomerBills.customer.name}</h2>
              </div>
              <button onClick={() => setSelectedCustomerBills(null)} className="p-1.5 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              {selectedCustomerBills.bills.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                   <History className="w-12 h-12 mx-auto mb-4 opacity-10" />
                   <p className="font-medium text-lg">No transactions found for this customer.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedCustomerBills.bills.map(bill => (
                    <div key={bill.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                       <div className="flex justify-between items-start mb-4">
                         <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Invoice ID</p>
                            <p className="font-mono text-blue-600 font-bold">{bill.id}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Date</p>
                            <p className="font-semibold">{new Date(bill.date).toLocaleString()}</p>
                         </div>
                       </div>
                       <table className="w-full text-sm mb-4">
                         <thead className="text-slate-400 font-bold border-b border-slate-100">
                           <tr>
                             <th className="text-left py-2">Item</th>
                             <th className="text-center py-2">Qty</th>
                             <th className="text-right py-2">Total</th>
                           </tr>
                         </thead>
                         <tbody>
                           {bill.items.map((item, idx) => (
                             <tr key={idx} className="border-b border-slate-50 last:border-0">
                               <td className="py-2 font-medium">{item.name}</td>
                               <td className="py-2 text-center">{item.quantity}</td>
                               <td className="py-2 text-right">₹{item.subtotal.toFixed(2)}</td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                       <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                         <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Payment Method: {bill.paymentMethod}</span>
                         <span className="text-xl font-black text-slate-900">₹{bill.grandTotal.toFixed(2)}</span>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Customer Management</h1>
          <p className="text-slate-500">Track loyalty and purchase behavior</p>
        </div>
        <button 
          onClick={() => { setEditingCustomer(undefined); setShowModal(true); }}
          className="flex items-center px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/10"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          New Customer
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6 p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name or phone number..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Customer Details</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Contact</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Address</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Added On</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{customer.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{customer.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="flex items-center">
                      <Phone className="w-3.5 h-3.5 mr-2 text-slate-400" />
                      {customer.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="flex items-start max-w-xs">
                      <MapPin className="w-3.5 h-3.5 mr-2 mt-0.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{customer.address || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {new Date(customer.dateAdded).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center space-x-2">
                      <button 
                        onClick={() => viewHistory(customer)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                        title="View History"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEdit(customer)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                        title="Edit Profile"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button 
                          onClick={() => handleDelete(customer.id, customer.name)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCustomers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <UserPlus className="w-16 h-16 mb-4 opacity-10" />
              <p className="font-medium">No customers found matching your search</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface CustomerModalProps {
  onClose: () => void;
  onSave: (data: Omit<Customer, 'id' | 'dateAdded'>) => void;
  initialData?: Customer;
}

const CustomerModal: React.FC<CustomerModalProps> = ({ onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        phone: initialData.phone,
        address: initialData.address || ''
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <UserPlus className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-black">{initialData ? 'Edit Customer' : 'Add New Customer'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Customer Name</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  required
                  type="text" 
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  required
                  type="tel" 
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  placeholder="Primary Contact"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Address (Optional)</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
                <textarea 
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 h-24 resize-none"
                  placeholder="Shipping/Billing Address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex space-x-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
            >
              Discard
            </button>
            <button 
              type="submit"
              className="flex-[2] py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center shadow-xl shadow-slate-900/10 active:scale-95"
            >
              <Save className="w-5 h-5 mr-2" />
              {initialData ? 'Update Record' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Customers;