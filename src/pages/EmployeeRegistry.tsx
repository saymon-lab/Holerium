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
  ArrowLeft
} from 'lucide-react';
import { motion } from 'motion/react';
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
        const existsLocally = employeesList.some(e => e.cpf.replace(/\D/g, '') === cleanCpf);

        if (name && cpf && !existsLocally) {
          employeesToInsert.push({
            name,
            cpf,
            role: 'Colaborador',
            status: 'Ativo',
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
          });
          addedCount++;
        }
      }

      if (employeesToInsert.length > 0) {
        const { error } = await supabase.from('employees').insert(employeesToInsert);
        if (error) {
          console.error('Erro ao importar CSV para o servidor:', error);
          alert('Erro ao salvar no banco de dados. Verifique CPFs duplicados.');
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
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2 items-center">
                      {!deleteStep[emp.id] ? (
                        <>
                          <button className="p-2 rounded-full hover:bg-white text-slate-400 hover:text-blue-900 transition-colors shadow-sm" title="Editar">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button className="p-2 rounded-full hover:bg-white text-slate-400 hover:text-blue-900 transition-colors shadow-sm" title="Senha">
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
    </div>
  );
}
