import React, { useState, useEffect } from 'react';
import { Invoice, InvoiceStatus, Company } from '../types';
import { Plus, CheckCircle, AlertTriangle, Clock, ArrowUpDown, ArrowUp, ArrowDown, Trash2, Download, Printer, Zap, Calendar, Users, FileText, Eye, X } from 'lucide-react';

interface BillingListProps {
  invoices: Invoice[];
  companies: Company[];
  unitPrice: number; // Dynamic price
  onAddInvoice: (invoice: Omit<Invoice, 'id'>) => void;
  onUpdateStatus: (id: string, status: InvoiceStatus) => void;
  onDeleteInvoice: (id: string) => void;
  onUpdateCompany: (id: string, updates: Partial<Company>) => void; // For batch edit
  pendingAction?: string | null;
  clearPendingAction?: () => void;
}

type SortKey = 'competence' | 'companyName' | 'totalValue' | 'dueDate' | 'status';
interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

interface BatchSortConfig {
    key: 'name' | 'employeeCount';
    direction: 'asc' | 'desc';
}

const BillingList: React.FC<BillingListProps> = ({ invoices, companies, unitPrice, onAddInvoice, onUpdateStatus, onDeleteInvoice, onUpdateCompany, pendingAction, clearPendingAction }) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterCompany, setFilterCompany] = useState<string>('');
  const [filterCompetence, setFilterCompetence] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'competence', direction: 'desc' });
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [viewNoteId, setViewNoteId] = useState<string | null>(null);

  // Manual Form State
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [referenceDateInput, setReferenceDateInput] = useState(''); // YYYY-MM-DD
  const [manualDueDate, setManualDueDate] = useState(''); // YYYY-MM-DD
  const [invoiceNotes, setInvoiceNotes] = useState('');

  // Batch Form State
  const [batchReferenceDate, setBatchReferenceDate] = useState('');
  const [batchDueDate, setBatchDueDate] = useState('');
  const [batchEmployeeCounts, setBatchEmployeeCounts] = useState<{[key: string]: number}>({});
  const [batchSortConfig, setBatchSortConfig] = useState<BatchSortConfig>({ key: 'name', direction: 'asc' });

  // Handle Quick Action
  useEffect(() => {
    if (pendingAction === 'CREATE') {
      setIsModalOpen(true);
      if (clearPendingAction) clearPendingAction();
    }
  }, [pendingAction, clearPendingAction]);

  // Init Batch Counts
  useEffect(() => {
    if (isBatchModalOpen) {
      const counts: any = {};
      companies.filter(c => c.status === 'Ativo').forEach(c => {
        counts[c.id] = c.employeeCount;
      });
      setBatchEmployeeCounts(counts);
    }
  }, [isBatchModalOpen, companies]);

  // Helpers
  const convertDateToCompetence = (dateStr: string) => {
    // YYYY-MM -> YYYY-MM
    if (!dateStr) return '';
    const [year, month] = dateStr.split('-');
    return `${year}-${month}`;
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

  // Safe date math to avoid timezone issues
  const addDaysToDate = (dateStr: string, days: number): string => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    // Month is 0-indexed in JS Date, day is 1-indexed.
    // However, to do math, we can rely on Date auto-correction
    const date = new Date(y, m - 1, d + days);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get unique competences for dropdown
  const uniqueCompetences = Array.from(new Set(invoices.map(i => i.competence))).sort().reverse();

  // 1. Filtering
  const filteredInvoices = invoices.filter(inv => {
    const matchesStatus = filterStatus === 'ALL' ? true : inv.status === filterStatus;
    const matchesCompany = filterCompany ? inv.companyId === filterCompany : true;
    const matchesCompetence = filterCompetence ? inv.competence === filterCompetence : true;
    
    return matchesStatus && matchesCompany && matchesCompetence;
  });

  // 2. Sorting
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    const directionMult = sortConfig.direction === 'asc' ? 1 : -1;
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
      ? <ArrowUp size={14} className="text-indigo-600 dark:text-indigo-400" /> 
      : <ArrowDown size={14} className="text-indigo-600 dark:text-indigo-400" />;
  };

  // --- Manual Creation ---
  
  const handleReferenceDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setReferenceDateInput(date);
    // Only auto-fill due date if it's empty to respect user edit
    if (date && !manualDueDate) {
      setManualDueDate(addDaysToDate(date, 30));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const company = companies.find(c => c.id === selectedCompanyId);
    if (!company) return;
    if (!referenceDateInput || !manualDueDate) {
      alert("Datas inválidas.");
      return;
    }

    const competence = convertDateToCompetence(referenceDateInput);
    const count = company.employeeCount;

    onAddInvoice({
      companyId: company.id,
      companyName: company.name,
      competence,
      dueDate: manualDueDate,
      employeeCount: count,
      unitValue: unitPrice,
      totalValue: count * unitPrice,
      status: InvoiceStatus.PENDING,
      notes: invoiceNotes
    });
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedCompanyId('');
    setReferenceDateInput('');
    setManualDueDate('');
    setInvoiceNotes('');
  };

  // --- Batch Creation ---

  const handleBatchReferenceDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setBatchReferenceDate(date);
    if (date) {
      setBatchDueDate(addDaysToDate(date, 30));
    } else {
      setBatchDueDate('');
    }
  };

  // Batch Sorting
  const sortedBatchCompanies = [...companies.filter(c => c.status === 'Ativo')].sort((a, b) => {
      const mult = batchSortConfig.direction === 'asc' ? 1 : -1;
      if (batchSortConfig.key === 'name') {
          return a.name.localeCompare(b.name) * mult;
      } else {
          return (a.employeeCount - b.employeeCount) * mult;
      }
  });

  const toggleBatchSort = (key: 'name' | 'employeeCount') => {
      setBatchSortConfig(curr => ({
          key,
          direction: curr.key === key && curr.direction === 'asc' ? 'desc' : 'asc'
      }));
  }

  const handleBatchSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!batchReferenceDate || !batchDueDate) {
          alert("Por favor selecione a data de referência.");
          return;
      }

      const competence = convertDateToCompetence(batchReferenceDate);
      const activeCompanies = companies.filter(c => c.status === 'Ativo');
      
      if (activeCompanies.length === 0) {
          alert("Nenhuma empresa ativa encontrada.");
          return;
      }

      // Process Updates and Creations
      activeCompanies.forEach(company => {
          const currentCount = company.employeeCount;
          const newCount = batchEmployeeCounts[company.id];

          // 1. Update company if count changed
          if (newCount !== undefined && newCount !== currentCount) {
              onUpdateCompany(company.id, { employeeCount: newCount });
          }

          // 2. Generate Invoice using NEW count
          const finalCount = newCount !== undefined ? newCount : currentCount;

          onAddInvoice({
              companyId: company.id,
              companyName: company.name,
              competence,
              dueDate: batchDueDate,
              employeeCount: finalCount,
              unitValue: unitPrice,
              totalValue: finalCount * unitPrice,
              status: InvoiceStatus.PENDING
          });
      });

      alert(`${activeCompanies.length} faturas geradas com sucesso!`);
      setIsBatchModalOpen(false);
      setBatchReferenceDate('');
      setBatchDueDate('');
  };

  // Export Mock
  const handleExport = (type: 'CSV' | 'PDF') => {
      if (type === 'PDF') {
          window.print();
      } else {
          const csvContent = "data:text/csv;charset=utf-8," 
              + "Competencia,Empresa,Funcionarios,Valor,Vencimento,Status,Obs\n"
              + invoices.map(i => `${convertCompetenceToDisplay(i.competence)},${i.companyName},${i.employeeCount},${i.totalValue},${i.dueDate},${i.status},${i.notes || ''}`).join("\n");
          const encodedUri = encodeURI(csvContent);
          const link = document.createElement("a");
          link.setAttribute("href", encodedUri as string);
          link.setAttribute("download", "faturas.csv");
          document.body.appendChild(link);
          link.click();
      }
  };

  // Status Badge
  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.PAID:
        return <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"><CheckCircle size={12}/> Pago</span>;
      case InvoiceStatus.OVERDUE:
        return <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><AlertTriangle size={12}/> Vencido</span>;
      default:
        return <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><Clock size={12}/> Pendente</span>;
    }
  };

  const confirmDelete = (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta fatura?")) {
      onDeleteInvoice(id);
    }
  };

  const inputClass = "w-full p-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded focus:ring-indigo-500 outline-none";
  const selectClass = "p-2 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded focus:ring-indigo-500 focus:border-indigo-500 outline-none";

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Controle de Faturas</h2>
        <div className="flex gap-2">
            <button 
                onClick={() => setIsBatchModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm text-sm"
            >
                <Zap size={16} />
                Gerar Lote Mensal
            </button>
            <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm text-sm"
            >
            <Plus size={16} />
            Avulso
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        {/* Filters */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
             <button 
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 text-sm rounded-md font-medium whitespace-nowrap transition-colors ${filterStatus === 'ALL' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              Todas
            </button>
            <button 
              onClick={() => setFilterStatus(InvoiceStatus.PENDING)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium whitespace-nowrap transition-colors ${filterStatus === InvoiceStatus.PENDING ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              Pendentes
            </button>
            <button 
              onClick={() => setFilterStatus(InvoiceStatus.PAID)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium whitespace-nowrap transition-colors ${filterStatus === InvoiceStatus.PAID ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              Pagas
            </button>
            <button 
              onClick={() => setFilterStatus(InvoiceStatus.OVERDUE)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium whitespace-nowrap transition-colors ${filterStatus === InvoiceStatus.OVERDUE ? 'bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              Vencidas
            </button>
          </div>
          
          <div className="flex-1 w-full md:w-auto flex gap-2">
            <select
               value={filterCompany}
               onChange={(e) => setFilterCompany(e.target.value)}
               className={`flex-1 md:max-w-xs ${selectClass}`}
            >
              <option value="">Todas Empresas</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            
            <select 
              value={filterCompetence}
              onChange={(e) => setFilterCompetence(e.target.value)}
              className={`w-36 ${selectClass}`}
            >
                <option value="">Competência</option>
                {uniqueCompetences.map(comp => (
                    <option key={comp} value={comp}>{convertCompetenceToDisplay(comp)}</option>
                ))}
            </select>
            
            <div className="flex gap-1">
                <button onClick={() => handleExport('CSV')} title="Exportar CSV" className="p-2 text-slate-500 hover:text-indigo-600 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded transition-colors">
                    <Download size={16} />
                </button>
                <button onClick={() => handleExport('PDF')} title="Imprimir" className="p-2 text-slate-500 hover:text-indigo-600 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded transition-colors">
                    <Printer size={16} />
                </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th 
                  className="px-6 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors select-none group"
                  onClick={() => handleSort('competence')}
                >
                  <div className="flex items-center gap-1">
                    Competência {getSortIcon('competence')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors select-none group"
                  onClick={() => handleSort('companyName')}
                >
                  <div className="flex items-center gap-1">
                    Empresa {getSortIcon('companyName')}
                  </div>
                </th>
                <th className="px-6 py-3 text-center">Funcionários</th>
                <th 
                  className="px-6 py-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors select-none group"
                  onClick={() => handleSort('totalValue')}
                >
                   <div className="flex items-center justify-end gap-1">
                    Valor Total {getSortIcon('totalValue')}
                  </div>
                </th>
                <th 
                   className="px-6 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors select-none group"
                   onClick={() => handleSort('dueDate')}
                >
                  <div className="flex items-center gap-1">
                    Vencimento {getSortIcon('dueDate')}
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
              {sortedInvoices.length > 0 ? (
                sortedInvoices.map((inv) => (
                  <tr key={inv.id} className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      {convertCompetenceToDisplay(inv.competence)}
                      {inv.notes && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 max-w-[80px] truncate">{inv.notes}</span>
                            <button onClick={() => setViewNoteId(inv.id)} className="text-slate-400 hover:text-indigo-500"><Eye size={12} /></button>
                          </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                      {inv.companyName}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-700 dark:text-slate-300">
                      {inv.employeeCount}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inv.totalValue)}
                      <div className="text-xs text-slate-400 font-normal">({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inv.unitValue)}/uni)</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {formatDateToDDMMYYYY(inv.dueDate)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(inv.status)}
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <select
                        value={inv.status}
                        onChange={(e) => onUpdateStatus(inv.id, e.target.value as InvoiceStatus)}
                        className={`text-xs py-1 px-2 rounded border focus:ring-2 outline-none cursor-pointer ${
                          inv.status === InvoiceStatus.PAID 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 focus:ring-emerald-500' 
                            : inv.status === InvoiceStatus.OVERDUE 
                              ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 focus:ring-red-500'
                              : 'bg-white text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 focus:ring-indigo-500'
                        }`}
                      >
                        <option value={InvoiceStatus.PENDING}>Pendente</option>
                        <option value={InvoiceStatus.PAID}>Pago</option>
                        <option value={InvoiceStatus.OVERDUE}>Vencido</option>
                      </select>
                      <button 
                        onClick={() => confirmDelete(inv.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="Excluir fatura"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    Nenhuma fatura encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Lançar Fatura Avulsa</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Empresa</label>
                <select 
                  required 
                  value={selectedCompanyId} 
                  onChange={e => setSelectedCompanyId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Selecione...</option>
                  <optgroup label="Ativas">
                    {companies.filter(c => c.status === 'Ativo').map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.employeeCount} func.)</option>
                    ))}
                  </optgroup>
                  <optgroup label="Inativas / Outras">
                    {companies.filter(c => c.status !== 'Ativo').map(c => (
                        <option key={c.id} value={c.id}>{c.name} - [{c.status}]</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data de Referência</label>
                  <input 
                    required 
                    type="date"
                    value={referenceDateInput} 
                    onChange={handleReferenceDateChange}
                    className={inputClass}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Define competência: {convertDateToCompetence(referenceDateInput) || '--'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vencimento</label>
                  <input 
                    required
                    type="date" 
                    value={manualDueDate}
                    onChange={(e) => setManualDueDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              
              <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notas Internas</label>
                  <textarea 
                    value={invoiceNotes}
                    onChange={(e) => setInvoiceNotes(e.target.value)}
                    rows={2}
                    placeholder="Obs. sobre a fatura..."
                    className={inputClass}
                  />
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded text-sm text-indigo-800 dark:text-indigo-300 flex items-start gap-2">
                 <Zap size={16} className="mt-0.5 shrink-0" />
                 <span>O valor será calculado automaticamente baseado no nº atual de funcionários cadastrados na empresa (x R$ {unitPrice}).</span>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded shadow-sm">Lançar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Generation Modal */}
      {isBatchModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-emerald-50 dark:bg-emerald-900/10">
              <h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                  <Zap size={20} />
                  Gerar Lote Mensal
              </h3>
            </div>
            
            <form onSubmit={handleBatchSubmit} className="flex-1 flex flex-col overflow-hidden">
               <div className="p-6 space-y-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data de Referência</label>
                      <input 
                        required 
                        type="date" 
                        value={batchReferenceDate} 
                        onChange={handleBatchReferenceDateChange}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vencimento</label>
                      <input 
                        required
                        type="date" 
                        value={batchDueDate}
                        onChange={(e) => setBatchDueDate(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900">
                   <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                       <Users size={16} /> 
                       Confirme os Funcionários Ativos
                   </h4>
                   <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                       <table className="w-full text-sm">
                           <thead className="bg-slate-50 dark:bg-slate-950 text-xs text-slate-500 dark:text-slate-400 uppercase text-left sticky top-0">
                               <tr>
                                   <th className="px-4 py-2 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200" onClick={() => toggleBatchSort('name')}>
                                       <div className="flex items-center gap-1">Empresa {batchSortConfig.key === 'name' && (batchSortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}</div>
                                   </th>
                                   <th className="px-4 py-2 w-32 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200" onClick={() => toggleBatchSort('employeeCount')}>
                                       <div className="flex items-center gap-1">Funcionários {batchSortConfig.key === 'employeeCount' && (batchSortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}</div>
                                   </th>
                                   <th className="px-4 py-2 w-32 text-right">Valor Est.</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                               {sortedBatchCompanies.map(c => (
                                   <tr key={c.id} className="bg-white dark:bg-slate-900">
                                       <td className="px-4 py-3 text-slate-800 dark:text-slate-200 font-medium">
                                           {c.name}
                                       </td>
                                       <td className="px-4 py-3">
                                           <input 
                                              type="number"
                                              min="0"
                                              value={batchEmployeeCounts[c.id] ?? c.employeeCount}
                                              onChange={(e) => setBatchEmployeeCounts(prev => ({...prev, [c.id]: Number(e.target.value)}))}
                                              className="w-full p-1 border border-slate-300 dark:border-slate-700 rounded text-center bg-white text-slate-900 dark:bg-slate-950 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                                           />
                                       </td>
                                       <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                                           {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((batchEmployeeCounts[c.id] ?? c.employeeCount) * unitPrice)}
                                       </td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
               </div>
              
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900">
                <button type="button" onClick={() => setIsBatchModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded shadow-sm">
                    Confirmar e Gerar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Note View Modal */}
      {viewNoteId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-sm p-6 border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 dark:text-white">Notas da Fatura</h3>
                    <button onClick={() => setViewNoteId(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded border border-slate-100 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {invoices.find(i => i.id === viewNoteId)?.notes}
                </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default BillingList;