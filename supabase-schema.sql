-- Tabela de Reservas
CREATE TABLE reservas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome_usuario TEXT NOT NULL,
  telefone TEXT NOT NULL,
  quadra_id TEXT NOT NULL,
  quadra_nome TEXT NOT NULL,
  data_reserva DATE NOT NULL,
  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,
  quantidade_pessoas INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (quadra_id, data_reserva, horario_inicio)
);

-- Tabela de Configuração da Logo
CREATE TABLE logo_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  logo_url TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Banners da Home
CREATE TABLE banners_home (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  imagem_url TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Notificações (Bloqueios de Data)
CREATE TABLE notificacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  imagem_url TEXT,
  data_notificacao DATE NOT NULL,
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Configurações Gerais
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Tabela de Telefones Bloqueados
CREATE TABLE blocked_phones (
  telefone TEXT PRIMARY KEY,
  motivo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Líderes
CREATE TABLE lideres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configuração do Storage
-- Criar o bucket 'imagens_app'
INSERT INTO storage.buckets (id, name, public) VALUES ('imagens_app', 'imagens_app', true);

-- Políticas de Segurança (RLS) para o Storage (Permitir leitura pública e escrita autenticada)
CREATE POLICY "Imagens publicamente acessíveis" ON storage.objects FOR SELECT USING (bucket_id = 'imagens_app');
CREATE POLICY "Upload de imagens para usuários autenticados" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'imagens_app' AND auth.role() = 'authenticated');
CREATE POLICY "Atualização de imagens para usuários autenticados" ON storage.objects FOR UPDATE USING (bucket_id = 'imagens_app' AND auth.role() = 'authenticated');
CREATE POLICY "Exclusão de imagens para usuários autenticados" ON storage.objects FOR DELETE USING (bucket_id = 'imagens_app' AND auth.role() = 'authenticated');

-- Habilitar RLS nas tabelas (Opcional, mas recomendado)
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE logo_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners_home ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE lideres ENABLE ROW LEVEL SECURITY;

-- Adicionar coluna status caso a tabela já exista
ALTER TABLE notificacoes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';

-- Políticas de Segurança (RLS) para as tabelas
-- Reservas: Leitura e criação pública (para permitir agendamentos), atualização/exclusão apenas admin
CREATE POLICY "Leitura pública de reservas" ON reservas FOR SELECT USING (true);
CREATE POLICY "Criação pública de reservas" ON reservas FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualização de reservas por admin" ON reservas FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Exclusão pública de reservas" ON reservas FOR DELETE USING (true);

-- Logo: Leitura pública, escrita admin
CREATE POLICY "Leitura pública da logo" ON logo_config FOR SELECT USING (true);
CREATE POLICY "Escrita da logo por admin" ON logo_config FOR ALL USING (auth.role() = 'authenticated');

-- Banners: Leitura pública, escrita admin
CREATE POLICY "Leitura pública de banners" ON banners_home FOR SELECT USING (true);
CREATE POLICY "Escrita de banners por admin" ON banners_home FOR ALL USING (auth.role() = 'authenticated');

-- Notificações: Leitura pública, escrita admin
CREATE POLICY "Leitura pública de notificações" ON notificacoes FOR SELECT USING (true);
CREATE POLICY "Escrita de notificações por admin" ON notificacoes FOR ALL USING (auth.role() = 'authenticated');

-- Settings: Leitura pública, escrita admin
CREATE POLICY "Leitura pública de settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Escrita de settings por admin" ON settings FOR ALL USING (auth.role() = 'authenticated');

-- Blocked Phones: Leitura pública, escrita admin
CREATE POLICY "Leitura pública de blocked_phones" ON blocked_phones FOR SELECT USING (true);
CREATE POLICY "Escrita de blocked_phones por admin" ON blocked_phones FOR ALL USING (auth.role() = 'authenticated');

-- Lideres: Leitura pública, escrita admin
CREATE POLICY "Leitura pública de lideres" ON lideres FOR SELECT USING (true);
CREATE POLICY "Escrita de lideres por admin" ON lideres FOR ALL USING (auth.role() = 'authenticated');
