-- =====================================================================
--  AVISO DE PRIVACIDAD — registro de aceptación (consentimiento)
--  Guarda cuándo cada usuario aceptó el aviso de privacidad.
--  Pegar en el SQL Editor de Supabase y ejecutar.
-- =====================================================================
alter table public.profiles
  add column if not exists aviso_aceptado_at timestamptz;
