import React, { useState } from 'react';
import { Shield, PersonStanding, Lock, ArrowRight, Fingerprint, ScanFace, Key, AlertCircle, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import ContactButton from '@/src/components/ContactButton';
import { supabase } from '@/src/lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [loginTab, setLoginTab] = useState<'colaborador'|'admin'|'super'>('colaborador');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('remember_me') === 'true';
  });

  React.useEffect(() => {
    const savedCpf = localStorage.getItem('remembered_cpf');
    if (savedCpf && rememberMe) {
      setCpf(savedCpf);
    }
  }, []);

  const formatCPF = (value: string) => {
    // Remove tudo o que não é dígito
    const digits = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    const limited = digits.slice(0, 11);
    
    // Aplica a máscara: 000.000.000-00
    return limited
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpf(formatted);
  };

  const recordLog = async (user: string, role: string, status: 'sucesso' | 'erro', detail: string = '') => {
    try {
      await supabase.from('access_logs').insert([{
        user,
        role,
        status,
        detail
      }]);
    } catch (err) {
      console.error('Falha ao registrar log no Supabase:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validação de CPF apenas se não for login Super Admin
    if (loginTab !== 'super') {
      const cleanInput = cpf.replace(/\D/g, ''); 
      if (!cleanInput) {
        setError('Por favor digite um CPF válido.');
        return;
      }
    }

    if (loginTab === 'super') {
      if (password === 'dev2026') {
        localStorage.setItem('currentUser', JSON.stringify({ 
          name: 'Desenvolvedor Master', 
          role: 'Desenvolvedor Geral', 
          avatar: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=100&q=80' 
        }));
        await recordLog('Desenvolvedor', 'Root', 'sucesso', 'Acesso via Console Geral');
        navigate('/superadmin');
      } else {
        setError('Senha mestre de servidor incorreta.');
        await recordLog('Desconhecido', 'Intrusos', 'erro', 'Tentativa de acesso Root falhou');
      }
      return;
    }

    const cleanInput = cpf.replace(/\D/g, '').trim(); 

    try {
      const { data: found, error: dbError } = await supabase
        .from('employees')
        .select('*')
        .eq('cpf', cpf)
        .maybeSingle();

      if (dbError) throw dbError;

      if (found) {
        if (loginTab === 'admin' && found.role !== 'Administrador do Sistema') {
          setError('Este usuário não possui privilégios administrativos.');
          await recordLog(found.name, 'Gestão', 'erro', 'Tentativa de acesso admin sem privilégio');
          return;
        }

        if (rememberMe) {
          localStorage.setItem('remembered_cpf', cpf);
          localStorage.setItem('remember_me', 'true');
        } else {
          localStorage.removeItem('remembered_cpf');
          localStorage.setItem('remember_me', 'false');
        }
        localStorage.setItem('currentUser', JSON.stringify(found));
        await recordLog(found.name, loginTab === 'admin' ? 'Gestão' : 'Colaborador', 'sucesso', loginTab === 'admin' ? 'Acesso Administrativo via CPF' : '');
        navigate('/dashboard');
      } else {
         setError('CPF não encontrado no sistema.');
         await recordLog('CPF: ' + (cpf || 'vazio'), loginTab === 'admin' ? 'Gestão' : 'Colaborador', 'erro', 'CPF inexistente na base');
      }
    } catch (e) {
      console.error('Erro de Login:', e);
      setError('Erro ao ler base de dados do servidor.');
    }
  };


  return (
    <div className="min-h-screen flex flex-col bg-surface overflow-hidden">
      <div className="flex flex-1">
        {/* Branding Side - Hidden on Mobile */}
        <div className="hidden lg:flex lg:w-7/12 relative items-center justify-center vault-gradient p-20 overflow-hidden">
          <div 
            className="absolute inset-0 opacity-20" 
            style={{ 
              backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBgnLUS1CGVYeEf6o-X7ku5DUREOkYHgdA0a0qSQkD8S-KAj_WqobYGd5sNIYMk-p6vQGYhSXaqArh_oAzke3oy1YlYDzG8grxC5ThlZpdf_UrqIp0g7plR40iHfTztxrQL19rhZrvaNfiCALaKVVVqEk5RHOpJ7ZSgI7RHLgBIVEzszKPIwe01gY0tr9KJQFOAMfpcurvbT7oUfARgIsnNNzoRHYg_qSp9He4ugjzRilfwm4CkZT348OVinbLZxc9Z2dbgPnexyw')",
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          ></div>
          
          <div className="relative z-10 max-w-2xl">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12 inline-flex items-center space-x-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10"
            >
              <Shield className="w-4 h-4 text-[#E9C176] fill-[#E9C176]/20" />
              <span className="text-white text-[10px] font-bold tracking-widest uppercase">Protocolo de Segurança Ativo</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white text-6xl font-extrabold tracking-tight mb-6 leading-tight font-headline"
            >
              Central de Documentos do <span className="text-[#E9C176]">Colaborador</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-blue-100/80 text-xl font-light max-w-lg mb-12 leading-relaxed"
            >
              Acesse seus recibos de pagamento, férias e informes de rendimentos com segurança e praticidade. Ambiente exclusivo para colaboradores e administradores.
            </motion.p>

            <div className="grid grid-cols-2 gap-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/5 p-6 rounded-2xl border border-white/5 backdrop-blur-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4 text-[#E9C176]">
                  <Shield className="w-5 h-5 fill-current" />
                </div>
                <h3 className="text-white font-bold mb-2">Gestão Ágil</h3>
                <p className="text-white/60 text-sm">Organização inteligente de arquivos corporativos.</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white/5 p-6 rounded-2xl border border-white/5 backdrop-blur-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4 text-[#E9C176]">
                   <Lock className="w-5 h-5 fill-current" />
                </div>
                <h3 className="text-white font-bold mb-2">Privacidade</h3>
                <p className="text-white/60 text-sm">Seus dados protegidos pelas leis mais rigorosas.</p>
              </motion.div>
            </div>
          </div>

          <div className="absolute bottom-8 left-12">
            <div className="flex items-center space-x-3 opacity-50">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <Lock className="text-white text-xs w-4 h-4" />
              </div>
              <span className="text-white/50 text-[10px] font-medium uppercase tracking-[0.2em] whitespace-nowrap">Holerium Digital Vault v2.4</span>
            </div>
          </div>
        </div>

        {/* Form Side */}
        <div className="w-full lg:w-5/12 bg-surface flex items-center justify-center p-8 lg:p-24 relative overflow-y-auto">
          <div className="w-full max-w-md">
            {/* Logo */}
            <div className="mb-12">
              <div className="flex items-center scale-110 origin-left">
                <svg width="220" height="60" viewBox="0 0 220 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="origin-left">
                  <rect x="0" y="0" width="48" height="48" rx="12" fill="url(#grad_login_top)"/>
                  <path d="M14 14V34M34 14V34M14 24H34" stroke="white" stroke-width="3" stroke-linecap="round"/>
                  <text 
                    x="60" 
                    y="32" 
                    font-family="Manrope, Inter, sans-serif" 
                    font-size="22" 
                    font-weight="600" 
                    fill="#0B1F5B" 
                    className="dark:fill-white cursor-default select-none transition-all active:scale-95"
                    onClick={() => { setLoginTab('super'); setError(''); }}
                  >
                    Holerium
                  </text>
                  <defs>
                    <linearGradient id="grad_login_top" x1="0" y1="0" x2="48" y2="48">
                      <stop offset="0%" stop-color="#0B1F5B"/>
                      <stop offset="100%" stop-color="#2563EB"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="h-1 w-12 bg-blue-300 rounded-full mt-2"></div>
            </div>

            <div className="mb-10">
              <h2 className="text-4xl font-extrabold text-primary mb-2 tracking-tight">
                {loginTab === 'colaborador' ? 'Acesso ao Portal' : loginTab === 'admin' ? 'Console de Gestão' : 'Desenvolvedor'}
              </h2>
              <p className="text-secondary font-medium">Identifique-se para entrar no sistema.</p>
            </div>

            <div className="mb-8 flex space-x-1 p-1 bg-surface-container rounded-2xl relative group">
              {/* Hidden Developer Access */}
              <button 
                type="button"
                onClick={() => { setLoginTab('super'); setError(''); }}
                className="absolute -right-1 -top-1 p-2 text-outline/20 hover:text-primary transition-all opacity-0 group-hover:opacity-100 z-50 cursor-pointer"
              >
                <Key className="w-4 h-4" />
              </button>

              <button 
                onClick={() => { setLoginTab('colaborador'); setError(''); }}
                className={cn(
                  "flex-1 py-4 text-sm font-bold rounded-xl transition-all duration-300",
                  loginTab === 'colaborador' ? "bg-white text-primary shadow-sm" : "text-secondary hover:text-primary"
                )}
              >
                Colaborador
              </button>
              <button 
                onClick={() => { setLoginTab('admin'); setError(''); }}
                className={cn(
                  "flex-1 py-4 text-sm font-bold rounded-xl transition-all duration-300",
                  loginTab === 'admin' ? "bg-white text-primary shadow-sm" : "text-secondary hover:text-primary"
                )}
              >
                Administrador
              </button>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {loginTab !== 'super' && (
                <div>
                  <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-2 ml-1">
                    {loginTab === 'colaborador' ? 'Seu CPF Corporativo' : 'CPF Master Administrador'}
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                       <PersonStanding className="w-5 h-5" />
                    </div>
                    <input 
                      className="block w-full pl-14 pr-4 py-5 bg-surface-container-highest border-none rounded-2xl text-on-surface font-medium placeholder:text-outline/40 focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all outline-none"
                      placeholder="000.000.000-00" 
                      type="text"
                      value={cpf}
                      onChange={handleCpfChange}
                      maxLength={14}
                    />
                  </div>
                </div>
              )}

              { loginTab === 'super' && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                  <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-2 ml-1">
                    Senha de Servidor
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                       <Lock className="w-5 h-5" />
                    </div>
                    <input 
                      className="block w-full pl-14 pr-4 py-5 bg-surface-container-highest border-none rounded-2xl text-on-surface font-medium placeholder:text-outline/40 focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all outline-none"
                      placeholder="••••••••••••" 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </motion.div>
              )}

              {error && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="bg-error-container text-red-600 p-4 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-100">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </motion.div>
              )}

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-5 h-5 rounded-lg border-outline-variant text-[#775a19] focus:ring-[#E9C176]/20 transition-all cursor-pointer"
                  />
                  <span className="text-secondary font-semibold group-hover:text-primary transition-colors">Lembrar acesso</span>
                </label>
              </div>

              <button className="w-full bg-primary text-white py-5 rounded-2xl font-bold flex items-center justify-center space-x-3 group hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20">
                <span className="uppercase tracking-widest text-sm">Acesso Seguro</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            <div className="mt-12">
              <div className="flex items-center mb-8">
                <div className="flex-1 h-px bg-surface-container"></div>
                <span className="px-6 text-[10px] font-bold text-outline uppercase tracking-[0.2em]">Autenticação Bio</span>
                <div className="flex-1 h-px bg-surface-container"></div>
              </div>
              <div className="flex justify-center space-x-6 opacity-30">
                <div className="w-14 h-14 rounded-2xl border border-outline-variant flex items-center justify-center">
                  <Fingerprint className="w-8 h-8" />
                </div>
                <div className="w-14 h-14 rounded-2xl border border-outline-variant flex items-center justify-center">
                  <ScanFace className="w-8 h-8" />
                </div>
                <div className="w-14 h-14 rounded-2xl border border-outline-variant flex items-center justify-center">
                  <Key className="w-8 h-8" />
                </div>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-surface-container text-center">
              <p className="text-[10px] text-secondary font-semibold uppercase tracking-widest leading-relaxed">
                Ambiente criptografado de ponta a ponta. 
                <br />© 2026 • Holerium Corporativo
              </p>
            </div>
          </div>
        </div>
      </div>

      <ContactButton />
    </div>
  );
}
