import React from 'react';
import { Company, Invoice, InvoiceStatus, SystemLog } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, Users, Building2, AlertCircle, TrendingUp, Activity, FileText } from 'lucide-react';

interface DashboardProps {
  companies: Company[];
  invoices: Invoice[];
  logs: SystemLog[];
  onQuickAction: (view: any, action: string) => void;
  theme: 'light' | 'dark';
}

const Dashboard: React.FC<DashboardProps> = ({ companies, invoices, logs, onQuickAction, theme }) => {

  // --- Calculations ---

  const totalRevenue = invoices
    .filter(i => i.status === InvoiceStatus.PAID)
    .reduce((acc, curr) => acc + curr.totalValue, 0);
  
  const pendingRevenue = invoices
    .filter(i => i.status === InvoiceStatus.PENDING || i.status === InvoiceStatus.OVERDUE)
    .reduce((acc, curr) => acc + curr.totalValue, 0);

  const activeCompanies = companies.filter(c => c.status === 'Ativo').length;
  
  // Total Employees (Directly from Companies now)
  const totalEmployees = companies
    .filter(c => c.status === 'Ativo')
    .reduce((acc, curr) => acc + (curr.employeeCount || 0), 0);

  // Chart Data
  const chartDataRaw = invoices.reduce((acc: any, curr) => {
    const month = curr.competence;
    if (!acc[month]) acc[month] = { name: month, Recebido: 0, Pendente: 0 };
    if (curr.status === InvoiceStatus.PAID) acc[month].Recebido += curr.totalValue;
    else acc[month].Pendente += curr.totalValue;
    return acc;
  }, {});
  
  const chartData = Object.values(chartDataRaw)
    .sort((a: any, b: any) => a.name.localeCompare(b.name))
    .map((item: any) => {
      const [year, month] = item.name.split('-');
      return { ...item, name: `${month}/${year}` };
    });

  // --- Smart Alerts Logic ---

  const alerts: { title: string, type: 'danger' | 'warning' | 'info' }[] = [];
  
  // 1. Overdue > 45 Days
  const fortyFiveDaysAgo = new Date();
  fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);
  const deepDefaultCompanies = new Set(
    invoices
      .filter(i => i.status === InvoiceStatus.OVERDUE && new Date(i.dueDate) < fortyFiveDaysAgo)
      .map(i => i.companyName)
  );

  if (deepDefaultCompanies.size > 0) {
    alerts.push({
      title: `${deepDefaultCompanies.size} empresas estão há mais de 45 dias inadimplentes.`,
      type: 'danger'
    });
  }

  // 2. High Value Due Today
  const todayStr = new Date().toISOString().split('T')[0];
  const dueTodayCount = invoices.filter(i => i.dueDate === todayStr && i.status === InvoiceStatus.PENDING).length;
  if (dueTodayCount > 0) {
    alerts.push({
      title: `${dueTodayCount} faturas vencem hoje. Fique atento aos recebimentos.`,
      type: 'info'
    });
  }

  // --- Monitoring: Top Debtors ---
  const debtByCompany: Record<string, number> = {};
  invoices.filter(i => i.status === InvoiceStatus.OVERDUE).forEach(i => {
      debtByCompany[i.companyName] = (debtByCompany[i.companyName] || 0) + i.totalValue;
  });
  const topDebtors = Object.entries(debtByCompany)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  // --- Chart Styles based on Theme ---
  const isDark = theme === 'dark';
  const axisColor = isDark ? '#cbd5e1' : '#475569'; // slate-300 : slate-600
  const gridColor = isDark ? '#334155' : '#e2e8f0'; // slate-700 : slate-200
  const tooltipStyle = isDark 
    ? { backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' } 
    : { backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a' };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Painel de Controle</h2>
        <span className="text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm border border-slate-200 dark:border-slate-700">
          Última atualização: {new Date().toLocaleTimeString()}
        </span>
      </div>

      {/* Smart Alerts Section */}
      {alerts.length > 0 && (
        <div className="grid gap-3">
          {alerts.map((alert, idx) => (
            <div key={idx} className={`p-3 rounded-lg border flex items-center gap-3 shadow-sm ${
              alert.type === 'danger' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300' :
              alert.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300' :
              'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
            }`}>
              <AlertCircle size={20} />
              <span className="font-medium text-sm">{alert.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Receita Confirmada</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
              </p>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400"><DollarSign size={24} /></div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">A Receber / Vencido</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendingRevenue)}
              </p>
            </div>
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-600 dark:text-amber-400"><AlertCircle size={24} /></div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Empresas Ativas</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{activeCompanies}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400"><Building2 size={24} /></div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Funcionários</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{totalEmployees}</p>
            </div>
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400"><Users size={24} /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Faturamento por Competência</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} className="transition-colors" />
                <XAxis dataKey="name" stroke={axisColor} />
                <YAxis stroke={axisColor} />
                <Tooltip 
                  formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))} 
                  contentStyle={tooltipStyle}
                />
                <Legend />
                <Bar dataKey="Recebido" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pendente" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monitoring Stats */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="text-indigo-600 dark:text-indigo-400" size={20} />
            Monitoramento
          </h3>
          <div className="space-y-6 flex-1 overflow-y-auto">
            
            {/* Avg Employees */}
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Média de Funcionários/Empresa</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                {activeCompanies > 0 ? Math.round(totalEmployees / activeCompanies) : 0}
              </p>
            </div>

            {/* Top Debtors */}
            {topDebtors.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 font-semibold text-red-500">Top Inadimplentes</p>
                  <div className="space-y-3">
                    {topDebtors.map(([name, value], idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span className="text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{name}</span>
                          <span className="font-medium text-red-600 dark:text-red-400">
                             {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                          </span>
                        </div>
                      ))
                    }
                  </div>
                </div>
            )}
            
            {/* Growth */}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Empresas em Crescimento</p>
              <div className="space-y-3">
                {companies
                  .sort((a, b) => b.employeeCount - a.employeeCount)
                  .slice(0, 3)
                  .map((comp, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{comp.name}</span>
                      <span className="font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full text-xs">
                        {comp.employeeCount} fun.
                      </span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <FileText size={20} className="text-slate-500 dark:text-slate-400" />
            Logs Recentes
          </h3>
          <button onClick={() => onQuickAction('SETTINGS', '')} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
            Ver todos
          </button>
        </div>
        <div className="max-h-60 overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0">
              <tr>
                <th className="px-6 py-2">Horário</th>
                <th className="px-6 py-2">Ação</th>
                <th className="px-6 py-2">Detalhes</th>
                <th className="px-6 py-2">Usuário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {logs.length > 0 ? (
                logs.slice(0, 10).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                        log.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800' :
                        log.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800' :
                        log.type === 'error' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800' :
                        'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-700 dark:text-slate-300 max-w-xs truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="px-6 py-3 text-slate-500 dark:text-slate-400">
                      {log.user || 'Sistema'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    Nenhum registro de atividade recente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;