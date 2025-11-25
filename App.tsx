import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Receipt, Menu, X, LogOut, Loader2, Database, AlertTriangle } from 'lucide-react';
import Dashboard from './components/Dashboard';
import CompanyList from './components/CompanyList';
import BillingList from './components/BillingList';
import { Company, Invoice, InvoiceStatus, CompanyStatus } from './types';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { INITIAL_COMPANIES, INITIAL_INVOICES } from './constants';

type View = 'DASHBOARD' | 'COMPANIES' | 'BILLING';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Global State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // --- Data Mapping Helpers (Database Snake_case <-> Frontend CamelCase) ---
  
  const mapCompanyFromDB = (dbCompany: any): Company => ({
    id: dbCompany.id,
    name: dbCompany.name,
    cnpj: dbCompany.cnpj,
    contactName: dbCompany.contact_name,
    status: dbCompany.status as CompanyStatus,
    createdAt: dbCompany.created_at
  });

  const mapInvoiceFromDB = (dbInvoice: any): Invoice => ({
    id: dbInvoice.id,
    companyId: dbInvoice.company_id,
    companyName: dbInvoice.company_name || 'Desconhecida',
    competence: dbInvoice.competence,
    dueDate: dbInvoice.due_date,
    employeeCount: dbInvoice.employee_count,
    unitValue: dbInvoice.unit_value,
    totalValue: dbInvoice.total_value,
    status: dbInvoice.status as InvoiceStatus
  });

  // --- Fetch Data ---

  const fetchData = async () => {
    setIsLoading(true);

    // If credentials are obviously missing, skip straight to demo mode
    if (!isSupabaseConfigured()) {
      console.log('No Supabase credentials. Loading demo data.');
      setCompanies(INITIAL_COMPANIES);
      setInvoices(INITIAL_INVOICES);
      setIsDemoMode(true);
      setIsLoading(false);
      return;
    }

    try {
      // 1. Fetch Companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('name');
      
      if (companiesError) throw companiesError;

      // 2. Fetch Invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .order('competence', { ascending: false });

      if (invoicesError) throw invoicesError;

      // Map to frontend types
      const mappedCompanies = (companiesData || []).map(mapCompanyFromDB);
      let mappedInvoices = (invoicesData || []).map(mapInvoiceFromDB);

      // 3. Check for Overdue Invoices automatically
      const today = new Date().toISOString().split('T')[0];
      const updatesPromises: Promise<any>[] = [];

      mappedInvoices = mappedInvoices.map(inv => {
        if (inv.status === InvoiceStatus.PENDING && inv.dueDate < today) {
          // Update in DB (fire and forget for performance)
          updatesPromises.push(
            supabase.from('invoices').update({ status: InvoiceStatus.OVERDUE }).eq('id', inv.id)
          );
          // Update local
          return { ...inv, status: InvoiceStatus.OVERDUE };
        }
        return inv;
      });

      if (updatesPromises.length > 0) {
        // We don't await this to speed up initial render, just let it run
        Promise.all(updatesPromises).catch(err => console.error('Error auto-updating overdue invoices:', err));
      }

      setCompanies(mappedCompanies);
      setInvoices(mappedInvoices);
      setIsDemoMode(false);

    } catch (error: any) {
      console.error('Error fetching data from Supabase:', error);
      console.error('Detailed Error:', JSON.stringify(error, null, 2));
      
      // Fallback to Mock Data
      setCompanies(INITIAL_COMPANIES);
      setInvoices(INITIAL_INVOICES);
      setIsDemoMode(true);
      
      // Only alert if it's not a generic connection error (common in dev without keys)
      if (error.message && !error.message.includes('fetch')) {
        alert(`Erro de conexão com Banco de Dados: ${error.message}. Usando dados de demonstração.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- CRUD Handlers ---

  const handleAddCompany = async (newCompanyData: Omit<Company, 'id' | 'createdAt'>) => {
    if (isDemoMode) {
      const mockCompany = { 
        ...newCompanyData, 
        id: Math.random().toString(), 
        createdAt: new Date().toISOString() 
      };
      setCompanies([...companies, mockCompany]);
      alert('Modo Demonstração: Empresa salva apenas localmente.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('companies')
        .insert([{
          name: newCompanyData.name,
          cnpj: newCompanyData.cnpj,
          contact_name: newCompanyData.contactName,
          status: newCompanyData.status
        }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setCompanies([...companies, mapCompanyFromDB(data)]);
      }
    } catch (error: any) {
      console.error('Error adding company:', error);
      alert(`Erro ao salvar empresa: ${error.message}`);
    }
  };

  const handleUpdateCompanyStatus = async (id: string, status: CompanyStatus) => {
    if (isDemoMode) {
      setCompanies(companies.map(c => c.id === id ? { ...c, status } : c));
      return;
    }

    try {
      const { error } = await supabase
        .from('companies')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      setCompanies(companies.map(c => c.id === id ? { ...c, status } : c));
    } catch (error: any) {
      console.error('Error updating company:', error);
      alert(`Erro ao atualizar status: ${error.message}`);
    }
  };

  const handleAddInvoice = async (newInvoiceData: Omit<Invoice, 'id'>) => {
    // Determine status based on due date (Server/App logic)
    const today = new Date().toISOString().split('T')[0];
    let initialStatus = newInvoiceData.status;
    
    if (initialStatus === InvoiceStatus.PENDING && newInvoiceData.dueDate < today) {
      initialStatus = InvoiceStatus.OVERDUE;
    }

    if (isDemoMode) {
      const mockInvoice = { ...newInvoiceData, id: Math.random().toString(), status: initialStatus };
      setInvoices([...invoices, mockInvoice]);
      alert('Modo Demonstração: Fatura salva apenas localmente.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('invoices')
        .insert([{
          company_id: newInvoiceData.companyId,
          company_name: newInvoiceData.companyName,
          competence: newInvoiceData.competence,
          due_date: newInvoiceData.dueDate,
          employee_count: newInvoiceData.employeeCount,
          unit_value: newInvoiceData.unitValue,
          total_value: newInvoiceData.totalValue,
          status: initialStatus
        }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setInvoices([...invoices, mapInvoiceFromDB(data)]);
      }
    } catch (error: any) {
      console.error('Error adding invoice:', error);
      alert(`Erro ao criar fatura: ${error.message}`);
    }
  };

  const handleUpdateInvoiceStatus = async (id: string, status: InvoiceStatus) => {
    if (isDemoMode) {
      setInvoices(invoices.map(i => i.id === id ? { ...i, status } : i));
      return;
    }

    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      setInvoices(invoices.map(i => i.id === id ? { ...i, status } : i));
    } catch (error: any) {
      console.error('Error updating invoice:', error);
      alert(`Erro ao atualizar fatura: ${error.message}`);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
          <Loader2 className="animate-spin mb-4" size={48} />
          <p>Conectando ao banco de dados...</p>
        </div>
      );
    }

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

        {/* Demo Mode Banner */}
        {isDemoMode && (
          <div className="bg-amber-100 text-amber-800 px-4 py-2 text-sm text-center flex items-center justify-center gap-2 border-b border-amber-200">
            <AlertTriangle size={16} />
            <span>
              <strong>Modo Demonstração:</strong> Conexão com banco de dados falhou. Exibindo dados de teste locais.
            </span>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;