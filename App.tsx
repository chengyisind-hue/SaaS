import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Receipt, Menu, X, LogOut, Loader2, AlertTriangle, Settings as SettingsIcon, PieChart, PlusCircle, CreditCard, Moon, Sun } from 'lucide-react';
import Dashboard from './components/Dashboard';
import CompanyList from './components/CompanyList';
import BillingList from './components/BillingList';
import Reports from './components/Reports';
import Login from './components/Login';
import Settings from './components/Settings';
import { Company, Invoice, InvoiceStatus, CompanyStatus, SystemLog, AppSettings } from './types';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { INITIAL_COMPANIES, INITIAL_INVOICES, MOCK_LOGS } from './constants';

type View = 'DASHBOARD' | 'COMPANIES' | 'BILLING' | 'REPORTS' | 'SETTINGS';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // Global State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  
  // Settings State (Persisted in LocalStorage)
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('APP_SETTINGS');
    return saved ? JSON.parse(saved) : { unitPrice: 5.00, dueDay: 10, apiKey: '', theme: 'light' };
  });

  // Apply Theme
  useEffect(() => {
    localStorage.setItem('APP_SETTINGS', JSON.stringify(settings));
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  // --- Logger ---
  const addLog = (action: string, details: string, type: SystemLog['type'] = 'info') => {
    const newLog: SystemLog = {
      id: Math.random().toString(36).substr(2, 9),
      action,
      details,
      timestamp: new Date().toISOString(),
      user: session?.user?.email || 'Sistema',
      type
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // --- Auth & Init ---
  
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session && !isSupabaseConfigured()) {
        setIsDemoMode(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Data Mapping Helpers ---
  
  const mapCompanyFromDB = (dbCompany: any): Company => ({
    id: dbCompany.id,
    name: dbCompany.name,
    cnpj: dbCompany.cnpj,
    contactName: dbCompany.contact_name,
    status: dbCompany.status as CompanyStatus,
    createdAt: dbCompany.created_at,
    employeeCount: dbCompany.employee_count || 0,
    notes: dbCompany.notes
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

    if (isDemoMode || !isSupabaseConfigured()) {
      if (!isDemoMode) setIsDemoMode(true);
      const companiesWithCounts = INITIAL_COMPANIES.map(c => ({...c, employeeCount: c.employeeCount || Math.floor(Math.random() * 50) + 5, notes: ''}));
      setCompanies(companiesWithCounts);
      setInvoices(INITIAL_INVOICES);
      setLogs(MOCK_LOGS);
      setIsLoading(false);
      return;
    }

    if (!session && isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    try {
      // O RLS do Supabase já vai filtrar automaticamente baseando-se no session.user.id
      const { data: companiesData, error: companiesError } = await supabase.from('companies').select('*').order('name');
      if (companiesError) throw companiesError;

      const { data: invoicesData, error: invoicesError } = await supabase.from('invoices').select('*').order('competence', { ascending: false });
      if (invoicesError) throw invoicesError;

      const mappedCompanies = (companiesData || []).map(mapCompanyFromDB);
      let mappedInvoices = (invoicesData || []).map(mapInvoiceFromDB);

      // Check Overdue
      const today = new Date().toISOString().split('T')[0];
      const updatesPromises: Promise<any>[] = [];

      mappedInvoices = mappedInvoices.map(inv => {
        if (inv.status === InvoiceStatus.PENDING && inv.dueDate < today) {
          updatesPromises.push(
            supabase.from('invoices').update({ status: InvoiceStatus.OVERDUE }).eq('id', inv.id)
          );
          return { ...inv, status: InvoiceStatus.OVERDUE };
        }
        return inv;
      });

      if (updatesPromises.length > 0) {
        Promise.all(updatesPromises).catch(err => console.error('Error auto-updating invoices:', err));
        addLog('Automação', `${updatesPromises.length} faturas vencidas foram atualizadas automaticamente.`, 'warning');
      }

      setCompanies(mappedCompanies);
      setInvoices(mappedInvoices);
      setIsDemoMode(false);

    } catch (error: any) {
      console.error('Supabase Error:', error);
      const companiesWithCounts = INITIAL_COMPANIES.map(c => ({...c, employeeCount: Math.floor(Math.random() * 50) + 5}));
      setCompanies(companiesWithCounts);
      setInvoices(INITIAL_INVOICES);
      setLogs(MOCK_LOGS);
      setIsDemoMode(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session || isDemoMode) {
      fetchData();
    }
  }, [session, isDemoMode]);

  // --- CRUD Handlers ---

  const handleAddCompany = async (newCompanyData: Omit<Company, 'id' | 'createdAt'>) => {
    const tempId = Math.random().toString();
    const now = new Date().toISOString();

    if (isDemoMode) {
      const mockCompany = { ...newCompanyData, id: tempId, createdAt: now };
      setCompanies([...companies, mockCompany]);
      addLog('Cadastro Empresa', `Empresa ${newCompanyData.name} cadastrada com ${newCompanyData.employeeCount} funcionários.`, 'success');
      return;
    }

    try {
      const { data, error } = await supabase.from('companies').insert([{
        name: newCompanyData.name,
        cnpj: newCompanyData.cnpj,
        contact_name: newCompanyData.contactName,
        status: newCompanyData.status,
        employee_count: newCompanyData.employeeCount,
        notes: newCompanyData.notes,
        user_id: session?.user?.id // VINCULA AO USUÁRIO LOGADO
      }]).select().single();

      if (error) throw error;
      if (data) {
        setCompanies([...companies, mapCompanyFromDB(data)]);
        addLog('Cadastro Empresa', `Empresa ${newCompanyData.name} cadastrada.`, 'success');
      }
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
      addLog('Erro', `Falha ao cadastrar empresa: ${error.message}`, 'error');
    }
  };

  // Generic Update Handler (Status, Employees, Notes)
  const handleUpdateCompany = async (id: string, updates: Partial<Company>) => {
    const company = companies.find(c => c.id === id);
    if (!company) return;

    if (isDemoMode) {
      setCompanies(companies.map(c => c.id === id ? { ...c, ...updates } : c));
      
      if (updates.status) addLog('Status Empresa', `Status da ${company.name} alterado para ${updates.status}.`, 'info');
      if (updates.employeeCount !== undefined) addLog('Atualização Empresa', `Funcionários da ${company.name} atualizados para ${updates.employeeCount}.`, 'info');
      if (updates.notes !== undefined) addLog('Nota Empresa', `Notas internas atualizadas para ${company.name}.`, 'info');
      return;
    }

    try {
      const dbUpdates: any = {};
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.employeeCount !== undefined) dbUpdates.employee_count = updates.employeeCount;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      const { error } = await supabase.from('companies').update(dbUpdates).eq('id', id);
      if (error) throw error;
      
      setCompanies(companies.map(c => c.id === id ? { ...c, ...updates } : c));
      
      if (updates.status) addLog('Status Empresa', `Status da ${company.name} alterado para ${updates.status}.`, 'info');
      if (updates.employeeCount !== undefined) addLog('Atualização Empresa', `Funcionários da ${company.name} atualizados para ${updates.employeeCount}.`, 'info');
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    }
  };

  const handleDeleteCompany = async (id: string) => {
    const companyName = companies.find(c => c.id === id)?.name || 'Empresa';

    if (isDemoMode) {
      setCompanies(companies.filter(c => c.id !== id));
      setInvoices(invoices.filter(i => i.companyId !== id));
      addLog('Exclusão Empresa', `Empresa ${companyName} e seus dados foram removidos.`, 'warning');
      return;
    }

    try {
      const { error } = await supabase.from('companies').delete().eq('id', id);
      if (error) throw error;
      setCompanies(companies.filter(c => c.id !== id));
      setInvoices(invoices.filter(i => i.companyId !== id));
      addLog('Exclusão Empresa', `Empresa ${companyName} removida.`, 'warning');
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    }
  };

  const handleAddInvoice = async (newInvoiceData: Omit<Invoice, 'id'>) => {
    const today = new Date().toISOString().split('T')[0];
    let initialStatus = newInvoiceData.status;
    if (initialStatus === InvoiceStatus.PENDING && newInvoiceData.dueDate < today) {
      initialStatus = InvoiceStatus.OVERDUE;
    }

    if (isDemoMode) {
      const mockInvoice = { ...newInvoiceData, id: Math.random().toString(), status: initialStatus };
      setInvoices([...invoices, mockInvoice]);
      addLog('Nova Fatura', `Fatura gerada para ${newInvoiceData.companyName} (${newInvoiceData.competence}).`, 'success');
      return;
    }

    try {
      const { data, error } = await supabase.from('invoices').insert([{
        company_id: newInvoiceData.companyId,
        company_name: newInvoiceData.companyName,
        competence: newInvoiceData.competence,
        due_date: newInvoiceData.dueDate,
        employee_count: newInvoiceData.employeeCount,
        unit_value: newInvoiceData.unitValue,
        total_value: newInvoiceData.totalValue,
        status: initialStatus,
        user_id: session?.user?.id // VINCULA AO USUÁRIO LOGADO
      }]).select().single();

      if (error) throw error;
      if (data) {
        setInvoices([...invoices, mapInvoiceFromDB(data)]);
        addLog('Nova Fatura', `Fatura gerada para ${newInvoiceData.companyName}.`, 'success');
      }
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    }
  };

  const handleUpdateInvoiceStatus = async (id: string, status: InvoiceStatus) => {
    if (isDemoMode) {
      setInvoices(invoices.map(i => i.id === id ? { ...i, status } : i));
      addLog('Atualização Fatura', `Status da fatura alterado para ${status}.`, 'info');
      return;
    }

    try {
      const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
      if (error) throw error;
      setInvoices(invoices.map(i => i.id === id ? { ...i, status } : i));
      addLog('Atualização Fatura', `Status da fatura alterado para ${status}.`, 'info');
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (isDemoMode) {
      setInvoices(invoices.filter(i => i.id !== id));
      addLog('Exclusão Fatura', `Fatura removida do sistema.`, 'warning');
      return;
    }

    try {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
      setInvoices(invoices.filter(i => i.id !== id));
      addLog('Exclusão Fatura', `Fatura removida do sistema.`, 'warning');
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    addLog('Logout', 'Usuário desconectado.', 'info');
    await supabase.auth.signOut();
    setIsDemoMode(false); 
    setSession(null);
  };

  // --- Auth Guard ---
  if (!session && !isDemoMode) {
    return <Login onLoginSuccess={() => addLog('Login', 'Usuário realizou login.', 'info')} />;
  }

  // Quick Action Handlers
  const triggerQuickAction = (view: any, action: string) => {
    setCurrentView(view);
    setPendingAction(action);
    setIsSidebarOpen(false);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
          <Loader2 className="animate-spin mb-4" size={48} />
          <p>Conectando ao sistema...</p>
        </div>
      );
    }

    switch (currentView) {
      case 'DASHBOARD':
        return (
          <Dashboard 
            companies={companies} 
            invoices={invoices} 
            logs={logs}
            onQuickAction={triggerQuickAction}
            theme={settings.theme}
          />
        );
      case 'COMPANIES':
        return (
          <CompanyList 
            companies={companies} 
            logs={logs}
            onAddCompany={handleAddCompany} 
            onUpdateCompany={handleUpdateCompany}
            onDeleteCompany={handleDeleteCompany}
            pendingAction={pendingAction}
            clearPendingAction={() => setPendingAction(null)}
          />
        );
      case 'BILLING':
        return (
          <BillingList 
            invoices={invoices} 
            companies={companies} 
            unitPrice={settings.unitPrice}
            onAddInvoice={handleAddInvoice}
            onUpdateStatus={handleUpdateInvoiceStatus}
            onDeleteInvoice={handleDeleteInvoice}
            onUpdateCompany={handleUpdateCompany} 
            pendingAction={pendingAction}
            clearPendingAction={() => setPendingAction(null)}
          />
        );
      case 'REPORTS':
        return (
          <Reports companies={companies} invoices={invoices} theme={settings.theme} />
        );
      case 'SETTINGS':
        return (
          <Settings 
            logs={logs}
            settings={settings}
            onUpdateSettings={setSettings}
          />
        );
      default:
        return <Dashboard companies={companies} invoices={invoices} logs={logs} onQuickAction={triggerQuickAction} theme={settings.theme} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex transition-colors duration-200">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 dark:bg-black text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto flex flex-col
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

        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          
          <button onClick={() => { setCurrentView('DASHBOARD'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'DASHBOARD' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          
          <button onClick={() => { setCurrentView('COMPANIES'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'COMPANIES' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Users size={20} />
            <span>Empresas</span>
          </button>
          
          <button onClick={() => { setCurrentView('BILLING'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'BILLING' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Receipt size={20} />
            <span>Financeiro</span>
          </button>
          
          <button onClick={() => { setCurrentView('REPORTS'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'REPORTS' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <PieChart size={20} />
            <span>Relatórios</span>
          </button>

          {/* Sidebar Quick Actions */}
          <div className="pt-6 pb-2">
            <h3 className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Ações Rápidas</h3>
            <button onClick={() => triggerQuickAction('COMPANIES', 'CREATE')} className="w-full flex items-center gap-3 px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors group">
              <PlusCircle size={18} className="text-emerald-500 group-hover:text-emerald-400" />
              <span className="text-sm">Cadastrar Empresa</span>
            </button>
            <button onClick={() => triggerQuickAction('BILLING', 'CREATE')} className="w-full flex items-center gap-3 px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors group">
              <CreditCard size={18} className="text-amber-500 group-hover:text-amber-400" />
              <span className="text-sm">Nova Fatura</span>
            </button>
          </div>

        </nav>

        <div className="w-full p-4 border-t border-slate-800 space-y-2 bg-slate-900 dark:bg-black">
          <button onClick={handleLogout} className="flex items-center gap-3 text-slate-400 hover:text-red-400 transition-colors px-4 py-2 w-full rounded-lg hover:bg-slate-800">
            <LogOut size={20} />
            <span>Sair</span>
          </button>
          
          <button onClick={() => { setCurrentView('SETTINGS'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${currentView === 'SETTINGS' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <SettingsIcon size={20} />
            <span>Configurações</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between sticky top-0 z-10">
          <h1 className="font-bold text-slate-800 dark:text-white">PontoGestor Admin</h1>
          <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600 dark:text-slate-300">
            <Menu size={24} />
          </button>
        </header>

        {isDemoMode && (
          <div className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-100 px-4 py-2 text-sm text-center flex items-center justify-center gap-2 border-b border-amber-200 dark:border-amber-700">
            <AlertTriangle size={16} />
            <span><strong>Modo Demonstração:</strong> Banco de dados desconectado ou usuário não logado.</span>
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