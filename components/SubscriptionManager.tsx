
import React from 'react';
import { useApp } from '../store.tsx';
import { 
  CreditCard, CheckCircle2, ShieldCheck, Zap, 
  Layers, Package, Cloud, Users, Sparkles, Star
} from 'lucide-react';
import { SubscriptionPlan } from '../types.ts';

const SubscriptionManager: React.FC = () => {
  const { businessConfig, updateSubscription } = useApp();

  const plans: SubscriptionPlan[] = [
    {
      id: 'starter',
      name: 'Starter Plan',
      price: 999,
      billingCycle: 'monthly',
      features: [
        'Up to 500 Inventory Items',
        'Basic Billing Terminal',
        'Offline Mode Local Storage',
        'Email Support Response'
      ]
    },
    {
      id: 'growth',
      name: 'Growth Plan',
      price: 2499,
      billingCycle: 'monthly',
      features: [
        'Unlimited Inventory Items',
        'Cloud-Sync Ready (Google Drive)',
        'Customer Loyalty Tracking',
        'Advanced Sales Analytics',
        'Priority Phone Support'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise Pro',
      price: 5999,
      billingCycle: 'monthly',
      features: [
        'Multi-Terminal Syncing',
        'AI Data Intelligence Agent',
        'Custom Invoice Branding',
        'Role-Based Access Control',
        'Automated Cloud Backups',
        'Dedicated Account Manager'
      ]
    }
  ];

  return (
    <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50/50">
      <div className="mb-10">
        <div className="flex items-center space-x-2 mb-1">
          <Layers className="w-4 h-4 text-orange-500" />
          <p className="text-orange-500 font-black text-[10px] uppercase tracking-widest">Enterprise Billing</p>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Subscription Governance</h1>
        <p className="text-slate-500 text-sm font-medium">Provision system capabilities and manage license lifecycle.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div 
            key={plan.id} 
            className={`bg-white rounded-[2.5rem] shadow-sm border p-8 flex flex-col relative overflow-hidden transition-all hover:shadow-xl ${
              businessConfig.currentPlanId === plan.id 
                ? 'border-orange-500 ring-4 ring-orange-500/10' 
                : 'border-slate-200'
            }`}
          >
            {businessConfig.currentPlanId === plan.id && (
              <div className="absolute top-6 right-6 px-3 py-1 bg-orange-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest flex items-center">
                <Star className="w-3 h-3 mr-1.5 fill-white" />
                Active Plan
              </div>
            )}
            
            <div className="mb-8">
              <h3 className="text-xl font-black text-slate-900 mb-2">{plan.name}</h3>
              <div className="flex items-baseline">
                <span className="text-3xl font-black text-slate-900">₹{plan.price}</span>
                <span className="text-slate-400 text-xs font-bold ml-2 uppercase">/{plan.billingCycle}</span>
              </div>
            </div>

            <div className="flex-1 space-y-4 mb-10">
              {plan.features.map((feature, idx) => (
                <div key={idx} className="flex items-start space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs font-bold text-slate-600">{feature}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => updateSubscription(plan.id)}
              disabled={businessConfig.currentPlanId === plan.id}
              className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center shadow-lg active:scale-95 ${
                businessConfig.currentPlanId === plan.id
                  ? 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {businessConfig.currentPlanId === plan.id ? (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" /> Current License
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2 text-orange-500" /> Upgrade Capacity
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="max-w-xl text-center md:text-left">
              <div className="flex items-center space-x-2 mb-4 justify-center md:justify-start">
                 <Sparkles className="w-5 h-5 text-orange-500" />
                 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Enterprise Support</span>
              </div>
              <h2 className="text-2xl font-black mb-2">Multi-Store Corporate License?</h2>
              <p className="text-sm font-medium text-slate-400">If you are a book retail chain operating across more than 5 terminals, our corporate team can design a custom settlement engine for your consolidated data reconciliation.</p>
           </div>
           <button className="px-10 py-5 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20 active:scale-95 flex items-center">
              <Cloud className="w-5 h-5 mr-3" />
              Request Quote
           </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionManager;
