import React, { useState, useEffect, useRef } from 'react';
import { 
  Edit2, 
  Lock, 
  UserMinus, 
  UserCheck, 
  Search, 
  Plus,
  MoreVertical,
  Upload,
  Trash2,
  AlertTriangle,
  X,
  ArrowLeft,
  CloudCog,
  Loader2,
  FileUp,
  History,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';

const initialEmployees = [
  { 
    id: 1, 
    name: 'Beatriz Silva', 
    role: 'Arquiteta Sênior', 
    cpf: '423.891.002-45', 
    status: 'Ativo',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80'
  },
  { 
    id: 2, 
    name: 'Ricardo Santos', 
    role: 'Analista de Segurança', 
    cpf: '154.223.990-12', 
    status: 'Inativo',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80'
  },
  { 
    id: 3, 
    name: 'Elena Petrov', 
    role: 'Supervisora do Portal', 
    cpf: '883.102.554-09', 
    status: 'Ativo',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&q=80'
  },
];

export default function EmployeeRegistry() {
  const navigate = useNavigate();
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, status: '' });
  const [syncLogs, setSyncLogs] = useState<{ type: 'info' | 'error' | 'success', msg: string }[]>([]);
  const [syncReferenceYear, setSyncReferenceYear] = useState(new Date().getFullYear().toString());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', cpf: '' });
  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});
  
  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser') || '{}');
    } catch { return {}; }
  });

  const userIsMaster = ['Desenvolvedor Geral', 'superadmin'].includes(currentUser?.role);


  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name');
        
      if (error) throw error;
      setEmployeesList(data || []);
    } catch (err) {
      console.error('Erro ao buscar funcionários:', err);
    } finally {
      setLoading(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteStep, setDeleteStep] = useState<Record<number, number>>({});

  const handleDeleteClick = async (empId: number) => {
    const currentStep = deleteStep[empId] || 0;
    if (currentStep === 0) {
      setDeleteStep(prev => ({ ...prev, [empId]: 1 }));
    } else if (currentStep === 1) {
      setDeleteStep(prev => ({ ...prev, [empId]: 2 }));
    } else if (currentStep === 2) {
      try {
        const { error } = await supabase
          .from('employees')
          .delete()
          .eq('id', empId);
        
        if (error) throw error;

        setEmployeesList(prev => prev.filter(emp => emp.id !== empId));
        setDeleteStep(prev => {
          const newState = { ...prev };
          delete newState[empId];
          return newState;
        });
      } catch (err) {
        console.error('Erro ao excluir funcionário:', err);
        alert('Erro ao excluir do servidor.');
      }
    }
  };

  const cancelDelete = (empId: number) => {
    setDeleteStep(prev => {
      const newState = { ...prev };
      delete newState[empId];
      return newState;
    });
  };

  const toggleStatus = async (empId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'Ativo' ? 'Inativo' : 'Ativo';
    try {
      const { error } = await supabase
        .from('employees')
        .update({ status: newStatus })
        .eq('id', empId);
      
      if (error) throw error;
      
      setEmployeesList(prev => prev.map(emp => 
        emp.id === empId ? { ...emp, status: newStatus } : emp
      ));
    } catch (err) {
      console.error('Erro ao alternar status:', err);
    }
  };

  const handleEditEmployee = (emp: any) => {
    setEditingEmployee(emp);
    setEditForm({ name: emp.name, cpf: emp.cpf });
    setIsEditModalOpen(true);
  };

  const saveEmployeeEdit = async () => {
    if (!editingEmployee) return;
    
    const nameChanged = editForm.name !== editingEmployee.name;
    const cpfChanged = editForm.cpf !== editingEmployee.cpf;

    if (!nameChanged && !cpfChanged) {
      setIsEditModalOpen(false);
      return;
    }

    try {
      if (cpfChanged) {
        // 1. Atualizar documentos vinculados ao CPF antigo para não perder histórico
        const { error: docError } = await supabase
          .from('documents')
          .update({ owner_cpf: editForm.cpf })
          .eq('owner_cpf', editingEmployee.cpf);
        
        if (docError) throw new Error('Erro ao atualizar documentos: ' + docError.message);
      }

      // 2. Atualizar o funcionário
      const { error: empError } = await supabase
        .from('employees')
        .update({ name: editForm.name, cpf: editForm.cpf })
        .eq('id', editingEmployee.id);

      if (empError) throw empError;

      setEmployeesList(prev => prev.map(e => e.id === editingEmployee.id ? { ...e, name: editForm.name, cpf: editForm.cpf } : e));
      setIsEditModalOpen(false);
      alert('Cadastro atualizado com sucesso!');
    } catch (err: any) {
      alert('Erro na atualização: ' + err.message);
    }
  };

  const handleResetPassword = async (emp: any) => {
    const confirm = window.confirm(`Deseja resetar a senha de ${emp.name}? O colaborador precisará cadastrar uma nova senha no próximo login.`);
    if (!confirm) return;
    
    try {
      const { error } = await supabase
        .from('employees')
        .update({ password: null })
        .eq('id', emp.id);

      if (error) throw error;
      
      alert('Senha resetada com sucesso! O campo agora está livre para novo cadastro.');
      fetchEmployees();
    } catch (err: any) {
      alert('Erro ao resetar: ' + err.message);
    }
  };

  const handleExportCSV = () => {
    if (employeesList.length === 0) {
      alert('Não há funcionários para exportar.');
      return;
    }

    // Cabeçalho do CSV
    const headers = ['Nome', 'CPF', 'Cargo', 'Status'];
    
    // Mapeia os dados dos funcionários
    const rows = employeesList.map(emp => [
      `"${emp.name}"`,
      `"${emp.cpf}"`,
      `"${emp.role || 'Colaborador'}"`,
      `"${emp.status}"`
    ]);

    // Une cabeçalho e linhas
    const csvContent = [
      headers.join(';'),
      ...rows.map(r => r.join(';'))
    ].join('\n');

    // Cria o Blob e dispara o download (UTF-8 com BOM para Excel identificar acentos)
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `lista_funcionarios_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      let startIndex = 0;
      if (lines[0].toLowerCase().includes('nome')) {
        startIndex = 1;
      }

      const employeesToInsert = [];
      const logs = [];
      let addedCount = 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split(/[;,]/);
        let name = parts[0]?.trim().replace(/["']/g, '') || '';
        let cpf = parts[1]?.trim().replace(/["']/g, '') || '';
        
        name = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        cpf = cpf.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        const cleanCpf = cpf.replace(/\D/g, '');
        // Verifica se já foi adicionado neste mesmo lote (no arquivo CSV)
        const existsInBatch = employeesToInsert.some(e => e.cpf.replace(/\D/g, '') === cleanCpf);

        if (name && cpf && !existsInBatch) {
          employeesToInsert.push({
            name: name,
            cpf: cpf, 
            role: 'Colaborador',
            status: 'Ativo',
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
          });
          addedCount++;
        }
      }

      if (employeesToInsert.length > 0) {
        // Usamos upsert para que CPFs existentes sejam atualizados em vez de dar erro
        const { error } = await supabase
          .from('employees')
          .upsert(employeesToInsert, { onConflict: 'cpf' });
          
        if (error) {
          console.error('Erro ao importar CSV para o servidor:', error);
          alert('Erro ao salvar no banco de dados: ' + error.message);
        } else {
          fetchEmployees();
          logs.unshift({
            type: 'success',
            title: 'Importação Concluída',
            message: `${addedCount} novos funcionários foram adicionados com sucesso ao servidor.`,
            timestamp: new Date().toLocaleString()
          });
        }
      }

      const existingLogs = JSON.parse(localStorage.getItem('import_errors_log') || '[]');
      localStorage.setItem('import_errors_log', JSON.stringify([...logs, ...existingLogs].slice(0, 50)));

      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const startBatchSync = async () => {
    try {
      // @ts-ignore
      const handle = await window.showDirectoryPicker({ mode: 'read' });
      setIsSyncing(true);
      setSyncLogs([{ type: 'info', msg: `Iniciando varredura em: ${handle.name}...` }]);
      
      const filesToUpload: { handle: FileSystemFileHandle, path: string, year: string, month: string, category: string }[] = [];
      const fullHistory: { type: 'info' | 'error' | 'success', msg: string }[] = [];

      const addLog = (type: 'info' | 'error' | 'success', msg: string) => {
        const newLog = { type, msg };
        fullHistory.push(newLog);
        setSyncLogs(prev => [newLog, ...prev.slice(0, 19)]);
      };
      
      const scan = async (dirHandle: FileSystemDirectoryHandle, currentPath: string = '') => {
        const normalize = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        
        // @ts-ignore
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'directory') {
            await scan(entry, `${currentPath}${entry.name}/`);
          } else if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.pdf')) {
            const fullPathNorm = normalize(currentPath + entry.name);
            
            let year = syncReferenceYear;
            let month = '01';
            let category = 'holerite';

            const isRendimentos = fullPathNorm.includes('RENDIMENTOS') || 
                                 fullPathNorm.includes('DIRF') || 
                                 fullPathNorm.includes('INFORME') || 
                                 fullPathNorm.includes('COMPROVANTE');

            if (isRendimentos) {
              month = '16';
              category = 'rendimentos';
              // Prioriza o ano que está no NOME do arquivo para rendimentos
              const fileNameNorm = normalize(entry.name);
              const yMatchFile = fileNameNorm.match(/(\d{4})/);
              const yMatchPath = fullPathNorm.match(/(\d{4})/);
              
              if (yMatchFile) {
                year = yMatchFile[1];
              } else if (yMatchPath) {
                year = yMatchPath[1];
              }
            } else if (fullPathNorm.includes('FERIAS')) {
              month = '15';
              category = 'ferias';
              const yMatch = fullPathNorm.match(/(\d{4})/);
              if (yMatch) year = yMatch[1];
            } else if (fullPathNorm.includes('13') && (fullPathNorm.includes('1ª') || fullPathNorm.includes('1A') || fullPathNorm.includes('1 PARC'))) {
              month = '13';
              category = '13_salario_1';
              const yMatch = fullPathNorm.match(/(\d{4})/);
              if (yMatch) year = yMatch[1];
            } else if (fullPathNorm.includes('13') && (fullPathNorm.includes('2ª') || fullPathNorm.includes('2A') || fullPathNorm.includes('2 PARC'))) {
              month = '14';
              category = '13_salario_2';
              const yMatch = fullPathNorm.match(/(\d{4})/);
              if (yMatch) year = yMatch[1];
            } else {
              const folderMatch = fullPathNorm.match(/(\d{2})[-/](\d{4})/) || fullPathNorm.match(/(\d{2})_(\d{4})/) || fullPathNorm.match(/(\d{2})\.(\d{4})/);
              if (folderMatch) {
                month = folderMatch[1];
                year = folderMatch[2];
              } else {
                const yMatch = fullPathNorm.match(/(\d{4})/);
                if (yMatch) year = yMatch[1];
              }
            }
            filesToUpload.push({ handle: entry as FileSystemFileHandle, path: `${currentPath}${entry.name}`, year, month, category });
          }
        }
      };

      await scan(handle, handle.name + '/');
      setSyncProgress({ current: 0, total: filesToUpload.length, status: 'Preparando upload...' });
      
      let count = 0;
      for (const item of filesToUpload) {
        count++;
        const file = await item.handle.getFile();
        const fileName = item.handle.name;
        
        const simplify = (text: string) => 
          text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
          .replace(/(.)\1+/g, "$1") // Remove letras duplicadas (LL -> L, SS -> S, etc)
          .trim();

        const currentFileName = fileName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
        const simplifiedFileName = simplify(fileName);
        const baseFileName = currentFileName.replace(/\.PDF$/, '').replace(/^[0-9.]+\s*/, '').trim();
        const simplifiedBase = simplify(baseFileName);
        const cleanCpfFromFileName = fileName.replace(/\D/g, '');
        
        const employee = employeesList.find(emp => {
          const empNamePre = (emp.name || '');
          const empCleanCpf = (emp.cpf || '').replace(/\D/g, '');
          const empCleanName = empNamePre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
          const empSimplified = simplify(empNamePre);
          
          if (!empCleanName || !empCleanCpf) return false;

          // 1. Tenta casar por CPF exato
          if (cleanCpfFromFileName.includes(empCleanCpf) && empCleanCpf.length >= 11) return true;

          // 2. Tenta casar se TODAS as palavras do arquivo estão no nome (Fuzzy)
          const fileWords = baseFileName.split(/[\s._-]+/).filter(w => w.length > 2);
          if (fileWords.length > 0 && fileWords.every(word => empCleanName.includes(word))) return true;

          // 3. Tenta casar pela versão SIMPLIFICADA (Fellipe -> Felipe)
          if (empSimplified.includes(simplifiedBase) || simplifiedBase.includes(empSimplified)) return true;

          // 4. Fallback: Nome contido ou arquivo contido
          return currentFileName.includes(empCleanName) || empCleanName.includes(baseFileName);
        });

        if (!employee) {
          addLog('error', `Não identificado: ${fileName}`);
          continue;
        }

        const normalizedFileName = fileName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const cloudPath = `${employee.cpf}/${item.year}/${item.month}/${normalizedFileName}`;
        
        const { error: storageErr } = await supabase.storage
          .from('receipts')
          .upload(cloudPath, file, { upsert: true });

        if (storageErr) {
          addLog('error', `Erro Cloud: ${storageErr.message} (${normalizedFileName})`);
          continue;
        }

        // REGRA DE ARQUIVO UNICO: Limpeza por ID antes de Upsert
        try {
          // LIMPEZA AGRESSIVA: Antes de inserir, remove qualquer registro que tenha o MESMO NOME de arquivo para este usuário
          // Isso garante que se o ano foi detectado errado antes, ele seja limpo agora.
          await supabase
            .from('documents')
            .delete()
            .match({ owner_cpf: employee.cpf, filename: normalizedFileName });
        } catch (e) {
          console.error("Erro na limpeza pré-inserção:", e);
        }

        const { error: dbErr } = await supabase
          .from('documents')
          .insert({
            owner_cpf: employee.cpf,
            year: item.year,
            month: item.month,
            filename: normalizedFileName,
            file_path: cloudPath,
            category: item.category
          });

        if (dbErr) {
          addLog('error', `Erro Banco: ${dbErr.message}`);
        } else {
          addLog('success', `Sucesso: ${employee.name} (${item.month}/${item.year})`);
        }

        setSyncProgress(prev => ({ ...prev, current: count }));
      }

      alert('Sincronização concluída!');

      // GERAR ARQUIVO DE LOG PARA O USUÁRIO
      const logHeader = `RELATÓRIO DE SINCRONIZAÇÃO - PORTAL SUPER\nData: ${new Date().toLocaleString()}\nTotal Processado: ${filesToUpload.length}\n------------------------------------------\n\n`;
      const logBody = fullHistory.map(l => `[${l.type.toUpperCase()}] ${l.msg}`).join('\n');
      const blob = new Blob([logHeader + logBody], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `log_sincronia_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (err: any) {
      if (err.name !== 'AbortError') alert(`Erro: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="p-10 flex-1 flex flex-col gap-8 animate-fade-in">
      <div className="flex items-center gap-5 mb-2">
        <button 
          onClick={() => navigate('/dashboard')}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-white hover:bg-slate-50 transition-colors text-primary shadow-sm border border-slate-100 active:scale-95"
          title="Voltar ao Início"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <section className="space-y-1">
          <h2 className="text-4xl md:text-5xl font-extrabold font-headline text-on-surface tracking-tight">Gerenciamento de Funcionários</h2>
        </section>
      </div>

      <section className="flex justify-between items-end">
        <div className="space-y-2">
          <p className="text-secondary font-body max-w-2xl">Gerencie o acesso seguro a documentos e perfis de identidade para o ecossistema corporativo.</p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface px-6 py-3 rounded-full font-bold active:scale-95 transition-all shadow-sm"
          >
            <Upload className="w-5 h-5" />
            <span>Importar CSV</span>
          </button>
          <button className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full font-bold hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-primary/20">
            <Plus className="w-5 h-5" />
            <span>Novo Funcionário</span>
          </button>
        </div>
      </section>

      <div className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm border border-surface-container-high">
        <div className="p-6 border-b border-surface-container-high flex justify-between items-center bg-surface-container-low/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-surface-container-high rounded-full text-sm w-80 focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-surface-container rounded-lg transition-colors text-secondary">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="px-8 py-5 text-[11px] font-extrabold uppercase tracking-widest text-secondary font-label">Perfil</th>
                <th className="px-8 py-5 text-[11px] font-extrabold uppercase tracking-widest text-secondary font-label">Identificação (CPF)</th>
                <th className="px-8 py-5 text-[11px] font-extrabold uppercase tracking-widest text-secondary font-label text-center">Status</th>
                <th className="px-8 py-5 text-[11px] font-extrabold uppercase tracking-widest text-secondary font-label text-center">Senha</th>
                <th className="px-8 py-5 text-[11px] font-extrabold uppercase tracking-widest text-secondary font-label text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {employeesList.filter(emp => 
                emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                emp.cpf.includes(searchTerm)
              ).map((emp) => (
                <tr key={emp.id} className="hover:bg-surface-container-high/20 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden ring-2 ring-primary/5">
                        <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <p className="font-bold font-headline text-blue-900">{emp.name}</p>
                        <p className="text-xs text-slate-500 font-body">{emp.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-sm font-medium font-body text-on-surface-variant">{emp.cpf}</td>
                  <td className="px-8 py-6 text-center">
                    <span className={cn(
                      "px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      emp.status === 'Ativo' ? "bg-tertiary-fixed text-on-tertiary-fixed-variant" : "bg-secondary-container text-on-secondary-container"
                    )}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 group/pass">
                        <span className={cn(
                          "font-mono text-sm font-bold tracking-widest",
                          emp.password ? "text-primary" : "text-slate-300 italic text-[10px]"
                        )}>
                          {emp.password 
                            ? (visiblePasswords[emp.id] ? emp.password : '••••') 
                            : 'Não cadastrada'}
                        </span>
                        {emp.password && (
                          <button 
                            onClick={() => setVisiblePasswords(prev => ({ ...prev, [emp.id]: !prev[emp.id] }))}
                            className="p-1 hover:bg-white rounded-md text-slate-400 hover:text-primary transition-all"
                          >
                            {visiblePasswords[emp.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2 items-center">
                      {/* Travar o perfil mestre para quem não é Master Developer */}
                      {(emp.cpf === '000.000.000-00' || emp.role === 'superadmin' || emp.role === 'Desenvolvedor Geral') && !userIsMaster ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-full text-[10px] font-bold text-slate-400">
                          <Lock className="w-3 h-3" />
                          <span>ACESSO RESTRITO</span>
                        </div>
                      ) : !deleteStep[emp.id] ? (
                        <>
                          <button 
                            onClick={() => handleEditEmployee(emp)}
                            className="p-2 rounded-full hover:bg-white text-slate-400 hover:text-blue-900 transition-colors shadow-sm" title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleResetPassword(emp)}
                            className="p-2 rounded-full hover:bg-white text-slate-400 hover:text-blue-900 transition-colors shadow-sm" title="Senha"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                          {emp.status === 'Ativo' ? (
                            <button 
                              onClick={() => toggleStatus(emp.id, emp.status)}
                              className="p-2 rounded-full hover:bg-white text-slate-400 hover:text-error transition-colors shadow-sm" title="Desativar"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          ) : (
                            <button 
                              onClick={() => toggleStatus(emp.id, emp.status)}
                              className="p-2 rounded-full hover:bg-white text-slate-400 hover:text-tertiary-fixed-dim transition-colors shadow-sm" title="Ativar"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => handleDeleteClick(emp.id)} className="p-2 rounded-full hover:bg-white text-slate-400 hover:text-red-600 transition-colors shadow-sm" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : deleteStep[emp.id] === 1 ? (
                        <div className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-1 rounded-full border border-red-200">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-xs font-bold">Excluir?</span>
                          <button onClick={() => handleDeleteClick(emp.id)} className="hover:bg-red-200 p-1.5 rounded-full bg-red-100 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <button onClick={() => cancelDelete(emp.id)} className="hover:bg-red-100 p-1.5 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full shadow-lg shadow-red-500/30">
                          <span className="text-xs font-bold px-1">Tem certeza?</span>
                          <button onClick={() => handleDeleteClick(emp.id)} className="hover:bg-red-700 bg-red-500 p-1.5 rounded-full transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <button onClick={() => cancelDelete(emp.id)} className="hover:bg-red-700 p-1.5 rounded-full transition-colors opacity-80">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <section className="bg-white rounded-3xl p-8 shadow-sm border border-surface-container-high mt-8 space-y-6">
        <div className="flex items-center justify-between border-b border-surface-container-high pb-4">
          <div className="flex items-center gap-3">
            <CloudCog className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold text-on-surface">Sincronização Cloud (Importação em Lote)</h3>
          </div>
          {isSyncing && (
              <div className="flex items-center gap-2 text-primary font-bold animate-pulse text-xs">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando...
              </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-4">
              <p className="text-sm text-secondary leading-relaxed">
                  Selecione a pasta raiz do seu servidor de recibos. O sistema irá identificar automaticamente os funcionários por nome ou CPF, anos e meses para cada PDF e subirá para a nuvem.
              </p>
              <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Dica de Organização</p>
                  <p className="text-[10px] text-secondary">
                      O sistema busca pastas no formato "MM-AAAA" e palavras como "DIRE/RENDIMENTOS" no caminho dos arquivos.
                  </p>
              </div>
              <div className="space-y-2">
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">Ano de Referência (Obrigatório p/ Férias/13º)</label>
                  <input 
                      type="text" 
                      value={syncReferenceYear}
                      onChange={e => setSyncReferenceYear(e.target.value)}
                      className="w-full bg-white border border-surface-container-high rounded-xl py-2 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder="Ex: 2026"
                  />
                  <p className="text-[10px] text-secondary italic">Se o robô não encontrar o ano escrito na pasta, ele usará este valor.</p>
              </div>
              <button
                  disabled={isSyncing}
                  onClick={startBatchSync}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
              >
                  <FileUp className="w-5 h-5" />
                  Selecionar Pasta e Sincronizar
              </button>
          </div>

          <div className="md:col-span-2 bg-surface-container-low rounded-3xl p-6 border border-surface-container-high relative overflow-hidden flex flex-col min-h-[300px]">
              {isSyncing ? (
                  <div className="space-y-6 animate-fade-in">
                      <div className="space-y-2">
                         <div className="flex justify-between items-end">
                              <span className="text-xs font-bold text-secondary uppercase tracking-widest">Progresso do Upload</span>
                              <span className="text-sm font-black text-primary">{Math.round((syncProgress.current / syncProgress.total) * 100)}%</span>
                         </div>
                         <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                              <motion.div 
                                  className="h-full bg-primary"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                              />
                         </div>
                         <p className="text-[10px] text-secondary-variant font-medium">{syncProgress.current} de {syncProgress.total} arquivos processados</p>
                      </div>

                      <div className="space-y-2">
                          <span className="text-[10px] font-bold text-secondary uppercase tracking-widest flex items-center gap-2">
                              <History className="w-3 h-3" />
                              Monitor de Sincronia
                          </span>
                          <div className="bg-white rounded-xl p-4 border border-surface-container-high h-[150px] overflow-auto flex flex-col gap-2 shadow-inner">
                              {syncLogs.map((log, i) => (
                                  <div key={i} className={cn(
                                      "text-[10px] font-medium flex items-center gap-2 pb-1 border-b border-slate-50",
                                      log.type === 'error' ? "text-red-500" : 
                                      log.type === 'success' ? "text-green-600" : 
                                      log.type === 'update' ? "text-blue-600" : "text-slate-500"
                                  )}>
                                      <div className={cn(
                                          "w-1 h-1 rounded-full", 
                                          log.type === 'error' ? "bg-red-500" : 
                                          log.type === 'success' ? "bg-green-500" : 
                                          log.type === 'update' ? "bg-blue-500" : "bg-slate-300"
                                      )} />
                                      {log.msg}
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                      <div className="w-16 h-16 bg-surface-container-high rounded-full flex items-center justify-center">
                          <CloudCog className="w-8 h-8 text-outline" />
                      </div>
                      <div>
                          <p className="font-bold text-on-surface">Aguardando Início</p>
                          <p className="text-xs text-secondary">A sincronização ainda não foi iniciada.</p>
                      </div>
                  </div>
              )}
          </div>
        </div>
      </section>

      {/* Modal de Edição */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-primary/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-headline font-bold text-on-surface">Editar Cadastro</h3>
                  <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">Nome Completo</label>
                    <input 
                      type="text" 
                      value={editForm.name}
                      onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">Identificação (CPF)</label>
                    <input 
                      type="text" 
                      value={editForm.cpf}
                      onChange={e => setEditForm(prev => ({ ...prev, cpf: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={saveEmployeeEdit}
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
