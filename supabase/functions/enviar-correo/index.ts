// Edge Function: enviar-correo  (con logs de diagnóstico)
// Envía notificaciones por correo vía SendGrid, respetando el opt-in.
// Requiere el secreto SENDGRID_API_KEY.
import { createClient } from 'npm:@supabase/supabase-js@2'

const REMITENTE = 'fortalezasconsultoria@gmail.com'
const REMITENTE_NOMBRE = 'Administración de Condominios'

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
    const sgKey = Deno.env.get('SENDGRID_API_KEY')
    console.log('SENDGRID_API_KEY presente:', !!sgKey)
    if (!sgKey) return json(500, { error: 'Falta SENDGRID_API_KEY en los secretos de la función.' })
    const admin = createClient(url, serviceKey)

    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: { user: caller } } = await admin.auth.getUser(token)
    if (!caller) { console.log('Sin caller autenticado'); return json(401, { error: 'No autenticado.' }) }

    const body = await req.json()
    const { asunto, mensaje, user_ids, unidad_id, condominio_id } = body
    console.log('payload:', JSON.stringify({ asunto, unidad_id, condominio_id, user_ids_len: (user_ids ?? []).length }))
    if (!asunto || !mensaje) return json(400, { error: 'Falta asunto o mensaje.' })

    let ids: string[] = Array.isArray(user_ids) ? user_ids : []
    if (ids.length === 0 && unidad_id) {
      const { data, error } = await admin.from('membresias').select('user_id')
        .eq('unidad_id', unidad_id).eq('rol', 'residente').eq('estado', 'activo')
      if (error) console.log('error membresias(unidad):', error.message)
      ids = (data ?? []).map((m: { user_id: string }) => m.user_id)
    }
    if (ids.length === 0 && condominio_id) {
      const { data, error } = await admin.from('membresias').select('user_id')
        .eq('condominio_id', condominio_id).eq('rol', 'residente').eq('estado', 'activo')
      if (error) console.log('error membresias(condominio):', error.message)
      ids = (data ?? []).map((m: { user_id: string }) => m.user_id)
    }
    ids = [...new Set(ids)]
    console.log('residentes encontrados:', ids.length)
    if (ids.length === 0) return json(200, { enviados: 0, motivo: 'sin destinatarios' })

    const { data: perfiles, error: perfErr } = await admin.from('profiles')
      .select('email, notif_correo').in('id', ids)
    if (perfErr) console.log('error profiles:', perfErr.message)
    const correos = (perfiles ?? [])
      .filter((p: { email: string | null; notif_correo: boolean }) => p.notif_correo && p.email)
      .map((p: { email: string }) => p.email)
    console.log('con opt-in y correo:', correos.length, JSON.stringify(correos))
    if (correos.length === 0) return json(200, { enviados: 0, motivo: 'nadie con opt-in' })

    const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sgKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: correos.map((email: string) => ({ to: [{ email }] })),
        from: { email: REMITENTE, name: REMITENTE_NOMBRE },
        subject: asunto,
        content: [{ type: 'text/plain', value: mensaje }],
      }),
    })
    console.log('SendGrid status:', resp.status)
    if (!resp.ok) {
      const detalle = await resp.text()
      console.log('SendGrid error:', detalle)
      return json(502, { error: 'SendGrid rechazó el envío.', detalle })
    }
    console.log('enviados OK:', correos.length)
    return json(200, { enviados: correos.length })
  } catch (e) {
    console.log('excepción:', (e as Error)?.message ?? String(e))
    return json(500, { error: (e as Error)?.message ?? String(e) })
  }
})
