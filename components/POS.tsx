
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useApp } from '../store.tsx';
import { 
  Barcode, Search, Trash2, CreditCard, Plus, Minus, User as UserIcon, 
  CheckCircle2, XCircle, Camera, RotateCcw, Banknote, QrCode, Globe, 
  Loader2, Image as ImageIcon, UserPlus, ChevronDown, Sparkles, 
  ShoppingCart, ClipboardList, ShieldCheck, ExternalLink, Zap,
  Activity, Fingerprint, ShieldAlert, Wifi, Smartphone, Lock, ScanLine, MonitorCheck, AlertCircle,
  RefreshCw, Landmark, ArrowDownLeft, MessageSquareText, Filter, ListFilter, BookOpen, Layers,
  Keyboard, MonitorSmartphone, Volume2
} from 'lucide-react';
import { OrderItem, Product, Bill, Customer, Category, CustomerOrder, OrderStatus } from '../types.ts';
import BarcodeScanner from './BarcodeScanner.tsx';
import * as htmlToImage from 'html-to-image';
import { GoogleGenAI, Type } from "@google/genai";
import PaymentOrchestrator from './PaymentOrchestrator.tsx';

// Unified Scan Source Types
type ScanSource = 'CAMERA' | 'EXTERNAL_DEVICE' | 'MANUAL';

