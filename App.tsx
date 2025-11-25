import React, { useState } from 'react';
import { LayoutDashboard, Users, Receipt, Menu, X, LogOut } from 'lucide-react';
import Dashboard from './components/Dashboard';
import CompanyList from './components/CompanyList';
import BillingList from './components/BillingList';
import { Company, Invoice, InvoiceStatus, CompanyStatus } from './types';
import { INITIAL_COMPANIES, INITIAL_INVOICES } from './constants';

type View = 'DASHBOARD' | 'COMPANIES' | 'BILLING';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Global State (Mock Backend)
  const [companies, setCompanies] = useState<Company[]>(INITIAL_COMPANIES);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);

  // CRUD Handlers
  const handleAddCompany = (newCompanyData: Omit<Company, 'id' | 'createdAt'>) => {
    const newCompany: Company = {
      ...newCompanyData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    setCompanies([...companies, newCompany]);
  };

  const handleUpdateCompanyStatus = (id: string, status: CompanyStatus) => {
    setCompanies(companies.map(c => c.id === id ? { ...c, status } : c));
  };

  const handleAddInvoice = (newInvoiceData: Omit<Invoice, 'id'>) => {
    const newInvoice: Invoice = {
      ...newInvoiceData,
      id: Date.now().toString()
    };
    setInvoices([...invoices, newInvoice]);
  };

  const handleUpdateInvoiceStatus = (id: string, status: InvoiceStatus) => {
    setInvoices(invoices.map(i => i.id === id ? { ...i, status } : i));
  };

  const renderContent = () => {
    switch (currentView) {
      case 'DASHBOARD':
        return <Dashboard companies={companies} invoices={invoices} />;
      case 'COMPANIES':
        return <CompanyList 
          companies={companies} 
          onAddCompany={handleAddCompany} 
          onUpdateStatus={handleUpdateCompanyStatus}
        />;
      case 'BILLING':
        return <BillingList 
          invoices={invoices} 
          companies={companies} 
          onAddInvoice={handleAddInvoice}
          onUpdateStatus={handleUpdateInvoiceStatus}
        />;
      default:
        return <Dashboard companies={companies} invoices={invoices} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">PontoGestor</h1>
            <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Admin Panel</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400">
            <X size={24} />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          <button 
            onClick={() => { setCurrentView('DASHBOARD'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'DASHBOARD' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          
          <button 
            onClick={() => { setCurrentView('COMPANIES'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'COMPANIES' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Users size={20} />
            <span>Empresas</span>
          </button>

          <button 
            onClick={() => { setCurrentView('BILLING'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'BILLING' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Receipt size={20} />
            <span>Financeiro</span>
          </button>
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-slate-800">
          <button className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors px-4 py-2 w-full">
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-10">
          <h1 className="font-bold text-slate-800">PontoGestor Admin</h1>
          <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600">
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;