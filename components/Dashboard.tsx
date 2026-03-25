
import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../store.tsx';
import { 
  ShoppingBag, Package, ArrowUpRight, Calendar, AlertCircle, 
  BarChart3, LineChart as LineChartIcon, DollarSign, Activity, 
  ChevronDown, RefreshCw, Clock, TrendingUp, Briefcase, Layers,
  Banknote, QrCode, CreditCard, Landmark
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Area, AreaChart, PieChart, Pie, Legend
} from 'recharts';

type TrendPeriod = '1D' | '1M' | '6M' | '12M';

const Dashboard: React.FC = () => {
  const { inventory = [], bills = [], user, connectionStatus } = useApp();
  const [isMounted, setIsMounted] = useState(false);
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('12M');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [catStartDate, setCatStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [catEndDate, setCatEndDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const today = new Date();
  const todayBills = bills.filter(b => new Date(b.date).toDateString() === today.toDateString());

  // Core Metrics Logic
  const totalRevenueToday = todayBills.reduce((acc, curr) => acc + curr.grandTotal, 0);
  const totalOrdersToday = todayBills.length;
  const totalProductsToday = todayBills.reduce((acc, b) => acc + b.items.reduce((sum, item) => sum + item.quantity, 0), 0);
  const totalRevenueAsOnToday = bills.reduce((acc, curr) => acc + curr.grandTotal, 0);

  // Today's Reconciliation
  const cashToday = todayBills.filter(b => b.paymentMethod === 'Cash').reduce((sum, b) => sum + b.grandTotal, 0);
  const upiToday = todayBills.filter(b => b.paymentMethod === 'UPI').reduce((sum, b) => sum + b.grandTotal, 0);
  const cardToday = todayBills.filter(b => b.paymentMethod === 'Card').reduce((sum, b) => sum + b.grandTotal, 0);

  // All-Time Reconciliation
  const cashAllTime = bills.filter(b => b.paymentMethod === 'Cash').reduce((sum, b) => sum + b.grandTotal, 0);
  const upiAllTime = bills.filter(b => b.paymentMethod === 'UPI').reduce((sum, b) => sum + b.grandTotal, 0);
  const cardAllTime = bills.filter(b => b.paymentMethod === 'Card').reduce((sum, b) => sum + b.grandTotal, 0);

  // Profit Calculation (Selling Value - Cost Value)
  const calculateBillProfit = (bill: any) => {
    return bill.items.reduce((acc: number, item: any) => {
      const itemProfit = (item.price - (item.costPrice || 0)) * item.quantity;
      return acc + itemProfit;
    }, 0);
  };

  const totalGrossProfitToday = Math.round(todayBills.reduce((acc, bill) => acc + calculateBillProfit(bill), 0));
  const totalGrossProfitAllTime = Math.round(bills.reduce((acc, bill) => acc + calculateBillProfit(bill), 0));
  
  const totalOrdersAllTime = bills.length;
  const totalProductsSoldAllTime = bills.reduce((acc, b) => acc + b.items.reduce((sum, item) => sum + item.quantity, 0), 0);

  const lowStockItems = inventory.filter(p => p.closingStock > 0 && p.closingStock <= 10);
  const outOfStockItems = inventory.filter(p => p.closingStock === 0);

  const revenueTrendData = useMemo(() => {
    const data = [];
    const now = new Date();
    if (trendPeriod === '12M' || trendPeriod === '6M') {
      const monthsCount = trendPeriod === '12M' ? 12 : 6;
      for (let i = monthsCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        const revenue = bills.reduce((acc, b) => {
          const bd = new Date(b.date);
          return (bd.getMonth() === d.getMonth() && bd.getFullYear() === d.getFullYear()) ? acc + b.grandTotal : acc;
        }, 0);
        data.push({ name: label, revenue });
      }
    } else if (trendPeriod === '1M') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const label = d.getDate().toString().padStart(2, '0');
        const revenue = bills.reduce((acc, b) => {
          const bd = new Date(b.date);
          return bd.toDateString() === d.toDateString() ? acc + b.grandTotal : acc;
        }, 0);
        data.push({ name: label, revenue });
      }
    } else if (trendPeriod === '1D') {
      for (let i = 23; i >= 0; i--) {
        const d = new Date();
        d.setHours(now.getHours() - i, 0, 0, 0);
        const label = `${d.getHours()}:00`;
        const revenue = bills.reduce((acc, b) => {
          const bd = new Date(b.date);
          return (bd.getHours() === d.getHours() && bd.toDateString() === d.toDateString()) ? acc + b.grandTotal : acc;
        }, 0);
        data.push({ name: label, revenue });
      }
    }
    return data;
  }, [bills, trendPeriod]);

  const salesByCategory = useMemo(() => {
    const start = new Date(catStartDate);
    const end = new Date(catEndDate);
    end.setHours(23,59,59,999);
    const filteredBills = bills.filter(b => {
      const bd = new Date(b.date);
      return bd >= start && bd <= end;
    });
    const categoryMap: Record<string, number> = {};
    filteredBills.forEach(bill => {
      bill.items.forEach(item => {
        const cat = item.category || 'Uncategorized';
        categoryMap[cat] = (categoryMap[cat] || 0) + item.subtotal;
      });
    });
    return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  }, [bills, catStartDate, catEndDate]);

  const COLORS = ['#F97316', '#3B82F6', '#10B981', '#6366F1', '#EC4899', '#8B5CF6'];

  const formattedTime = currentTime.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false 
  });

  return (
    <div className="p-4 md:p-8 overflow-y-auto min-h-0 flex-1 bg-slate-50/50">
      <div className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
             <div className={`w-2 h-2 rounded-full ${connectionStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
             <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">
               FP&A Intelligence {connectionStatus === 'syncing' ? '(Updating...)' : 'Live'}
             </p>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Financial Controller</h1>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-white px-4 md:px-5 py-2.5 rounded-2xl shadow-sm border border-slate-200 text-sm font-bold text-slate-700 w-fit">
            <Calendar className="w-4 h-4 mr-2.5 text-orange-500" />
            {today.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
          <div className="flex items-center bg-slate-900 px-4 md:px-5 py-2.5 rounded-2xl shadow-lg border border-slate-800 text-sm font-black text-orange-500 w-fit">
            <Clock className="w-4 h-4 mr-2.5" />
            {formattedTime}
          </div>
        </div>
      </div>

      {/* Primary Retail Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        <StatCard icon={<DollarSign className="text-emerald-500" />} title="Revenue Today" value={`₹${totalRevenueToday.toLocaleString()}`} accent="emerald" />
        <StatCard icon={<ShoppingBag className="text-blue-500" />} title="Orders Today" value={totalOrdersToday.toString()} accent="blue" />
        <StatCard icon={<Package className="text-indigo-500" />} title="Products Sold Today" value={totalProductsToday.toString()} accent="indigo" />
        <StatCard icon={<ArrowUpRight className="text-orange-500" />} title="Total Gross Revenue" value={`₹${totalRevenueAsOnToday.toLocaleString()}`} accent="orange" subValue="All Time" />
      </div>

      {/* NEW: Payment Mode Reconciliation (Today) */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-4 px-1">
          <Landmark className="w-4 h-4 text-slate-400" />
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Payment Reconciliation (Today)</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <StatCard icon={<Banknote className="text-emerald-600" />} title="Cash Collection" value={`₹${cashToday.toLocaleString()}`} accent="emerald" subValue="Liquid" />
          <StatCard icon={<QrCode className="text-indigo-600" />} title="UPI Collection" value={`₹${upiToday.toLocaleString()}`} accent="indigo" subValue="Digital" />
          <StatCard icon={<CreditCard className="text-blue-600" />} title="Card Collection" value={`₹${cardToday.toLocaleString()}`} accent="blue" subValue="Banking" />
        </div>
      </div>

      {/* FP&A Executive Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <StatCard icon={<TrendingUp className="text-emerald-600" />} title="Gross Profit Today" value={`₹${totalGrossProfitToday.toLocaleString()}`} accent="emerald" subValue="Realized" />
        <StatCard icon={<Briefcase className="text-blue-600" />} title="Gross Profit All Time" value={`₹${totalGrossProfitAllTime.toLocaleString()}`} accent="blue" subValue="Realized" />
        <StatCard icon={<Activity className="text-indigo-600" />} title="Orders All Time" value={totalOrdersAllTime.toLocaleString()} accent="indigo" subValue="Transaction Count" />
        <StatCard icon={<Layers className="text-orange-600" />} title="Product Sold All Time" value={totalProductsSoldAllTime.toLocaleString()} accent="orange" subValue="Total Units" />
      </div>

      {/* NEW: Cumulative Collections (All Time) */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-4 px-1">
          <HistoryIcon className="w-4 h-4 text-slate-400" />
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cumulative Collections (All Time)</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-white p-6 rounded-[32px] border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-[9px] font-black uppercase tracking-tight mb-1">Total Cash</p>
              <h3 className="text-xl font-black text-slate-900">₹{cashAllTime.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-2xl"><Banknote className="w-5 h-5 text-emerald-500" /></div>
          </div>
          <div className="bg-white p-6 rounded-[32px] border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-[9px] font-black uppercase tracking-tight mb-1">Total UPI</p>
              <h3 className="text-xl font-black text-slate-900">₹{upiAllTime.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-indigo-50 rounded-2xl"><QrCode className="w-5 h-5 text-indigo-500" /></div>
          </div>
          <div className="bg-white p-6 rounded-[32px] border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-[9px] font-black uppercase tracking-tight mb-1">Total Cards</p>
              <h3 className="text-xl font-black text-slate-900">₹{cardAllTime.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-2xl"><CreditCard className="w-5 h-5 text-blue-500" /></div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 md:p-8 rounded-[32px] shadow-sm border border-slate-200 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-50 rounded-lg"><LineChartIcon className="w-5 h-5 text-orange-600" /></div>
            <h3 className="text-xl font-black text-slate-900">Revenue Performance Trend</h3>
          </div>
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            {(['1D', '1M', '6M', '12M'] as TrendPeriod[]).map(p => (
              <button key={p} onClick={() => setTrendPeriod(p)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${trendPeriod === p ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[300px]">
          {isMounted && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrendData}>
                <defs><linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F97316" stopOpacity={0.1}/><stop offset="95%" stopColor="#F97316" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000) + 'k' : v}`} />
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Area type="monotone" dataKey="revenue" stroke="#F97316" strokeWidth={3} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Categorical Sales (Pie Chart Upgrade) */}
        <div className="lg:col-span-2 bg-white p-4 md:p-8 rounded-[32px] shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-slate-100 rounded-lg"><BarChart3 className="w-5 h-5 text-slate-600" /></div>
              <h3 className="text-xl font-black text-slate-900">Categorical Distribution (₹)</h3>
            </div>
            <div className="flex items-center space-x-2">
              <input type="date" value={catStartDate} onChange={(e) => setCatStartDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-bold" />
              <input type="date" value={catEndDate} onChange={(e) => setCatEndDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-bold" />
            </div>
          </div>
          <div className="h-[350px]">
            {isMounted && salesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                    labelLine={false}
                  >
                    {salesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(v: number) => `₹${v.toLocaleString()}`}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 8px 16px rgba(0,0,0,0.1)'}}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase'}} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="flex flex-col items-center justify-center h-full opacity-30"><BarChart3 className="w-12 h-12 mb-4" /><p className="font-black uppercase tracking-widest text-xs">No Data</p></div>}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 h-fit">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-slate-900 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-red-500" /> Inventory Risks
            </h3>
            {connectionStatus === 'syncing' && <RefreshCw className="w-4 h-4 text-slate-300 animate-spin" />}
          </div>
          <div className="space-y-4">
            {[...outOfStockItems, ...lowStockItems].slice(0, 6).map(item => (
              <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-black truncate text-slate-800">{item.name}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Cl {item.class}</span>
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${item.closingStock === 0 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                    {item.closingStock} left
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, subValue, accent }: any) => {
  const accentClasses: any = {
    orange: 'bg-orange-50 text-orange-500 ring-orange-100',
    emerald: 'bg-emerald-50 text-emerald-500 ring-emerald-100',
    blue: 'bg-blue-50 text-blue-500 ring-blue-100',
    indigo: 'bg-indigo-50 text-indigo-500 ring-indigo-100',
  };
  return (
    <div className="bg-white p-7 rounded-[32px] shadow-sm border border-slate-200 group hover:shadow-lg transition-all">
      <div className={`p-4 rounded-2xl ring-4 w-fit mb-6 ${accentClasses[accent]}`}>{icon}</div>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{title}</p>
      <div className="flex items-baseline space-x-2">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h2>
        {subValue && <span className="text-[10px] font-bold text-slate-400 italic">{subValue}</span>}
      </div>
    </div>
  );
};

const HistoryIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default Dashboard;
