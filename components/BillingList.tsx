import React, { useState } from 'react';
import { Invoice, InvoiceStatus, Company } from '../types';
import { UNIT_PRICE } from '../constants';
import { Plus, CheckCircle, AlertTriangle, Clock, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface BillingListProps {
  invoices: Invoice[];
  companies: Company[];
  onAddInvoice: (invoice: Omit<Invoice, 'id'>) => void;
  onUpdateStatus: (id: string, status: InvoiceStatus) => void;
}

type SortKey = 'competence' | 'companyName' | 'totalValue' | 'dueDate' | 'status';
interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

const BillingList: React.FC<BillingListProps> = ({ invoices, companies, onAddInvoice, onUpdateStatus }) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterCompany, setFilterCompany] = useState<string>('');
  const [filterCompetence, setFilterCompetence] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'competence', direction: 'desc' });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [competenceInput, setCompetenceInput] = useState(''); // Stores MM/YYYY
  const [employeeCount, setEmployeeCount] = useState<number>(0);

  // Helpers
  const formatCompetence = (val: string) => {
    return val
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1/$2')
      .substring(0, 7);
  };

  const convertInputToCompetence = (input: string) => {
    // MM/YYYY -> YYYY-MM
    const [month, year] = input.split('/');
    if (month && year) return `${year}-${month}`;
    return '';
  };

  const convertCompetenceToDisplay = (comp: string) => {
    // YYYY-MM -> MM/YYYY
    const [year, month] = comp.split('-');
    if (year && month) return `${month}/${year}`;
    return comp;
  };

  const formatDateToDDMMYYYY = (dateString: string) => {
    // Expects YYYY-MM-DD
    if (!dateString) return '-';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return dateString;
  };

  const getDueDate = (compInput: string) => {
    // Expects MM/YYYY
    if (compInput.length === 7) {
      const [month, year] = compInput.split('/');
      // Ensure valid numbers before creating date
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      if (m >= 1 && m <= 12 && y > 1900) {
        const lastDay = new Date(y, m, 0);
        return lastDay;
      }
    }
    return null;
  };

  // 1. Filtering
  const filteredInvoices = invoices.filter(inv => {
    const matchesStatus = filterStatus === 'ALL' ? true : inv.status === filterStatus;
    const matchesCompany = filterCompany ? inv.companyId === filterCompany : true;
    const matchesCompetence = filterCompetence 
      ? inv.competence === convertInputToCompetence(filterCompetence)
      : true;
    
    return matchesStatus && matchesCompany && matchesCompetence;
  });

  // 2. Sorting
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    const directionMult = sortConfig.direction === 'asc' ? 1 : -1;
    
    // String comparisons work for ISO Dates (dueDate, competence) and Names
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
      ? <ArrowUp size={14} className="text-indigo-600" /> 
      : <ArrowDown size={14} className="text-indigo-600" />;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const company = companies.find(c => c.id === selectedCompanyId);
    if (!company) return;

    // Strict Validation: Must be MM/YYYY where MM is 01-12
    const strictRegex = /^(0[1-9]|1[0-2])\/\d{4}$/;

    if (!strictRegex.test(competenceInput)) {
      alert("Competência inválida. O mês deve ser entre 01 e 12 e o formato MM/AAAA (ex: 01/2025).");
      return;
    }

    const [monthStr, yearStr] = competenceInput.split('/');
    const year = parseInt(yearStr, 10);

    if (year < 2000 || year > 2100) {
      alert("Ano fora do escopo permitido.");
      return;
    }

    const competence = convertInputToCompetence(competenceInput);
    const dueDateObj = getDueDate(competenceInput);
    
    if (!dueDateObj) {
      alert("Data de competência inválida.");
      return;
    }

    // Check if invoice already exists for this company/competence could be added here, but not requested.

    onAddInvoice({
      companyId: company.id,
      companyName: company.name,
      competence,
      dueDate: dueDateObj.toISOString().split('T')[0],
      employeeCount,
      unitValue: UNIT_PRICE,
      totalValue: employeeCount * UNIT_PRICE,
      status: InvoiceStatus.PENDING
    });
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedCompanyId('');
    setCompetenceInput('');
    setEmployeeCount(0);
  };

  const handleCompetenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCompetenceInput(formatCompetence(e.target.value));
  };
  
  const handleFilterCompetenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterCompetence(formatCompetence(e.target.value));
  };

  // Status Badge Helper
  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.PAID:
        return <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700"><CheckCircle size={12}/> Pago</span>;
      case InvoiceStatus.OVERDUE:
        return <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-700"><AlertTriangle size={12}/> Vencido</span>;
      default:
        return <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700"><Clock size={12}/> Pendente</span>;
    }
  };

  const calculatedDueDate = getDueDate(competenceInput);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Controle de Faturas</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={18} />
          Gerar Fatura
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
             <button 
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 text-sm rounded-md font-medium whitespace-nowrap transition-colors ${filterStatus === 'ALL' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Todas
            </button>
            <button 
              onClick={() => setFilterStatus(InvoiceStatus.PENDING)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium whitespace-nowrap transition-colors ${filterStatus === InvoiceStatus.PENDING ? 'bg-white text-amber-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Pendentes
            </button>
            <button 
              onClick={() => setFilterStatus(InvoiceStatus.PAID)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium whitespace-nowrap transition-colors ${filterStatus === InvoiceStatus.PAID ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Pagas
            </button>
            <button 
              onClick={() => setFilterStatus(InvoiceStatus.OVERDUE)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium whitespace-nowrap transition-colors ${filterStatus === InvoiceStatus.OVERDUE ? 'bg-white text-red-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Vencidas
            </button>
          </div>
          
          <div className="flex-1 w-full md:w-auto flex gap-2">
            <select
               value={filterCompany}
               onChange={(e) => setFilterCompany(e.target.value)}
               className="flex-1 md:max-w-xs p-2 text-sm bg-white text-black border border-slate-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Todas Empresas</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input 
              type="text" 
              placeholder="MM/AAAA"
              value={filterCompetence}
              onChange={handleFilterCompetenceChange}
              className="w-32 p-2 text-sm bg-white text-black border border-slate-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
            />
            {(filterCompany || filterCompetence) && (
              <button 
                onClick={() => { setFilterCompany(''); setFilterCompetence(''); }}
                className="text-xs text-slate-500 hover:text-slate-700 underline px-2"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th 
                  className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                  onClick={() => handleSort('competence')}
                >
                  <div className="flex items-center gap-1">
                    Competência {getSortIcon('competence')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                  onClick={() => handleSort('companyName')}
                >
                  <div className="flex items-center gap-1">
                    Empresa {getSortIcon('companyName')}
                  </div>
                </th>
                <th className="px-6 py-3 text-center">Vidas</th>
                <th 
                  className="px-6 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                  onClick={() => handleSort('totalValue')}
                >
                   <div className="flex items-center justify-end gap-1">
                    Valor Total {getSortIcon('totalValue')}
                  </div>
                </th>
                <th 
                   className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                   onClick={() => handleSort('dueDate')}
                >
                  <div className="flex items-center gap-1">
                    Vencimento {getSortIcon('dueDate')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status {getSortIcon('status')}
                  </div>
                </th>
                <th className="px-6 py-3 text-right">Alterar Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedInvoices.length > 0 ? (
                sortedInvoices.map((inv) => (
                  <tr key={inv.id} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {convertCompetenceToDisplay(inv.competence)}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {inv.companyName}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-700">
                      {inv.employeeCount}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inv.totalValue)}
                      <div className="text-xs text-slate-400 font-normal">({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inv.unitValue)}/uni)</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDateToDDMMYYYY(inv.dueDate)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(inv.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <select
                        value={inv.status}
                        onChange={(e) => onUpdateStatus(inv.id, e.target.value as InvoiceStatus)}
                        className={`text-xs py-1 px-2 rounded border focus:ring-2 outline-none cursor-pointer ${
                          inv.status === InvoiceStatus.PAID 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 focus:ring-emerald-500' 
                            : inv.status === InvoiceStatus.OVERDUE 
                              ? 'bg-red-50 text-red-800 border-red-200 focus:ring-red-500'
                              : 'bg-white text-slate-700 border-slate-300 focus:ring-indigo-500'
                        }`}
                      >
                        <option value={InvoiceStatus.PENDING}>Pendente</option>
                        <option value={InvoiceStatus.PAID}>Pago</option>
                        <option value={InvoiceStatus.OVERDUE}>Vencido</option>
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Nenhuma fatura encontrada.
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
              <h3 className="text-xl font-bold text-slate-800">Lançar Fatura</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
                <select 
                  required 
                  value={selectedCompanyId} 
                  onChange={e => setSelectedCompanyId(e.target.value)}
                  className="w-full p-2 bg-white text-black border border-slate-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Selecione...</option>
                  {companies.filter(c => c.status === 'Ativo').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Competência</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="MM/AAAA"
                    value={competenceInput} 
                    onChange={handleCompetenceChange}
                    className="w-full p-2 bg-white text-black border border-slate-300 rounded focus:ring-indigo-500 focus:border-indigo-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vencimento</label>
                  <input 
                    readOnly
                    type="text" 
                    value={calculatedDueDate ? formatDateToDDMMYYYY(calculatedDueDate.toISOString().split('T')[0]) : '-'}
                    className="w-full p-2 bg-slate-100 text-slate-600 border border-slate-300 rounded cursor-not-allowed" 
                  />
                  <span className="text-xs text-slate-500">Automático (Último dia)</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Qtd. Funcionários</label>
                <input 
                  required 
                  type="number" 
                  min="1"
                  value={employeeCount} 
                  onChange={e => setEmployeeCount(Number(e.target.value))}
                  className="w-full p-2 bg-white text-black border border-slate-300 rounded focus:ring-indigo-500 focus:border-indigo-500" 
                />
              </div>
              <div className="bg-slate-50 p-3 rounded text-sm text-slate-600 flex justify-between">
                <span>Total Estimado:</span>
                <span className="font-bold text-slate-900">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(employeeCount * UNIT_PRICE)}
                </span>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded shadow-sm">Lançar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingList;