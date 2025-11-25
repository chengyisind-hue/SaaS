import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Lock, Mail, Loader2, UserCircle } from 'lucide-react';

interface LoginProps {
  onLoginSuccess?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (onLoginSuccess) onLoginSuccess();
    } catch (error: any) {
      setMessage({ text: error.message || "Credenciais inválidas. Tente novamente.", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin, 
      });
      if (error) throw error;
      setMessage({ text: "Link enviado! Verifique sua caixa de entrada.", type: 'success' });
      setIsResetMode(false);
    } catch (error: any) {
      setMessage({ text: error.message || "Erro ao solicitar redefinição", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-black flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100 dark:border-slate-700">
        
        {/* Header Section */}
        <div className="bg-indigo-600 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-white opacity-5 transform -skew-y-12 translate-y-4 scale-150"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="bg-white/20 p-3 rounded-full mb-3 backdrop-blur-sm">
              <UserCircle className="text-white" size={32} />
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide">Portal do Gestor</h1>
            <p className="text-indigo-200 text-xs mt-1 uppercase tracking-wider">Acesso Administrativo</p>
          </div>
        </div>
        
        <div className="p-8 pt-6">
          {message && (
            <div className={`mb-5 p-3 rounded text-sm text-center font-medium ${message.type === 'error' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-800'}`}>
              {message.text}
            </div>
          )}

          {isResetMode ? (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="text-center">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Recuperar Acesso</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Informe seu e-mail corporativo</p>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">E-mail</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none text-sm transition-all text-slate-900 dark:text-white"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-semibold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 transform active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : "Enviar Link de Recuperação"}
              </button>

              <button
                type="button"
                onClick={() => setIsResetMode(false)}
                className="w-full text-sm text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
              >
                Voltar para o Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">E-mail</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none text-sm transition-all text-slate-900 dark:text-white"
                    placeholder="admin@empresa.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Senha</label>
                  <button
                    type="button"
                    onClick={() => setIsResetMode(true)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                  >
                    Esqueceu?
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none text-sm transition-all text-slate-900 dark:text-white"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-semibold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 transform active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : "Acessar Painel"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
