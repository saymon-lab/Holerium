import React, { useState } from 'react';
import { Shield, PersonStanding, Lock, ArrowRight, Fingerprint, ScanFace, Key, AlertCircle, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import ContactButton from '@/src/components/ContactButton';
import { supabase } from '@/src/lib/supabase';
import AboutModal from '@/src/components/AboutModal';
import { Info } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [loginTab, setLoginTab] = useState<'colaborador'|'admin'|'super'>('colaborador');
  const [error, setError] = useState('');
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isBioLoading, setIsBioLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('remember_me') === 'true';
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerPassword, setRegisterPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        user: user,
        role: role,
        status: status,
        detail: detail
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
      setIsSubmitting(true);
      // Tenta buscar tanto pelo CPF digitado quanto pelo CPF limpo (sem pontos)
      const { data: found, error: dbError } = await supabase
        .from('employees')
        .select('*')
        .or(`cpf.eq."${cpf}",cpf.eq."${cleanInput}"`)
        .maybeSingle();

      if (dbError) throw dbError;

      if (found) {
        // Se estiver tentando cadastrar senha
        if (isRegistering) {
          if (found.password) {
            setError('Já existe uma senha cadastrada para este CPF.');
            setIsRegistering(false);
            return;
          }

          if (registerPassword.length !== 4 || !/^\d+$/.test(registerPassword)) {
            setError('A senha deve conter exatamente 4 números.');
            return;
          }

          const { error: updateError } = await supabase
            .from('employees')
            .update({ password: registerPassword })
            .eq('id', found.id);

          if (updateError) throw updateError;

          alert('Senha cadastrada com sucesso! Agora você pode fazer o login.');
          setIsRegistering(false);
          setRegisterPassword('');
          return;
        }

        // Login Normal
        if (!found.password) {
          setError('Este CPF ainda não possui senha cadastrada. Clique em "Cadastrar Senha" abaixo.');
          return;
        }

        if (found.password !== password) {
          setError('Senha incorreta.');
          await recordLog(found.name, loginTab === 'admin' ? 'Gestão' : 'Colaborador', 'erro', 'Senha inválida');
          return;
        }

        // Se chegou aqui, login OK
        const isAdmin = ['admin', 'superadmin', 'Administrador do Sistema', 'Desenvolvedor Geral'].includes(found.role);

        if (loginTab === 'admin' && !isAdmin) {
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
      setError('Erro ao processar solicitação no servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      if (!window.PublicKeyCredential) {
        setError('Seu dispositivo não suporta biometria.');
        return;
      }

      setIsBioLoading(true);
      setError('');

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      // Busca credencial do dispositivo
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: "required",
          rpId: window.location.hostname
        }
      }) as PublicKeyCredential;

      if (assertion) {
        // Busca o usuário pelo ID da credencial (bio_id)
        const { data: user, error: dbError } = await supabase
          .from('employees')
          .select('*')
          .eq('bio_id', assertion.id)
          .maybeSingle();

        if (dbError) throw dbError;

        if (user) {
          localStorage.setItem('currentUser', JSON.stringify(user));
          await recordLog(user.name, 'Biometria', 'sucesso', 'Login via Digital/FaceID');
          navigate('/dashboard');
        } else {
          setError('Biometria não vinculada a nenhum usuário. Por favor, entre com seu CPF primeiro.');
        }
      }
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        console.error('Erro bio login:', err);
        setError('Falha na autenticação biométrica.');
      }
    } finally {
      setIsBioLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col bg-surface overflow-hidden">
      <div className="flex flex-1">
        {/* Branding Side - Deep Blue Glassmorphism */}
        <div className="hidden lg:flex lg:w-7/12 relative items-center justify-center bg-primary p-8 overflow-hidden">
          {/* Animated Background Overlay */}
          <div 
            className="absolute inset-0 opacity-40 mix-blend-overlay rotate-3 scale-110" 
            style={{ 
              backgroundImage: "url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80')",
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-[#050f2b]"></div>
          
          <div className="relative z-10 max-w-2xl">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 inline-flex items-center space-x-3 bg-white/5 backdrop-blur-2xl px-4 py-2 rounded-2xl border border-white/10 shadow-2xl"
            >
              <div className="w-2 h-2 rounded-full bg-[#E9C176] animate-pulse shadow-[0_0_10px_#E9C176]"></div>
              <span className="text-white/80 text-[10px] font-black tracking-[0.3em] uppercase">Security Protocol v2.4</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white text-7xl font-extrabold tracking-tighter mb-4 leading-[1.05] font-headline"
            >
              Central de Documentos <br />
              do <span className="text-[#E9C176]">Colaborador</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-blue-100/60 text-xl font-medium max-w-lg mb-6 leading-relaxed"
            >
              Acesse seus recibos de pagamento, férias e informes de rendimentos com segurança e praticidade. Ambiente exclusivo para colaboradores e administradores.
            </motion.p>

            <div className="grid grid-cols-2 gap-4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/5 p-8 rounded-[2rem] border border-white/5 backdrop-blur-sm group hover:bg-white/10 transition-all duration-500"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#E9C176]/10 flex items-center justify-center mb-6 text-[#E9C176] group-hover:scale-110 transition-transform">
                  <Shield className="w-5 h-5 fill-current" />
                </div>
                <h3 className="text-white text-lg font-bold mb-3">LGPD Ready</h3>
                <p className="text-white/40 text-sm leading-relaxed">Conformidade total com as leis de privacidade brasileiras.</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white/5 p-8 rounded-[2rem] border border-white/5 backdrop-blur-sm group hover:bg-white/10 transition-all duration-500"
              >
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center mb-6 text-white/50 group-hover:scale-110 transition-transform">
                   <Lock className="w-5 h-5 fill-current" />
                </div>
                <h3 className="text-white text-lg font-bold mb-3">E-Vault</h3>
                <p className="text-white/40 text-sm leading-relaxed">Armazenamento de dados em nuvem de alta disponibilidade.</p>
              </motion.div>
            </div>
          </div>

            <div className="mt-12">
              <div className="flex items-center space-x-4">
                <div className="flex -space-x-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-primary bg-slate-800 flex items-center justify-center text-[10px] text-white font-bold overflow-hidden shadow-xl">
                      <img src={`https://i.pravatar.cc/100?u=${i}`} alt="user" />
                    </div>
                  ))}
                </div>
                <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">+4.2k usuários ativos hoje</p>
              </div>
            </div>
          </div>

          {/* Form Side - MD3 Surface Light */}
        <div className="w-full lg:w-5/12 bg-surface-container-lowest flex items-center justify-center p-8 lg:p-24 relative overflow-y-auto">
          <div className="w-full max-w-sm">
            {/* Logo */}
            <div className="mb-16">
              <div className="flex items-center gap-4 group cursor-pointer active:scale-95 transition-transform">
                <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/30 rotate-3 group-hover:rotate-0 transition-all">
                  <div className="text-white font-black text-2xl tracking-tighter italic">H</div>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-primary tracking-tighter leading-none font-headline">Holerium</h2>
                  <p className="text-[10px] text-[#E9C176] font-black uppercase tracking-[0.3em] mt-1">Digital Vault</p>
                </div>
              </div>
            </div>

            <div className="mb-12">
              <h2 className="text-4xl font-black text-on-surface mb-3 tracking-tighter font-headline">
                {loginTab === 'colaborador' ? 'Seja bem-vindo' : loginTab === 'admin' ? 'Portal Gestor' : 'Dev Access'}
              </h2>
              <p className="text-secondary font-medium text-lg italic">Insira suas credenciais corporativas.</p>
            </div>

            {/* Segmented Control */}
            <div className="mb-10 flex p-1.5 bg-surface-container-high rounded-[1.2rem] shadow-inner relative group/tabs">
              <button 
                onClick={() => { setLoginTab('colaborador'); setError(''); }}
                className={cn(
                  "flex-[3] py-4 text-[10px] font-black rounded-xl transition-all duration-500 uppercase tracking-[0.2em]",
                  loginTab === 'colaborador' ? "bg-white text-primary shadow-xl scale-[1.02]" : "text-secondary hover:text-primary"
                )}
              >
                Colaborador
              </button>
              <button 
                onClick={() => { setLoginTab('admin'); setError(''); }}
                className={cn(
                  "flex-[3] py-4 text-[10px] font-black rounded-xl transition-all duration-500 uppercase tracking-[0.2em]",
                  loginTab === 'admin' ? "bg-white text-primary shadow-xl scale-[1.02]" : "text-secondary hover:text-primary"
                )}
              >
                Administrador
              </button>

              {/* Opção Oculta Master (Desenvolvedor) */}
              <button 
                type="button"
                onClick={() => { setLoginTab('super'); setError(''); }}
                className={cn(
                  "flex-1 flex items-center justify-center transition-all duration-500 rounded-xl opacity-0 group-hover/tabs:opacity-100",
                  loginTab === 'super' ? "bg-white text-[#E9C176] shadow-xl opacity-100 scale-110" : "text-outline/40 hover:text-[#E9C176]"
                )}
                title="Acesso Master"
              >
                <Lock className={cn("w-4 h-4 transition-all", loginTab === 'super' && "fill-current")} />
              </button>
            </div>

            <form className="space-y-8" onSubmit={handleSubmit}>
              {loginTab !== 'super' && (
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-secondary uppercase tracking-[0.2em] ml-2">
                    {loginTab === 'colaborador' ? 'CPF do Colaborador' : 'CPF Credencial Master'}
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                       <PersonStanding className="w-5 h-5" />
                    </div>
                    <input 
                      className="block w-full pl-16 pr-6 py-6 bg-white border border-surface-container-high rounded-[1.5rem] text-on-surface font-black text-lg placeholder:text-outline/30 focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all outline-none shadow-sm"
                      placeholder="000.000.000-00" 
                      type="text"
                      value={cpf}
                      onChange={handleCpfChange}
                      maxLength={14}
                    />
                  </div>
                </div>
              )}

              { loginTab === 'super' ? (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <label className="block text-[10px] font-black text-secondary uppercase tracking-[0.2em] ml-2">
                    Senha de Servidor
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                       <Lock className="w-5 h-5" />
                    </div>
                    <input 
                      className="block w-full pl-16 pr-6 py-6 bg-white border border-surface-container-high rounded-[1.5rem] text-on-surface font-black text-lg placeholder:text-outline/30 focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all outline-none shadow-sm"
                      placeholder="••••••••••••" 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </motion.div>
              ) : isRegistering ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3 bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100">
                  <label className="block text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                    Criar Nova Senha (4 Números)
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-primary/40 group-focus-within:text-primary transition-colors">
                       <Key className="w-5 h-5" />
                    </div>
                    <input 
                      className="block w-full pl-16 pr-6 py-6 bg-white border border-blue-200 rounded-[1.5rem] text-primary font-black text-2xl tracking-[0.5em] placeholder:text-outline/20 focus:ring-4 focus:ring-primary/10 transition-all outline-none shadow-sm"
                      placeholder="0000" 
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    />
                  </div>
                  <p className="text-[9px] text-blue-600/60 font-bold uppercase tracking-widest text-center mt-2">Esta senha será usada para seus próximos acessos</p>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <label className="block text-[10px] font-black text-secondary uppercase tracking-[0.2em] ml-2">
                    Senha de 4 Dígitos
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                       <Lock className="w-5 h-5" />
                    </div>
                    <input 
                      className="block w-full pl-16 pr-6 py-6 bg-white border border-surface-container-high rounded-[1.5rem] text-on-surface font-black text-lg placeholder:text-outline/30 focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all outline-none shadow-sm"
                      placeholder="••••" 
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={password}
                      onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    />
                  </div>
                </motion.div>
              )}

              {error && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 text-red-700 p-5 rounded-3xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border border-red-100 shadow-sm shadow-red-500/5">
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
                  <span className="text-secondary font-semibold group-hover:text-primary transition-colors">Lembrar</span>
                </label>

                {loginTab !== 'super' && (
                  <button 
                    type="button"
                    onClick={() => {
                      setIsRegistering(!isRegistering);
                      setError('');
                    }}
                    className="text-primary font-bold text-xs hover:underline decoration-2 underline-offset-4"
                  >
                    {isRegistering ? 'Voltar ao Login' : 'Cadastrar Senha'}
                  </button>
                )}
              </div>

              <button 
                disabled={isSubmitting}
                className="w-full bg-primary text-white py-6 rounded-[1.5rem] font-black flex items-center justify-center space-x-4 group hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-primary/30 disabled:opacity-50 disabled:scale-100"
              >
                <span className="uppercase tracking-[0.3em] text-[10px]">
                  {isSubmitting ? 'Verificando...' : isRegistering ? 'Confirmar Cadastro' : 'Autenticação Segura'}
                </span>
                {!isSubmitting && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>

            <div className="mt-16">
              <div className="flex items-center mb-10">
                <div className="flex-1 h-px bg-surface-container-high"></div>
                <span className="px-6 text-[10px] font-black text-outline/40 uppercase tracking-[0.4em]">Biometria</span>
                <div className="flex-1 h-px bg-surface-container-high"></div>
              </div>
              <div className="flex justify-center space-x-8">
                <button 
                  type="button"
                  onClick={handleBiometricLogin}
                  disabled={isBioLoading}
                  className={cn(
                    "w-16 h-16 rounded-[1.5rem] border-2 border-surface-container-high flex items-center justify-center transition-all hover:border-primary hover:text-primary hover:shadow-2xl hover:shadow-primary/10 active:scale-90 shadow-sm",
                    isBioLoading ? "bg-surface-container animate-pulse" : "bg-white"
                  )}
                  title="Entrar com Biometria"
                >
                  <Fingerprint className={cn("w-8 h-8", isBioLoading ? "text-primary" : "text-outline/60")} />
                </button>
                <div className="w-16 h-16 rounded-[1.5rem] border-2 border-surface-container-high flex items-center justify-center opacity-20 bg-surface-container-low select-none">
                  <ScanFace className="w-8 h-8 text-outline" />
                </div>
                <div className="w-16 h-16 rounded-[1.5rem] border-2 border-surface-container-high flex items-center justify-center opacity-20 bg-surface-container-low select-none">
                  <Key className="w-8 h-8 text-outline" />
                </div>
              </div>
            </div>

            <div className="mt-20 pt-10 border-t border-surface-container-high text-center flex justify-center">
              <button 
                onClick={() => setIsAboutOpen(true)}
                className="flex flex-col items-center gap-4 text-[9px] text-secondary/40 uppercase tracking-[0.4em] font-black hover:text-primary transition-all group"
              >
                <span>Sincronizado na Nuvem • Holerium v2.5.0</span>
                <div className="w-6 h-1 bg-surface-container-high rounded-full group-hover:w-12 group-hover:bg-primary transition-all"></div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Developer Trigger Area */}
      <div 
        className="fixed top-0 right-0 w-20 h-20 z-50 cursor-default"
        onClick={() => { setLoginTab('super'); setError(''); }}
      ></div>

      <ContactButton />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
}
