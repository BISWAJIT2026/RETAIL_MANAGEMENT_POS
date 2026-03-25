
import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Barcode as BarcodeIcon, Tag, BookOpen, Layers, Hash, Percent, IndianRupee, Plus, Minus, Info, Sparkles, Loader2, Wand2, CheckCircle2, ImageIcon, Trash2, Camera, RefreshCw, Scan } from 'lucide-react';
import { Product } from '../types.ts';
import { useApp } from '../store.tsx';
import BarcodeScanner from './BarcodeScanner.tsx';

interface ProductModalProps {
  onClose: () => void;
  onSave: (product: Omit<Product, 'id' | 'dateAdded' | 'totalSold'>) => void;
  initialData?: Product;
}

const ProductModal: React.FC<ProductModalProps> = ({ onClose, onSave, initialData }) => {
  const { lookupISBN, categories, targetClasses } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [formData, setFormData] = useState({
    barcode: '',
    name: '',
    author: '',
    class: 'N/A',
    category: 'Books',
    stockIn: 0,
    closingStock: 0,
    costPrice: 0,
    mrp: 0,
    discountRate: 0,
    image: ''
  });

  const [stockAdjustment, setStockAdjustment] = useState<number | string>('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [showSuccessHint, setShowSuccessHint] = useState(false);
  
  // Scanner state
  const [showScanner, setShowScanner] = useState(false);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        barcode: initialData.barcode,
        name: initialData.name,
        author: initialData.author,
        class: initialData.class,
        category: initialData.category,
        stockIn: initialData.stockIn,
        closingStock: initialData.closingStock,
        costPrice: Math.round(initialData.costPrice),
        mrp: Math.round(initialData.mrp),
        discountRate: initialData.discountRate,
        image: initialData.image || ''
      });
    } else {
      setFormData(prev => ({
        ...prev,
        category: categories[0] || 'Books',
        class: targetClasses.includes('N/A') ? 'N/A' : targetClasses[0] || 'General'
      }));
    }
  }, [initialData, categories, targetClasses]);

  const handleLookup = async () => {
    if (!formData.barcode || formData.barcode.length < 5) return;
    setIsLookingUp(true);
    try {
      const details = await lookupISBN(formData.barcode);
      if (details) {
        setFormData(prev => ({
          ...prev,
          name: details.name || prev.name,
          author: details.author || prev.author,
          class: details.class || prev.class,
          category: details.category || prev.category,
          mrp: Math.round(details.mrp || prev.mrp),
          costPrice: Math.round(details.costPrice || prev.costPrice)
        }));
        setShowSuccessHint(true);
        setTimeout(() => setShowSuccessHint(false), 2000);
      }
    } catch (e) { console.error(e); }
    finally { setIsLookingUp(false); }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
        };
      }
      setIsCameraActive(true);
    } catch (err) {
      alert("Could not access camera for product image.");
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Use actual video resolution
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setFormData(prev => ({ ...prev, image: imageData }));
        stopCamera();
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, image: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const onBarcodeScan = (barcode: string) => {
    setFormData(prev => ({ ...prev, barcode }));
    setShowScanner(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalClosingStock = formData.closingStock;
    if (initialData && stockAdjustment !== '') finalClosingStock += Number(stockAdjustment);
    else if (!initialData) finalClosingStock = formData.stockIn;

    const mrp = Math.round(formData.mrp);
    const costPrice = Math.round(formData.costPrice);
    const customerPrice = Math.round(mrp * (1 - formData.discountRate / 100));
    
    onSave({ 
      ...formData, 
      mrp,
      costPrice,
      closingStock: Math.max(0, finalClosingStock), 
      customerPrice 
    });
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'stockIn' || name === 'mrp' || name === 'discountRate' || name === 'costPrice') ? parseFloat(value) || 0 : value
    }));
  };

  const calculatedPrice = Math.round(formData.mrp * (1 - formData.discountRate / 100));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-hidden">
      {showScanner && <BarcodeScanner onScan={onBarcodeScan} onClose={() => setShowScanner(false)} />}
      
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col border border-white/20 max-h-[95vh] animate-in zoom-in-95 duration-200">
        <div className="bg-slate-900 text-white px-8 py-5 flex justify-between items-center relative overflow-hidden flex-shrink-0">
          <div className="flex items-center space-x-3 z-10">
            <div className="p-2 bg-orange-500 rounded-xl shadow-lg"><Tag className="w-5 h-5 text-white" /></div>
            <div>
              <h2 className="text-lg font-black tracking-tight">{initialData ? 'Update Inventory' : 'Add New Item'}</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Master Product Registry</p>
            </div>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }} className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Product Media</label>
                <div className="relative group aspect-[16/10] w-full bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center">
                  {isCameraActive ? (
                    <div className="absolute inset-0 bg-black flex flex-col items-center">
                      <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
                      <div className="absolute bottom-3 left-0 right-0 flex justify-center space-x-4 px-4">
                        <button type="button" onClick={captureFrame} className="p-3 bg-orange-500 text-white rounded-xl shadow-xl flex items-center justify-center active:scale-95"><Camera className="w-5 h-5" /></button>
                        <button type="button" onClick={stopCamera} className="p-3 bg-slate-800 text-white rounded-xl shadow-xl flex items-center justify-center active:scale-95"><X className="w-5 h-5" /></button>
                      </div>
                    </div>
                  ) : formData.image ? (
                    <>
                      <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, image: '' }))} className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        <button type="button" onClick={startCamera} className="p-2 bg-white text-slate-900 rounded-lg hover:bg-slate-50 transition-colors"><Camera className="w-4 h-4" /></button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center space-y-3">
                      <ImageIcon className="w-10 h-10 text-slate-300" />
                      <div className="flex space-x-2">
                         <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-[9px] font-black uppercase hover:bg-slate-50 transition-colors">Upload</button>
                         <button type="button" onClick={startCamera} className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-[9px] font-black uppercase flex items-center hover:bg-orange-600 transition-colors"><Camera className="w-3 h-3 mr-1.5" /> Camera</button>
                      </div>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Scan SKU / ISBN</label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <input required name="barcode" type="text" className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-orange-500/10 outline-none font-mono text-sm" placeholder="ISBN Barcode" value={formData.barcode} onChange={handleChange} />
                    <button type="button" onClick={() => setShowScanner(true)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-500 transition-colors">
                      <Scan className="w-4 h-4" />
                    </button>
                  </div>
                  <button type="button" onClick={handleLookup} disabled={isLookingUp} className="px-4 bg-indigo-600 text-white rounded-xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center hover:bg-indigo-700">
                    {isLookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  </button>
                </div>
                {showSuccessHint && <p className="text-[9px] font-black text-emerald-500 uppercase mt-2 animate-pulse">AI Verified & Populated</p>}
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Item Title</label>
                <input required name="name" type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:ring-4 focus:ring-orange-500/10 outline-none" placeholder="NCERT Mathematics" value={formData.name} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Author / Brand</label>
                <input name="author" type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-orange-500/10 outline-none" placeholder="Publisher or Manufacturer" value={formData.author} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Standard</label>
                  <select name="class" className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl appearance-none font-black text-xs cursor-pointer focus:ring-4 focus:ring-orange-500/10 outline-none" value={formData.class} onChange={handleChange}>
                    {targetClasses.map(c => <option key={c} value={c}>{c === 'N/A' ? 'General' : `Class ${c}`}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Type</label>
                  <select name="category" className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl appearance-none font-black text-xs cursor-pointer focus:ring-4 focus:ring-orange-500/10 outline-none" value={formData.category} onChange={handleChange}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div className="p-6 bg-slate-900 rounded-3xl text-white space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Printed MRP</label>
                   <input required name="mrp" type="number" className="w-full bg-white/10 border border-white/20 p-3 rounded-lg font-black text-lg focus:ring-2 focus:ring-orange-500 outline-none" value={formData.mrp} onChange={handleChange} />
                </div>
                <div>
                   <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Standard Disc %</label>
                   <input name="discountRate" type="number" className="w-full bg-white/10 border border-white/20 p-3 rounded-lg font-black text-lg focus:ring-2 focus:ring-orange-500 outline-none" value={formData.discountRate} onChange={handleChange} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Unit Cost Price (Purchase)</label>
                <input required name="costPrice" type="number" className="w-full bg-white/10 border border-white/20 p-3 rounded-lg font-black text-lg focus:ring-2 focus:ring-orange-500 outline-none" value={formData.costPrice} onChange={handleChange} />
              </div>
              <div className="bg-orange-500 p-4 rounded-xl flex justify-between items-center shadow-lg shadow-orange-500/20">
                 <span className="text-[9px] font-black uppercase tracking-widest text-orange-950">Store Net Price</span>
                 <span className="text-2xl font-black">₹{calculatedPrice}</span>
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 flex flex-col justify-center">
               {initialData ? (
                 <div className="space-y-4">
                   <div className="flex justify-between items-center px-1"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Inventory Status</span><span className="font-black text-xl text-slate-900">{formData.closingStock} Units</span></div>
                   <div>
                     <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block ml-1">Manual Adjust (+/-)</label>
                     <input type="number" className="w-full p-4 bg-white border border-slate-200 rounded-xl font-black text-lg shadow-sm focus:ring-4 focus:ring-orange-500/10 outline-none" placeholder="e.g. +20" value={stockAdjustment} onChange={(e) => setStockAdjustment(e.target.value)} />
                   </div>
                 </div>
               ) : (
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block ml-1 text-center">Initial Opening Stock</label>
                    <input name="stockIn" type="number" className="w-full p-6 bg-white border border-slate-200 rounded-2xl font-black text-3xl text-center focus:ring-8 focus:ring-orange-500/10 outline-none" placeholder="0" value={formData.stockIn} onChange={handleChange} />
                 </div>
               )}
            </div>
          </div>

          <div className="pt-4 flex space-x-3 flex-shrink-0">
            <button type="button" onClick={() => { stopCamera(); onClose(); }} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors active:scale-95">Discard</button>
            <button type="submit" className="flex-[2] py-4 bg-slate-900 text-white font-black rounded-xl shadow-xl text-[10px] uppercase tracking-[0.2em] flex items-center justify-center hover:bg-slate-800 transition-all active:scale-95">
              <Save className="w-4 h-4 mr-2.5 text-orange-500" /> {initialData ? 'Commit Updates' : 'Initialize Product'}
            </button>
          </div>
        </form>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default ProductModal;
