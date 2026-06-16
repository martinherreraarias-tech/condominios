-- =====================================================================
--  GESTIÓN DE RESIDENTES (editar / quitar)
--  - Editar la UNIDAD de un residente: ya permitido (RLS de membresias).
--  - Quitar a un residente del condominio: ya permitido (RLS de membresias).
--  - Editar el NOMBRE de un residente: requiere esta función segura, para
--    que admin/super solo puedan cambiar el nombre y NADA más del perfil.
--  Pegar en el SQL Editor de Supabase y ejecutar.
-- =====================================================================

create or replace function public.editar_residente(p_user_id uuid, p_nombre text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Autorización: super admin, o admin de algún condominio del residente.
  if not (
    public.es_super_admin() or exists (
      select 1 from public.membresias m
      where m.user_id = p_user_id
        and public.tiene_rol_en(m.condominio_id, array['admin'])
    )
  ) then
    raise exception 'No autorizado para editar a este residente';
  end if;

  update public.profiles set nombre = p_nombre where id = p_user_id;
end;
$$;

revoke all on function public.editar_residente(uuid, text) from public;
grant execute on function public.editar_residente(uuid, text) to authenticated;
