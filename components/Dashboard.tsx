import React, { useState } from 'react';
import { Company, Invoice, InvoiceStatus } from '../types';
import { generateFinancialReport } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, Users, Building2, AlertCircle, Sparkles, Loader2, AlertTriangle } from 'lucide-react';

interface DashboardProps {
  companies: Company[];
  invoices: Invoice[];
}

const Dashboard: React.FC<DashboardProps> = ({ companies, invoices }) => {
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // Calculate Stats
  const totalRevenue = invoices
    .filter(i => i.status === InvoiceStatus.PAID)
    .reduce((acc, curr) => acc + curr.totalValue, 0);
  
  const pendingRevenue = invoices
    .filter(i => i.status === InvoiceStatus.PENDING || i.status === InvoiceStatus.OVERDUE)
    .reduce((acc, curr) => acc + curr.totalValue, 0);

  const activeCompanies = companies.filter(c => c.status === 'Ativo').length;
  
  // Estimate total managed employees based on latest invoice for each company
  const latestInvoicesMap = new Map();
  invoices.forEach(inv => {
    if (!latestInvoicesMap.has(inv.companyId) || inv.competence > latestInvoicesMap.get(inv.companyId).competence) {
      latestInvoicesMap.set(inv.companyId, inv);
    }
  });
  let totalEmployees = 0;
  latestInvoicesMap.forEach(inv => totalEmployees += inv.employeeCount);

  // Prepare Chart Data (Revenue by Month)
  const chartDataRaw = invoices.reduce((acc: any, curr) => {
    const month = curr.competence;
    if (!acc[month]) acc[month] = { name: month, Recebido: 0, Pendente: 0 };
    
    if (curr.status === InvoiceStatus.PAID) {
      acc[month].Recebido += curr.totalValue;
    } else {
      acc[month].Pendente += curr.totalValue;
    }
    return acc;
  }, {});
  
  // Convert map to array and format name from YYYY-MM to MM/YYYY
  const chartData = Object.values(chartDataRaw)
    .sort((a: any, b: any) => a.name.localeCompare(b.name))
    .map((item: any) => {
      const [year, month] = item.name.split('-');
      return {
        ...item,
        name: `${month}/${year}` // Format for display
      };
    });

  const handleGenerateInsight = async () => {
    setIsLoadingAi(true);
    const report = await generateFinancialReport(companies, invoices);
    setAiAnalysis(report);
    setIsLoadingAi(false);
  };

  const isError = aiAnalysis.startsWith("Erro:");

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Visão Geral</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Receita Confirmada</p>
              <p className="text-2xl font-bold text-emerald-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
              </p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
              <DollarSign size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">A Receber / Vencido</p>
              <p className="text-2xl font-bold text-amber-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendingRevenue)}
              </p>
            </div>
            <div className="p-3 bg-amber-100 rounded-full text-amber-600">
              <AlertCircle size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Empresas Ativas</p>
              <p className="text-2xl font-bold text-blue-600">{activeCompanies}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
              <Building2 size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Vidas (Funcionários)</p>
              <p className="text-2xl font-bold text-indigo-600">{totalEmployees}</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
              <Users size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Faturamento por Competência</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))} />
                <Legend />
                <Bar dataKey="Recebido" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pendente" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insight */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Sparkles className="text-purple-600" size={20} />
              Gemini Insights
            </h3>
            <button 
              onClick={handleGenerateInsight}
              disabled={isLoadingAi}
              className="text-xs px-3 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-full font-medium transition-colors disabled:opacity-50"
            >
              {isLoadingAi ? 'Analisando...' : 'Gerar Análise'}
            </button>
          </div>
          
          <div className="flex-1 bg-slate-50 rounded-lg p-4 text-sm text-slate-700 overflow-y-auto">
            {isLoadingAi ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Loader2 className="animate-spin mb-2" size={24} />
                <p>Processando dados financeiros...</p>
              </div>
            ) : aiAnalysis ? (
              isError ? (
                <div className="flex flex-col items-center justify-center h-full text-red-500 text-center gap-2">
                  <AlertTriangle size={24} />
                  <p>{aiAnalysis}</p>
                </div>
              ) : (
                <div className="prose prose-sm prose-slate max-w-none">
                   <pre className="whitespace-pre-wrap font-sans text-slate-600">{aiAnalysis}</pre>
                </div>
              )
            ) : (
              <p className="text-slate-400 text-center mt-10">
                Clique em "Gerar Análise" para obter insights sobre faturamento e saúde da carteira de clientes usando IA.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;