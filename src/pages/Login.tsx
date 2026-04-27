import React, { useState } from 'react';
import { Shield, PersonStanding, Lock, ArrowRight, Fingerprint, ScanFace, Key, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import ContactButton from '@/src/components/ContactButton';
import { supabase } from '@/src/lib/supabase';
import AboutModal from '@/src/components/AboutModal';

export default function Login() {
  const navigate = useNavigate();
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [loginTab, setLoginTab] = useState<'login'|'register'>('login');
  const [error, setError] = useState('');
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isBioLoading, setIsBioLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    const saved = localStorage.getItem('remember_me');
    return saved === null ? true : saved === 'true';
  });
  const [registerPassword, setRegisterPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  React.useEffect(() => {
    const savedCpf = localStorage.getItem('remembered_cpf');
    const savedPassword = localStorage.getItem('remembered_password');
    if (rememberMe) {
      if (savedCpf) setCpf(savedCpf);
      if (savedPassword) setPassword(savedPassword);
    }
  }, []);

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const limited = digits.slice(0, 11);
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
    
    const cleanInput = cpf.replace(/\D/g, ''); 
    if (!cleanInput) {
      setError('Por favor digite um CPF válido.');
      return;
    }

    try {
      setIsSubmitting(true);
      const { data: found, error: dbError } = await supabase
        .from('employees')
        .select('*')
        .or(`cpf.eq."${cpf}",cpf.eq."${cleanInput}"`)
        .maybeSingle();

      if (dbError) throw dbError;

      if (found) {
        if (loginTab === 'register') {
          if (found.password) {
            setError('Já existe uma senha cadastrada para este CPF.');
            setLoginTab('login');
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

          // Login Automático após cadastro de sucesso para melhor UX
          const updatedUser = { ...found, password: registerPassword };
          
          if (rememberMe) {
            localStorage.setItem('remembered_cpf', cpf);
            localStorage.setItem('remembered_password', registerPassword);
            localStorage.setItem('remember_me', 'true');
          } else {
            localStorage.removeItem('remembered_cpf');
            localStorage.removeItem('remembered_password');
            localStorage.setItem('remember_me', 'false');
          }
          
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          await recordLog(found.name, 'Entrada', 'sucesso', 'Primeiro acesso - Senha criada e login automático');
          navigate('/dashboard');
          return;
        }

        // Login Normal (Colaborador ou Admin)
        if (!found.password) {
          setError('Este CPF ainda não possui senha cadastrada. Preencha sua nova senha abaixo.');
          setLoginTab('register');
          return;
        }

        if (found.password !== password) {
          setError('Senha incorreta.');
          await recordLog(found.name, 'Entrada', 'erro', 'Senha inválida');
          return;
        }

        // Sucesso
        if (rememberMe) {
          localStorage.setItem('remembered_cpf', cpf);
          localStorage.setItem('remembered_password', password);
          localStorage.setItem('remember_me', 'true');
        } else {
          localStorage.removeItem('remembered_cpf');
          localStorage.removeItem('remembered_password');
          localStorage.setItem('remember_me', 'false');
        }
        localStorage.setItem('currentUser', JSON.stringify(found));
        await recordLog(found.name, 'Entrada', 'sucesso', 'Login realizado');
        navigate('/dashboard');
      } else {
         setError('CPF não encontrado no sistema.');
         await recordLog('CPF: ' + (cpf || 'vazio'), 'Entrada', 'erro', 'CPF inexistente na base');
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

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: "required",
          rpId: window.location.hostname
        }
      }) as PublicKeyCredential;

      if (assertion) {
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
        {/* Branding Side */}
        <div className="hidden lg:flex lg:w-7/12 relative items-center justify-center bg-primary p-8 overflow-hidden">
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
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 inline-flex items-center space-x-3 bg-white/5 backdrop-blur-2xl px-4 py-2 rounded-2xl border border-white/10 shadow-2xl">
              <div className="w-2 h-2 rounded-full bg-[#E9C176] animate-pulse shadow-[0_0_10px_#E9C176]"></div>
              <span className="text-white/80 text-[10px] font-black tracking-[0.3em] uppercase">Security Protocol v2.5.1</span>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="text-white text-7xl font-extrabold tracking-tighter mb-4 leading-[1.05] font-headline">
              Central de Documentos <br /> do <span className="text-[#E9C176]">Colaborador</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="text-blue-100/60 text-xl font-medium max-w-lg mb-6 leading-relaxed">
              Acesse seus recibos de pagamento, férias e informes de rendimentos com segurança e praticidade.
            </motion.p>
          </div>
        </div>

        {/* Form Side */}
        <div className="w-full lg:w-5/12 bg-surface-container-lowest flex items-center justify-center p-6 sm:p-12 lg:p-24 relative overflow-y-auto">
          <div className="w-full max-w-sm">
            <div className="mb-8 sm:mb-16">
              <div className="flex items-center gap-4 group cursor-pointer tap-press">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/30 rotate-3 group-hover:rotate-0 transition-all">
                  <div className="text-white font-black text-xl sm:text-2xl tracking-tighter italic">H</div>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-primary tracking-tighter leading-none font-headline">Holerium</h2>
                  <p className="text-[10px] text-[#E9C176] font-black uppercase tracking-[0.3em] mt-1">Digital Vault</p>
                </div>
              </div>
            </div>

            <div className="mb-8 sm:mb-12">
              <h2 className="text-3xl sm:text-4xl font-black text-on-surface mb-3 tracking-tighter font-headline leading-tight">
                {loginTab === 'login' ? 'Seja bem-vindo' : 'Primeiro Acesso'}
              </h2>
              <p className="text-secondary font-medium text-base sm:text-lg italic">
                {loginTab === 'login' ? 'Insira suas credenciais corporativas.' : 'Cadastre sua senha de 4 números.'}
              </p>
            </div>

            {/* Segmented Control */}
            <div className="mb-8 sm:mb-10 flex p-1.5 bg-surface-container-high rounded-[1.2rem] shadow-inner relative">
              <button 
                onClick={() => { setLoginTab('login'); setError(''); }}
                className={cn(
                  "flex-1 py-3.5 sm:py-4 text-[9px] sm:text-[10px] font-black rounded-xl transition-all duration-500 uppercase tracking-[0.2em] tap-press",
                  loginTab === 'login' ? "bg-white text-primary shadow-xl scale-[1.02]" : "text-secondary hover:text-primary"
                )}
              >
                Entrar
              </button>
              <button 
                onClick={() => { setLoginTab('register'); setError(''); }}
                className={cn(
                  "flex-1 py-3.5 sm:py-4 text-[9px] sm:text-[10px] font-black rounded-xl transition-all duration-500 uppercase tracking-[0.2em] tap-press",
                  loginTab === 'register' ? "bg-white text-primary shadow-xl scale-[1.02]" : "text-secondary hover:text-primary"
                )}
              >
                Cadastrar Senha
              </button>
            </div>

            <form className="space-y-8" onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-secondary uppercase tracking-[0.2em] ml-2">
                    CPF Registrado
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

                {loginTab === 'register' ? (
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
                        type={showRegisterPassword ? "text" : "password"}
                        inputMode="numeric"
                        maxLength={4}
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="absolute inset-y-0 right-0 pr-6 flex items-center text-outline/40 hover:text-primary transition-colors tap-press"
                      >
                        {showRegisterPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
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
                        type={showPassword ? "text" : "password"}
                        inputMode="numeric"
                        maxLength={4}
                        value={password}
                        onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-6 flex items-center text-outline/40 hover:text-primary transition-colors tap-press"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 text-red-700 p-5 rounded-3xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border border-red-100 shadow-sm">
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
                  <span className="text-secondary font-semibold group-hover:text-primary transition-colors">Lembrar Acesso</span>
                </label>
              </div>

              <button 
                disabled={isSubmitting}
                className="w-full bg-primary text-white py-5 sm:py-6 rounded-[1.5rem] font-black flex items-center justify-center space-x-4 group hover:scale-[1.02] tap-press transition-all shadow-2xl shadow-primary/30 disabled:opacity-50 disabled:scale-100"
              >
                <span className="uppercase tracking-[0.3em] text-[10px]">
                  {isSubmitting ? 'Verificando...' : loginTab === 'register' ? 'Criar Minha Senha' : 'Acessar Meu Portal'}
                </span>
                {!isSubmitting && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>

            {/* Biometrics */}
            <div className="mt-16">
              <div className="flex items-center mb-10">
                <div className="flex-1 h-px bg-surface-container-high"></div>
                <span className="px-6 text-[10px] font-black text-outline/40 uppercase tracking-[0.4em]">Biometria</span>
                <div className="flex-1 h-px bg-surface-container-high"></div>
              </div>
              <div className="flex justify-center flex-wrap gap-8">
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
              </div>
            </div>

            <ContactButton variant="inline" />

            <div className="mt-20 pt-10 border-t border-surface-container-high text-center space-y-4">
              <button 
                onClick={() => setIsAboutOpen(true)}
                className="text-[9px] text-secondary/40 uppercase tracking-[0.4em] font-black hover:text-primary transition-all group block mx-auto"
              >
                <span>Nuvem Ativa • Holerium v2.5.1</span>
              </button>
              <p className="text-[9px] text-secondary/30 uppercase tracking-[0.1em] font-medium">
                © Holerium Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>
      </div>
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
}
