import React, { useState, useEffect } from 'react';
import { Company, CompanyStatus, SystemLog, AppSettings } from '../types';
import { Plus, Search, ArrowUpDown, ArrowUp, ArrowDown, Filter, Trash2, Edit, FileText, Activity, Save, Clock, RefreshCw, Loader2, Key, Calendar } from 'lucide-react';
import { fetchEmployeeCountsFromApi } from '../services/integrationService';

interface CompanyListProps {
  companies: Company[];
  logs?: SystemLog[];
  settings?: AppSettings;
  onAddCompany: (c: Omit<Company, 'id'>) => void;
  onUpdateCompany?: (id: string, updates: Partial<Company>) => void; // New generic update prop
  onUpdateStatus?: (id: string, status: CompanyStatus) => void; // Legacy prop fallback
  onDeleteCompany: (id: string) => void;
  pendingAction?: string | null;
  clearPendingAction?: () => void;
}

type SortKey = 'name' | 'status' | 'createdAt' | 'employeeCount';
interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

const CompanyList: React.FC<CompanyListProps> = ({ companies, logs = [], settings, onAddCompany, onUpdateCompany, onUpdateStatus, onDeleteCompany, pendingAction, clearPendingAction }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null); // For Details/CRM Modal

  // New Company Form State
  const [newName, setNewName] = useState('');
  const [newCnpj, setNewCnpj] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newEmployeeCount, setNewEmployeeCount] = useState<number>(0);
  const [newCreatedAt, setNewCreatedAt] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const [newNotes, setNewNotes] = useState('');
  const [newCompanyKey, setNewCompanyKey] = useState('');
  const [newIntegrationPassword, setNewIntegrationPassword] = useState('');

  // Handle Quick Action from Sidebar
  useEffect(() => {
    if (pendingAction === 'CREATE') {
      setIsAddModalOpen(true);
      if (clearPendingAction) clearPendingAction();
    }
  }, [pendingAction, clearPendingAction]);

  const handleSyncWithApi = async () => {
    // Only warn if general setting is missing AND at least one company doesn't have individual credentials
    // For now, we assume if they are clicking this, they want to use the integration.
    
    setIsSyncing(true);
    try {
      // Pass the companies list to the service. The service will handle using individual or global keys.
      // NOTE: integrationUrl is global, but keys/passwords are per company.
      const updates = await fetchEmployeeCountsFromApi(settings?.integrationUrl || '', settings?.integrationToken || '', companies);
      
      let updatedCount = 0;
      updates.forEach(update => {
        const company = companies.find(c => c.cnpj === update.cnpj);
        if (company && company.employeeCount !== update.activeEmployees) {
          if (onUpdateCompany) {
            onUpdateCompany(company.id, { employeeCount: update.activeEmployees });
            updatedCount++;
          }
        }
      });
      
      alert(`Sincronização concluída! ${updatedCount} empresas tiveram o número de funcionários atualizado.`);
    } catch (error: any) {
      alert(`Erro na sincronização: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // 1. Filtering
  const filteredCompanies = companies.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.cnpj.includes(searchTerm);
    
    let matchesStatus = true;
    if (filterStatus === 'ALL') {
      matchesStatus = true;
    } else if (filterStatus === 'INACTIVE_GROUP') {
      // Shows all companies that are NOT active (Blocked, Cancelled, Unused)
      matchesStatus = c.status !== CompanyStatus.ACTIVE;
    } else {
      matchesStatus = c.status === filterStatus;
    }

    return matchesSearch && matchesStatus;
  });

  // 2. Sorting
  const sortedCompanies = [...filteredCompanies].sort((a, b) => {
    const directionMult = sortConfig.direction === 'asc' ? 1 : -1;
    
    if (sortConfig.key === 'createdAt') {
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * directionMult;
    }
    
    // @ts-ignore
    if (a[sortConfig.key] < b[sortConfig.key]) return -1 * directionMult;
    // @ts-ignore
    if (a[sortConfig.key] > b[sortConfig.key]) return 1 * directionMult;
    return 0;
  });

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-slate-400 opacity-50" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="text-blue-600 dark:text-blue-400" /> 
      : <ArrowDown size={14} className="text-blue-600 dark:text-blue-400" />;
  };

  const formatCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18);
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCnpj(formatCNPJ(e.target.value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCompany({
      name: newName,
      cnpj: newCnpj,
      contactName: newContact,
      status: CompanyStatus.ACTIVE,
      employeeCount: newEmployeeCount,
      createdAt: new Date(newCreatedAt).toISOString(),
      notes: newNotes,
      companyKey: newCompanyKey,
      integrationPassword: newIntegrationPassword
    });
    setIsAddModalOpen(false);
    // Reset form
    setNewName('');
    setNewCnpj('');
    setNewContact('');
    setNewEmployeeCount(0);
    setNewCreatedAt(new Date().toISOString().split('T')[0]);
    setNewNotes('');
    setNewCompanyKey('');
    setNewIntegrationPassword('');
  };

  const handleSaveDetails = (updatedCompany: Company) => {
     if (onUpdateCompany) {
         onUpdateCompany(updatedCompany.id, {
             employeeCount: updatedCompany.employeeCount,
             notes: updatedCompany.notes,
             companyKey: updatedCompany.companyKey,
             integrationPassword: updatedCompany.integrationPassword
         });
     }
     setActiveCompany(null);
  };

  const handleStatusChange = (id: string, newStatus: CompanyStatus) => {
      if (onUpdateCompany) {
          onUpdateCompany(id, { status: newStatus });
      } else if (onUpdateStatus) {
          onUpdateStatus(id, newStatus);
      }
  };

  const confirmDelete = (id: string) => {
    if (window.confirm("ATENÇÃO: Excluir uma empresa apagará também todo o histórico de faturas dela. Deseja continuar?")) {
      onDeleteCompany(id);
    }
  };

  const getStatusBadgeStyles = (status: CompanyStatus) => {
    switch (status) {
      case CompanyStatus.ACTIVE:
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case CompanyStatus.BLOCKED:
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case CompanyStatus.CANCELLED:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case CompanyStatus.UNUSED:
        return 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
    }
  };

  const getSelectStyles = (status: CompanyStatus) => {
    switch (status) {
      case CompanyStatus.ACTIVE:
        return 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
      case CompanyStatus.BLOCKED:
        return 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case CompanyStatus.CANCELLED:
        return 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800';
      case CompanyStatus.UNUSED:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600';
    }
  };

  // Filter logs for timeline
  const getCompanyTimeline = (company: Company) => {
      const companyLogs = logs
        .filter(l => l.details.includes(company.name) || l.action.includes(company.name))
        .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // Fake initial log for creation if not present
      return companyLogs;
  };

  const inputClass = "w-full p-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded focus:ring-blue-500 outline-none";

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Empresas Clientes</h2>
        <div className="flex gap-2">
           <button 
            onClick={handleSyncWithApi}
            disabled={isSyncing}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
            title="Buscar quantidade de funcionários na API Externa"
          >
            {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            Sincronizar (API)
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Nova Empresa
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou CNPJ..." 
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={18} className="text-slate-500 hidden sm:block" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:w-auto p-2 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            >
              <option value="ALL">Todos os Status</option>
              <option value={CompanyStatus.ACTIVE}>Ativos</option>
              <option value="INACTIVE_GROUP">Inativos</option>
              <option value={CompanyStatus.BLOCKED}>Bloqueados</option>
              <option value={CompanyStatus.CANCELLED}>Cancelados</option>
              <option value={CompanyStatus.UNUSED}>Não utilizados</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th 
                  className="px-6 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors select-none group"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Empresa {getSortIcon('name')}
                  </div>
                </th>
                <th className="px-6 py-3">Contato</th>
                 <th 
                  className="px-6 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors select-none group"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-1">
                    Cadastro {getSortIcon('createdAt')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors select-none group"
                  onClick={() => handleSort('employeeCount')}
                >
                  <div className="flex items-center gap-1">
                    Funcionários {getSortIcon('employeeCount')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors select-none group"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status {getSortIcon('status')}
                  </div>
                </th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sortedCompanies.length > 0 ? (
                sortedCompanies.map((company) => (
                  <tr key={company.id} className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      <div>{company.name}</div>
                      <div className="text-slate-500 dark:text-slate-400 text-xs font-normal">{company.cnpj}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                      <div>{company.contactName}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                      <div>{new Date(company.createdAt).toLocaleDateString('pt-BR')}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                           <UsersIcon className="text-slate-400" size={14} />
                           {company.employeeCount}
                        </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeStyles(company.status)}`}>
                        {company.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setActiveCompany(company)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
                        title="Detalhes e Histórico"
                      >
                         <FileText size={16} />
                      </button>
                      
                      <select
                        value={company.status}
                        onChange={(e) => handleStatusChange(company.id, e.target.value as CompanyStatus)}
                        className={`text-xs py-1 px-2 rounded border focus:ring-2 outline-none cursor-pointer ${getSelectStyles(company.status)}`}
                      >
                        <option value={CompanyStatus.ACTIVE}>Ativo</option>
                        <option value={CompanyStatus.BLOCKED}>Bloqueado</option>
                        <option value={CompanyStatus.CANCELLED}>Cancelado</option>
                        <option value={CompanyStatus.UNUSED}>Não utilizado</option>
                      </select>
                      
                      <button 
                        onClick={() => confirmDelete(company.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="Excluir empresa"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    Nenhuma empresa encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Company Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Nova Empresa</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Razão Social</label>
                <input required value={newName} onChange={e => setNewName(e.target.value)} type="text" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">CNPJ</label>
                <input required value={newCnpj} onChange={handleCnpjChange} type="text" className={inputClass} placeholder="00.000.000/0000-00" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome Contato</label>
                    <input required value={newContact} onChange={e => setNewContact(e.target.value)} type="text" className={inputClass} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data Cadastro</label>
                    <input required value={newCreatedAt} onChange={e => setNewCreatedAt(e.target.value)} type="date" className={inputClass} />
                 </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Qtd. Funcionários</label>
                <input required value={newEmployeeCount} onChange={e => setNewEmployeeCount(Number(e.target.value))} type="number" min="0" className={inputClass} />
              </div>
              
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Integração Facilita Ponto</h4>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Chave da Empresa</label>
                        <input value={newCompanyKey} onChange={e => setNewCompanyKey(e.target.value)} type="text" className={`${inputClass} text-sm`} placeholder="Ex: 001002" />
                    </div>
                     <div>
                        <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Senha Integração</label>
                        <input value={newIntegrationPassword} onChange={e => setNewIntegrationPassword(e.target.value)} type="text" className={`${inputClass} text-sm`} placeholder="******" />
                    </div>
                </div>
              </div>

               <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notas Internas</label>
                <textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} rows={2} className={`${inputClass} text-sm`} placeholder="Detalhes iniciais..." />
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded shadow-sm">Cadastrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CRM / Details Modal */}
      {activeCompany && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 h-[80vh] flex flex-col">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start">
              <div>
                 <h3 className="text-xl font-bold text-slate-800 dark:text-white">{activeCompany.name}</h3>
                 <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">CNPJ: {activeCompany.cnpj}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeStyles(activeCompany.status)}`}>
                 {activeCompany.status}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white dark:bg-slate-900">
                
                {/* Basic Info Read-only */}
                 <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase mb-4 flex items-center gap-2">
                        <FileText size={16} /> Dados Cadastrais
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Contato Responsável</label>
                             <input type="text" value={activeCompany.contactName} disabled className={`${inputClass} bg-gray-100 dark:bg-slate-800 cursor-not-allowed text-slate-500`} />
                        </div>
                        <div>
                             <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Data de Cadastro</label>
                             <input type="date" value={activeCompany.createdAt.split('T')[0]} disabled className={`${inputClass} bg-gray-100 dark:bg-slate-800 cursor-not-allowed text-slate-500`} />
                        </div>
                    </div>
                </div>

                {/* Employee Count Section */}
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase mb-4 flex items-center gap-2">
                        <UsersIcon size={16} /> Gestão de Vidas
                    </h4>
                    <div className="flex items-end gap-4">
                        <div className="flex-1">
                            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Quantidade Atual</label>
                            <input 
                                type="number" 
                                value={activeCompany.employeeCount} 
                                onChange={(e) => setActiveCompany({...activeCompany, employeeCount: Number(e.target.value)})}
                                className={inputClass}
                            />
                        </div>
                        <button 
                            onClick={() => handleSaveDetails(activeCompany)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
                        >
                            <Save size={16} /> Atualizar
                        </button>
                    </div>
                </div>

                {/* API Credentials */}
                 <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase mb-4 flex items-center gap-2">
                        <Key size={16} /> Integração Facilita Ponto
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Chave da Empresa</label>
                            <input 
                                type="text"
                                value={activeCompany.companyKey || ''}
                                onChange={(e) => setActiveCompany({...activeCompany, companyKey: e.target.value})}
                                className={inputClass}
                                placeholder="Ex: 001002"
                            />
                        </div>
                        <div>
                             <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Senha Integração</label>
                            <input 
                                type="text"
                                value={activeCompany.integrationPassword || ''}
                                onChange={(e) => setActiveCompany({...activeCompany, integrationPassword: e.target.value})}
                                className={inputClass}
                                placeholder="******"
                            />
                        </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                        <button 
                            onClick={() => handleSaveDetails(activeCompany)}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            Salvar Credenciais
                        </button>
                    </div>
                </div>

                {/* Internal Notes */}
                <div>
                     <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase mb-2 flex items-center gap-2">
                        <Edit size={16} /> Notas Internas
                    </h4>
                    <textarea 
                        value={activeCompany.notes || ''} 
                        onChange={(e) => setActiveCompany({...activeCompany, notes: e.target.value})}
                        rows={4} 
                        className={`${inputClass} text-sm`}
                        placeholder="Escreva observações sobre este cliente (ex: Histórico de atrasos, contatos importantes...)"
                    />
                    <div className="flex justify-end mt-2">
                         <button 
                            onClick={() => handleSaveDetails(activeCompany)}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            Salvar Notas
                        </button>
                    </div>
                </div>

                {/* Timeline */}
                <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase mb-4 flex items-center gap-2">
                        <Activity size={16} /> Linha do Tempo
                    </h4>
                    <div className="space-y-4 border-l-2 border-slate-200 dark:border-slate-800 pl-4 ml-2">
                        {/* Always show Creation Entry */}
                         <div className="relative">
                            <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-400 dark:bg-emerald-600 ring-4 ring-white dark:ring-slate-900"></div>
                            <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">Empresa Cadastrada</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                                <Clock size={10} /> {new Date(activeCompany.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        
                        {getCompanyTimeline(activeCompany).length > 0 ? (
                             getCompanyTimeline(activeCompany).slice(0, 10).map((log) => (
                                <div key={log.id} className="relative">
                                    <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600 ring-4 ring-white dark:ring-slate-900"></div>
                                    <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">{log.action}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{log.details}</p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                                        <Clock size={10} /> {new Date(log.timestamp).toLocaleString()} • {log.user || 'System'}
                                    </p>
                                </div>
                             ))
                        ) : null}
                    </div>
                </div>

            </div>

             <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-white dark:bg-slate-900">
                <button onClick={() => setActiveCompany(null)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">Fechar</button>
             </div>

          </div>
         </div>
      )}
    </div>
  );
};

const UsersIcon = ({className, size}: {className?: string, size: number}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);

export default CompanyList;