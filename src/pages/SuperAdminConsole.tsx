import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Settings, 
  Database, 
  Shield, 
  Search, 
  Filter, 
  Trash2, 
  UserPlus, 
  Download, 
  Upload, 
  RefreshCcw, 
  Key, 
  ArrowLeft, 
  X, 
  Check, 
  AlertCircle,
  FileText,
  Activity,
  UserCheck,
  UserX,
  ShieldCheck,
  CloudCog,
  Loader2,
  FileUp,
  History,
  Lock
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';
import { cn } from '@/src/lib/utils';

interface Employee {
  id: string;
  name: string;
  cpf: string;
  role: 'user' | 'admin' | 'superadmin';
  created_at?: string;
}

export default function SuperAdminConsole() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, status: '' });
  const [syncLogs, setSyncLogs] = useState<{ type: 'info' | 'error' | 'success', msg: string }[]>([]);
  const [storageStats, setStorageStats] = useState({ usedRecords: 0, percent: 0, text: 'Conectando...' });
  const [menuPermissions, setMenuPermissions] = useState(() => {
    try {
      const saved = localStorage.getItem('menu_permissions_v1');
      return saved ? JSON.parse(saved) : {
        admin: ['/dashboard', '/documents', '/admin', '/logs', '/settings'],
        collaborator: ['/dashboard', '/documents', '/settings']
      };
    } catch {
      return {
        admin: ['/dashboard', '/documents', '/admin', '/logs', '/settings'],
        collaborator: ['/dashboard', '/documents', '/settings']
      };
    }
  });

  const availableMenus = [
    { path: '/dashboard', label: 'Início' },
    { path: '/documents', label: 'Meus Documentos' },
    { path: '/admin', label: 'Console Admin' },
    { path: '/logs', label: 'Logs de Auditoria' },
    { path: '/settings', label: 'Meu Perfil' },
  ];

  const togglePermission = (role: 'admin' | 'collaborator', path: string) => {
    const newPerms = { ...menuPermissions };
    if (newPerms[role].includes(path)) {
      newPerms[role] = newPerms[role].filter((p: string) => p !== path);
    } else {
      newPerms[role] = [...newPerms[role], path];
    }
    setMenuPermissions(newPerms);
    localStorage.setItem('menu_permissions_v1', JSON.stringify(newPerms));
  };


  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchEmployees(), calculateStorageUsage()]);
    } catch (err) {
      console.error('Erro ao recarregar dados:', err);
    }
    setLoading(false);
  };

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('name');
    if (data) setEmployees(data);
  };

  const calculateStorageUsage = async () => {
    try {
      const { count: empCount } = await supabase.from('employees').select('*', { count: 'exact', head: true });
      const { count: logCount } = await supabase.from('access_logs').select('*', { count: 'exact', head: true });
      const total = (empCount || 0) + (logCount || 0);
      const percent = Math.min((total / 10000) * 100, 100);
      setStorageStats({ 
        usedRecords: total, 
        percent, 
        text: `${total} registros no Supabase` 
      });
    } catch (err) {
      setStorageStats({ usedRecords: 0, percent: 0, text: 'Erro ao calcular ocupação' });
    }
  };

  const toggleAdminPrivilege = async (emp: Employee) => {
    const newRole = emp.role === 'admin' ? 'user' : 'admin';
    const { error } = await supabase
      .from('employees')
      .update({ role: newRole })
      .eq('id', emp.id);

    if (error) {
      alert('Erro ao atualizar privilégios: ' + error.message);
    } else {
      fetchEmployees();
    }
  };

  const handleExportBackup = async () => {
    try {
      setLoading(true);
      const [empRes, docRes, logRes] = await Promise.all([
        supabase.from('employees').select('*'),
        supabase.from('documents').select('*'),
        supabase.from('access_logs').select('*')
      ]);

      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        employees: empRes.data || [],
        documents: docRes.data || [],
        logs: logRes.data || []
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href",     dataStr);
      downloadAnchorNode.setAttribute("download", `portal_backup_completo_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      alert('Backup exportado com sucesso!');
    } catch (err: any) {
      alert('Erro ao exportar backup: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Deseja realmente restaurar os dados deste backup? Isso atualizará os registros existentes.')) {
      e.target.value = '';
      return;
    }

    try {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = JSON.parse(event.target?.result as string);
          
          if (!content.employees || !content.documents) {
            throw new Error('Formato de backup inválido.');
          }

          // Restaurar Funcionários
          if (content.employees.length > 0) {
            const { error: err1 } = await supabase.from('employees').upsert(content.employees);
            if (err1) throw new Error('Erro ao restaurar funcionários: ' + err1.message);
          }

          // Restaurar Documentos
          if (content.documents.length > 0) {
            const { error: err2 } = await supabase.from('documents').upsert(content.documents);
            if (err2) throw new Error('Erro ao restaurar documentos: ' + err2.message);
          }

          // Restaurar Logs (opcional)
          if (content.logs && content.logs.length > 0) {
            await supabase.from('access_logs').upsert(content.logs);
          }

          alert('Restauração concluída com sucesso!');
          fetchData();
        } catch (err: any) {
          alert('Erro no processamento do arquivo: ' + err.message);
        }
      };
      reader.readAsText(file);
    } catch (err: any) {
      alert('Erro ao ler arquivo: ' + err.message);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleResetSystem = () => {
    if (confirm('ATENÇÃO: Isso apagará TODOS os dados locais. Deseja continuar?')) {
      localStorage.clear();
      alert('Sistema resetado. Voltando ao login.');
      window.location.href = '/login';
    }
  };

  const startBatchSync = async () => {
    try {
      // @ts-ignore
      const handle = await window.showDirectoryPicker({ mode: 'read' });
      setIsSyncing(true);
      setSyncLogs([{ type: 'info', msg: `Iniciando varredura em: ${handle.name}...` }]);
      
      const filesToUpload: { handle: FileSystemFileHandle, path: string, year: string, month: string }[] = [];
      const fullHistory: { type: 'info' | 'error' | 'success', msg: string }[] = [];

      const addLog = (type: 'info' | 'error' | 'success', msg: string) => {
        const newLog = { type, msg };
        fullHistory.push(newLog);
        setSyncLogs(prev => [newLog, ...prev.slice(0, 19)]);
      };
      
      const scan = async (dirHandle: FileSystemDirectoryHandle, currentPath: string = '') => {
        // @ts-ignore
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'directory') {
            await scan(entry, `${currentPath}${entry.name}/`);
          } else if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.pdf')) {
            const pathParts = currentPath.split('/').filter(Boolean);
            let year = '2024';
            let month = '01';
            const folderMatch = entry.name.match(/(\d{2})-(\d{4})/) || (pathParts.length > 0 ? pathParts[pathParts.length-1].match(/(\d{2})-(\d{4})/) : null);
            if (folderMatch) {
              month = folderMatch[1];
              year = folderMatch[2];
            } else if (pathParts.length > 0) {
              const lastFolder = pathParts[pathParts.length-1];
              if (/^\d{4}$/.test(lastFolder)) year = lastFolder;
            }
            filesToUpload.push({ handle: entry as FileSystemFileHandle, path: `${currentPath}${entry.name}`, year, month });
          }
        }
      };

      await scan(handle);
      setSyncProgress({ current: 0, total: filesToUpload.length, status: 'Preparando upload...' });
      
      let count = 0;
      for (const item of filesToUpload) {
        count++;
        const file = await item.handle.getFile();
        const fileName = item.handle.name;
        
        const cleanName = fileName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        const cleanCpf = fileName.replace(/\D/g, '');
        
        const employee = employees.find(emp => {
          const empCleanCpf = emp.cpf.replace(/\D/g, '');
          const empCleanName = emp.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
          return empCleanCpf === cleanCpf || cleanName.includes(empCleanName) || empCleanName.includes(cleanName.replace('.PDF', ''));
        });

        if (!employee) {
          addLog('error', `Não identificado: ${fileName}`);
          continue;
        }

        const cloudPath = `${employee.cpf}/${item.year}/${item.month}/${fileName}`;
        
        const { error: storageErr } = await supabase.storage
          .from('receipts')
          .upload(cloudPath, file, { upsert: true });

        if (storageErr) {
          addLog('error', `Erro Cloud: ${storageErr.message} (${fileName})`);
          continue;
        }

        const { error: dbErr } = await supabase
          .from('documents')
          .upsert({
            owner_cpf: employee.cpf,
            year: item.year,
            month: item.month,
            filename: fileName,
            file_path: cloudPath
          });

        if (dbErr) {
          addLog('error', `Erro Banco: ${dbErr.message}`);
        } else {
          addLog('success', `Sucesso: ${employee.name} (${item.month}/${item.year})`);
        }

        setSyncProgress(prev => ({ ...prev, current: count }));
      }

      alert('Sincronização concluída!');
      calculateStorageUsage();

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

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(search.toLowerCase()) || 
    emp.cpf.includes(search)
  );

  return (
    <div className="p-10 flex-1 flex flex-col gap-8 animate-fade-in max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-5 mb-2">
        <button 
          onClick={() => navigate('/dashboard')}
          className="w-14 h-14 flex items-center justify-center rounded-full bg-white hover:bg-surface-container transition-colors text-primary shadow-sm active:scale-95 border border-surface-container-high"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-4xl font-extrabold font-headline text-on-surface tracking-tight">Console de Desenvolvedor</h2>
          <p className="text-secondary font-body text-lg">Gestão centralizada de privilégios e sincronização em nuvem.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Status Bio */}
        <section className="bg-white rounded-3xl p-8 shadow-sm border border-surface-container-high space-y-6">
          <div className="flex items-center gap-3 border-b border-surface-container-high pb-4">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold text-on-surface">Estado do Sistema</h3>
          </div>
          
          <div className="space-y-4">
            <div className="bg-surface-container-low p-5 rounded-2xl flex items-center gap-4">
               <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                  <Check className="w-6 h-6" />
               </div>
               <div>
                 <p className="text-xs font-bold text-secondary uppercase tracking-widest">Supabase Cloud</p>
                 <p className="font-bold text-on-surface">Conectado</p>
               </div>
            </div>

            <div className="p-5 rounded-2xl border border-surface-container-high space-y-3">
               <div className="flex justify-between items-end">
                  <span className="text-xs font-bold text-secondary uppercase">Uso de Dados</span>
                  <span className="text-sm font-black text-on-surface">{storageStats.percent.toFixed(1)}%</span>
               </div>
               <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${storageStats.percent}%` }}
                    className="h-full bg-primary" 
                   />
               </div>
               <p className="text-[10px] text-on-surface-variant font-medium">{storageStats.text}</p>
            </div>
          </div>

          <button 
            onClick={fetchData}
            disabled={loading}
            className="w-full py-4 bg-surface-container hover:bg-surface-container-high text-primary rounded-2xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
            Atualizar Status
          </button>
          
          <div className="pt-4 border-t border-surface-container-high space-y-3">
            <p className="text-[10px] font-bold text-secondary uppercase tracking-widest px-1">Manutenção de Dados</p>
            
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={handleExportBackup}
                disabled={loading}
                className="py-3 bg-white border border-surface-container-high text-on-surface rounded-xl text-xs font-bold hover:bg-surface-container transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                Backup
              </button>
              
              <label className="py-3 bg-white border border-surface-container-high text-on-surface rounded-xl text-xs font-bold hover:bg-surface-container transition-all flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                Restaurar
                <input 
                  type="file" 
                  accept=".json" 
                  className="hidden" 
                  onChange={handleImportBackup}
                  disabled={loading}
                />
              </label>
            </div>

            <button 
              onClick={handleResetSystem}
              className="w-full py-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar Cache Local
            </button>
          </div>
        </section>

        {/* Gestão de Privilégios */}
        <section className="bg-white rounded-3xl p-8 shadow-sm border border-surface-container-high md:col-span-2 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container-high pb-4">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-bold text-on-surface">Privilégios Administrativos</h3>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
              <input 
                type="text" 
                placeholder="Buscar por nome ou CPF..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 bg-surface-container rounded-full text-sm w-full md:w-64 border-none focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>

          <div className="max-h-[400px] overflow-auto pr-2 custom-scrollbar space-y-3">
            {filteredEmployees.map(emp => (
              <div key={emp.id} className="flex items-center justify-between p-4 rounded-2xl border border-surface-container bg-surface-container-low/30 hover:bg-surface-container-low transition-all">
                <div className="flex items-center gap-4">
                   <div className={cn(
                     "w-12 h-12 rounded-full flex items-center justify-center",
                     emp.role === 'admin' ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-white text-outline border border-surface-container-high"
                   )}>
                      {emp.role === 'admin' ? <ShieldCheck className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                   </div>
                   <div>
                     <p className="font-bold text-on-surface">{emp.name}</p>
                     <p className="text-xs text-secondary font-medium tracking-wide">CPF: {emp.cpf}</p>
                   </div>
                </div>

                <div className="flex items-center gap-2">
                   <button 
                    onClick={() => toggleAdminPrivilege(emp)}
                    className={cn(
                      "px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2",
                      emp.role === 'admin' 
                        ? "bg-red-50 text-red-600 hover:bg-red-100" 
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                   >
                     {emp.role === 'admin' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                     {emp.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                   </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-surface-container-high">
             <div className="flex-1 text-xs text-secondary italic">
               * O backup exporta a lista completa de funcionários, documentos vinculados e logs de auditoria.
             </div>
          </div>
        </section>

        {/* Visibilidade de Menus */}
        <section className="bg-white rounded-3xl p-8 shadow-sm border border-surface-container-high md:col-span-3 space-y-6">
          <div className="flex items-center gap-3 border-b border-surface-container-high pb-4">
            <Settings className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold text-on-surface">Visibilidade de Menus por Nível</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Permissões Admin */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-primary" />
                <h4 className="font-bold text-on-surface">Menu dos Administradores</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableMenus.map(menu => (
                  <button
                    key={`admin-${menu.path}`}
                    onClick={() => togglePermission('admin', menu.path)}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-bold transition-all border",
                      menuPermissions.admin.includes(menu.path)
                        ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                        : "bg-white text-secondary border-surface-container-high hover:border-primary/30"
                    )}
                  >
                    {menu.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Permissões Colaborador */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-secondary" />
                <h4 className="font-bold text-on-surface">Menu dos Colaboradores</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableMenus.map(menu => (
                  <button
                    key={`collab-${menu.path}`}
                    onClick={() => togglePermission('collaborator', menu.path)}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-bold transition-all border",
                      menuPermissions.collaborator.includes(menu.path)
                        ? "bg-secondary text-white border-secondary shadow-md shadow-secondary/20"
                        : "bg-white text-secondary border-surface-container-high hover:border-secondary/30"
                    )}
                  >
                    {menu.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
            <p className="text-[10px] text-primary font-bold">
              * Nota: O Console Geral (este que você está usando) é exclusivo para o Desenvolvedor Master e não pode ser ocultado.
            </p>
          </div>
        </section>


        {/* NOVA SEÇÃO: Sincronização Cloud (Importação em Lote) */}
        <section className="bg-white rounded-3xl p-8 shadow-sm border border-surface-container-high md:col-span-3 space-y-6">
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
                        O sistema busca pastas no formato "MM-AAAA" e arquivos que contenham o nome ou CPF do funcionário.
                    </p>
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
                                        log.type === 'error' ? "text-red-500" : log.type === 'success' ? "text-green-600" : "text-slate-500"
                                    )}>
                                        <div className={cn("w-1 h-1 rounded-full", log.type === 'error' ? "bg-red-500" : log.type === 'success' ? "bg-green-500" : "bg-slate-300")} />
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

      </div>
    </div>
  );
}
