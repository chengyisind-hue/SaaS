import React from 'react';
import { Company, Invoice, InvoiceStatus, CompanyStatus } from '../types';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, AlertOctagon, Download } from 'lucide-react';

interface ReportsProps {
  companies: Company[];
  invoices: Invoice[];
  theme: 'light' | 'dark';
}

const Reports: React.FC<ReportsProps> = ({ companies, invoices, theme }) => {
  
  // --- Metrics Calculation ---

  const totalInvoices = invoices.length;
  const totalRevenue = invoices.reduce((acc, curr) => acc + curr.totalValue, 0);
  const averageTicket = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

  const activeCompanies = companies.filter(c => c.status === CompanyStatus.ACTIVE).length;
  const churnedCompanies = companies.filter(c => 
    c.status === CompanyStatus.CANCELLED || c.status === CompanyStatus.BLOCKED
  ).length;
  const churnRate = companies.length > 0 ? (churnedCompanies / companies.length) * 100 : 0;

  const overdueInvoices = invoices.filter(i => i.status === InvoiceStatus.OVERDUE);
  const delinquencyRate = totalInvoices > 0 ? (overdueInvoices.length / totalInvoices) * 100 : 0;
  const delinquencyAmount = overdueInvoices.reduce((acc, curr) => acc + curr.totalValue, 0);

  // --- Charts Data ---

  // Status Distribution
  const statusDataRaw = companies.reduce((acc: any, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {});
  
  const statusData = Object.keys(statusDataRaw).map(key => ({
    name: key,
    value: statusDataRaw[key]
  }));

  const COLORS = ['#10b981', '#64748b', '#ef4444', '#f97316', '#94a3b8'];

  // Top 5 Revenue Companies
  const revenueByCompany = invoices.reduce((acc: any, curr) => {
    acc[curr.companyName] = (acc[curr.companyName] || 0) + curr.totalValue;
    return acc;
  }, {});

  const topCompaniesData = Object.keys(revenueByCompany)
    .map(key => ({ name: key, value: revenueByCompany[key] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // --- Chart Styles based on Theme ---
  const isDark = theme === 'dark';
  const axisColor = isDark ? '#cbd5e1' : '#475569'; // slate-300 : slate-600
  const gridColor = isDark ? '#334155' : '#e2e8f0'; // slate-700 : slate-200
  const tooltipStyle = isDark 
    ? { backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' } 
    : { backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Relatórios Gerenciais</h2>
        <div className="flex gap-2">
            <button onClick={() => window.print()} className="text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 px-3 py-1 rounded shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                <Download size={14} /> Exportar
            </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Ticket Médio</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(averageTicket)}
              </h3>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <DollarSign size={20} />
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Valor médio por fatura emitida</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Churn Rate</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                {churnRate.toFixed(1)}%
              </h3>
            </div>
            <div className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
              <TrendingDown size={20} />
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Clientes cancelados/bloqueados</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Inadimplência</p>
              <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {delinquencyRate.toFixed(1)}%
              </h3>
            </div>
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
              <AlertOctagon size={20} />
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(delinquencyAmount)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">LTV Estimado</p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                R$ 1.250
              </h3>
            </div>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <TrendingUp size={20} />
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Valor vitalício (Mockado)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Distribuição da Base de Clientes</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Revenue */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Top 5 Empresas (Receita Total)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={topCompaniesData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 12, fill: axisColor}} />
                <Tooltip 
                    formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))} 
                    contentStyle={tooltipStyle}
                />
                <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;