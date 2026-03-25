
import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './store.tsx';
import Layout from './components/Layout.tsx';
import Dashboard from './components/Dashboard.tsx';
import Inventory from './components/Inventory.tsx';
import POS from './components/POS.tsx';
import History from './components/History.tsx';
import Customers from './components/Customers.tsx';
import Orders from './components/Orders.tsx';
import Login from './components/Login.tsx';
import SystemSettings from './components/SystemSettings.tsx';
import PaymentDataManager from './components/PaymentDataManager.tsx';
import SubscriptionManager from './components/SubscriptionManager.tsx';

const AppContent: React.FC = () => {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Handle staff initial view
  useEffect(() => {
    if (user?.role === 'STAFF') {
      setActiveTab('pos');
    } else {
      setActiveTab('dashboard');
    }
  }, [user]);

  if (!user) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'inventory':
        return <Inventory />;
      case 'pos':
        return <POS />;
      case 'orders':
        return <Orders />;
      case 'history':
        return <History />;
      case 'customers':
        return <Customers />;
      case 'payment-mgmt':
        return <PaymentDataManager />;
      case 'system':
        return <SystemSettings />;
      case 'subscription':
        return <SubscriptionManager />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
