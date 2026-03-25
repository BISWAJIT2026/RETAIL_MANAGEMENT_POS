
import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, Loader2, CheckCircle2, XCircle, Clock, ShieldCheck, 
  Activity, Zap, AlertCircle, Signal, ArrowRight, Fingerprint,
  RefreshCw, Landmark, ShieldAlert, Wifi
} from 'lucide-react';

export enum TransactionState {
  IDLE = 'IDLE',
  INITIATED = 'INITIATED',
  QR_GENERATED = 'QR_GENERATED',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_TIMEOUT = 'PAYMENT_TIMEOUT'
}

interface PaymentOrchestratorProps {
  amount: number;
  transactionId: string;
  upiId: string;
  qrCode: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const PaymentOrchestrator: React.FC<PaymentOrchestratorProps> = ({ 
  amount, transactionId, upiId, qrCode, onSuccess, onCancel 
}) => {
  const [state, setState] = useState<TransactionState>(TransactionState.IDLE);
  const [logs, setLogs] = useState<{ time: string, msg: string, type: 'info' | 'success' | 'error' }[]>([]);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minute timeout
  
  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg, type }, ...prev]);
  };

  useEffect(() => {
    // Initiation Sequence
    const initiate = async () => {
      setState(TransactionState.INITIATED);
      addLog(`Orchestrator initialized for TXN: ${transactionId}`, 'info');
      
      await new Promise(r => setTimeout(r, 800));
      setState(TransactionState.QR_GENERATED);
      addLog("NPCI intent generated. QR Ready.", 'info');
      
      await new Promise(r => setTimeout(r, 600));
      setState(TransactionState.AWAITING_PAYMENT);
      addLog("Subscribed to Merchant Gateway signals. Awaiting callback...", 'info');
    };

    initiate();
  }, [transactionId]);

  useEffect(() => {
    let timer: number;
    if (state === TransactionState.AWAITING_PAYMENT && timeLeft > 0) {
      timer = window.setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && state === TransactionState.AWAITING_PAYMENT) {
      setState(TransactionState.PAYMENT_TIMEOUT);
      addLog("Transaction timed out. Merchant SLA exceeded.", 'error');
    }
    return () => clearInterval(timer);
  }, [state, timeLeft]);

  const simulateMerchantCallback = async (success: boolean) => {
    addLog(`Inbound merchant signal detected...`, 'info');
    await new Promise(r => setTimeout(r, 1200));
    
    if (success) {
      setState(TransactionState.PAYMENT_SUCCESS);
      addLog(`Payment Verified. Amount: ₹${amount} settled.`, 'success');
      setTimeout(() => onSuccess(), 1500);
    } else {
      setState(TransactionState.PAYMENT_FAILED);
      addLog(`Merchant reported failure. Error: Insufficient Funds / Decline.`, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-300 border border-white/10">
        
        {/* Left: Orchestration Plane */}
        <div className="flex-[1.2] bg-slate-900 p-8 text-white flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest">Payment Orchestrator</h3>
                <p className="text-[10px] font-bold text-slate-400">NPCI Digital Control Plane</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
              <div className={`w-2 h-2 rounded-full ${state === TransactionState.AWAITING_PAYMENT ? 'bg-orange-500 animate-pulse' : 'bg-slate-600'}`}></div>
              <span className="text-[10px] font-black uppercase tracking-widest">{state}</span>
            </div>
          </div>

          {/* Audit Trace */}
          <div className="flex-1 bg-black/40 rounded-2xl p-6 mb-6 border border-white/5 overflow-y-auto space-y-3 font-mono">
             <div className="flex items-center space-x-2 pb-3 border-b border-white/5 mb-3">
               <Activity className="w-3.5 h-3.5 text-slate-500" />
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live Audit Trace</span>
             </div>
             {logs.map((log, i) => (
               <div key={i} className={`text-[10px] leading-relaxed flex items-start space-x-2 animate-in slide-in-from-left-2`}>
                 <span className="text-slate-600 shrink-0">[{log.time}]</span>
                 <span className={log.type === 'success' ? 'text-emerald-400' : log.type === 'error' ? 'text-red-400' : 'text-slate-300'}>
                   {log.msg}
                 </span>
               </div>
             ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">POS Reference</p>
                <p className="text-xs font-black truncate">{transactionId}</p>
             </div>
             <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Time to SLA</p>
                <p className="text-xs font-black text-orange-400">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</p>
             </div>
          </div>
        </div>

        {/* Right: Payment Interface */}
        <div className="flex-1 p-8 flex flex-col items-center justify-center text-center bg-white">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Request Amount</p>
           <h2 className="text-5xl font-black text-slate-900 mb-8">₹{amount.toLocaleString()}</h2>

           <div className="relative mb-8 group">
              <div className="absolute -inset-4 bg-slate-100 rounded-3xl group-hover:bg-orange-50 transition-colors"></div>
              <div className="relative bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center justify-center">
                 {qrCode ? (
                   <img src={qrCode} className={`w-48 h-48 md:w-56 md:h-56 object-contain transition-opacity ${state === TransactionState.AWAITING_PAYMENT ? 'opacity-100' : 'opacity-20'}`} />
                 ) : (
                   <QrCode className="w-48 h-48 text-slate-200" />
                 )}
                 {state === TransactionState.AWAITING_PAYMENT && (
                   <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[1px] opacity-0 hover:opacity-100 transition-opacity">
                      <Wifi className="w-8 h-8 text-orange-500 animate-pulse" />
                      <p className="text-[10px] font-black uppercase text-orange-600 mt-2">Active Signal Sync</p>
                   </div>
                 )}
                 {state === TransactionState.PAYMENT_SUCCESS && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/90">
                       <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/20 animate-in zoom-in">
                          <CheckCircle2 className="w-10 h-10 text-white" />
                       </div>
                    </div>
                 )}
              </div>
           </div>

           {state === TransactionState.AWAITING_PAYMENT ? (
             <div className="w-full space-y-4">
                <div className="flex flex-col items-center py-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <div className="flex items-center space-x-2 text-orange-500 animate-pulse mb-1">
                      <Signal className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Waiting for Merchant Pulse...</span>
                   </div>
                   <p className="text-[9px] font-bold text-slate-400">Do not refresh or close this terminal</p>
                </div>
                
                {/* Simulation Controls for testing callback logic */}
                <div className="flex gap-3">
                   <button 
                    onClick={() => simulateMerchantCallback(true)}
                    className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
                   >
                     Simulate Success
                   </button>
                   <button 
                    onClick={() => simulateMerchantCallback(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                   >
                     Simulate Failure
                   </button>
                </div>
             </div>
           ) : state === TransactionState.PAYMENT_FAILED || state === TransactionState.PAYMENT_TIMEOUT ? (
             <div className="w-full space-y-4">
               <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center space-x-4">
                 <ShieldAlert className="w-8 h-8 text-red-500" />
                 <div className="text-left">
                   <p className="text-[10px] font-black text-red-800 uppercase">Verification Failed</p>
                   <p className="text-[9px] font-bold text-red-600">Merchant reported a fatal error during settlement.</p>
                 </div>
               </div>
               <div className="flex gap-3">
                 <button onClick={() => window.location.reload()} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center">
                   <RefreshCw className="w-4 h-4 mr-2" /> Retry Orchestration
                 </button>
                 <button onClick={onCancel} className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest">
                   Switch Method
                 </button>
               </div>
             </div>
           ) : (
             <div className="flex flex-col items-center">
               <Loader2 className="w-12 h-12 text-slate-200 animate-spin" />
               <p className="mt-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">Syncing Gateway...</p>
             </div>
           )}

           <button onClick={onCancel} className="mt-6 text-[10px] font-black text-slate-400 uppercase hover:text-red-500 transition-colors">
             Cancel Transaction
           </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentOrchestrator;
