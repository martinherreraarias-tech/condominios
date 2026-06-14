// Edge Function: crear-usuario
// Crea una cuenta de usuario de forma segura (solo lo puede llamar el super admin).
// Despliégala desde el Dashboard de Supabase: Edge Functions -> Deploy a new function.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

function generarPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const arr = new Uint32Array(12)
  crypto.getRandomValues(arr)
  return Array.from(arr, (n) => chars[n % chars.length]).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(url, serviceKey)

    // 1) Identificar a quien llama, por su token
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: { user: caller } } = await admin.auth.getUser(token)
    if (!caller) return json(401, { error: 'No autenticado.' })

    // 2) Verificar que es super admin
    const { data: perfil } = await admin
      .from('profiles').select('is_super_admin').eq('id', caller.id).single()
    if (!perfil?.is_super_admin) {
      return json(403, { error: 'Solo el super administrador puede crear usuarios.' })
    }

    // 3) Leer datos
    const { email, nombre } = await req.json()
    if (!email) return json(400, { error: 'Falta el correo.' })

    // 4) Crear la cuenta (confirmada, para que pueda entrar de inmediato)
    const tempPassword = generarPassword()
    const { data: creado, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { nombre: nombre ?? '' },
    })
    if (createErr) return json(400, { error: createErr.message })

    // El trigger handle_new_user crea el perfil automáticamente.
    return json(200, { user_id: creado.user.id, email, tempPassword })
  } catch (e) {
    return json(500, { error: (e as Error)?.message ?? String(e) })
  }
})
