import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface DataContextType {
  reservas: any[];
  setReservas: React.Dispatch<React.SetStateAction<any[]>>;
  settings: any;
  setSettings: React.Dispatch<React.SetStateAction<any>>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reservas, setReservas] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ logo_url: '', banners: [] });

  const fetchSettings = async () => {
    try {
      // Fetch logo - try settings table first, then logo_config as fallback
      const { data: logoSetting, error: logoSettingError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'logo_url')
        .maybeSingle();

      let logoUrl = logoSetting?.value || '';

      if (!logoUrl) {
        const { data: logoData, error: logoError } = await supabase
          .from('logo_config')
          .select('logo_url')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (logoData) {
          logoUrl = logoData.logo_url;
        }
      }

      // Fetch banners
      const { data: bannersData, error: bannersError } = await supabase
        .from('banners_home')
        .select('*')
        .order('ordem', { ascending: true });

      if (bannersError) {
        console.error('Erro ao buscar banners:', bannersError);
      }

      // Fetch general settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*');

      if (settingsError) {
        console.error('Erro ao buscar configurações:', settingsError);
      }

      const adminName = settingsData?.find(s => s.key === 'admin_name')?.value || '';
      const adminPhone = settingsData?.find(s => s.key === 'admin_phone')?.value || '';

      setSettings({
        logo_url: logoUrl,
        banners: bannersData || [],
        admin_name: adminName,
        admin_phone: adminPhone
      });
    } catch (e) {
      console.error('Failed to fetch settings', e);
    }
  };

  useEffect(() => {
    fetchSettings();

    // Real-time subscriptions
    const reservasSubscription = supabase
      .channel('public:reservas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, payload => {
        if (payload.eventType === 'INSERT') {
          setReservas(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'DELETE') {
          setReservas(prev => prev.filter(r => r.id !== payload.old.id));
        }
      })
      .subscribe();

    const logoSubscription = supabase
      .channel('public:logo_config')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'logo_config' }, payload => {
        fetchSettings();
      })
      .subscribe();

    const bannersSubscription = supabase
      .channel('public:banners_home')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banners_home' }, payload => {
        fetchSettings();
      })
      .subscribe();

    const settingsSubscription = supabase
      .channel('public:settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, payload => {
        fetchSettings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(reservasSubscription);
      supabase.removeChannel(logoSubscription);
      supabase.removeChannel(bannersSubscription);
      supabase.removeChannel(settingsSubscription);
    };
  }, []);

  return (
    <DataContext.Provider value={{ reservas, setReservas, settings, setSettings }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
