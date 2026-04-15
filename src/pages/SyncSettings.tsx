import React, { useState, useRef, useEffect } from 'react';
import { Camera, BadgeAlert, FolderOpen, Save, ArrowLeft, Fingerprint, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';

export default function SyncSettings() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser') || '{}');
    } catch { return {}; }
  });
  const [isRegisteringBio, setIsRegisteringBio] = useState(false);

  const [folderPath, setFolderPath] = useState(() => {
    return localStorage.getItem('receiptsFolderPath') || 'Nenhuma pasta vinculada';
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectFolder = async () => {
    try {
      // @ts-ignore - File System Access API
      const dirHandle = await window.showDirectoryPicker({
        mode: 'read',
      });
      // Navegadores não expõem o caminho raiz completo por segurança (ex: C:\...), 
      // mas expõem o nome da pasta e permitem guardar sua referência.
      const displayPath = `Pasta local selecionada: /${dirHandle.name}`;
      setFolderPath(displayPath);
      localStorage.setItem('receiptsFolderPath', displayPath);
      
      // Salva aviso
      alert(`A pasta '${dirHandle.name}' foi vinculada com sucesso ao navegador!`);
    } catch (err) {
      console.log('Seleção de diretório cancelada ou não suportada', err);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limite de 300 KB (300 * 1024 bytes)
    const MAX_SIZE = 300 * 1024;
    if (file.size > MAX_SIZE) {
      alert(`A imagem é muito grande (${(file.size / 1024).toFixed(1)} KB). Por favor, selecione uma imagem de até 300 KB para economizar espaço no servidor.`);
      return;
    }

    try {
      // 1. Upload para o Supabase Storage (Pasta avatars/)
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.cpf || 'unknown'}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Obter a URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      // 3. Atualizar no banco de dados (tabela employees)
      const { error: dbError } = await supabase
        .from('employees')
        .update({ avatar: publicUrl })
        .eq('cpf', currentUser.cpf);

      if (dbError) throw dbError;

      // 4. Atualizar LocalStorage e Estado
      const updatedUser = { ...currentUser, avatar: publicUrl };
      setCurrentUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));

      alert('Foto de perfil atualizada com sucesso!');
      
      // Pequeno delay antes do reload para garantir a escrita no Storage
      setTimeout(() => window.location.reload(), 500);
    } catch (err: any) {
      console.error('Erro ao atualizar avatar:', err);
      alert('Erro ao salvar foto: ' + (err.message || 'Erro desconhecido'));
    }
  };

  const registerBiometrics = async () => {
    try {
      if (!window.PublicKeyCredential) {
        alert('Seu navegador não suporta biometria WebAuthn.');
        return;
      }

      setIsRegisteringBio(true);

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const creationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: { name: "Holerium", id: window.location.hostname },
        user: {
          id: Uint8Array.from(currentUser.cpf.replace(/\D/g, ''), c => c.charCodeAt(0)),
          name: currentUser.name,
          displayName: currentUser.name,
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
        timeout: 60000,
        attestation: "none",
        authenticatorSelection: {
           authenticatorAttachment: "platform",
           userVerification: "required",
           residentKey: "required"
        }
      };

      const credential = await navigator.credentials.create({
        publicKey: creationOptions
      }) as PublicKeyCredential;

      if (credential) {
        const { error } = await supabase
          .from('employees')
          .update({ bio_id: credential.id })
          .eq('cpf', currentUser.cpf);

        if (error) throw error;
        
        // Atualiza localmente
        const updatedUser = { ...currentUser, bio_id: credential.id };
        setCurrentUser(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));

        alert('Biometria ativada com sucesso neste dispositivo!');
      }
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') { // Ignora se o usuário cancelar
        console.error('Erro ao registrar biometria:', err);
        alert('Falha ao ativar biometria: ' + err.message);
      }
    } finally {
      setIsRegisteringBio(false);
    }
  };

  const removeBiometrics = async () => {
    if (!confirm('Deseja realmente remover o acesso biométrico deste dispositivo?')) return;
    try {
      setIsRegisteringBio(true);
      const { error } = await supabase
        .from('employees')
        .update({ bio_id: null })
        .eq('cpf', currentUser.cpf);

      if (error) throw error;
      
      const updatedUser = { ...currentUser, bio_id: null };
      setCurrentUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      alert('Biometria removida.');
    } catch (err: any) {
      alert('Erro ao remover: ' + err.message);
    } finally {
      setIsRegisteringBio(false);
    }
  };

  const isColaborador = currentUser.role !== 'Administrador do Sistema';

  return (
    <div className="p-10 flex-1 flex flex-col gap-8 animate-fade-in max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-5 mb-2">
        <button 
          onClick={() => navigate('/dashboard')}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-white hover:bg-slate-50 transition-colors text-primary shadow-sm border border-slate-100 active:scale-95"
          title="Voltar ao Início"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <section className="space-y-2">
          <h2 className="text-4xl md:text-5xl font-extrabold font-headline text-on-surface tracking-tight">
            {isColaborador ? 'Meu Perfil' : 'Perfil Administrador'}
          </h2>
        </section>
      </div>

      <section className="space-y-2">
        <p className="text-secondary font-body max-w-2xl">
          {isColaborador 
            ? 'Gerencie sua foto de perfil oficial no Portal.' 
            : 'Atualmente focado no gerenciamento de seu próprio perfil.'}
        </p>
      </section>

      <div className="bg-surface-container-lowest rounded-3xl p-12 shadow-sm border border-surface-container-high flex flex-col items-center justify-center text-center space-y-6">
        <div className="relative group">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-surface shadow-xl bg-surface-container-highest">
            <img 
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80'} 
              alt="Avatar" 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
            />
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 p-3 bg-primary text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all group-hover:ring-4 ring-primary/20"
          >
            <Camera className="w-5 h-5" />
          </button>
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleAvatarUpload} 
            className="hidden" 
          />
        </div>

        <div>
          <h3 className="text-2xl font-bold text-on-surface">{currentUser.name || 'Usuário Local'}</h3>
          <p className="text-primary font-bold uppercase tracking-widest text-xs mt-1">{currentUser.role || 'Convidado'}</p>
        </div>
        
        {isColaborador && (
          <div className="flex items-center gap-2 mt-4 px-4 py-3 bg-blue-50 text-blue-900 rounded-2xl text-xs font-bold border border-blue-100">
            <BadgeAlert className="w-5 h-5 text-primary" />
            <span className="text-left">Suas credenciais (Nome e CPF) são blindadas e exclusivas. Apenas o Administrador Global pode alterá-las. A sua foto, porém, é customizável.</span>
          </div>
        )}
      </div>

      {/* Seção de Biometria */}
      <section className="bg-white rounded-3xl p-10 shadow-sm border border-surface-container-high space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/5 text-primary rounded-2xl flex items-center justify-center">
            <Fingerprint className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-on-surface">Acesso Biométrico</h3>
            <p className="text-xs text-secondary font-medium">Use sua digital ou reconhecimento facial para um acesso instantâneo.</p>
          </div>
        </div>

        <div className="bg-surface-container rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <p className="text-sm font-bold text-on-surface">
              {currentUser.bio_id ? 'Biometria Ativa' : 'Biometria Desativada'}
            </p>
            <p className="text-xs text-secondary leading-relaxed max-w-sm">
              Ao ativar, você poderá entrar no Holerium apenas com o sensor de digital do seu dispositivo. Seguro, criptografado e prático.
            </p>
          </div>

          {!currentUser.bio_id ? (
            <button 
              onClick={registerBiometrics}
              disabled={isRegisteringBio}
              className="bg-primary text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <Fingerprint className="w-4 h-4" />
              {isRegisteringBio ? 'Registrando...' : 'Ativar Digital'}
            </button>
          ) : (
            <button 
              onClick={removeBiometrics}
              disabled={isRegisteringBio}
              className="bg-red-50 text-red-600 px-8 py-3 rounded-xl font-bold text-sm hover:bg-red-100 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <Trash2 className="w-4 h-4" />
              Remover Acesso
            </button>
          )}
        </div>
      </section>

      {!isColaborador && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-surface-container-low rounded-3xl p-10 shadow-sm border border-surface-container-high mt-4">
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold font-headline text-on-surface">Diretório Mestre de Recibos</h3>
              <p className="text-secondary text-sm max-w-2xl">
                Configure o caminho local no seu computador ou servidor onde as pastas de recibos de pagamentos estão armazenadas (ex: as pastas contendo os anos e meses dos PDFs).
              </p>
            </div>
            
            <div className="space-y-4 pt-4">
              <label className="block text-xs font-bold uppercase tracking-widest text-secondary">Vínculo de Diretório</label>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 bg-surface-container-highest rounded-2xl px-4 py-4 flex items-center gap-4 border border-outline-variant/30">
                  <FolderOpen className="w-6 h-6 text-primary flex-shrink-0" />
                  <span className="font-mono text-sm text-on-surface font-medium opacity-80 select-none truncate">
                    {folderPath}
                  </span>
                </div>
                <button 
                  onClick={handleSelectFolder}
                  className="bg-primary hover:bg-primary/90 text-white px-8 py-4 sm:py-0 rounded-2xl font-bold active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 whitespace-nowrap"
                >
                  <FolderOpen className="w-5 h-5 fill-white/20" />
                  Localizar Pasta...
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-secondary mt-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <p>Clique em "Localizar Pasta" para abrir o explorador nativo do Windows e apontar o repositório.</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
