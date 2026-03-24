import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Lock, AlertCircle } from 'lucide-react';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const email = 'jhonaslemos0@gmail.com';

    if (password !== 'admin123') {
      setError('Senha inválida. Acesso restrito.');
      setLoading(false);
      return;
    }

    try {
      let { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Se o usuário não existir, tenta criar automaticamente
      if (error && error.message.includes('Invalid login credentials')) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            throw new Error('A senha informada está incorreta para este email no banco de dados.');
          }
          throw new Error(signUpError.message);
        }
        
        // Se o signUp funcionar mas não retornar sessão (confirmação de email ativada),
        // avisamos o usuário.
        if (!signUpData.session) {
          throw new Error('Conta criada. Verifique seu email para confirmar o cadastro antes de fazer login.');
        }
        
        data = signUpData;
      } else if (error) {
        throw new Error(error.message || 'Erro ao fazer login');
      }

      if (data.session && data.user) {
        login(data.session.access_token, data.user);
        navigate('/admin');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#E10600]/10 mb-4">
            <Lock className="w-8 h-8 text-[#E10600]" />
          </div>
          <h2 className="text-2xl font-bold text-white">Acesso Restrito</h2>
          <p className="text-gray-400 mt-2">Área exclusiva para administradores</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-[#E10600] transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E10600] hover:bg-red-700 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? 'Entrando...' : 'Entrar no Painel'}
          </button>
        </form>
      </div>
    </div>
  );
}
