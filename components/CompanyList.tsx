import React, { useState } from 'react';
import { Company, CompanyStatus } from '../types';
import { Plus, Search, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react';

interface CompanyListProps {
  companies: Company[];
  onAddCompany: (c: Omit<Company, 'id' | 'createdAt'>) => void;
  onUpdateStatus: (id: string, status: CompanyStatus) => void;
}

type SortKey = 'name' | 'status' | 'createdAt';
interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

const CompanyList: React.FC<CompanyListProps> = ({ companies, onAddCompany, onUpdateStatus }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Company Form State
  const [newName, setNewName] = useState('');
  const [newCnpj, setNewCnpj] = useState('');
  const [newContact, setNewContact] = useState('');

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
    
    if (a[sortConfig.key] < b[sortConfig.key]) return -1 * directionMult;
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
      ? <ArrowUp size={14} className="text-blue-600" /> 
      : <ArrowDown size={14} className="text-blue-600" />;
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
      status: CompanyStatus.ACTIVE
    });
    setIsModalOpen(false);
    // Reset form
    setNewName('');
    setNewCnpj('');
    setNewContact('');
  };

  const getStatusBadgeStyles = (status: CompanyStatus) => {
    switch (status) {
      case CompanyStatus.ACTIVE:
        return 'bg-green-100 text-green-700';
      case CompanyStatus.INACTIVE:
        return 'bg-slate-100 text-slate-600';
      case CompanyStatus.BLOCKED:
        return 'bg-red-100 text-red-700';
      case CompanyStatus.CANCELLED:
        return 'bg-orange-100 text-orange-800';
      case CompanyStatus.UNUSED:
        return 'bg-gray-200 text-gray-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getSelectStyles = (status: CompanyStatus) => {
    switch (status) {
      case CompanyStatus.ACTIVE:
        return 'bg-green-50 text-green-800 border-green-200 focus:ring-green-500';
      case CompanyStatus.BLOCKED:
        return 'bg-red-50 text-red-800 border-red-200 focus:ring-red-500';
      case CompanyStatus.CANCELLED:
        return 'bg-orange-50 text-orange-800 border-orange-200 focus:ring-orange-500';
      case CompanyStatus.UNUSED:
        return 'bg-gray-100 text-gray-800 border-gray-200 focus:ring-gray-500';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-300 focus:ring-slate-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Empresas Clientes</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={18} />
          Nova Empresa
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou CNPJ..." 
              className="w-full pl-10 pr-4 py-2 bg-white text-black border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={18} className="text-slate-500 hidden sm:block" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:w-auto p-2 bg-white text-slate-700 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
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
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th 
                  className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Empresa {getSortIcon('name')}
                  </div>
                </th>
                <th className="px-6 py-3">Contato</th>
                <th 
                  className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status {getSortIcon('status')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-1">
                    Data Cadastro {getSortIcon('createdAt')}
                  </div>
                </th>
                <th className="px-6 py-3 text-right">Alterar Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedCompanies.length > 0 ? (
                sortedCompanies.map((company) => (
                  <tr key={company.id} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div>{company.name}</div>
                      <div className="text-slate-500 text-xs font-normal">{company.cnpj}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      <div>{company.contactName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeStyles(company.status)}`}>
                        {company.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(company.createdAt).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <select
                        value={company.status}
                        onChange={(e) => onUpdateStatus(company.id, e.target.value as CompanyStatus)}
                        className={`text-xs py-1 px-2 rounded border focus:ring-2 outline-none cursor-pointer ${getSelectStyles(company.status)}`}
                      >
                        <option value={CompanyStatus.ACTIVE}>Ativo</option>
                        <option value={CompanyStatus.BLOCKED}>Bloqueado</option>
                        <option value={CompanyStatus.CANCELLED}>Cancelado</option>
                        <option value={CompanyStatus.UNUSED}>Não utilizado</option>
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Nenhuma empresa encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-800">Nova Empresa</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Razão Social</label>
                <input required value={newName} onChange={e => setNewName(e.target.value)} type="text" className="w-full p-2 bg-white text-black border border-slate-300 rounded focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ</label>
                <input required value={newCnpj} onChange={handleCnpjChange} type="text" className="w-full p-2 bg-white text-black border border-slate-300 rounded focus:ring-blue-500 focus:border-blue-500" placeholder="00.000.000/0000-00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Contato</label>
                <input required value={newContact} onChange={e => setNewContact(e.target.value)} type="text" className="w-full p-2 bg-white text-black border border-slate-300 rounded focus:ring-blue-500 focus:border-blue-500" />
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded shadow-sm">Cadastrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyList;