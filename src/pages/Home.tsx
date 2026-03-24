import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format, addDays, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Carousel from '../components/Carousel';
import { useData } from '../contexts/DataContext';
import { supabase } from '../lib/supabase';
import { Clock, Users, Calendar as CalendarIcon, MapPin, CheckCircle2, AlertCircle, User, ChevronDown, ChevronUp } from 'lucide-react';

const QUADRAS = [
  { id: 'volei_1', nome: 'Vôlei de Areia / Beach Tennis 1', minPessoas: 4 },
  { id: 'volei_2', nome: 'Vôlei de Areia / Beach Tennis 2', minPessoas: 4 },
  { id: 'volei_3', nome: 'Vôlei de Areia / Beach Tennis 3', minPessoas: 4 },
  { id: 'basquete', nome: 'Basquete', minPessoas: 6 },
  { id: 'futsal', nome: 'Futsal (Grama Sintética)', minPessoas: 10 },
];

const FAQ_DATA = [
  {
    question: "Como faço um agendamento?",
    answer: "Para agendar, basta selecionar a data desejada, escolher a quadra e o horário disponível. Lembre-se que apenas líderes cadastrados podem realizar a reserva final."
  },
  {
    question: "Quais são os horários de funcionamento?",
    answer: "Segunda a sexta das 16:00 às 22:00. Sábado das 08:00 às 12:00 e das 13:00 às 22:00. Domingo: Fechado. Pedimos atenção ao horário de fechamento, pois o zelador fecha o portão pontualmente às 22:00."
  },
  {
    question: "Quais são as regras para cancelamento?",
    answer: "Cancelamentos devem ser feitos com pelo menos 24 horas de antecedência através do painel 'Minha Conta' ou entrando em contato com o administrador."
  },
  {
    question: "Posso levar convidados?",
    answer: "Sim, convidados são bem-vindos, desde que respeitem as normas de conduta e convivência da Arena ABBA PAI."
  }
];

