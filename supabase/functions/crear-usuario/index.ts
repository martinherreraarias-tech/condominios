// Edge Function: crear-usuario  (FLUJO DE INVITACIÓN)
// Crea la cuenta y le ENVÍA UN CORREO DE INVITACIÓN a la persona, donde ella
// confirma su correo y pone su propia contraseña. Solo lo llama el super admin.
// Requiere que el SMTP (SendGrid) esté configurado en Supabase (ya lo está).
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(url, serviceKey)

    // 1) Identificar a quien llama
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: { user: caller } } = await admin.auth.getUser(token)
    if (!caller) return json(401, { error: 'No autenticado.' })

    // 2) Verificar super admin
    const { data: perfil } = await admin
      .from('profiles').select('is_super_admin').eq('id', caller.id).single()
    if (!perfil?.is_super_admin) return json(403, { error: 'Solo el super administrador puede crear usuarios.' })

    // 3) Datos
    const { email, nombre, redirect_to } = await req.json()
    if (!email) return json(400, { error: 'Falta el correo.' })

    // 4) Invitar (crea el usuario y manda el correo de invitación)
    const { data: creado, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { nombre: nombre ?? '' },
      redirectTo: redirect_to,
    })
    if (invErr) return json(400, { error: invErr.message })

    // El trigger handle_new_user crea el perfil automáticamente.
    return json(200, { user_id: creado.user.id, email, invited: true })
  } catch (e) {
    return json(500, { error: (e as Error)?.message ?? String(e) })
  }
})
