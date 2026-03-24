import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Settings, Image as ImageIcon, Trash2, Search, Calendar, Users, MapPin, Upload, CheckCircle, AlertTriangle } from 'lucide-react';

export default function Admin() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { settings, setSettings } = useData();
  const [reservas, setReservas] = useState<any[]>([]);
  const [blockedPhones, setBlockedPhones] = useState<any[]>([]);
  const [lideres, setLideres] = useState<any[]>([]);
  const [notificacoes, setNotificacoes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'reservas' | 'settings' | 'blocked' | 'lideres' | 'notificacoes' | 'meus_dados'>('reservas');
  
  // Filters
  const [filterDate, setFilterDate] = useState('');
  const [filterQuadra, setFilterQuadra] = useState('');
  const [filterUser, setFilterUser] = useState('');

  // Block form
  const [blockPhone, setBlockPhone] = useState('');
  const [blockReason, setBlockReason] = useState('');

  // Lider form
  const [liderNome, setLiderNome] = useState('');
  const [liderPhone, setLiderPhone] = useState('');

  // Admin form
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');
  const [adminError, setAdminError] = useState('');
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);

  // Notificacao form
  const [notifId, setNotifId] = useState<number | null>(null);
  const [notifTitulo, setNotifTitulo] = useState('');
  const [notifDescricao, setNotifDescricao] = useState('');
  const [notifData, setNotifData] = useState('');
  const [notifStatus, setNotifStatus] = useState('ativo');
  const [notifImagem, setNotifImagem] = useState<File | null>(null);
  const [notifExistingImageUrl, setNotifExistingImageUrl] = useState<string | null>(null);
  const [notifPreviewUrl, setNotifPreviewUrl] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingNotifData, setPendingNotifData] = useState<any>(null);

  // Modals
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchReservas();
    fetchBlockedPhones();
    fetchLideres();
    fetchNotificacoes();
  }, [user, navigate]);

  useEffect(() => {
    if (settings) {
      setAdminName(settings.admin_name || '');
      setAdminPhone(settings.admin_phone || '');
    }
  }, [settings]);

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminSuccess('');
    setAdminError('');
    setIsSavingAdmin(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert([
          { key: 'admin_name', value: adminName },
          { key: 'admin_phone', value: adminPhone }
        ]);
      
      if (error) throw error;

      setSettings((prev: any) => ({ ...prev, admin_name: adminName, admin_phone: adminPhone }));
      setAdminSuccess('Dados salvos com sucesso!');
      setTimeout(() => setAdminSuccess(''), 3000);
    } catch (e: any) {
      console.error('Erro ao salvar dados:', e);
      setAdminError(e.message || 'Erro ao salvar dados.');
      setTimeout(() => setAdminError(''), 3000);
    } finally {
      setIsSavingAdmin(false);
    }
  };

  const ensureBucketExists = async () => {
    try {
      const { data, error } = await supabase.storage.getBucket('imagens_app');
      
      if (error && error.message.includes('not found')) {
        const { error: createError } = await supabase.storage.createBucket('imagens_app', {
          public: true,
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
        });
        
        if (createError) {
          console.error('Erro ao criar bucket:', createError);
          throw new Error('O bucket "imagens_app" não existe no Supabase. Por favor, acesse o painel do Supabase, vá em Storage e crie um bucket público chamado "imagens_app", ou execute o script SQL fornecido.');
        }
      }
    } catch (e: any) {
      console.error('Erro ao verificar/criar bucket:', e);
      if (e.message && e.message.includes('not found')) {
        throw new Error('O bucket "imagens_app" não existe no Supabase. Por favor, acesse o painel do Supabase, vá em Storage e crie um bucket público chamado "imagens_app".');
      }
      throw e;
    }
  };

  useEffect(() => {
    if (!notifImagem) {
      setNotifPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(notifImagem);
    setNotifPreviewUrl(objectUrl);

    // Free memory when ever this component is unmounted
    return () => URL.revokeObjectURL(objectUrl);
  }, [notifImagem]);

  const fetchNotificacoes = async () => {
    try {
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .order('data_notificacao', { ascending: false });
      if (error) throw error;
      setNotificacoes(data || []);
    } catch (e) {
      console.error('Erro ao buscar notificações', e);
    }
  };

  const handleSaveNotificacao = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!showConfirmModal) {
      setShowConfirmModal(true);
      return;
    }

    try {
      let imageUrl = null;
      if (notifImagem) {
        await ensureBucketExists();
        
        const fileExt = notifImagem.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('imagens_app')
          .upload(`notificacoes/${fileName}`, notifImagem);
        
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage
          .from('imagens_app')
          .getPublicUrl(`notificacoes/${fileName}`);
          
        imageUrl = publicUrlData.publicUrl;
      }

      const notifDataObj: any = {
        titulo: notifTitulo,
        descricao: notifDescricao,
        data_notificacao: notifData,
        status: notifStatus
      };

      if (imageUrl) {
        notifDataObj.imagem_url = imageUrl;
      }

      if (notifId) {
        const { error } = await supabase
          .from('notificacoes')
          .update(notifDataObj)
          .eq('id', notifId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notificacoes')
          .insert([notifDataObj]);
        if (error) throw error;
      }

      setNotifId(null);
      setNotifTitulo('');
      setNotifDescricao('');
      setNotifData('');
      setNotifStatus('ativo');
      setNotifImagem(null);
      setNotifExistingImageUrl(null);
      setShowConfirmModal(false);
      fetchNotificacoes();
    } catch (e: any) {
      console.error('Erro ao salvar notificação', e);
      setAlertMessage(e.message || 'Erro ao salvar notificação.');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo';
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
      fetchNotificacoes();
    } catch (e) {
      console.error('Erro ao alternar status', e);
    }
  };

  const handleEditNotificacao = (n: any) => {
    setNotifId(n.id);
    setNotifTitulo(n.titulo);
    setNotifDescricao(n.descricao);
    setNotifData(n.data_notificacao);
    setNotifStatus(n.status || 'ativo');
    setNotifImagem(null);
    setNotifExistingImageUrl(n.imagem_url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteNotificacao = async (id: string) => {
    setConfirmDialog({
      message: 'Excluir esta notificação?',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('notificacoes')
            .delete()
            .eq('id', id);
          if (error) throw error;
          fetchNotificacoes();
        } catch (e) {
          console.error('Erro ao excluir notificação', e);
        }
      }
    });
  };

  const fetchLideres = async () => {
    try {
      const { data, error } = await supabase
        .from('lideres')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setLideres(data || []);
    } catch (e) {
      console.error('Erro ao buscar líderes', e);
    }
  };

  const handleAddLider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Clean phone number (remove non-digits)
      const cleanPhone = liderPhone.replace(/\D/g, '');
      
      const { error } = await supabase
        .from('lideres')
        .insert([{ nome: liderNome, telefone: cleanPhone }]);
      
      if (error) {
        if (error.code === '23505') {
          setAlertMessage('Este telefone já está cadastrado para outro líder.');
          return;
        }
        throw error;
      }
      
      setLiderNome('');
      setLiderPhone('');
      fetchLideres();
    } catch (e) {
      console.error('Erro ao cadastrar líder', e);
      setAlertMessage('Erro ao cadastrar líder.');
    }
  };

  const handleRemoveLider = async (id: string) => {
    setConfirmDialog({
      message: 'Remover este líder?',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('lideres')
            .delete()
            .eq('id', id);
          if (error) throw error;
          fetchLideres();
        } catch (e) {
          console.error('Erro ao remover líder', e);
        }
      }
    });
  };

  const fetchBlockedPhones = async () => {
    try {
      const { data, error } = await supabase
        .from('blocked_phones')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setBlockedPhones(data || []);
    } catch (e) {
      console.error('Erro ao buscar telefones bloqueados', e);
    }
  };

  const handleBlockPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanPhone = blockPhone.replace(/\D/g, '');
      const { error } = await supabase
        .from('blocked_phones')
        .insert([{ telefone: cleanPhone, motivo: blockReason }]);
      if (error) throw error;
      setBlockPhone('');
      setBlockReason('');
      fetchBlockedPhones();
    } catch (e) {
      console.error('Erro ao bloquear telefone', e);
      setAlertMessage('Erro ao bloquear telefone. Pode já estar bloqueado.');
    }
  };

  const handleUnblockPhone = async (telefone: string) => {
    setConfirmDialog({
      message: 'Desbloquear este telefone?',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('blocked_phones')
            .delete()
            .eq('telefone', telefone);
          if (error) throw error;
          fetchBlockedPhones();
        } catch (e) {
          console.error('Erro ao desbloquear telefone', e);
        }
      }
    });
  };

  const fetchReservas = async () => {
    try {
      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .order('data_reserva', { ascending: false })
        .order('horario_inicio', { ascending: false });
      if (error) throw error;
      setReservas(data || []);
    } catch (e) {
      console.error('Erro ao buscar reservas', e);
    }
  };

  const handleCancelReserva = async (id: string) => {
    setConfirmDialog({
      message: 'Tem certeza que deseja cancelar esta reserva?',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('reservas')
            .delete()
            .eq('id', id);
          if (error) throw error;
          setReservas((prev) => prev.filter((r) => r.id !== id));
        } catch (e) {
          console.error('Erro ao cancelar reserva', e);
        }
      }
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await ensureBucketExists();

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('imagens_app')
        .upload(`logos/${fileName}`, file);
      
      if (uploadError) throw uploadError;
      
      const { data: publicUrlData } = supabase.storage
        .from('imagens_app')
        .getPublicUrl(`logos/${fileName}`);
        
      const logoUrl = publicUrlData.publicUrl;

      const { error: dbError } = await supabase
        .from('settings')
        .upsert({ key: 'logo_url', value: logoUrl });
        
      if (dbError) throw dbError;
      
      setSettings((prev: any) => ({ ...prev, logo_url: logoUrl }));
    } catch (e: any) {
      console.error('Erro ao fazer upload da logo', e);
      alert(e.message || 'Erro ao fazer upload da logo');
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      await ensureBucketExists();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('imagens_app')
          .upload(`banners/${fileName}`, file);
          
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage
          .from('imagens_app')
          .getPublicUrl(`banners/${fileName}`);
          
        const bannerUrl = publicUrlData.publicUrl;

        const { error: dbError } = await supabase
          .from('banners_home')
          .insert([{ imagem_url: bannerUrl, ordem: (settings.banners?.length || 0) + i }]);
          
        if (dbError) throw dbError;
      }
      
      // Fetch updated banners
      const { data: bannersData } = await supabase
        .from('banners_home')
        .select('*')
        .order('ordem', { ascending: true });
        
      setSettings((prev: any) => ({ ...prev, banners: bannersData || [] }));
    } catch (e: any) {
      console.error('Erro ao fazer upload de banners', e);
      alert(e.message || 'Erro ao fazer upload de banners');
    }
  };

  const handleRemoveBanner = async (id: string, url: string) => {
    if (!window.confirm('Remover este banner?')) return;
    try {
      const { error: dbError } = await supabase
        .from('banners_home')
        .delete()
        .eq('id', id);
        
      if (dbError) throw dbError;
      
      // Try to delete from storage, but don't fail if it doesn't work
      try {
        const path = url.split('/').pop();
        if (path) {
          await supabase.storage.from('imagens_app').remove([`banners/${path}`]);
        }
      } catch (storageError) {
        console.error('Erro ao deletar imagem do storage', storageError);
      }
      
      // Fetch updated banners
      const { data: bannersData } = await supabase
        .from('banners_home')
        .select('*')
        .order('ordem', { ascending: true });
        
      setSettings((prev: any) => ({ ...prev, banners: bannersData || [] }));
    } catch (e) {
      console.error('Erro ao remover banner', e);
    }
  };

  const filteredReservas = reservas.filter((r) => {
    const matchDate = filterDate ? r.data_reserva === filterDate : true;
    const matchQuadra = filterQuadra ? r.quadra_nome.toLowerCase().includes(filterQuadra.toLowerCase()) : true;
    const matchUser = filterUser ? r.nome_usuario.toLowerCase().includes(filterUser.toLowerCase()) : true;
    return matchDate && matchQuadra && matchUser;
  });

  if (!user) return null;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-black text-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Painel Administrativo</h1>
            <p className="text-gray-400 mt-1">Gerencie reservas e configurações do sistema</p>
          </div>
          <div className="flex bg-zinc-900 rounded-lg p-1 border border-white/10 overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('reservas')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'reservas' ? 'bg-[#E10600] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Calendar size={16} />
              Reservas
            </button>
            <button
              onClick={() => setActiveTab('lideres')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'lideres' ? 'bg-[#E10600] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users size={16} />
              Líderes
            </button>
            <button
              onClick={() => setActiveTab('blocked')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'blocked' ? 'bg-[#E10600] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users size={16} />
              Bloqueios
            </button>
            <button
              onClick={() => setActiveTab('notificacoes')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'notificacoes' ? 'bg-[#E10600] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <ImageIcon size={16} />
              Notificações
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'settings' ? 'bg-[#E10600] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Settings size={16} />
              Configurações
            </button>
            <button
              onClick={() => setActiveTab('meus_dados')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'meus_dados' ? 'bg-[#E10600] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Settings size={16} />
              Meus Dados
            </button>
          </div>
        </div>

        {activeTab === 'lideres' && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users size={18} className="text-[#E10600]" />
                Adicionar Líder
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Apenas os telefones cadastrados aqui poderão fazer reservas no sistema.
              </p>
              <form onSubmit={handleAddLider} className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  placeholder="Nome do Líder"
                  required
                  value={liderNome}
                  onChange={(e) => setLiderNome(e.target.value)}
                  className="flex-1 bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#E10600] transition-colors"
                />
                <input
                  type="text"
                  placeholder="Telefone (WhatsApp)"
                  required
                  value={liderPhone}
                  onChange={(e) => setLiderPhone(e.target.value)}
                  className="flex-1 bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#E10600] transition-colors"
                />
                <button
                  type="submit"
                  className="bg-[#E10600] hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
                >
                  Adicionar
                </button>
              </form>
            </div>

            <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-black/50 text-gray-400 uppercase font-medium border-b border-white/10">
                    <tr>
                      <th className="px-6 py-4">Nome</th>
                      <th className="px-6 py-4">Telefone</th>
                      <th className="px-6 py-4">Data de Cadastro</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {lideres.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                          Nenhum líder cadastrado.
                        </td>
                      </tr>
                    ) : (
                      lideres.map((lider) => (
                        <tr key={lider.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-medium text-white">{lider.nome}</td>
                          <td className="px-6 py-4 text-gray-300">{lider.telefone}</td>
                          <td className="px-6 py-4 text-gray-400">
                            {format(new Date(lider.created_at), 'dd/MM/yyyy HH:mm')}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleRemoveLider(lider.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-500/10"
                              title="Remover"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'blocked' && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users size={18} className="text-[#E10600]" />
                Bloquear Telefone
              </h3>
              <form onSubmit={handleBlockPhone} className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  placeholder="Telefone"
                  required
                  value={blockPhone}
                  onChange={(e) => setBlockPhone(e.target.value)}
                  className="flex-1 bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#E10600] transition-colors"
                />
                <input
                  type="text"
                  placeholder="Motivo (opcional)"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="flex-1 bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#E10600] transition-colors"
                />
                <button
                  type="submit"
                  className="bg-[#E10600] hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
                >
                  Bloquear
                </button>
              </form>
            </div>

            <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-black/50 text-gray-400 uppercase font-medium border-b border-white/10">
                    <tr>
                      <th className="px-6 py-4">Telefone</th>
                      <th className="px-6 py-4">Motivo</th>
                      <th className="px-6 py-4">Data do Bloqueio</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {blockedPhones.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                          Nenhum telefone bloqueado.
                        </td>
                      </tr>
                    ) : (
                      blockedPhones.map((blocked) => (
                        <tr key={blocked.telefone} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-medium text-white">{blocked.telefone}</td>
                          <td className="px-6 py-4 text-gray-300">{blocked.motivo || '-'}</td>
                          <td className="px-6 py-4 text-gray-400">
                            {format(new Date(blocked.created_at), 'dd/MM/yyyy HH:mm')}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleUnblockPhone(blocked.telefone)}
                              className="text-gray-400 hover:text-emerald-500 transition-colors p-2 rounded-lg hover:bg-emerald-500/10"
                              title="Desbloquear"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reservas' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Search size={18} className="text-[#E10600]" />
                Filtros
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Data</label>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#E10600] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Quadra</label>
                  <input
                    type="text"
                    placeholder="Ex: Vôlei 1"
                    value={filterQuadra}
                    onChange={(e) => setFilterQuadra(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#E10600] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Usuário</label>
                  <input
                    type="text"
                    placeholder="Nome do usuário"
                    value={filterUser}
                    onChange={(e) => setFilterUser(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#E10600] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-black/50 text-gray-400 uppercase font-medium border-b border-white/10">
                    <tr>
                      <th className="px-6 py-4">Data/Hora</th>
                      <th className="px-6 py-4">Quadra</th>
                      <th className="px-6 py-4">Usuário</th>
                      <th className="px-6 py-4">Contato</th>
                      <th className="px-6 py-4 text-center">Pessoas</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredReservas.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          Nenhuma reserva encontrada.
                        </td>
                      </tr>
                    ) : (
                      filteredReservas.map((reserva) => (
                        <tr key={reserva.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-white">
                              {format(new Date(reserva.data_reserva + 'T00:00:00'), 'dd/MM/yyyy')}
                            </div>
                            <div className="text-gray-400 text-xs mt-0.5">
                              {reserva.horario_inicio} - {reserva.horario_fim}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <MapPin size={14} className="text-[#E10600]" />
                              {reserva.quadra_nome}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Users size={14} className="text-gray-400" />
                              {reserva.nome_usuario}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-300">{reserva.telefone}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-zinc-800 text-xs font-medium">
                              {reserva.quantidade_pessoas}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleCancelReserva(reserva.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-500/10"
                              title="Cancelar Reserva"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notificacoes' && (
          <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <ImageIcon size={18} className="text-[#E10600]" />
                    {notifId ? 'Editar Notificação' : 'Nova Notificação'}
                  </h3>
                  <form onSubmit={handleSaveNotificacao} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5">Título</label>
                        <input
                          type="text"
                          required
                          value={notifTitulo}
                          onChange={(e) => setNotifTitulo(e.target.value)}
                          className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#E10600] transition-colors"
                          placeholder="Ex: Arena Fechada para Evento"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5">Data do Bloqueio/Aviso</label>
                        <input
                          type="date"
                          required
                          value={notifData}
                          onChange={(e) => setNotifData(e.target.value)}
                          className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#E10600] transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1.5">Descrição / Aviso</label>
                      <textarea
                        required
                        value={notifDescricao}
                        onChange={(e) => setNotifDescricao(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#E10600] transition-colors min-h-[100px]"
                        placeholder="Descreva o motivo do bloqueio ou o aviso importante..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1.5">Imagem (Opcional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setNotifImagem(e.target.files?.[0] || null)}
                        className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#E10600] transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-4 pt-2">
                      <button
                        type="submit"
                        className="w-full bg-[#E10600] hover:bg-red-700 text-white px-8 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={18} />
                        {notifId ? 'Atualizar' : 'Confirmar e Publicar'}
                      </button>
                      {notifId && (
                        <button
                          type="button"
                          onClick={() => {
                            setNotifId(null);
                            setNotifTitulo('');
                            setNotifDescricao('');
                            setNotifData('');
                            setNotifImagem(null);
                            setNotifExistingImageUrl(null);
                          }}
                          className="w-full px-4 py-3 rounded-xl bg-zinc-800 text-white hover:bg-zinc-700 transition-colors font-medium"
                        >
                          Cancelar Edição
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Preview Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 px-2">
                    <Search size={14} className="text-[#E10600]" />
                    Pré-visualização em Tempo Real
                  </h3>
                  
                  <div className="bg-[#0a0a0a] border-2 border-red-500/40 rounded-3xl p-6 sm:p-10 text-center flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden shadow-[0_0_60px_rgba(225,6,0,0.15)] scale-[0.9] sm:scale-100 origin-top">
                    {/* Decorative elements */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5"></div>
                    
                    <div className="relative z-10 w-20 h-20 sm:w-28 sm:h-28 bg-red-500/10 rounded-full flex items-center justify-center mb-6 sm:mb-8 ring-8 sm:ring-12 ring-red-500/5">
                      <AlertTriangle className="text-red-500" size={40} />
                    </div>

                    <h4 className="relative z-10 text-3xl sm:text-5xl font-black text-white uppercase tracking-tighter mb-2 sm:mb-4 italic leading-none">
                      DIA <span className="text-red-500">BLOQUEADO</span>
                    </h4>
                    
                    <p className="relative z-10 text-gray-400 max-w-md leading-relaxed font-medium text-sm sm:text-xl mb-6 sm:mb-10 uppercase tracking-widest opacity-80">
                      Acesso restrito para agendamentos
                    </p>

                    <div className="relative z-10 p-6 sm:p-8 bg-zinc-900/90 rounded-2xl border border-white/10 w-full backdrop-blur-xl shadow-2xl">
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-red-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg whitespace-nowrap">
                        Comunicado Oficial
                      </div>
                      
                      <h5 className="text-white font-black text-xl sm:text-3xl mb-3 uppercase tracking-tight leading-none break-words">
                        {notifTitulo || 'Título da Notificação'}
                      </h5>
                      
                      <div className="h-1 w-12 bg-red-500 mx-auto mb-4 rounded-full"></div>
                      
                      <p className="text-gray-300 text-sm sm:text-lg leading-relaxed font-light italic break-words">
                        "{notifDescricao || 'A descrição do aviso aparecerá aqui...'}"
                      </p>
                      
                      {(notifPreviewUrl || notifExistingImageUrl) && (
                        <div className="mt-6 rounded-xl overflow-hidden border border-white/10 bg-black/40">
                          <img 
                            src={notifPreviewUrl || notifExistingImageUrl!} 
                            alt="Preview" 
                            className="w-full h-32 sm:h-48 object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </div>

                    <div className="relative z-10 mt-6 sm:mt-8 flex items-center gap-2 text-red-500/60 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                      <Calendar size={14} />
                      <span>Data: {notifData ? format(new Date(notifData + 'T00:00:00'), 'dd/MM/yyyy') : '--/--/----'}</span>
                    </div>
                  </div>
                </div>
              </div>

            <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-black/50 text-gray-400 uppercase font-medium border-b border-white/10">
                    <tr>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Título</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {notificacoes.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                          Nenhuma notificação cadastrada.
                        </td>
                      </tr>
                    ) : (
                      notificacoes.map((n) => {
                        const isPast = new Date(n.data_notificacao + 'T23:59:59') < new Date();
                        return (
                          <tr key={n.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 font-medium text-white">
                              {format(new Date(n.data_notificacao + 'T00:00:00'), 'dd/MM/yyyy')}
                            </td>
                            <td className="px-6 py-4 text-gray-300">{n.titulo}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  n.status === 'inativo' 
                                    ? 'bg-zinc-800 text-gray-500' 
                                    : isPast 
                                      ? 'bg-zinc-800 text-gray-500' 
                                      : 'bg-emerald-500/10 text-emerald-500'
                                }`}>
                                  {n.status === 'inativo' ? 'Inativo' : isPast ? 'Passada' : 'Ativa / Futura'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleToggleStatus(n.id, n.status)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    n.status === 'ativo' 
                                      ? 'text-emerald-500 hover:bg-emerald-500/10' 
                                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                                  }`}
                                  title={n.status === 'ativo' ? 'Desativar (Liberar Data)' : 'Ativar (Bloquear Data)'}
                                >
                                  <CheckCircle size={18} />
                                </button>
                                <button
                                  onClick={() => handleEditNotificacao(n)}
                                  className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                                  title="Editar"
                                >
                                  <Settings size={18} />
                                </button>
                                <button
                                  onClick={() => handleDeleteNotificacao(n.id)}
                                  className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-500/10"
                                  title="Excluir"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Logo Settings */}
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <ImageIcon className="text-[#E10600]" />
                Logo do Aplicativo
              </h3>
              
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/10 rounded-xl bg-black/50 mb-6">
                {settings?.logo_url ? (
                  <img src={settings.logo_url} alt="Logo Atual" className="max-h-32 object-contain mb-4" />
                ) : (
                  <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                    <ImageIcon size={32} className="text-gray-500" />
                  </div>
                )}
                <p className="text-sm text-gray-400 text-center">
                  {settings?.logo_url ? 'Logo atual do sistema' : 'Nenhuma logo configurada'}
                </p>
              </div>

              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 border border-white/5">
                  <Upload size={18} />
                  Alterar Logo
                </div>
              </div>
            </div>

            {/* Banner Settings */}
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <ImageIcon className="text-[#E10600]" />
                Banners da Página Inicial
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {settings?.banners?.map((banner: any, index: number) => (
                  <div key={banner.id || index} className="relative group aspect-video rounded-xl overflow-hidden bg-black border border-white/10">
                    <img src={banner.imagem_url} alt={`Banner ${index + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => handleRemoveBanner(banner.id, banner.imagem_url)}
                        className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transform scale-90 group-hover:scale-100 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                {(!settings?.banners || settings.banners.length === 0) && (
                  <div className="col-span-2 p-8 text-center border-2 border-dashed border-white/10 rounded-xl bg-black/50">
                    <p className="text-gray-500 text-sm">Nenhum banner configurado</p>
                  </div>
                )}
              </div>

              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleBannerUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-full bg-[#E10600] hover:bg-red-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2">
                  <Upload size={18} />
                  Adicionar Imagens
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'meus_dados' && (
          <div className="space-y-6 max-w-2xl">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Settings className="text-[#E10600]" />
                Meus Dados
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                O telefone cadastrado aqui receberá os comprovantes automáticos dos agendamentos feitos.
              </p>
              <form onSubmit={handleSaveAdmin} className="space-y-4">
                {adminSuccess && (
                  <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl flex items-center gap-2">
                    <CheckCircle size={18} />
                    {adminSuccess}
                  </div>
                )}
                {adminError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-2">
                    <AlertTriangle size={18} />
                    {adminError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Nome</label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Nome do Administrador"
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#E10600] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Telefone Principal (WhatsApp)</label>
                  <input
                    type="text"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    placeholder="Ex: 5511999999999"
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#E10600] transition-colors"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Inclua o código do país e DDD. Ex: 5511999999999
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isSavingAdmin}
                  className="w-full bg-[#E10600] hover:bg-red-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle size={18} />
                  {isSavingAdmin ? 'Confirmando...' : 'Confirmar'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 mx-auto">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-center mb-2">Confirmar Notificação?</h3>
            <p className="text-gray-400 text-center mb-8">
              Ao confirmar, esta notificação será publicada e a data <span className="text-white font-bold">{notifData ? format(new Date(notifData + 'T00:00:00'), 'dd/MM/yyyy') : ''}</span> será <span className="text-red-500 font-bold uppercase">bloqueada</span> para novos agendamentos.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleSaveNotificacao()}
                className="w-full px-6 py-3 rounded-xl bg-[#E10600] text-white font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
              >
                Confirmar e Publicar
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="w-full px-6 py-3 rounded-xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generic Alert Modal */}
      {alertMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 mx-auto">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-center mb-2">Atenção</h3>
            <p className="text-gray-400 text-center mb-8">
              {alertMessage}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setAlertMessage(null)}
                className="w-full px-6 py-3 rounded-xl bg-[#E10600] text-white font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generic Confirm Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 mx-auto">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-center mb-2">Confirmar Ação</h3>
            <p className="text-gray-400 text-center mb-8">
              {confirmDialog.message}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="w-full px-6 py-3 rounded-xl bg-[#E10600] text-white font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
              >
                Confirmar
              </button>
              <button
                onClick={() => setConfirmDialog(null)}
                className="w-full px-6 py-3 rounded-xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
