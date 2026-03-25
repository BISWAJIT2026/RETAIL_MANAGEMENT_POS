
/**
 * DEVELOPER CREDENTIALS LOG:
 * - Admin: admin / admin123 (Biswajit Pal)
 * - Staff (Generic): staff / staff123
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Product, Bill, OrderItem, User, UserRole, Customer, CustomerOrder, OrderStatus, BusinessConfig, SubscriptionPlan } from './types.ts';
import { INITIAL_INVENTORY } from './constants.tsx';
import { GoogleGenAI, Type } from "@google/genai";

export type ConnectionStatus = 'online' | 'syncing' | 'offline';

interface AppContextType {
  inventory: Product[];
  bills: Bill[];
  customers: Customer[];
  orders: CustomerOrder[];
  categories: string[];
  targetClasses: string[];
  businessConfig: BusinessConfig;
  user: User | null;
  isLoading: boolean;
  terminalId: string;
  connectionStatus: ConnectionStatus;
  lastCloudSync: string | null;
  login: (userId: string, password: string) => Promise<boolean>;
  signup: (businessName: string, adminName: string, adminPass: string) => Promise<boolean>;
  logout: () => void;
  updateAdminProfile: (name: string) => void;
  updateBusinessConfig: (config: BusinessConfig) => void;
  updatePasswords: (adminPass: string, staffPass: string) => void;
  syncWithLocal: () => void;
  processSale: (items: OrderItem[], customerId?: string, customerName?: string, paymentMethod?: string, orderId?: string, advanceAdjusted?: number) => Promise<Bill | null>;
  searchProducts: (query: string, filters: any) => Product[];
  getProductByBarcode: (barcode: string) => Product | undefined;
  addProduct: (product: Omit<Product, 'id' | 'dateAdded' | 'totalSold'>) => void;
  addProductsBulk: (products: Omit<Product, 'id' | 'dateAdded' | 'totalSold'>[]) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'dateAdded'>) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  lookupISBN: (isbn: string) => Promise<Partial<Product> | null>;
  addOrder: (order: Omit<CustomerOrder, 'id' | 'date' | 'status'>) => CustomerOrder;
  updateOrderAdvance: (orderId: string, amount: number) => void;
  cancelOrder: (orderId: string) => void;
  exportData: () => void;
  exportToCSV: (type: 'inventory' | 'sales' | 'customers' | 'orders') => void;
  importData: (file: File) => Promise<{ success: boolean; message: string }>;
  upiId: string;
  upiQrCode: string | null;
  updateUpiSettings: (id: string, qr: string | null) => void;
  updateTerminalId: (id: string) => void;
  clearAllLocalData: () => void;
  updateTaxonomy: (type: 'categories' | 'classes', items: string[]) => void;
  forceCloudSync: () => Promise<void>;
  lastBackupDate: string | null;
  isGDriveConnected: boolean;
  gDriveClientId: string;
  setGDriveClientId: (id: string) => void;
  connectGDrive: () => void;
  disconnectGDrive: () => void;
  syncToGDrive: (silent?: boolean) => Promise<{ success: boolean; message: string }>;
  loadFromGDrive: (silent?: boolean) => Promise<{ success: boolean; message: string }>;
  getDataSnapshot: () => any;
  // Security
  staffPassHint: string;
  updateSubscription: (planId: string) => void;
  testWebhook: (url: string) => Promise<{ success: boolean, status?: number, message: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const syncChannel = new BroadcastChannel('vmd_retail_sync');

const DEFAULT_CATEGORIES = ['Books', 'Stationery', 'Bags', 'Accessories'];
const DEFAULT_CLASSES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'N/A'];
const GDrive_BACKUP_FILENAME = 'vidyamandir_retail_drive_backup.json';

const DEFAULT_BUSINESS: BusinessConfig = {
  name: 'Choynika Retail',
  mailingName: 'Choynika Retail',
  subHeader: 'Educational Resources & Stationery Hub',
  address: 'Choudharibar, Mukundapur Bazar, Basantia - Chalti Road, East Midnapore, WB - 721422',
  phone: '9831857301',
  isGstEnabled: false,
  gstNumber: '',
  gstRate: 18,
  currentPlanId: 'starter',
  webhookUrl: '',
  webhookSecret: '',
  webhookBypassPreflight: false
};

const INITIAL_INVENTORY_WITH_COST = INITIAL_INVENTORY.map(p => ({
  ...p,
  costPrice: Math.round(p.customerPrice * 0.75) 
}));

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('vidyamandir_categories');
    return saved && saved !== "undefined" ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });
  const [targetClasses, setTargetClasses] = useState<string[]>(() => {
    const saved = localStorage.getItem('vidyamandir_classes');
    return saved && saved !== "undefined" ? JSON.parse(saved) : DEFAULT_CLASSES;
  });

  const [businessConfig, setBusinessConfig] = useState<BusinessConfig>(() => {
    const saved = localStorage.getItem('vidyamandir_business_config');
    return saved && saved !== "undefined" ? JSON.parse(saved) : DEFAULT_BUSINESS;
  });

  const [inventory, setInventory] = useState<Product[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dynamic Passwords
  const [adminPassword, setAdminPassword] = useState(localStorage.getItem('vmd_admin_pass') || 'admin123');
  const [staffPassword, setStaffPassword] = useState(localStorage.getItem('vmd_staff_pass') || 'staff123');

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('online');
  const [lastCloudSync, setLastCloudSync] = useState<string | null>(localStorage.getItem('vmd_last_cloud_sync'));
  
  const [upiId, setUpiId] = useState<string>(localStorage.getItem('vidyamandir_upi_id') || '');
  const [upiQrCode, setUpiQrCode] = useState<string | null>(localStorage.getItem('vidyamandir_upi_qr'));
  const [terminalId, setTerminalId] = useState<string>(localStorage.getItem('vidyamandir_terminal_id') || 'Counter-01');
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(localStorage.getItem('vidyamandir_last_backup'));

  const [gDriveClientId, setGDriveClientIdState] = useState<string>(localStorage.getItem('vmd_gdrive_client_id') || '');
  const [isGDriveConnected, setIsGDriveConnected] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const autoSyncTimerRef = useRef<number | null>(null);

  // Webhook Utility with improved resilience
  const triggerWebhook = useCallback(async (eventType: string, payload: any) => {
    const url = businessConfig.webhookUrl?.trim();
    if (!url || !url.startsWith('http')) return;
    
    const isBypass = businessConfig.webhookBypassPreflight;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const headers: Record<string, string> = {
      // If bypassing preflight, use text/plain to remain a "simple request"
      'Content-Type': isBypass ? 'text/plain' : 'application/json'
    };

    // Custom headers trigger Preflight (OPTIONS)
    // We only add them if we are NOT in bypass mode
    if (!isBypass) {
      headers['X-VIDYAMANDIR-EVENT'] = eventType;
      headers['X-VIDYAMANDIR-SECRET'] = businessConfig.webhookSecret || '';
    }

    const bodyObj: any = {
      event: eventType,
      timestamp: new Date().toISOString(),
      business: businessConfig.name,
      terminal: terminalId,
      user: user?.name || 'System',
      data: payload
    };

    // If bypassing, we put the metadata inside the JSON body since headers are restricted
    if (isBypass) {
      bodyObj._security = {
        secret: businessConfig.webhookSecret || '',
        event: eventType
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors', // Explicitly allow CORS
        headers,
        body: JSON.stringify(bodyObj),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      console.log(`[WEBHOOK_AUDIT] Event: ${eventType}, Status: ${response.status}`);
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        console.warn(`[WEBHOOK_TIMEOUT] Event: ${eventType} timed out.`);
      } else if (e instanceof TypeError && e.message === 'Failed to fetch') {
        console.error(`[WEBHOOK_NETWORK_ERROR] Event: ${eventType} failed. This is likely a CORS issue. Recommendation: Enable 'CORS Compatibility Mode' in System Settings if your server cannot handle Preflight requests.`);
      } else {
        console.error(`[WEBHOOK_ERROR] Event: ${eventType}`, e);
      }
    }
  }, [businessConfig, terminalId, user]);

  const testWebhook = async (url: string): Promise<{ success: boolean, status?: number, message: string }> => {
    if (!url || !url.startsWith('http')) {
      return { success: false, message: "Invalid URL protocol. Use http:// or https://" };
    }
    
    const isBypass = businessConfig.webhookBypassPreflight;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const headers: Record<string, string> = {
      'Content-Type': isBypass ? 'text/plain' : 'application/json'
    };

    if (!isBypass) {
      headers['X-VIDYAMANDIR-EVENT'] = 'TEST_PING';
      headers['X-VIDYAMANDIR-SECRET'] = businessConfig.webhookSecret || '';
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event: 'TEST_PING',
          timestamp: new Date().toISOString(),
          message: "Vidyamandir POS Webhook Test Successful",
          ...(isBypass ? { _security: { secret: businessConfig.webhookSecret || '' } } : {})
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return { 
        success: response.ok, 
        status: response.status, 
        message: response.ok ? "Ping Successful" : `Server returned ${response.status}.` 
      };
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') return { success: false, message: "Connection Timed Out" };
      return { success: false, message: "Network Error: Possible CORS blockage. Try 'Compatibility Mode'." };
    }
  };

  const setGDriveClientId = (id: string) => {
    setGDriveClientIdState(id);
    localStorage.setItem('vmd_gdrive_client_id', id);
    setTokenClient(null);
  };

  const refreshFromLocal = useCallback(() => {
    try {
      const savedInventory = localStorage.getItem('vidyamandir_inventory');
      const savedBills = localStorage.getItem('vidyamandir_bills');
      const savedCustomers = localStorage.getItem('vidyamandir_customers');
      const savedOrders = localStorage.getItem('vidyamandir_orders');
      const savedCats = localStorage.getItem('vidyamandir_categories');
      const savedClasses = localStorage.getItem('vidyamandir_classes');
      const savedBusiness = localStorage.getItem('vidyamandir_business_config');
      
      if (savedInventory && savedInventory !== "undefined") setInventory(JSON.parse(savedInventory));
      else setInventory(INITIAL_INVENTORY_WITH_COST);

      if (savedBills && savedBills !== "undefined") setBills(JSON.parse(savedBills));
      if (savedCustomers && savedCustomers !== "undefined") setCustomers(JSON.parse(savedCustomers));
      if (savedOrders && savedOrders !== "undefined") setOrders(JSON.parse(savedOrders));
      
      if (savedCats && savedCats !== "undefined") setCategories(JSON.parse(savedCats));
      if (savedClasses && savedClasses !== "undefined") setTargetClasses(JSON.parse(savedClasses));
      if (savedBusiness && savedBusiness !== "undefined") setBusinessConfig(JSON.parse(savedBusiness));
    } catch (e) {
      console.error("Critical: Local store refresh failed", e);
    }
  }, []);

  const simulateCloudSync = useCallback(async () => {
    setConnectionStatus('syncing');
    await new Promise(resolve => setTimeout(resolve, 800));
    const now = new Date().toISOString();
    setLastCloudSync(now);
    localStorage.setItem('vmd_last_cloud_sync', now);
    setConnectionStatus('online');
  }, []);

  const saveToStorage = (key: string, data: any, broadcastType?: string) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      if (broadcastType) {
        syncChannel.postMessage({ type: broadcastType, data });
      }
      simulateCloudSync();
      // If GDrive is connected and it's a master data update, push silently
      if (isGDriveConnected && accessToken && (broadcastType === 'INVENTORY_UPDATE' || broadcastType === 'BILLS_UPDATE')) {
        syncToGDrive(true);
      }
    } catch (e) { 
      console.error("Storage write error:", e);
      setConnectionStatus('offline');
    }
  };

  const connectGDrive = () => {
    if (tokenClient) tokenClient.requestAccessToken();
    else alert("Please ensure you have entered a valid Client ID in System Settings.");
  };

  const disconnectGDrive = () => {
    setAccessToken(null);
    setIsGDriveConnected(false);
  };

  const getDriveFileId = async (token: string) => {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${GDrive_BACKUP_FILENAME}' and trashed=false`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.files && data.files.length > 0 ? data.files[0].id : null;
  };

  const syncToGDrive = async (silent: boolean = false): Promise<{ success: boolean; message: string }> => {
    if (!accessToken) return { success: false, message: "Drive not connected." };
    if (!silent) setConnectionStatus('syncing');
    try {
      const appData = { inventory, bills, customers, orders, categories, targetClasses, businessConfig, timestamp: new Date().toISOString() };
      const fileId = await getDriveFileId(accessToken);
      const metadata = { name: GDrive_BACKUP_FILENAME, mimeType: 'application/json' };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([JSON.stringify(appData)], { type: 'application/json' }));

      if (fileId) {
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: form
        });
      } else {
        await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: form
        });
      }
      const now = new Date().toISOString();
      setLastCloudSync(now);
      localStorage.setItem('vmd_last_cloud_sync', now);
      setConnectionStatus('online');
      return { success: true, message: "Cloud Push Successful" };
    } catch (e: any) {
      if (!silent) setConnectionStatus('offline');
      return { success: false, message: e.message || "Sync failed." };
    }
  };

  const loadFromGDrive = async (silent: boolean = false): Promise<{ success: boolean; message: string }> => {
    if (!accessToken) return { success: false, message: "Drive not connected." };
    if (!silent) setConnectionStatus('syncing');
    try {
      const fileId = await getDriveFileId(accessToken);
      if (!fileId) return { success: false, message: "No cloud data found." };
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const content = await response.json();
      
      // Smart Merging: Use cloud version for inventory, but merge sales history
      setInventory(content.inventory);
      setCategories(content.categories || DEFAULT_CATEGORIES);
      setTargetClasses(content.targetClasses || DEFAULT_CLASSES);
      setBusinessConfig(content.businessConfig || DEFAULT_BUSINESS);
      
      // Merging Bills (avoiding duplicates)
      const currentBills = [...bills];
      const cloudBills = content.bills || [];
      const mergedBills = [...cloudBills];
      currentBills.forEach(localB => {
        if (!mergedBills.find(b => b.id === localB.id)) {
          mergedBills.push(localB);
        }
      });
      setBills(mergedBills);

      saveToStorage('vidyamandir_inventory', content.inventory);
      saveToStorage('vidyamandir_bills', mergedBills);
      saveToStorage('vidyamandir_customers', content.customers || []);
      saveToStorage('vidyamandir_orders', content.orders || []);
      saveToStorage('vidyamandir_categories', content.categories || DEFAULT_CATEGORIES);
      saveToStorage('vidyamandir_classes', content.targetClasses || DEFAULT_CLASSES);
      saveToStorage('vidyamandir_business_config', content.businessConfig || DEFAULT_BUSINESS);
      
      syncChannel.postMessage({ type: 'HARD_RESET' });
      setConnectionStatus('online');
      return { success: true, message: "Cloud Data Reconciled" };
    } catch (e: any) {
      if (!silent) setConnectionStatus('offline');
      return { success: false, message: e.message || "Restore failed." };
    }
  };

  // Background Heartbeat for Multi-Device Consistency
  useEffect(() => {
    if (isGDriveConnected && accessToken) {
      // Immediate pull on connection
      loadFromGDrive(true);
      
      // Set interval for delta polling (60s)
      autoSyncTimerRef.current = window.setInterval(() => {
        loadFromGDrive(true);
      }, 60000);
    }
    return () => {
      if (autoSyncTimerRef.current) clearInterval(autoSyncTimerRef.current);
    };
  }, [isGDriveConnected, accessToken]);

  useEffect(() => {
    const backupInterval = setInterval(() => {
      const backupData = { inventory, bills, customers, orders, categories, targetClasses, businessConfig, timestamp: new Date().toISOString() };
      localStorage.setItem('vidyamandir_auto_backup', JSON.stringify(backupData));
      const now = new Date().toISOString();
      setLastBackupDate(now);
      localStorage.setItem('vidyamandir_last_backup', now);
    }, 300000);
    return () => clearInterval(backupInterval);
  }, [inventory, bills, customers, orders, categories, targetClasses, businessConfig]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('vidyamandir_')) {
        refreshFromLocal();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshFromLocal]);

  useEffect(() => {
    const handleBroadcast = (e: MessageEvent) => {
      const { type, data } = e.data;
      switch (type) {
        case 'INVENTORY_UPDATE': setInventory(data); break;
        case 'BILLS_UPDATE': setBills(data); break;
        case 'CUSTOMERS_UPDATE': setCustomers(data); break;
        case 'ORDERS_UPDATE': setOrders(data); break;
        case 'CATEGORIES_UPDATE': setCategories(data); break;
        case 'CLASSES_UPDATE': setTargetClasses(data); break;
        case 'BUSINESS_CONFIG_UPDATE': setBusinessConfig(data); break;
        case 'HARD_RESET': refreshFromLocal(); break;
        case 'UPI_SETTINGS_UPDATE':
          setUpiId(data.upiId);
          setUpiQrCode(data.upiQrCode);
          break;
      }
      setLastCloudSync(new Date().toISOString());
    };
    syncChannel.addEventListener('message', handleBroadcast);
    return () => syncChannel.removeEventListener('message', handleBroadcast);
  }, [refreshFromLocal]);

  useEffect(() => {
    if (!gDriveClientId) return;
    const initGsi = () => {
      if (!(window as any).google) return;
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: gDriveClientId,
          scope: 'https://www.googleapis.com/auth/drive.file',
          callback: (response: any) => {
            if (response.access_token) {
              setAccessToken(response.access_token);
              setIsGDriveConnected(true);
            }
          },
        });
        setTokenClient(client);
      } catch (err) {
        console.error("GSI Client Initialization Error:", err);
      }
    };
    const checkInterval = setInterval(() => {
        if ((window as any).google) {
            initGsi();
            clearInterval(checkInterval);
        }
    }, 500);
    return () => clearInterval(checkInterval);
  }, [gDriveClientId]);

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      const savedUser = localStorage.getItem('vidyamandir_user');
      if (savedUser && savedUser !== "undefined") setUser(JSON.parse(savedUser));
      refreshFromLocal();
      setIsLoading(false);
    };
    initData();
  }, [refreshFromLocal]);

  const login = async (userId: string, password: string): Promise<boolean> => {
    const normalizedId = userId.trim().toLowerCase();
    
    if (normalizedId === 'admin' && password === adminPassword) {
      const u: User = { id: 'admin', name: localStorage.getItem('vmd_admin_name') || 'Biswajit Pal', role: 'ADMIN' };
      setUser(u);
      localStorage.setItem('vidyamandir_user', JSON.stringify(u));
      return true;
    }
    
    if (normalizedId === 'staff' && password === staffPassword) {
      const staffName = `${businessConfig.mailingName || businessConfig.name} Staff`;
      const u: User = { id: 'staff', name: staffName, role: 'STAFF' };
      setUser(u);
      localStorage.setItem('vidyamandir_user', JSON.stringify(u));
      return true;
    }
    
    return false;
  };

  const signup = async (businessName: string, adminName: string, adminPass: string): Promise<boolean> => {
    const newConfig: BusinessConfig = {
      ...DEFAULT_BUSINESS,
      name: businessName,
      mailingName: businessName,
    };
    setBusinessConfig(newConfig);
    setAdminPassword(adminPass);
    localStorage.setItem('vidyamandir_business_config', JSON.stringify(newConfig));
    localStorage.setItem('vmd_admin_pass', adminPass);
    localStorage.setItem('vmd_admin_name', adminName);
    
    // Auto-login as the new admin
    const u: User = { id: 'admin', name: adminName, role: 'ADMIN' };
    setUser(u);
    localStorage.setItem('vidyamandir_user', JSON.stringify(u));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('vidyamandir_user');
  };

  const updatePasswords = (newAdminPass: string, newStaffPass: string) => {
    setAdminPassword(newAdminPass);
    setStaffPassword(newStaffPass);
    localStorage.setItem('vmd_admin_pass', newAdminPass);
    localStorage.setItem('vmd_staff_pass', newStaffPass);
  };

  const updateAdminProfile = (name: string) => {
    if (user && user.role === 'ADMIN') {
      const newUser = { ...user, name };
      setUser(newUser);
      localStorage.setItem('vidyamandir_user', JSON.stringify(newUser));
      localStorage.setItem('vmd_admin_name', name);
    }
  };

  const updateBusinessConfig = (config: BusinessConfig) => {
    setBusinessConfig(config);
    saveToStorage('vidyamandir_business_config', config, 'BUSINESS_CONFIG_UPDATE');
  };

  const syncWithLocal = () => {
    saveToStorage('vidyamandir_inventory', inventory, 'INVENTORY_UPDATE');
    saveToStorage('vidyamandir_bills', bills, 'BILLS_UPDATE');
    saveToStorage('vidyamandir_customers', customers, 'CUSTOMERS_UPDATE');
    saveToStorage('vidyamandir_orders', orders, 'ORDERS_UPDATE');
  };

  const processSale = async (orderItems: OrderItem[], customerId?: string, customerName?: string, paymentMethod: string = 'Cash', orderId?: string, advanceAdjusted: number = 0): Promise<Bill | null> => {
    const updatedInventory = [...inventory];
    for (const item of orderItems) {
      const pIdx = updatedInventory.findIndex(p => p.id === item.productId);
      if (pIdx === -1 || updatedInventory[pIdx].closingStock < item.quantity) {
        throw new Error(`Insufficient stock for ${item.name}`);
      }
      
      const product = updatedInventory[pIdx];
      updatedInventory[pIdx].totalSold += item.quantity;
      updatedInventory[pIdx].closingStock -= item.quantity;
      
      item.category = product.category;
      item.costPrice = product.costPrice; 
      item.subtotal = Math.round(item.subtotal);
      item.price = Math.round(item.price);
      item.mrp = Math.round(item.mrp);
    }
    const itemsTotal = orderItems.reduce((acc, curr) => acc + curr.subtotal, 0);
    const finalGrandTotal = Math.round(Math.max(0, itemsTotal - advanceAdjusted));
    const invoiceId = `INV-${String(bills.length + 1).padStart(3, '0')}`;
    const newBill: Bill = {
      id: invoiceId,
      date: new Date().toISOString(),
      items: orderItems,
      grandTotal: finalGrandTotal,
      customerId, customerName, paymentMethod, orderId, advanceAdjusted: Math.round(advanceAdjusted)
    };
    const newBills = [newBill, ...bills];
    setInventory(updatedInventory);
    setBills(newBills);
    let updatedOrders = [...orders];
    if (orderId) {
      updatedOrders = updatedOrders.map(o => o.id === orderId ? { ...o, status: OrderStatus.COMPLETED } : o);
      setOrders(updatedOrders);
      saveToStorage('vidyamandir_orders', updatedOrders, 'ORDERS_UPDATE');
    }
    saveToStorage('vidyamandir_inventory', updatedInventory, 'INVENTORY_UPDATE');
    saveToStorage('vidyamandir_bills', newBills, 'BILLS_UPDATE');
    
    // Automation Trigger
    triggerWebhook('SALE_COMPLETED', newBill);
    
    return newBill;
  };

  const addOrder = (data: Omit<CustomerOrder, 'id' | 'date' | 'status'>) => {
    const newOrder: CustomerOrder = {
      ...data,
      id: `ORD-${Date.now()}`,
      date: new Date().toISOString(),
      status: OrderStatus.PENDING,
      totalAmount: Math.round(data.totalAmount),
      advancePaid: Math.round(data.advancePaid)
    };
    const updated = [newOrder, ...orders];
    setOrders(updated);
    saveToStorage('vidyamandir_orders', updated, 'ORDERS_UPDATE');
    
    // Automation Trigger
    triggerWebhook('ORDER_CREATED', newOrder);
    
    return newOrder;
  };

  const updateOrderAdvance = (orderId: string, amount: number) => {
    const roundedAmount = Math.round(amount);
    const updated = orders.map(o => o.id === orderId ? { 
      ...o, 
      advancePaid: Math.round(o.advancePaid + roundedAmount),
      status: Math.round(o.advancePaid + roundedAmount) >= o.totalAmount ? OrderStatus.COMPLETED : OrderStatus.PARTIAL 
    } : o);
    setOrders(updated);
    saveToStorage('vidyamandir_orders', updated, 'ORDERS_UPDATE');
  };

  const cancelOrder = (orderId: string) => {
    const updated = orders.map(o => o.id === orderId ? { ...o, status: OrderStatus.CANCELLED } : o);
    setOrders(updated);
    saveToStorage('vidyamandir_orders', updated, 'ORDERS_UPDATE');
  };

  const addProduct = (data: Omit<Product, 'id' | 'dateAdded' | 'totalSold'>) => {
    const newP: Product = { 
      ...data, 
      id: `PRD-${Date.now()}`, 
      dateAdded: new Date().toISOString().split('T')[0], 
      totalSold: 0,
      costPrice: Math.round(data.costPrice),
      mrp: Math.round(data.mrp),
      customerPrice: Math.round(data.customerPrice)
    };
    const updated = [newP, ...inventory];
    setInventory(updated);
    saveToStorage('vidyamandir_inventory', updated, 'INVENTORY_UPDATE');
    
    // Automation Trigger
    triggerWebhook('PRODUCT_ADDED', newP);
  };

  const addProductsBulk = (productsData: Omit<Product, 'id' | 'dateAdded' | 'totalSold'>[]) => {
    const now = new Date().toISOString().split('T')[0];
    const newProducts: Product[] = productsData.map((data, index) => ({
      ...data,
      id: `PRD-${Date.now()}-${index}`,
      dateAdded: now,
      totalSold: 0,
      costPrice: Math.round(data.costPrice),
      mrp: Math.round(data.mrp),
      customerPrice: Math.round(data.customerPrice)
    }));
    const updated = [...newProducts, ...inventory];
    setInventory(updated);
    saveToStorage('vidyamandir_inventory', updated, 'INVENTORY_UPDATE');
    
    // Automation Trigger
    triggerWebhook('BULK_IMPORT', { count: newProducts.length });
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    const updated = inventory.map(p => {
      if (p.id === id) {
        const merged = { ...p, ...updates };
        if (updates.costPrice !== undefined) merged.costPrice = Math.round(updates.costPrice);
        if (updates.mrp !== undefined) merged.mrp = Math.round(updates.mrp);
        if (updates.customerPrice !== undefined) merged.customerPrice = Math.round(updates.customerPrice);
        return merged;
      }
      return p;
    });
    setInventory(updated);
    saveToStorage('vidyamandir_inventory', updated, 'INVENTORY_UPDATE');
  };

  const deleteProduct = (id: string) => {
    const updated = inventory.filter(p => p.id !== id);
    setInventory(updated);
    saveToStorage('vidyamandir_inventory', updated, 'INVENTORY_UPDATE');
  };

  const searchProducts = useCallback((query: string, filters: any) => {
    const q = query.trim().toLowerCase();
    return inventory.filter(p => {
      const matchesQuery = !q || p.name.toLowerCase().includes(q) || p.author.toLowerCase().includes(q) || p.barcode.includes(q);
      const matchesClass = !filters.class || filters.class === 'All' || p.class === filters.class;
      const matchesCategory = !filters.category || filters.category === 'All' || p.category === filters.category;
      let matchesStock = true;
      if (filters.stockStatus === 'In Stock') matchesStock = p.closingStock > 10;
      else if (filters.stockStatus === 'Low Stock') matchesStock = p.closingStock > 0 && p.closingStock <= 10;
      else if (filters.stockStatus === 'Out of Stock') matchesStock = p.closingStock === 0;
      return matchesQuery && matchesClass && matchesCategory && matchesStock;
    });
  }, [inventory]);

  const updateTaxonomy = (type: 'categories' | 'classes', items: string[]) => {
    if (type === 'categories') {
      setCategories(items);
      saveToStorage('vidyamandir_categories', items, 'CATEGORIES_UPDATE');
    } else {
      setTargetClasses(items);
      saveToStorage('vidyamandir_classes', items, 'CLASSES_UPDATE');
    }
  };

  const forceCloudSync = async () => {
    if (isGDriveConnected) {
      await syncToGDrive();
    }
    await simulateCloudSync();
    syncChannel.postMessage({ type: 'HARD_RESET' });
  };

  const importData = async (file: File): Promise<{ success: boolean; message: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = JSON.parse(e.target?.result as string);
          if (!content.inventory || !content.bills) {
             resolve({ success: false, message: "Invalid backup file structure." });
             return;
          }
          setInventory(content.inventory);
          setBills(content.bills);
          setCustomers(content.customers || []);
          setOrders(content.orders || []);
          setCategories(content.categories || DEFAULT_CATEGORIES);
          setTargetClasses(content.targetClasses || DEFAULT_CLASSES);
          setBusinessConfig(content.businessConfig || DEFAULT_BUSINESS);
          localStorage.setItem('vidyamandir_inventory', JSON.stringify(content.inventory));
          localStorage.setItem('vidyamandir_bills', JSON.stringify(content.bills));
          localStorage.setItem('vidyamandir_customers', JSON.stringify(content.customers || []));
          localStorage.setItem('vidyamandir_orders', JSON.stringify(content.orders || []));
          localStorage.setItem('vidyamandir_categories', JSON.stringify(content.categories || DEFAULT_CATEGORIES));
          localStorage.setItem('vidyamandir_classes', JSON.stringify(content.targetClasses || DEFAULT_CLASSES));
          localStorage.setItem('vidyamandir_business_config', JSON.stringify(content.businessConfig || DEFAULT_BUSINESS));
          syncChannel.postMessage({ type: 'HARD_RESET' });
          resolve({ success: true, message: "System restored successfully!" });
        } catch (err) {
          resolve({ success: false, message: "Failed to parse backup file." });
        }
      };
      reader.readAsText(file);
    });
  };

  const lookupISBN = async (isbn: string): Promise<Partial<Product> | null> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const res = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Book info for ISBN: ${isbn}. Include estimated wholesale cost price (costPrice) as well.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              author: { type: Type.STRING },
              class: { type: Type.STRING },
              category: { type: Type.STRING },
              mrp: { type: Type.NUMBER },
              costPrice: { type: Type.NUMBER }
            }
          }
        }
      });
      const details = JSON.parse(res.text || '{}');
      if (details.mrp) details.mrp = Math.round(details.mrp);
      if (details.costPrice) details.costPrice = Math.round(details.costPrice);
      return details;
    } catch (e) { return null; }
  };

  const exportData = () => {
    const data = { inventory, bills, customers, orders, categories, targetClasses, businessConfig, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `VMD_DATA_${terminalId}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    setLastBackupDate(new Date().toISOString());
  };

  const exportToCSV = (type: 'inventory' | 'sales' | 'customers' | 'orders') => {
    let headers: string[] = [];
    let rows: any[][] = [];
    const fileName = `VMD_${type.toUpperCase()}_${terminalId}_${new Date().toISOString().split('T')[0]}.csv`;

    if (type === 'inventory') {
      headers = ['Barcode', 'Name', 'Author', 'Standard', 'Category', 'Closing Stock', 'MRP', 'Discount %', 'Cost Price', 'Selling Price'];
      rows = inventory.map(p => [
        p.barcode, p.name, p.author, p.class, p.category, p.closingStock, p.mrp, p.discountRate, p.costPrice, p.customerPrice
      ]);
    } else if (type === 'sales') {
      headers = ['Invoice ID', 'Date', 'Customer', 'Product', 'Category', 'Qty', 'MRP', 'Sold At', 'Subtotal', 'Cost', 'Margin', 'Payment'];
      bills.forEach(b => {
        b.items.forEach(i => {
          const margin = i.subtotal - ((i.costPrice || 0) * i.quantity);
          rows.push([
            b.id, new Date(b.date).toLocaleDateString(), b.customerName || 'Walk-in',
            i.name, i.category || 'N/A', i.quantity, i.mrp, i.price, i.subtotal, i.costPrice || 0, margin, b.paymentMethod
          ]);
        });
      });
    } else if (type === 'customers') {
      headers = ['ID', 'Name', 'Phone', 'Address', 'Registration Date'];
      rows = customers.map(c => [c.id, c.name, c.phone, c.address || 'N/A', new Date(c.dateAdded).toLocaleDateString()]);
    } else if (type === 'orders') {
      headers = ['Order ID', 'Date', 'Customer', 'Status', 'Total Value', 'Advance Paid', 'Outstanding'];
      rows = orders.map(o => [
        o.id, new Date(o.date).toLocaleDateString(), o.customerName, o.status,
        o.totalAmount, o.advancePaid, o.totalAmount - o.advancePaid
      ]);
    }

    const csvString = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDataSnapshot = () => {
    return {
      inventory: inventory.map(p => ({ 
        id: p.id, 
        name: p.name, 
        stock: p.closingStock, 
        price: p.customerPrice, 
        cost: p.costPrice,
        cat: p.category 
      })),
      recentBills: bills.slice(0, 50).map(b => ({ 
        id: b.id, 
        total: b.grandTotal, 
        profit: b.items.reduce((acc, i) => acc + (i.subtotal - (i.costPrice * i.quantity)), 0),
        date: b.date, 
        customer: b.customerName 
      })),
      customerCount: customers.length,
      pendingOrders: orders.filter(o => o.status !== OrderStatus.COMPLETED).length,
      revenueTotal: bills.reduce((acc, b) => acc + b.grandTotal, 0)
    };
  };

  const addCustomer = (data: any) => { 
    const newC = { ...data, id: `CUST-${Date.now()}`, dateAdded: new Date().toISOString() };
    const updated = [newC, ...customers];
    setCustomers(updated);
    saveToStorage('vidyamandir_customers', updated, 'CUSTOMERS_UPDATE');
    
    // Automation Trigger
    triggerWebhook('CUSTOMER_ADDED', newC);
    
    return newC;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    const updated = customers.map(c => c.id === id ? { ...c, ...updates } : c);
    setCustomers(updated);
    saveToStorage('vidyamandir_customers', updated, 'CUSTOMERS_UPDATE');
  };

  const deleteCustomer = (id: string) => {
    const updated = customers.filter(c => c.id !== id);
    setCustomers(updated);
    saveToStorage('vidyamandir_customers', updated, 'CUSTOMERS_UPDATE');
  };

  const updateUpiSettings = (id: string, qr: string | null) => {
    setUpiId(id);
    setUpiQrCode(qr);
    localStorage.setItem('vidyamandir_upi_id', id);
    if (qr) localStorage.setItem('vidyamandir_upi_qr', qr);
    else localStorage.removeItem('vidyamandir_upi_qr');
    simulateCloudSync();
  };

  const updateTerminalId = (id: string) => {
    setTerminalId(id);
    localStorage.setItem('vidyamandir_terminal_id', id);
  };

  const clearAllLocalData = () => { localStorage.clear(); window.location.reload(); };

  const updateSubscription = (planId: string) => {
    const newConfig = { ...businessConfig, currentPlanId: planId };
    updateBusinessConfig(newConfig);
  };

  return (
    <AppContext.Provider value={{ 
      inventory, bills, customers, orders, categories, targetClasses, businessConfig, user, isLoading, terminalId, upiId, upiQrCode,
      connectionStatus, lastCloudSync, forceCloudSync,
      login, signup, logout, updateAdminProfile, updateBusinessConfig, updatePasswords, syncWithLocal, processSale, searchProducts, getProductByBarcode: (b) => inventory.find(p => p.barcode === b), 
      addProduct, addProductsBulk, updateProduct, deleteProduct, addCustomer, 
      updateCustomer, deleteCustomer, 
      lookupISBN, addOrder, updateOrderAdvance, cancelOrder, exportData, 
      exportToCSV, importData, updateUpiSettings, updateTerminalId, clearAllLocalData, updateTaxonomy, lastBackupDate,
      isGDriveConnected, gDriveClientId, setGDriveClientId, connectGDrive, disconnectGDrive, syncToGDrive, loadFromGDrive,
      getDataSnapshot,
      staffPassHint: staffPassword,
      updateSubscription,
      testWebhook
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp missing');
  return context;
};
