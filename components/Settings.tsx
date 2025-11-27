import React, { useState, useEffect } from 'react';
import { User, Save, Info, Settings as SettingsIcon, List, Search, Moon, Sun, Lock, Mail, Loader2, Link } from 'lucide-react';
import { SystemLog, AppSettings } from '../types';
import { supabase } from '../services/supabaseClient';

interface SettingsProps {
  logs?: SystemLog[];
  settings?: AppSettings;
  onUpdateSettings?: (newSettings: AppSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ logs = [], settings, onUpdateSettings }) => {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'INTEGRATION' | 'LOGS'>('GENERAL');
  
  // Settings State
  const [unitPriceInput, setUnitPriceInput] = useState<number>(5.00);
  const [dueDayInput, setDueDayInput] = useState<number>(10);
  const [themeInput, setThemeInput] = useState<'light' | 'dark'>('light');
  
  // Integration State
  const [integrationUrl, setIntegrationUrl] = useState('');
  const [integrationToken, setIntegrationToken] = useState('');

  // Profile State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  
  // Logs Filter State
  const [logSearch, setLogSearch] = useState('');
  const [logFilterType, setLogFilterType] = useState<string>('ALL');

  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (settings) {
      setUnitPriceInput(settings.unitPrice);
      setDueDayInput(settings.dueDay || 10);
      setThemeInput(settings.theme || 'light');
      setIntegrationUrl(settings.integrationUrl || '');
      setIntegrationToken(settings.integrationToken || '');
    }
    
    // Fetch current user email
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, [settings]);

  const handleSaveGeneral = () => {
    if (onUpdateSettings) {
      onUpdateSettings({ 
        unitPrice: unitPriceInput,
        dueDay: dueDayInput,
        apiKey: settings?.apiKey || '', 
        theme: themeInput,
        integrationUrl,
        integrationToken
      });
      showFeedback("Configurações salvas com sucesso.", 'success');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      const updates: any = { email };
      if (password) updates.password = password;

      const { error } = await supabase.auth.updateUser(updates);
      
      if (error) throw error;
      showFeedback("Dados de acesso atualizados. Verifique seu e-mail se alterou o endereço.", 'success');
      setPassword(''); // Clear password after save
    } catch (error: any) {
      showFeedback(`Erro ao atualizar perfil: ${error.message}`, 'error');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const showFeedback = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  // Filter Logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(logSearch.toLowerCase()) || 
      log.details.toLowerCase().includes(logSearch.toLowerCase()) ||
      (log.user || '').toLowerCase().includes(logSearch.toLowerCase());
    
    const matchesType = logFilterType === 'ALL' ? true : log.type === logFilterType;
    
    return matchesSearch && matchesType;
  });

  const inputClass = "w-full p-2.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-indigo-500 outline-none transition-colors";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Painel de Configurações</h2>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 animate-fadeIn shadow-sm border ${message.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'}`}>
          <Info size={20} />
          {message.text}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 min-h-[600px] flex flex-col md:flex-row overflow-hidden transition-colors">
        {/* Sidebar Navigation for Settings */}
        <div className="w-full md:w-64 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('GENERAL')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'GENERAL' ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
          >
            <SettingsIcon size={18} /> Geral e Perfil
          </button>
          <button
            onClick={() => setActiveTab('INTEGRATION')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'INTEGRATION' ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
          >
            <Link size={18} /> Integração
          </button>
          <button
            onClick={() => setActiveTab('LOGS')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'LOGS' ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
          >
            <List size={18} /> Logs Completos
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-white dark:bg-slate-900">
          
          {activeTab === 'GENERAL' && (
            <div className="space-y-10 animate-fadeIn max-w-3xl">
              
              {/* System Settings */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2 mb-6">Preferências do Sistema</h3>
                <div className="grid gap-6">
                  
                  {/* Theme Selector */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tema da Interface</label>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setThemeInput('light')}
                        className={`flex items-center gap-2 px-4 py-2 rounded border transition-all ${themeInput === 'light' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                      >
                        <Sun size={18} /> Claro
                      </button>
                      <button 
                         onClick={() => setThemeInput('dark')}
                         className={`flex items-center gap-2 px-4 py-2 rounded border transition-all ${themeInput === 'dark' ? 'bg-slate-800 border-indigo-500 text-indigo-300 shadow-sm' : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                      >
                        <Moon size={18} /> Escuro
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Price */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Preço por Funcionário</label>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 rounded-l border border-r-0 border-slate-300 dark:border-slate-700">R$</span>
                        <input 
                          type="number" 
                          step="0.01"
                          min="0"
                          value={unitPriceInput} 
                          onChange={(e) => setUnitPriceInput(Number(e.target.value))}
                          className="w-full p-2.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-r focus:ring-2 focus:ring-indigo-500 outline-none" 
                        />
                      </div>
                    </div>

                    {/* Due Date */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dia Padrão de Vencimento</label>
                      <select 
                        value={dueDayInput} 
                        onChange={(e) => setDueDayInput(Number(e.target.value))}
                        className={inputClass}
                      >
                        {[5, 10, 15, 20, 25, 30].map(day => (
                          <option key={day} value={day}>Dia {day}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <button onClick={handleSaveGeneral} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded shadow-sm flex items-center gap-2 font-medium transition-colors">
                      <Save size={18} /> Salvar Preferências
                    </button>
                  </div>
                </div>
              </div>

              {/* User Profile Settings */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2 mb-6">Dados de Acesso</h3>
                <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                   <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">E-mail de Login</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={`${inputClass} pl-10`}
                        />
                      </div>
                   </div>
                   
                   <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nova Senha (Opcional)</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="password"
                          placeholder="Deixe em branco para manter a atual"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`${inputClass} pl-10`}
                          minLength={6}
                        />
                      </div>
                   </div>

                   <div>
                    <button 
                      type="submit" 
                      disabled={isUpdatingProfile}
                      className="bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white px-6 py-2 rounded shadow-sm flex items-center gap-2 font-medium transition-colors disabled:opacity-50"
                    >
                      {isUpdatingProfile ? <Loader2 className="animate-spin" size={18} /> : <User size={18} />}
                      Atualizar Perfil
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}
          
          {activeTab === 'INTEGRATION' && (
            <div className="space-y-10 animate-fadeIn max-w-3xl">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2 mb-6">Conexão com WhiteLabel</h3>
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg mb-6">
                   <p className="text-sm text-indigo-800 dark:text-indigo-300">
                     Configure aqui a API do seu fornecedor de Ponto Eletrônico. O sistema usará o CNPJ como chave para sincronizar a quantidade de funcionários ativos.
                   </p>
                </div>
                
                <div className="grid gap-6">
                   <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL da API (Endpoint)</label>
                      <input 
                        type="url"
                        placeholder="Ex: https://api.pontowhitelabel.com/v1"
                        value={integrationUrl}
                        onChange={(e) => setIntegrationUrl(e.target.value)}
                        className={inputClass}
                      />
                   </div>
                   
                   <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Token de Acesso (API Key)</label>
                      <input 
                        type="password"
                        placeholder="Ex: sk_live_..."
                        value={integrationToken}
                        onChange={(e) => setIntegrationToken(e.target.value)}
                        className={inputClass}
                      />
                   </div>
                   
                   <div>
                    <button onClick={handleSaveGeneral} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded shadow-sm flex items-center gap-2 font-medium transition-colors">
                      <Save size={18} /> Salvar Credenciais
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'LOGS' && (
            <div className="space-y-4 animate-fadeIn h-full flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Logs do Sistema</h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{logs.length} registros</span>
              </div>

              {/* Log Filters */}
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Buscar em logs..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="w-full pl-9 p-2.5 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded focus:ring-indigo-500 outline-none"
                  />
                </div>
                <select 
                  value={logFilterType}
                  onChange={(e) => setLogFilterType(e.target.value)}
                  className="p-2.5 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded focus:ring-indigo-500 outline-none"
                >
                  <option value="ALL">Todos os Tipos</option>
                  <option value="info">Info</option>
                  <option value="success">Sucesso</option>
                  <option value="warning">Alerta</option>
                  <option value="error">Erro</option>
                </select>
              </div>

              {/* Logs Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden flex-1 overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 w-40">Data/Hora</th>
                      <th className="px-4 py-2 w-24">Tipo</th>
                      <th className="px-4 py-2 w-40">Ação</th>
                      <th className="px-4 py-2">Detalhes</th>
                      <th className="px-4 py-2 w-48">Usuário</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {filteredLogs.length > 0 ? (
                      filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400 text-xs font-mono">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                              log.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900' :
                              log.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900' :
                              log.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900' :
                              'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900'
                            }`}>
                              {log.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{log.action}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{log.details}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-500 text-xs">{log.user || 'Sistema'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">Nenhum log encontrado para os filtros atuais.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;