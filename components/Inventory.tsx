
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../store.tsx';
import { Search, RefreshCw, ChevronDown, Plus, Package, Edit3, Trash2, Database, AlertTriangle, Sparkles, Upload, CheckCircle2, X, Maximize2, FileDown } from 'lucide-react';
import { Product } from '../types.ts';
import ProductModal from './ProductModal.tsx';

const Inventory: React.FC = () => {
  const { inventory, syncWithLocal, isLoading, searchProducts, addProduct, addProductsBulk, updateProduct, deleteProduct, user, categories, targetClasses } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success'>('idle');
  const [importStatus, setImportStatus] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isAdmin = user?.role === 'ADMIN';

  const [filters, setFilters] = useState({
    class: 'All',
    category: 'All',
    stockStatus: 'All'
  });

  // Auto-clear import status
  useEffect(() => {
    if (importStatus) {
      const timer = setTimeout(() => setImportStatus(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [importStatus]);

  const filteredInventory = useMemo(() => {
    return searchProducts(searchTerm, filters);
  }, [searchTerm, filters, inventory, searchProducts]);

  const stockStatuses = ['All', 'In Stock', 'Low Stock', 'Out of Stock'];

  const handleEdit = (product: Product) => {
    if (!isAdmin) return;
    setEditingProduct(product);
    setShowModal(true);
  };

  const handleSave = (productData: Omit<Product, 'id' | 'dateAdded' | 'totalSold'>) => {
    if (editingProduct) updateProduct(editingProduct.id, productData);
    else addProduct(productData);
    setShowModal(false);
  };

  const handleSync = async () => {
    setSyncStatus('syncing');
    syncWithLocal();
    setSyncStatus('success');
    setTimeout(() => setSyncStatus('idle'), 2000);
  };

  // Robust CSV Line Parser that handles quoted values correctly
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let curVal = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(curVal.trim());
        curVal = '';
      } else {
        curVal += char;
      }
    }
    result.push(curVal.trim());
    return result.map(val => val.replace(/^"|"$/g, ''));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rawRows = text.split(/\r?\n/).filter(line => line.trim() !== '');
        
        if (rawRows.length === 0) {
          setImportStatus({ message: "The selected file is empty.", type: 'error' });
          return;
        }

        const rows = rawRows.map(parseCSVLine);
        
        // Determine if first row is header
        const header = rows[0];
        const isHeader = header.some(cell => 
          ['barcode', 'sku', 'name', 'item', 'mrp'].includes(cell.toLowerCase().trim())
        );
        
        const dataRows = isHeader ? rows.slice(1) : rows;
        const productsToImport: Omit<Product, 'id' | 'dateAdded' | 'totalSold'>[] = [];
        let errorCount = 0;

        dataRows.forEach((row, index) => {
          // Expected Map: 0:barcode, 1:name, 2:author, 3:class, 4:category, 5:stock, 6:cost, 7:mrp, 8:discount
          if (row.length < 2 || !row[1]) {
            errorCount++;
            return;
          }

          const barcode = row[0] || `SKU-${Date.now()}-${index}`;
          const name = row[1];
          const author = row[2] || 'Unknown';
          const targetClass = row[3] || 'N/A';
          const categoryStr = row[4] || 'General';
          
          // Numerical conversions with defaults
          const stockNum = Math.max(0, parseInt(row[5]) || 0);
          const mrpNum = Math.round(parseFloat(row[7]) || 0);
          const discNum = parseFloat(row[8]) || 0;
          const costNum = Math.round(parseFloat(row[6]) || (mrpNum * 0.75)); 
          const price = Math.round(mrpNum * (1 - discNum / 100));

          productsToImport.push({
            barcode,
            name,
            author,
            class: targetClass,
            category: categoryStr,
            stockIn: stockNum,
            closingStock: stockNum,
            costPrice: costNum,
            mrp: mrpNum,
            discountRate: discNum,
            customerPrice: price
          });
        });

        if (productsToImport.length > 0) {
          addProductsBulk(productsToImport);
          const successMsg = `Imported ${productsToImport.length} products successfully.`;
          const errorMsg = errorCount > 0 ? ` (${errorCount} rows skipped due to missing data)` : '';
          setImportStatus({ message: successMsg + errorMsg, type: 'success' });
        } else {
          setImportStatus({ message: "No valid product data found. Ensure Barcode and Name are present.", type: 'error' });
        }
      } catch (err) {
        console.error("CSV Import Error:", err);
        setImportStatus({ message: "System failed to process this CSV. Check for formatting errors.", type: 'error' });
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.onerror = () => setImportStatus({ message: "Critical error reading file from local disk.", type: 'error' });
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const headers = "barcode,name,author,class,category,stock,cost price,mrp,discount rate";
    const sample = "\n890123456001,\"Sample Book Name\",Author Name,10,Books,50,150,250,10";
    const blob = new Blob([headers + sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "inventory_import_template.csv";
    link.click();
  };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50/50">
      {showModal && <ProductModal onClose={() => setShowModal(false)} onSave={handleSave} initialData={editingProduct} />}
      
      {/* Image Zoom Overlay */}
      {zoomedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => setZoomedImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh] flex items-center justify-center animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <button 
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
              onClick={() => setZoomedImage(null)}
            >
              <X className="w-8 h-8" />
            </button>
            <img 
              src={zoomedImage} 
              alt="Zoomed product" 
              className="w-full h-full object-contain rounded-2xl shadow-2xl border border-white/10" 
            />
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 md:mb-10">
        <div>
          <div className="flex items-center space-x-2 mb-1">
             <Database className="w-4 h-4 text-orange-500" />
             <p className="text-orange-500 font-black text-[10px] uppercase tracking-widest">Master Database</p>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Stock Registry</h1>
        </div>
        {isAdmin && (
          <div className="flex items-center bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto">
            <button onClick={downloadTemplate} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Download Template">
              <FileDown className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-slate-100 mx-1"></div>
            <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 text-[10px] font-black uppercase text-slate-500 hover:bg-slate-50 rounded-xl transition-all">Import CSV</button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
            <div className="w-px h-6 bg-slate-100 mx-1"></div>
            <button onClick={handleSync} className="px-4 py-2 text-[10px] font-black uppercase text-slate-500 hover:bg-slate-50 rounded-xl transition-all">
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            </button>
            <div className="w-px h-6 bg-slate-100 mx-1"></div>
            <button onClick={() => { setEditingProduct(undefined); setShowModal(true); }} className="px-5 py-2 bg-orange-500 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-orange-500/20 active:scale-95 transition-all">Add New</button>
          </div>
        )}
      </div>

      {importStatus && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-4 ${importStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          <div className="flex items-center">
            {importStatus.type === 'success' ? <CheckCircle2 className="w-5 h-5 mr-3" /> : <AlertTriangle className="w-5 h-5 mr-3" />}
            <p className="text-xs font-black uppercase tracking-tight">{importStatus.message}</p>
          </div>
          <button onClick={() => setImportStatus(null)} className="p-1 hover:bg-black/5 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 mb-8 p-6">
        <div className="flex flex-col md:grid md:grid-cols-12 gap-6">
          <div className="md:col-span-5 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" placeholder="Search SKU, Title, Author..." className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="md:col-span-2 relative">
            <select className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest appearance-none" value={filters.class} onChange={(e) => setFilters({...filters, class: e.target.value})}>
              <option value="All">All Classes</option>
              {targetClasses.map(c => <option key={c} value={c}>Class {c}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <div className="md:col-span-3 relative">
            <select className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest appearance-none" value={filters.category} onChange={(e) => setFilters({...filters, category: e.target.value})}>
              <option value="All">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <div className="md:col-span-2 relative">
            <select className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest appearance-none" value={filters.stockStatus} onChange={(e) => setFilters({...filters, stockStatus: e.target.value})}>
              {stockStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr><th className="px-8 py-6">Product Detail</th><th className="px-8 py-6">Category</th><th className="px-8 py-6">Class</th><th className="px-8 py-6 text-center">Stock</th><th className="px-8 py-6 text-right">Price</th>{isAdmin && <th className="px-8 py-6 text-center">Actions</th>}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInventory.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-3">
                       {item.image && (
                         <div 
                           className="relative group cursor-zoom-in"
                           onClick={() => setZoomedImage(item.image!)}
                         >
                           <img 
                            src={item.image} 
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-slate-200" 
                           />
                           <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-opacity">
                             <Maximize2 className="w-4 h-4 text-white" />
                           </div>
                         </div>
                       )}
                       <div>
                         <p className="font-black text-slate-900 text-sm">{item.name}</p>
                         <p className="text-[10px] text-slate-400 font-bold uppercase">{item.barcode}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-6"><span className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black uppercase text-slate-600">{item.category}</span></td>
                  <td className="px-8 py-6 font-black text-xs text-slate-600">{item.class}</td>
                  <td className="px-8 py-6 text-center"><span className={`px-4 py-1.5 rounded-xl font-black text-xs ${item.closingStock === 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{item.closingStock}</span></td>
                  <td className="px-8 py-6 text-right font-black text-slate-900">₹{Math.round(item.customerPrice)}</td>
                  {isAdmin && <td className="px-8 py-6 text-center"><button onClick={() => handleEdit(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit3 className="w-4 h-4" /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