export default function Home() {
  const { reservas, setReservas, settings } = useData();
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [selectedQuadra, setSelectedQuadra] = useState<any>(null);
  const [isSchedulingOpen, setIsSchedulingOpen] = useState(false);
  const [activeNotification, setActiveNotification] = useState<any>(null);
  const [todayNotification, setTodayNotification] = useState<any>(null);
  const [allNotifications, setAllNotifications] = useState<any[]>([]);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nome_usuario: '',
    telefone: '',
    quantidade_pessoas: '',
    esporte: 'Vôlei de Areia'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const schedulingRef = React.useRef<HTMLDivElement>(null);

  const getHorariosForDate = (date: Date) => {
    const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    if (day === 0) return []; // Sunday Closed
    
    if (day === 6) { // Saturday 08:00 to 22:00 (last slot starts at 21:00)
      return [
        '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', 
        '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
      ];
    }
    
    // Monday to Friday 16:00 to 22:00 (last slot starts at 21:00)
    return ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
  };

  const currentHorarios = getHorariosForDate(selectedDate);

  useEffect(() => {
    if (isSchedulingOpen && schedulingRef.current) {
      schedulingRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isSchedulingOpen]);

  // Generate next 14 days
  const dates = Array.from({ length: 14 }).map((_, i) => addDays(startOfToday(), i));

  const fetchAllNotifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('status', 'ativo')
        .order('data_notificacao', { ascending: true });
      if (error) throw error;
      setAllNotifications(data || []);
    } catch (e) {
      console.error('Erro ao buscar todas as notificações', e);
    }
  }, []);

  const fetchTodayNotification = useCallback(async () => {
    try {
      const today = format(startOfToday(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('data_notificacao', today)
        .eq('status', 'ativo')
        .maybeSingle();
      if (error) throw error;
      setTodayNotification(data);
    } catch (e) {
      console.error('Erro ao buscar notificação de hoje', e);
    }
  }, []);

  const checkNotification = useCallback(async () => {
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('data_notificacao', formattedDate)
        .eq('status', 'ativo')
        .maybeSingle();
      if (error) throw error;
      setActiveNotification(data);
    } catch (e) {
      console.error('Erro ao verificar notificação', e);
    }
  }, [selectedDate]);

  const fetchReservas = useCallback(async () => {
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .eq('data_reserva', formattedDate);
      if (error) throw error;
      setReservas(data || []);
    } catch (e) {
      console.error('Erro ao buscar reservas', e);
    }
  }, [selectedDate, setReservas]);

  useEffect(() => {
    fetchReservas();
    checkNotification();
  }, [fetchReservas, checkNotification]);

  useEffect(() => {
    fetchTodayNotification();
    fetchAllNotifications();
  }, [fetchTodayNotification, fetchAllNotifications]);

  const isReserved = (quadraId: string, horario: string) => {
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    return reservas.some(
      (r) => r.quadra_id === quadraId && r.data_reserva === formattedDate && r.horario_inicio === horario
    );
  };

  const handleOpenModal = (horario: string) => {
    if (!selectedQuadra) return;
    setSelectedTime(horario);
    setFormData({ 
      nome_usuario: '', 
      telefone: '', 
      quantidade_pessoas: selectedQuadra.minPessoas.toString(),
      esporte: 'Vôlei de Areia'
    });
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuadra) return;
    setError('');
    setLoading(true);
    
    const qtdPessoas = parseInt(formData.quantidade_pessoas);
    if (isNaN(qtdPessoas) || qtdPessoas < selectedQuadra.minPessoas) {
      setError(`Mínimo de ${selectedQuadra.minPessoas} pessoas para esta quadra.`);
      setLoading(false);
      return;
    }

    try {
      // Clean phone number for comparison
      const cleanPhone = formData.telefone.replace(/\D/g, '');
      
      // Check if phone is blocked
      const { data: blockedData, error: blockedError } = await supabase
        .from('blocked_phones')
        .select('telefone, motivo')
        .or(`telefone.eq."${formData.telefone}",telefone.eq."${cleanPhone}"`)
        .maybeSingle();

      if (blockedError) throw blockedError;

      if (blockedData) {
        setError(`Este telefone está bloqueado para agendamentos. Motivo: ${blockedData.motivo || 'Não especificado'}`);
        setLoading(false);
        return;
      }

      // Check if phone is in lideres table
      // We check both the exact string and the cleaned version to be safe
      const { data: liderData, error: liderError } = await supabase
        .from('lideres')
        .select('id')
        .or(`telefone.eq."${formData.telefone}",telefone.eq."${cleanPhone}"`)
        .maybeSingle();
      
      if (liderError) throw liderError;
      
      if (!liderData) {
        setError('Apenas líderes cadastrados podem realizar agendamentos. Por favor, entre em contato com o administrador para cadastrar seu telefone.');
        setLoading(false);
        return;
      }

      setIsConfirmModalOpen(true);
    } catch (err: any) {
      console.error('Erro ao validar líder/bloqueio:', err);
      setError('Erro ao validar cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReservation = async () => {
    if (!selectedQuadra) return;
    setLoading(true);
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const quadraNome = selectedQuadra.id.startsWith('volei') ? `${selectedQuadra.nome} (${formData.esporte})` : selectedQuadra.nome;
      const horarioFim = `${parseInt(selectedTime.split(':')[0]) + 1}:00`;

      const { data, error: insertError } = await supabase
        .from('reservas')
        .insert([{
          nome_usuario: formData.nome_usuario,
          telefone: formData.telefone,
          quantidade_pessoas: parseInt(formData.quantidade_pessoas),
          quadra_id: selectedQuadra.id,
          quadra_nome: quadraNome,
          data_reserva: formattedDate,
          horario_inicio: selectedTime,
          horario_fim: horarioFim,
        }])
        .select();

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('Este horário já foi reservado.');
        }
        throw new Error(insertError.message || 'Erro ao salvar reserva');
      }

      setSuccess('Reserva confirmada com sucesso!');
      setIsConfirmModalOpen(false);
      
      // Send WhatsApp message to admin
      if (settings?.admin_phone) {
        const message = `*NOVO AGENDAMENTO - ARENA ABBA PAI*\n\n` +
          `*Nome:* ${formData.nome_usuario}\n` +
          `*Telefone:* ${formData.telefone}\n` +
          `*Quadra:* ${quadraNome}\n` +
          `*Data:* ${format(selectedDate, 'dd/MM/yyyy')}\n` +
          `*Horário:* ${selectedTime} às ${horarioFim}\n` +
          `*Quantidade de Pessoas:* ${formData.quantidade_pessoas}`;
        
        const encodedMessage = encodeURIComponent(message);
        const adminPhoneClean = settings.admin_phone.replace(/\D/g, '');
        const whatsappUrl = `https://wa.me/${adminPhoneClean}?text=${encodedMessage}`;
        
        window.open(whatsappUrl, '_blank');
      }

      setTimeout(() => {
        setIsModalOpen(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      setIsConfirmModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="w-full bg-gradient-to-b from-zinc-900/50 to-black py-16 px-4 text-center border-b border-white/5">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
            O ESPORTE <span className="text-[#E10600]">TRANSFORMA</span> VIDAS
          </h1>
          <p className="text-lg md:text-2xl text-gray-400 font-light leading-relaxed">
            Bem-vindo ao nosso complexo esportivo. Um espaço dedicado à saúde, diversão e integração da nossa comunidade.
          </p>
        </div>
      </div>
      <Carousel />

      {todayNotification && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="relative bg-gradient-to-r from-[#E10600]/20 to-black border border-[#E10600]/50 rounded-2xl overflow-hidden flex flex-col md:flex-row items-center gap-6 p-6 md:p-8 animate-in fade-in slide-in-from-top-4 duration-700 shadow-[0_0_30px_rgba(225,6,0,0.15)]">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#E10600]"></div>
            {todayNotification.imagem_url && (
              <div className="w-full md:w-1/3 aspect-video md:aspect-square rounded-xl overflow-hidden flex-shrink-0">
                <img 
                  src={todayNotification.imagem_url} 
                  alt={todayNotification.titulo} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E10600] text-white text-xs font-bold uppercase tracking-wider mb-4 shadow-[0_0_15px_rgba(225,6,0,0.5)] animate-pulse">
                <AlertCircle size={14} /> Aviso Importante
              </div>
              <h2 className="text-2xl md:text-4xl font-black text-white mb-4 uppercase italic tracking-tighter">
                {todayNotification.titulo}
              </h2>
              <p className="text-gray-300 text-lg leading-relaxed">
                {todayNotification.descricao}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            AGENDAMENTO DE <span className="text-[#E10600]">QUADRAS</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto mb-8">
            Selecione a data, a quadra e o horário desejado. O uso é totalmente gratuito e organizado para a comunidade.
          </p>

          {!isSchedulingOpen ? (
            <div className="flex flex-col items-center gap-4">
              <button 
                onClick={() => setIsSchedulingOpen(true)}
                className="bg-[#E10600] hover:bg-red-700 text-white px-12 py-5 rounded-2xl font-black text-2xl uppercase tracking-tighter transition-all shadow-2xl shadow-red-500/40 hover:scale-105 active:scale-95 animate-in fade-in zoom-in duration-500"
              >
                Agendamento
              </button>
              <Link 
                to="/minha-conta"
                className="bg-zinc-800 hover:bg-zinc-700 text-white px-8 py-3 rounded-xl font-bold text-sm transition-all border border-white/10 flex items-center gap-2"
              >
                <User size={18} />
                Minha Conta
              </Link>
              
              <div className="mt-12 p-10 bg-black/40 border border-white/10 rounded-[2.5rem] backdrop-blur-md max-w-[420px] w-full shadow-2xl relative group overflow-hidden animate-in fade-in zoom-in duration-1000">
                {/* Decorative glow */}
                <div className="absolute -top-20 -left-20 w-40 h-40 bg-red-600/10 rounded-full blur-[80px] group-hover:bg-red-600/20 transition-all duration-700"></div>
                <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-red-600/5 rounded-full blur-[80px] group-hover:bg-red-600/10 transition-all duration-700"></div>
                
                <p className="text-white italic text-2xl text-center leading-snug font-medium relative z-10">
                  "Tudo o que fizerem, façam de todo o coração, como para o Senhor."
                </p>
                
                <div className="flex items-center justify-center gap-4 mt-8 relative z-10">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#E10600]"></div>
                  <p className="text-[#E10600] font-black text-sm uppercase tracking-[0.25em] whitespace-nowrap">
                    Colossenses 3:23
                  </p>
                  <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#E10600]"></div>
                </div>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => {
                setIsSchedulingOpen(false);
                setSelectedQuadra(null);
              }}
              className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all border border-white/10"
            >
              Fechar Agendamento
            </button>
          )}
        </div>

        {isSchedulingOpen && (
          <div ref={schedulingRef} className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Left Column: Date & Court Selection */}
            <div className={`space-y-8 transition-all duration-500 ${selectedQuadra ? 'lg:col-span-4' : 'lg:col-span-12 max-w-3xl mx-auto w-full'}`}>
              {/* Date Selection */}
              <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <span className="text-6xl font-black">01</span>
                </div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CalendarIcon className="text-[#E10600]" size={20} />
                Escolha a Data
              </h3>
              <div className="flex overflow-x-auto pb-4 gap-3 snap-x scrollbar-hide">
                {dates.map((date) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const isSelected = dateStr === format(selectedDate, 'yyyy-MM-dd');
                  const isBlocked = allNotifications.some(n => n.data_notificacao === dateStr);
                  const isSunday = date.getDay() === 0;
                  
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => setSelectedDate(date)}
                      className={`flex-shrink-0 snap-start w-20 h-24 rounded-xl flex flex-col items-center justify-center transition-all relative ${
                        isSelected
                          ? 'bg-[#E10600] text-white shadow-lg shadow-red-500/20'
                          : isBlocked || isSunday
                            ? 'bg-zinc-900 border border-red-500/30 text-red-500'
                            : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700 hover:text-white'
                      }`}
                    >
                      <span className="text-xs font-medium uppercase tracking-wider mb-1">
                        {format(date, 'EEE', { locale: ptBR })}
                      </span>
                      <span className="text-2xl font-bold">{format(date, 'dd')}</span>
                      <span className="text-xs">{format(date, 'MMM', { locale: ptBR })}</span>
                      {(isBlocked || isSunday) && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-black"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Court Selection */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10">
                <span className="text-6xl font-black">02</span>
              </div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="text-[#E10600]" size={20} />
                Escolha a Quadra
              </h3>
              <div className="space-y-3">
                {QUADRAS.map((quadra) => (
                  <button
                    key={quadra.id}
                    onClick={() => setSelectedQuadra(quadra)}
                    className={`w-full text-left px-5 py-4 rounded-xl transition-all flex items-center justify-between ${
                      selectedQuadra?.id === quadra.id
                        ? 'bg-zinc-800 border border-[#E10600] text-white'
                        : 'bg-zinc-900/50 border border-white/5 text-gray-400 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <span className="font-medium">{quadra.nome}</span>
                    <div className="flex items-center gap-1 text-xs opacity-60">
                      <Users size={14} />
                      <span>Mín. {quadra.minPessoas}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Time Slots */}
          {selectedQuadra && (
            <div className="lg:col-span-8 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 lg:p-8 h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <span className="text-8xl font-black">03</span>
                </div>
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
                  <div>
                    <h3 className="text-2xl font-bold text-white">{selectedQuadra.nome}</h3>
                    <p className="text-gray-400 mt-1">
                      {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 text-xs font-medium text-gray-300">
                      <Clock size={14} /> 1 hora por reserva
                    </span>
                  </div>
                </div>

                <div className="grid gap-4">
                  {activeNotification ? (
                    <div className="bg-[#0a0a0a] border-2 border-red-500/40 rounded-3xl p-10 text-center flex flex-col items-center justify-center min-h-[400px] animate-in zoom-in duration-700 relative overflow-hidden shadow-[0_0_60px_rgba(225,6,0,0.15)]">
                      {/* Decorative elements */}
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5"></div>
                      
                      <div className="relative z-10 w-28 h-28 bg-red-500/10 rounded-full flex items-center justify-center mb-8 ring-12 ring-red-500/5 animate-pulse">
                        <div className="absolute inset-0 rounded-full border border-red-500/20 animate-ping duration-[3000ms]"></div>
                        <AlertCircle className="text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" size={56} />
                      </div>

                      <h4 className="relative z-10 text-5xl font-black text-white uppercase tracking-tighter mb-4 italic">
                        DIA <span className="text-red-500">BLOQUEADO</span>
                      </h4>
                      
                      <p className="relative z-10 text-gray-400 max-w-md leading-relaxed font-medium text-xl mb-10 uppercase tracking-widest opacity-80">
                        Acesso restrito para agendamentos
                      </p>

                      <div className="relative z-10 p-8 bg-zinc-900/90 rounded-2xl border border-white/10 w-full backdrop-blur-xl shadow-2xl transform hover:scale-[1.02] transition-transform duration-500">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-red-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg">
                          Comunicado Oficial
                        </div>
                        
                        <h5 className="text-white font-black text-3xl mb-3 uppercase tracking-tight leading-none">
                          {activeNotification.titulo}
                        </h5>
                        
                        <div className="h-1 w-12 bg-red-500 mx-auto mb-4 rounded-full"></div>
                        
                        <p className="text-gray-300 text-lg leading-relaxed font-light italic">
                          "{activeNotification.descricao}"
                        </p>
                      </div>

                      <div className="relative z-10 mt-8 flex items-center gap-2 text-red-500/60 text-xs font-bold uppercase tracking-widest">
                        <Clock size={14} />
                        <span>Data: {format(selectedDate, 'dd/MM/yyyy')}</span>
                      </div>
                    </div>
                  ) : currentHorarios.length === 0 ? (
                    <div className="bg-[#0a0a0a] border-2 border-red-500/40 rounded-3xl p-10 text-center flex flex-col items-center justify-center min-h-[400px] animate-in zoom-in duration-700 relative overflow-hidden shadow-[0_0_60px_rgba(225,6,0,0.15)]">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>
                      
                      <div className="relative z-10 w-28 h-28 bg-red-500/10 rounded-full flex items-center justify-center mb-8 ring-12 ring-red-500/5">
                        <AlertCircle className="text-red-500" size={56} />
                      </div>

                      <h4 className="relative z-10 text-5xl font-black text-white uppercase tracking-tighter mb-4 italic">
                        DOMINGO <span className="text-red-500">FECHADO</span>
                      </h4>
                      
                      <p className="relative z-10 text-gray-400 max-w-md leading-relaxed font-medium text-xl uppercase tracking-widest opacity-80">
                        Não há agendamentos disponíveis aos domingos.
                      </p>
                    </div>
                  ) : (
                    currentHorarios.map((horario) => {
                      const ocupado = isReserved(selectedQuadra.id, horario);
                      return (
                        <div
                          key={horario}
                          className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-xl border transition-all ${
                            ocupado
                              ? 'bg-zinc-900/80 border-red-900/30 opacity-75'
                              : 'bg-zinc-800/50 border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center gap-4 mb-4 sm:mb-0">
                            <div className={`text-2xl font-mono font-bold ${ocupado ? 'text-gray-500' : 'text-white'}`}>
                              {horario}
                            </div>
                            <div className="flex flex-col">
                              <span className={`text-sm font-medium ${ocupado ? 'text-red-500' : 'text-emerald-500'}`}>
                                {ocupado ? 'OCUPADO' : 'DISPONÍVEL'}
                              </span>
                              {!ocupado && (
                                <span className="text-xs text-gray-500">Até as {parseInt(horario.split(':')[0]) + 1}:00</span>
                              )}
                            </div>
                          </div>

                          <button
                            disabled={ocupado}
                            onClick={() => handleOpenModal(horario)}
                            className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium transition-all ${
                              ocupado
                                ? 'bg-zinc-800 text-gray-500 cursor-not-allowed'
                                : 'bg-[#E10600] hover:bg-red-700 text-white shadow-lg shadow-red-500/20'
                            }`}
                          >
                            {ocupado ? 'Indisponível' : 'Reservar'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Seção de FAQ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-white mb-4">
              Perguntas <span className="text-[#E10600]">Frequentes</span>
            </h2>
            <p className="text-gray-400">
              Tudo o que você precisa saber sobre a Arena ABBA PAI
            </p>
          </div>

          <div className="space-y-4">
            {FAQ_DATA.map((faq, index) => (
              <div 
                key={index}
                className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                >
                  <span className="font-bold text-white pr-8">{faq.question}</span>
                  {openFaqIndex === index ? (
                    <ChevronUp className="text-[#E10600] shrink-0" size={20} />
                  ) : (
                    <ChevronDown className="text-gray-500 shrink-0" size={20} />
                  )}
                </button>
                
                <div 
                  className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${
                    openFaqIndex === index ? 'max-h-40 pb-6 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Reserva */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white">Confirmar Reserva</h3>
              <p className="text-gray-400 text-sm mt-1">
                {selectedQuadra?.nome} • {format(selectedDate, 'dd/MM/yyyy')} às {selectedTime}
              </p>
            </div>

            {success ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h4 className="text-lg font-medium text-emerald-500 mb-1">Sucesso!</h4>
                <p className="text-emerald-400/80 text-sm">{success}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={formData.nome_usuario}
                    onChange={(e) => setFormData({ ...formData, nome_usuario: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#E10600] transition-colors"
                    placeholder="Seu nome"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Telefone (WhatsApp)</label>
                  <input
                    type="tel"
                    required
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#E10600] transition-colors"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Quantidade de Pessoas (Mín. {selectedQuadra?.minPessoas})
                  </label>
                  <input
                    type="number"
                    required
                    min={selectedQuadra?.minPessoas}
                    value={formData.quantidade_pessoas}
                    onChange={(e) => setFormData({ ...formData, quantidade_pessoas: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#E10600] transition-colors"
                  />
                </div>

                {selectedQuadra?.id.startsWith('volei') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Esporte</label>
                    <select
                      value={formData.esporte}
                      onChange={(e) => setFormData({ ...formData, esporte: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#E10600] transition-colors"
                    >
                      <option value="Vôlei de Areia">Vôlei de Areia</option>
                      <option value="Beach Tennis">Beach Tennis</option>
                    </select>
                  </div>
                )}

                <div className="flex gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium text-gray-300 bg-zinc-800 hover:bg-zinc-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white bg-[#E10600] hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Salvando...' : 'Confirmar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Modal de Confirmação Final */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-sm p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#E10600]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="text-[#E10600]" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-white">Revisar Agendamento</h3>
              <p className="text-gray-400 text-sm mt-2">Confirme os detalhes abaixo antes de finalizar.</p>
            </div>

            <div className="space-y-4 bg-black/40 rounded-xl p-5 border border-white/5 mb-8">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-xs uppercase tracking-wider font-bold">Quadra</span>
                <span className="text-white font-medium text-sm">{selectedQuadra?.nome}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-xs uppercase tracking-wider font-bold">Data</span>
                <span className="text-white font-medium text-sm">{format(selectedDate, 'dd/MM/yyyy')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-xs uppercase tracking-wider font-bold">Horário</span>
                <span className="text-white font-medium text-sm">{selectedTime} às {parseInt(selectedTime.split(':')[0]) + 1}:00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-xs uppercase tracking-wider font-bold">Pessoas</span>
                <span className="text-white font-medium text-sm">{formData.quantidade_pessoas}</span>
              </div>
              {selectedQuadra?.id.startsWith('volei') && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-xs uppercase tracking-wider font-bold">Esporte</span>
                  <span className="text-white font-medium text-sm">{formData.esporte}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleConfirmReservation}
                disabled={loading}
                className="w-full py-4 rounded-xl bg-[#E10600] hover:bg-red-700 text-white font-bold transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
              >
                {loading ? 'Processando...' : 'Confirmar Agendamento'}
              </button>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-zinc-800 text-gray-400 hover:text-white transition-all font-medium"
              >
                Voltar e Editar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