const POS: React.FC = () => {
  const { 
    getProductByBarcode, inventory, processSale, customers, 
    addCustomer, user, orders, upiId, upiQrCode, businessConfig,
    targetClasses, categories
  } = useApp();
  
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  
  // Scan Source Management
  const [activeScanMode, setActiveScanMode] = useState<'CAMERA' | 'HID'>('HID');
  const scanBuffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);
  const SCAN_THRESHOLD = 30; // ms threshold for hardware scanner detection

  // Product Search & Catalog State
  const [productSearch, setProductSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showCatalog, setShowCatalog] = useState(false);

  // Customer Selection State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showAddCustomerQuick, setShowAddCustomerQuick] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({ name: '', phone: '' });

  // Linked Order State
  const [linkedOrder, setLinkedOrder] = useState<CustomerOrder | null>(null);
  const [showOrderLinkModal, setShowOrderLinkModal] = useState(false);

  // Payment & Orchestration State
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [showOrchestrator, setShowOrchestrator] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [completedBill, setCompletedBill] = useState<Bill | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const customerRef = useRef<HTMLDivElement>(null);

  // Unified Scan Processing Pipeline
  const onScanComplete = useCallback((barcode: string, source: ScanSource) => {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return;

    const product = getProductByBarcode(cleanBarcode);
    if (product) {
      addItemToCart(product);
      setBarcodeInput('');
      // Play subtle success chime (simulated)
      console.log(`[SCAN_AUDIT] Source: ${source}, Barcode: ${cleanBarcode}, Status: SUCCESS`);
    } else {
      if (source !== 'MANUAL') {
        setErrorMessage(`Invalid Item Scanned: ${cleanBarcode}`);
        setTimeout(() => setErrorMessage(null), 3000);
      }
      console.warn(`[SCAN_AUDIT] Source: ${source}, Barcode: ${cleanBarcode}, Status: FAILED`);
    }
  }, [getProductByBarcode]);

  // External Hardware Scanner Listener (HID Keyboard Wedge)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if currently typing in an input that isn't the primary barcode field
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      // Fix: cast target to HTMLInputElement | HTMLTextAreaElement to access placeholder property safely
      const isSearchOrCustomerInput = isInput && (
        (target as HTMLInputElement | HTMLTextAreaElement).placeholder?.toLowerCase().includes('search') || 
        (target as HTMLInputElement | HTMLTextAreaElement).placeholder?.toLowerCase().includes('lookup')
      );

      if (isInput && isSearchOrCustomerInput) {
        scanBuffer.current = '';
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime.current;
      lastKeyTime.current = currentTime;

      // Logic for HID Scanners (Ultra-fast character entry)
      if (e.key === 'Enter') {
        if (scanBuffer.current.length > 0) {
          e.preventDefault();
          onScanComplete(scanBuffer.current, 'EXTERNAL_DEVICE');
          scanBuffer.current = '';
        }
      } else if (e.key.length === 1) {
        // If typing speed is human (too slow), clear buffer, otherwise treat as scanner
        if (timeDiff > SCAN_THRESHOLD && scanBuffer.current.length > 0) {
          scanBuffer.current = e.key;
        } else {
          scanBuffer.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [onScanComplete]);

  useEffect(() => {
    if (!showScanner && !completedBill && !showAddCustomerQuick && !showOrderLinkModal && !showOrchestrator && !showCatalog) {
      if (window.innerWidth >= 1024) inputRef.current?.focus();
    }
  }, [showScanner, completedBill, showAddCustomerQuick, showOrderLinkModal, showOrchestrator, showCatalog]);

  const handleCheckout = useCallback(async (bypassOrchestrator: boolean = false) => {
    if (cart.length === 0) return;
    
    if (paymentMethod === 'UPI' && !bypassOrchestrator) {
      setShowOrchestrator(true);
      return;
    }

    setIsProcessing(true);
    try {
      const advanceToAdjust = linkedOrder ? Math.round(linkedOrder.advancePaid) : 0;
      
      const bill = await processSale(
        cart, 
        selectedCustomer?.id, 
        selectedCustomer?.name || 'Walk-in', 
        paymentMethod,
        linkedOrder?.id,
        advanceToAdjust
      );
      setCompletedBill(bill);
      setCart([]);
      setBarcodeInput('');
      setPaymentMethod('Cash'); 
      setLinkedOrder(null);
      setShowOrchestrator(false);
    } catch (err: any) {
      setErrorMessage(err.message);
      setShowOrchestrator(false);
    } finally {
      setIsProcessing(false);
    }
  }, [cart, paymentMethod, selectedCustomer, linkedOrder, processSale]);

  const subtotal = Math.round(cart.reduce((acc, curr) => acc + (curr.mrp * curr.quantity), 0));
  const totalDiscount = Math.round(cart.reduce((acc, curr) => acc + ((curr.mrp - curr.price) * curr.quantity), 0));
  const netTotal = Math.round(cart.reduce((acc, curr) => acc + curr.subtotal, 0));
  const advanceToAdjust = linkedOrder ? Math.round(linkedOrder.advancePaid) : 0;
  const grandTotal = Math.round(Math.max(0, netTotal - advanceToAdjust));

  const sendWhatsAppNotification = (bill: Bill) => {
    const customerPhone = selectedCustomer?.phone;
    if (!customerPhone) return;

    const itemsSummary = bill.items.map(i => `${i.name} (x${i.quantity})`).join(', ');
    const message = `*${businessConfig.name.toUpperCase()} - INVOICE*\n\n` +
      `Hello ${bill.customerName || 'Customer'},\n` +
      `Thank you for shopping with us! Your invoice is ready.\n\n` +
      `*Invoice ID:* ${bill.id}\n` +
      `*Date:* ${new Date(bill.date).toLocaleDateString()}\n` +
      `*Total Amount:* ₹${Math.round(bill.grandTotal)}\n` +
      `*Items:* ${itemsSummary}\n\n` +
      `Visit again soon!`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/91${customerPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return [];
    return customers.filter(c => 
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
      c.phone.includes(customerSearch)
    ).slice(0, 5);
  }, [customers, customerSearch]);

  const filteredProducts = useMemo(() => {
    return inventory.filter(p => {
      const query = productSearch.toLowerCase();
      const matchesQuery = !query || 
        p.name.toLowerCase().includes(query) || 
        p.author.toLowerCase().includes(query) || 
        p.barcode.includes(query);
      const matchesClass = selectedClass === 'All' || p.class === selectedClass;
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesQuery && matchesClass && matchesCategory;
    });
  }, [inventory, productSearch, selectedClass, selectedCategory]);

  const activeOrdersForCustomer = useMemo(() => {
    if (!selectedCustomer) return [];
    return orders.filter(o => 
      o.customerId === selectedCustomer.id && 
      (o.status === OrderStatus.PENDING || o.status === OrderStatus.PARTIAL)
    );
  }, [orders, selectedCustomer]);

  const formatDateWithTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${d}-${m}-${y} ${h}:${min}`;
  };

  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    onScanComplete(barcodeInput, 'MANUAL');
  };

  const onCameraScan = (barcode: string) => {
    onScanComplete(barcode, 'CAMERA');
    setShowScanner(false);
  };

  const addItemToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.closingStock) {
          setErrorMessage(`Insufficient stock for ${product.name}`);
          setTimeout(() => setErrorMessage(null), 3000);
          return prev;
        }
        const newQty = existing.quantity + 1;
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: newQty, subtotal: Math.round(newQty * item.price) } 
            : item
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
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId !== id) return item;
      const product = inventory.find(p => p.id === id);
      const newQty = Math.max(1, item.quantity + delta);
      if (product && newQty > product.closingStock) {
        setErrorMessage(`Only ${product.closingStock} units available`);
        setTimeout(() => setErrorMessage(null), 3000);
        return item;
      }
      return { ...item, quantity: newQty, subtotal: Math.round(newQty * item.price) };
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.productId !== id));
    if (linkedOrder && cart.length <= 1) setLinkedOrder(null);
  };

  const applyOrder = (order: CustomerOrder) => {
    setLinkedOrder(order);
    setCart(order.items.map(i => ({
      ...i,
      subtotal: Math.round(i.subtotal),
      price: Math.round(i.price),
      mrp: Math.round(i.mrp)
    })));
    setShowOrderLinkModal(false);
  };

  const handleQuickCustomerSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustomer.name || !quickCustomer.phone) return;
    const newCust = addCustomer(quickCustomer);
    setSelectedCustomer(newCust);
    setCustomerSearch(newCust.name);
    setShowAddCustomerQuick(false);
    setQuickCustomer({ name: '', phone: '' });
  };

  const downloadReceiptAsImage = async () => {
    if (!receiptRef.current) return;
    setIsGeneratingImage(true);
    try {
      const dataUrl = await htmlToImage.toPng(receiptRef.current, { 
        backgroundColor: '#ffffff', 
        pixelRatio: 3,
        style: {
          fontFamily: "'Inter', sans-serif"
        }
      });
      const link = document.createElement('a');
      link.download = `Invoice-${completedBill?.id || Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) { 
      console.error(err);
      setErrorMessage('Failed to generate invoice image'); 
    }
    finally { setIsGeneratingImage(false); }
  };

  const handleNewSale = () => {
    setCompletedBill(null);
    setSelectedCustomer(null);
    setCustomerSearch('');
  };

  if (completedBill) {
    const gstRate = businessConfig.gstRate || 0;
    const isGst = businessConfig.isGstEnabled;
    const taxableValue = isGst ? Math.round(completedBill.grandTotal / (1 + (gstRate / 100))) : completedBill.grandTotal;
    const gstAmount = completedBill.grandTotal - taxableValue;

    return (
      <div className="h-full w-full relative">
        <div className="no-print flex flex-col items-center justify-center h-full p-4 md:p-8 text-center bg-slate-50 overflow-y-auto">
          <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-xl border border-slate-200 max-w-md w-full my-4 md:my-8 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
              <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold mb-1 text-slate-900">Sale Complete!</h2>
            <p className="text-slate-500 mb-4 md:mb-6 font-medium text-sm">Invoice {completedBill.id}</p>
            
            <div className="bg-slate-50 p-4 md:p-5 rounded-2xl text-left mb-6 space-y-2 border border-slate-100">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Customer</span>
                <span className="font-semibold text-slate-800">{completedBill.customerName || 'Walk-in'}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-700 font-bold text-sm md:text-base">Net Payable</span>
                <span className="font-black text-lg md:text-xl text-slate-900">₹{Math.round(completedBill.grandTotal)}</span>
              </div>
            </div>

            <div className="flex flex-col space-y-3">
              <button onClick={downloadReceiptAsImage} disabled={isGeneratingImage} className="flex items-center justify-center py-3 md:py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50 text-sm">
                {isGeneratingImage ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <ImageIcon className="w-5 h-5 mr-2" />}
                Save HQ Invoice (PNG)
              </button>
              
              {selectedCustomer?.phone && (
                <button onClick={() => sendWhatsAppNotification(completedBill)} className="flex items-center justify-center py-3 md:py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg active:scale-95 text-sm">
                  <MessageSquareText className="w-5 h-5 mr-2" />
                  Notify via WhatsApp
                </button>
              )}

              <button onClick={handleNewSale} className="flex items-center justify-center py-3 text-slate-600 font-semibold hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all text-sm">
                <RotateCcw className="w-4 h-4 mr-2" />
                New Sale
              </button>
            </div>
          </div>
        </div>

        <div style={{ position: 'fixed', left: '-5000px', top: '0', zIndex: -1 }}>
          <div ref={receiptRef} style={{ backgroundColor: 'white', color: 'black', padding: '60px 50px', fontFamily: "sans-serif", width: '700px', lineHeight: '1.6' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
               <h1 style={{ fontSize: '56px', fontWeight: '900', margin: '0', letterSpacing: '4px', textTransform: 'uppercase' }}>{businessConfig.mailingName || businessConfig.name}</h1>
               {businessConfig.subHeader && (
                 <p style={{ fontSize: '22px', fontWeight: '700', color: '#666', margin: '5px 0 15px', textTransform: 'uppercase', letterSpacing: '2px' }}>{businessConfig.subHeader}</p>
               )}
               <div style={{ fontSize: '15px', fontWeight: '500', margin: '15px 0', color: '#333' }}>
                 <p style={{ margin: '4px 0', fontSize: '18px', maxWidth: '80%', marginInline: 'auto' }}>{businessConfig.address}</p>
               </div>
               <p style={{ fontSize: '20px', fontWeight: '900', margin: '15px 0' }}>Contact: +91 {businessConfig.phone}</p>
               {businessConfig.isGstEnabled && businessConfig.gstNumber && (
                 <p style={{ fontSize: '16px', fontWeight: '900', margin: '5px 0', color: '#555' }}>GSTIN: {businessConfig.gstNumber}</p>
               )}
            </div>
            <div style={{ borderTop: '2px dashed #000', margin: '30px 0' }}></div>
            <div style={{ fontSize: '18px', fontWeight: '900' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}><span>INV NO:</span><span>{completedBill.id}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}><span>DATE:</span><span>{formatDateWithTime(completedBill.date)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}><span>CUST:</span><span>{completedBill.customerName}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}><span>PAY:</span><span>{completedBill.paymentMethod}</span></div>
            </div>
            <div style={{ borderTop: '2px dashed #000', margin: '30px 0' }}></div>
            <table style={{ width: '100%', fontSize: '18px', borderCollapse: 'collapse', marginBottom: '30px' }}>
              <thead>
                <tr style={{ fontWeight: '900' }}>
                  <th align="left" style={{ paddingBottom: '20px' }}>Item</th>
                  <th align="center" style={{ paddingBottom: '20px' }}>Qty</th>
                  <th align="right" style={{ paddingBottom: '20px' }}>Amt</th>
                </tr>
              </thead>
              <tbody>
                {completedBill.items.map((item, i) => (
                  <tr key={i} style={{ verticalAlign: 'top' }}>
                    <td style={{ padding: '15px 0' }}>
                      <div style={{ fontWeight: '900', fontSize: '20px' }}>{item.name}</div>
                      <div style={{ fontSize: '14px', color: '#666', marginTop: '6px' }}>MRP: ₹{Math.round(item.mrp)} ({item.discountRate}% Disc)</div>
                    </td>
                    <td align="center" style={{ padding: '15px 0', fontWeight: '900' }}>{item.quantity}</td>
                    <td align="right" style={{ padding: '15px 0', fontWeight: '900' }}>₹{Math.round(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ borderTop: '2px solid #000', marginBottom: '30px' }}></div>
            <div style={{ fontSize: '20px', fontWeight: '900', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total Items:</span><span>{completedBill.items.reduce((acc, curr) => acc + curr.quantity, 0)}</span></div>
              {isGst && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: '16px' }}><span>Taxable Value:</span><span>₹{taxableValue}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: '16px' }}><span>GST ({gstRate}%):</span><span>₹{Math.round(gstAmount)}</span></div>
                </>
              )}
              {completedBill.advanceAdjusted ? <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}><span>Advance Adjusted:</span><span>- ₹{Math.round(completedBill.advanceAdjusted)}</span></div> : null}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '36px', fontWeight: '900', marginTop: '10px' }}><span>NET TOTAL</span><span>₹{Math.round(completedBill.grandTotal)}</span></div>
            </div>
            <div style={{ borderTop: '1px solid #ccc', margin: '40px 0' }}></div>
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ margin: '0', fontSize: '26px', fontWeight: '900', letterSpacing: '2px' }}>THANK YOU FOR SHOPPING!</h4>
              <p style={{ fontSize: '16px', color: '#666', marginTop: '15px' }}>Visit again at {businessConfig.name}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const paymentOptions = [
    { id: 'Cash', icon: Banknote, label: 'Cash' },
    { id: 'UPI', icon: QrCode, label: 'UPI Pay' },
    { id: 'Card', icon: CreditCard, label: 'Card Pay' },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-full no-print bg-slate-50/50 overflow-hidden">
      {showScanner && <BarcodeScanner onScan={onCameraScan} onClose={() => setShowScanner(false)} />}
      
      {showOrchestrator && (
        <PaymentOrchestrator 
          amount={grandTotal}
          transactionId={`TXN-${Date.now()}`}
          upiId={upiId}
          qrCode={upiQrCode}
          onSuccess={() => handleCheckout(true)}
          onCancel={() => setShowOrchestrator(false)}
        />
      )}
      
      {/* POS Content */}
      <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden min-h-0">
        <div className="flex flex-col gap-4 mb-4 md:mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 md:space-x-4">
               <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 rounded-xl md:rounded-2xl flex items-center justify-center text-orange-500 shadow-lg">
                  <ShoppingCart className="w-5 h-5 md:w-6 md:h-6" />
               </div>
               <div>
                 <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">{businessConfig.name}</h1>
                 <div className="flex items-center space-x-2 mt-1">
                   <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                     <span className={`w-1.5 h-1.5 rounded-full mr-1.5 md:mr-2 ${activeScanMode === 'HID' ? 'bg-indigo-500 shadow-[0_0_8px_indigo]' : 'bg-emerald-500 animate-pulse'}`}></span>
                     {activeScanMode === 'HID' ? 'Hardware Scanner Ready' : 'Camera Lens Active'}
                   </p>
                 </div>
               </div>
            </div>
            <div className="flex items-center space-x-2">
               {/* Mode Switcher */}
               <div className="hidden sm:flex bg-slate-100 p-1 rounded-xl mr-2">
                  <button 
                    onClick={() => setActiveScanMode('HID')}
                    className={`p-2 rounded-lg transition-all ${activeScanMode === 'HID' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                    title="External Scanner Mode"
                  >
                    <Keyboard className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setActiveScanMode('CAMERA')}
                    className={`p-2 rounded-lg transition-all ${activeScanMode === 'CAMERA' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}
                    title="Camera Lens Mode"
                  >
                    <MonitorSmartphone className="w-4 h-4" />
                  </button>
               </div>
               <button 
                onClick={() => setShowCatalog(!showCatalog)} 
                className={`p-3 rounded-xl transition-all flex items-center space-x-2 ${showCatalog ? 'bg-orange-500 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-600'}`}
               >
                  <ListFilter className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Product Catalog</span>
               </button>
               <div className="lg:hidden">
                  <button onClick={() => setShowScanner(true)} className="p-3 bg-orange-100 text-orange-600 rounded-xl">
                      <Camera className="w-6 h-6" />
                  </button>
               </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
             <div className="relative w-full sm:flex-1" ref={customerRef}>
               <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
               <input 
                type="text" 
                placeholder="Lookup Customer..."
                className="pl-9 pr-10 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 text-sm w-full transition-all bg-white font-bold"
                value={customerSearch}
                onFocus={() => setShowCustomerDropdown(true)}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerDropdown(true);
                  if (!e.target.value) {
                    setSelectedCustomer(null);
                    setLinkedOrder(null);
                  }
                }}
              />
              <button onClick={() => setShowAddCustomerQuick(true)} className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-500 hover:text-orange-600 p-1 bg-orange-50 rounded-lg">
                <Plus className="w-4 h-4" />
              </button>
              {showCustomerDropdown && (customerSearch || filteredCustomers.length > 0) && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[60] overflow-hidden">
                   {filteredCustomers.map(c => (
                     <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(c.name); setShowCustomerDropdown(false); }} className="w-full text-left px-5 py-4 hover:bg-slate-50 border-b last:border-0">
                        <p className="font-black text-slate-900 text-sm">{c.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{c.phone}</p>
                     </button>
                   ))}
                   {customerSearch && filteredCustomers.length === 0 && (
                     <div className="p-5 text-center text-slate-400 text-xs font-bold uppercase">No records found.</div>
                   )}
                </div>
              )}
             </div>

             <div className="flex items-center gap-3 w-full sm:w-auto">
               <form onSubmit={handleBarcodeSubmit} className="relative flex-1 group sm:w-56">
                  <Barcode className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${activeScanMode === 'HID' ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <input 
                    ref={inputRef} 
                    type="text" 
                    placeholder={activeScanMode === 'HID' ? "Scan Barcode Now..." : "Scan or Type..."}
                    className={`pl-11 pr-12 py-3 bg-white border rounded-2xl focus:ring-4 w-full text-sm font-bold transition-all ${activeScanMode === 'HID' ? 'focus:ring-indigo-500/10 border-indigo-100 ring-2 ring-indigo-50' : 'focus:ring-orange-500/10'}`} 
                    value={barcodeInput} 
                    onChange={(e) => setBarcodeInput(e.target.value)} 
                  />
                  <button type="button" onClick={() => setShowScanner(true)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hidden sm:block hover:bg-orange-50 rounded-xl text-orange-600 transition-all"><Camera className="w-4.5 h-4.5" /></button>
               </form>
               {selectedCustomer && activeOrdersForCustomer.length > 0 && !linkedOrder && (
                  <button onClick={() => setShowOrderLinkModal(true)} className="p-3 bg-orange-500 text-white rounded-2xl animate-bounce shadow-lg shadow-orange-500/20">
                     <ClipboardList className="w-5 h-5" />
                  </button>
               )}
               {linkedOrder && (
                 <button onClick={() => { setLinkedOrder(null); setCart([]); }} className="p-3 bg-red-50 text-red-500 rounded-2xl" title="Detach Order">
                    <XCircle className="w-5 h-5" />
                 </button>
               )}
             </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-4 bg-orange-50 text-orange-700 border border-orange-200 rounded-2xl flex items-center justify-between text-xs font-black uppercase">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)}><XCircle className="w-4 h-4" /></button>
          </div>
        )}

        {/* Alternate Inventory Selection: Product Catalog */}
        {showCatalog && (
          <div className="mb-6 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[400px] animate-in slide-in-from-top-4">
             <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <input 
                    type="text" 
                    placeholder="Search by Item Name, Author or SKU..." 
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-orange-500/10"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    autoFocus
                   />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                   <div className="relative group">
                      <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <select 
                        className="pl-9 pr-8 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none appearance-none"
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                      >
                         <option value="All">All Classes</option>
                         {targetClasses.map(c => <option key={c} value={c}>Class {c}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300 pointer-events-none appearance-none" />
                   </div>
                   <div className="relative group">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <select 
                        className="pl-9 pr-8 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none appearance-none"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                      >
                         <option value="All">All Categories</option>
                         {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300 pointer-events-none appearance-none" />
                   </div>
                   <button onClick={() => { setProductSearch(''); setSelectedClass('All'); setSelectedCategory('All'); }} className="p-3 text-slate-400 hover:text-orange-500 transition-colors">
                      <RotateCcw className="w-4 h-4" />
                   </button>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                   {filteredProducts.map(p => (
                     <div key={p.id} className="p-4 rounded-2xl border border-slate-100 hover:border-orange-200 hover:shadow-md transition-all flex items-start space-x-3 group bg-white">
                        <div className="w-14 h-14 bg-slate-50 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-100">
                           {p.image ? (
                             <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                           ) : (
                             <ImageIcon className="w-6 h-6 text-slate-200" />
                           )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                           <p className="font-black text-slate-900 text-xs truncate leading-tight">{p.name}</p>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight truncate mt-0.5">
                             {p.author} • Cl {p.class}
                           </p>
                           <div className="flex items-center justify-between mt-3">
                              <span className="text-xs font-black text-slate-900">₹{Math.round(p.customerPrice)}</span>
                              <button 
                                onClick={() => addItemToCart(p)}
                                disabled={p.closingStock <= 0}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${p.closingStock > 0 ? 'bg-slate-900 text-white hover:bg-orange-500' : 'bg-red-50 text-red-400 cursor-not-allowed'}`}
                              >
                                {p.closingStock > 0 ? 'Add to Cart' : 'Out of Stock'}
                              </button>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto bg-white rounded-3xl shadow-sm border border-slate-200 min-h-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0 min-w-[500px]">
              <thead className="bg-slate-50 sticky top-0 z-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4 border-b border-slate-100">Item</th>
                  <th className="px-4 py-4 text-right border-b border-slate-100">Rate</th>
                  <th className="px-4 py-4 text-center border-b border-slate-100">Qty</th>
                  <th className="px-4 py-4 text-right border-b border-slate-100">Total</th>
                  <th className="px-6 py-4 text-center border-b border-slate-100">Del</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {cart.map((item) => {
                  const product = inventory.find(p => p.id === item.productId);
                  return (
                    <tr key={item.productId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center">
                            {product?.image ? (
                              <img src={product.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-slate-300" />
                            )}
                          </div>
                          <p className="font-bold text-slate-900 text-sm leading-tight">{item.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-black text-slate-700 text-xs">₹{Math.round(item.price)}</td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center space-x-2 bg-slate-50 p-1 rounded-xl w-fit mx-auto">
                          <button onClick={() => updateQuantity(item.productId, -1)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white shadow-sm"><Minus className="w-3 h-3" /></button>
                          <span className="font-black w-6 text-center text-xs">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.productId, 1)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white shadow-sm"><Plus className="w-3 h-3" /></button>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-black text-slate-900 text-sm">₹{Math.round(item.subtotal)}</td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => removeFromCart(item.productId)} className="text-slate-300 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 p-6 md:p-8 flex flex-col shadow-2xl z-20 overflow-y-auto max-h-[50vh] lg:max-h-full">
        <h2 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight mb-6 pb-4 border-b border-slate-100 hidden lg:block">Order Summary</h2>
        
        <div className="space-y-3 mb-6 bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-100">
          {linkedOrder && (
            <div className="flex items-center space-x-2 mb-4 px-3 py-2 bg-orange-100 text-orange-700 rounded-xl">
               <ClipboardList className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest">Linked: #{linkedOrder.id.slice(-6)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-500 text-[10px] md:text-xs font-bold uppercase"><span>Gross Items</span><span>₹{subtotal}</span></div>
          <div className="flex justify-between text-emerald-600 text-[10px] md:text-xs font-black uppercase"><span>Discounts</span><span>- ₹{totalDiscount}</span></div>
          <div className="pt-3 flex justify-between items-baseline border-t border-slate-200 border-dashed">
            <span className="text-[10px] font-black text-slate-900 uppercase">Cart Subtotal</span>
            <span className="text-xl md:text-2xl font-black text-slate-900">₹{netTotal}</span>
          </div>
          {advanceToAdjust > 0 && (
            <div className="flex justify-between text-orange-600 text-[10px] md:text-xs font-black uppercase pt-1">
              <span>Advance Adjusted</span>
              <span>- ₹{advanceToAdjust}</span>
            </div>
          )}
          <div className="pt-2 flex justify-between items-baseline">
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Final Payable</span>
            <span className="text-2xl md:text-4xl font-black text-slate-900">₹{grandTotal}</span>
          </div>
        </div>

        <div className="mb-6">
          <div className="grid grid-cols-3 gap-2">
             {paymentOptions.map((opt) => (
               <button key={opt.id} onClick={() => setPaymentMethod(opt.id)} className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${paymentMethod === opt.id ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : 'border-slate-100 bg-white text-slate-400 hover:bg-slate-50'}`}>
                 <opt.icon className={`w-5 h-5 mb-1 ${paymentMethod === opt.id ? 'text-orange-500' : 'text-slate-300'}`} />
                 <span className="text-[8px] font-black uppercase">{opt.label}</span>
               </button>
             ))}
          </div>
        </div>

        <button 
          onClick={() => handleCheckout()} 
          disabled={cart.length === 0 || isProcessing} 
          className="w-full py-4 md:py-6 bg-slate-900 text-white rounded-2xl md:rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50 mt-auto"
        >
          {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Finalize & Invoice'}
        </button>
      </div>

      {showOrderLinkModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
              <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                 <h3 className="font-black text-xs uppercase tracking-widest">Pending Orders: {selectedCustomer?.name}</h3>
                 <button onClick={() => setShowOrderLinkModal(false)}><XCircle className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto bg-slate-50">
                 {activeOrdersForCustomer.map(order => (
                   <button key={order.id} onClick={() => applyOrder(order)} className="w-full text-left p-4 bg-white border border-slate-200 rounded-2xl hover:border-orange-500 hover:shadow-lg transition-all group">
                      <div className="flex justify-between items-start mb-2">
                         <span className="text-[9px] font-black text-slate-400 uppercase">ID: #{order.id.slice(-6)}</span>
                         <span className="text-[9px] font-black text-orange-500 uppercase px-2 py-0.5 bg-orange-50 rounded-full">{order.status}</span>
                      </div>
                      <p className="font-black text-slate-900 text-sm mb-1">{order.items.length} items ordered</p>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                         <div className="text-[10px] font-bold text-slate-500">Value: ₹{Math.round(order.totalAmount)}</div>
                         <div className="text-[10px] font-black text-emerald-600 uppercase">Advance: ₹{Math.round(order.advancePaid)}</div>
                      </div>
                   </button>
                 ))}
              </div>
           </div>
        </div>
      )}
      
      {showAddCustomerQuick && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/20">
              <div className="p-5 border-b flex justify-between items-center bg-slate-900 text-white uppercase text-xs font-black tracking-widest">
                <span>Fast Customer Entry</span>
                <button onClick={() => setShowAddCustomerQuick(false)}><XCircle className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleQuickCustomerSave} className="p-6 md:p-8 space-y-4">
                 <input required className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-sm" placeholder="Full Name" value={quickCustomer.name} onChange={(e) => setQuickCustomer({...quickCustomer, name: e.target.value})} autoFocus />
                 <input required className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-sm" placeholder="10-Digit Phone" value={quickCustomer.phone} onChange={(e) => setQuickCustomer({...quickCustomer, phone: e.target.value})} />
                 <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-xs shadow-xl active:scale-[0.98]">Save & Use</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default POS;
