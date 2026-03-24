import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, MapPin, Trash2, LogOut, User, AlertTriangle } from 'lucide-react';

export default function MinhaConta() {
  const [phone, setPhone] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cancelLoading, setCancelLoading] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError('Por favor, informe seu número de telefone.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Clean phone number for comparison to match how it might be stored
      const cleanPhone = phone.replace(/\D/g, '');

      const { data, error: fetchError } = await supabase
        .from('reservas')
        .select('*')
        .or(`telefone.eq."${phone}",telefone.eq."${cleanPhone}"`)
        .order('data_reserva', { ascending: false })
        .order('horario_inicio', { ascending: false });

      if (fetchError) throw fetchError;

      setReservations(data || []);
      setIsLoggedIn(true);
    } catch (err) {
      console.error('Erro ao buscar reservas:', err);
      setError('Ocorreu um erro ao buscar suas reservas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setPhone('');
    setReservations([]);
    setError('');
  };

  const confirmCancelReservation = async () => {
    if (!showConfirmModal) return;
    
    const id = showConfirmModal;
    setCancelLoading(id);
    try {
      const { error: deleteError } = await supabase
        .from('reservas')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setReservations(reservations.filter(r => r.id !== id));
      setShowConfirmModal(null);
    } catch (err) {
      console.error('Erro ao cancelar reserva:', err);
      setError('Ocorreu um erro ao cancelar o agendamento. Tente novamente.');
      setShowConfirmModal(null);
    } finally {
      setCancelLoading(null);
    }
  };

  const isFutureReservation = (dateStr: string, timeStr: string) => {
    const reservationDateTime = parseISO(`${dateStr}T${timeStr}`);
    return isAfter(reservationDateTime, new Date());
  };

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto px-4 py-20">
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="w-16 h-16 bg-[#E10600]/10 rounded-full flex items-center justify-center mb-6 mx-auto">
            <User className="text-[#E10600]" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">Minha Conta</h2>
          <p className="text-gray-400 text-center mb-8 text-sm">
            Informe o número de telefone usado no agendamento para visualizar ou cancelar suas reservas.
          </p>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
                <AlertTriangle size={16} className="shrink-0" />
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Telefone (WhatsApp)</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#E10600] transition-colors"
                placeholder="(00) 00000-0000"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E10600] hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Buscando...' : 'Acessar Minhas Reservas'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const upcomingReservations = reservations.filter(r => isFutureReservation(r.data_reserva, r.horario_inicio));
  const pastReservations = reservations.filter(r => !isFutureReservation(r.data_reserva, r.horario_inicio));

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Minhas Reservas</h1>
          <p className="text-gray-400">
            Gerenciando reservas para o telefone: <span className="text-white font-medium">{phone}</span>
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors w-fit"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Calendar className="text-[#E10600]" size={20} />
            Próximos Agendamentos
          </h2>
          
          {upcomingReservations.length === 0 ? (
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-8 text-center">
              <p className="text-gray-400">Nenhum agendamento futuro encontrado.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {upcomingReservations.map((reserva) => (
                <div key={reserva.id} className="bg-zinc-900 border border-white/10 rounded-2xl p-5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-2 h-full bg-[#E10600]"></div>
                  
                  <div className="mb-4">
                    <h3 className="font-bold text-lg">{reserva.quadra_nome}</h3>
                    <p className="text-sm text-gray-400">{reserva.nome_usuario}</p>
                  </div>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Calendar size={16} className="text-gray-500" />
                      {format(new Date(reserva.data_reserva + 'T00:00:00'), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Clock size={16} className="text-gray-500" />
                      {reserva.horario_inicio.substring(0, 5)} - {reserva.horario_fim.substring(0, 5)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <User size={16} className="text-gray-500" />
                      {reserva.quantidade_pessoas} pessoas
                    </div>
                  </div>

                  <button
                    onClick={() => setShowConfirmModal(reserva.id)}
                    disabled={cancelLoading === reserva.id}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cancelLoading === reserva.id ? (
                      'Cancelando...'
                    ) : (
                      <>
                        <Trash2 size={16} />
                        Cancelar Agendamento
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {pastReservations.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4 text-gray-400 flex items-center gap-2">
              <Clock size={20} />
              Histórico
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pastReservations.map((reserva) => (
                <div key={reserva.id} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 opacity-70">
                  <h3 className="font-bold text-gray-300 mb-2">{reserva.quadra_nome}</h3>
                  <div className="space-y-1">
                    <div className="text-sm text-gray-400">
                      {format(new Date(reserva.data_reserva + 'T00:00:00'), "dd/MM/yyyy")}
                    </div>
                    <div className="text-sm text-gray-400">
                      {reserva.horario_inicio.substring(0, 5)} - {reserva.horario_fim.substring(0, 5)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 mx-auto">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-center mb-2">Cancelar Agendamento?</h3>
            <p className="text-gray-400 text-center mb-8">
              Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={confirmCancelReservation}
                className="w-full px-6 py-3 rounded-xl bg-[#E10600] text-white font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
              >
                Sim, Cancelar
              </button>
              <button
                onClick={() => setShowConfirmModal(null)}
                className="w-full px-6 py-3 rounded-xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-colors"
              >
                Não, Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
