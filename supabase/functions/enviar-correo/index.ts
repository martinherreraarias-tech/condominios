// Edge Function: enviar-correo
// Envía notificaciones por correo vía la API de SendGrid, respetando el opt-in
// (profiles.notif_correo) de cada destinatario. Resuelve los destinatarios del
// lado servidor para no exponer correos en el navegador.
//
// REQUISITO: agregar el secreto SENDGRID_API_KEY a la función.
//   Supabase Dashboard -> Edge Functions -> reset/secrets, o por CLI:
//   supabase secrets set SENDGRID_API_KEY=tu_api_key
//
// Cuerpo aceptado (JSON):
//   { asunto, mensaje, user_ids?: string[], unidad_id?: string, condominio_id?: string }
//   - user_ids:     destinatarios explícitos
//   - unidad_id:    residentes activos de esa unidad
//   - condominio_id: residentes activos del condominio (para avisos a comunidad)
import { createClient } from 'npm:@supabase/supabase-js@2'

const REMITENTE = 'notificaciones@alertandonfortalezas.com.mx'
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
    if (!sgKey) return json(500, { error: 'Falta SENDGRID_API_KEY en los secretos de la función.' })
    const admin = createClient(url, serviceKey)

    // Solo usuarios autenticados pueden disparar notificaciones
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: { user: caller } } = await admin.auth.getUser(token)
    if (!caller) return json(401, { error: 'No autenticado.' })

    const { asunto, mensaje, user_ids, unidad_id, condominio_id } = await req.json()
    if (!asunto || !mensaje) return json(400, { error: 'Falta asunto o mensaje.' })

    // Resolver IDs de destinatarios
    let ids: string[] = Array.isArray(user_ids) ? user_ids : []
    if (ids.length === 0 && unidad_id) {
      const { data } = await admin.from('membresias').select('user_id')
        .eq('unidad_id', unidad_id).eq('rol', 'residente').eq('estado', 'activo')
      ids = (data ?? []).map((m: { user_id: string }) => m.user_id)
    }
    if (ids.length === 0 && condominio_id) {
      const { data } = await admin.from('membresias').select('user_id')
        .eq('condominio_id', condominio_id).eq('rol', 'residente').eq('estado', 'activo')
      ids = (data ?? []).map((m: { user_id: string }) => m.user_id)
    }
    ids = [...new Set(ids)]
    if (ids.length === 0) return json(200, { enviados: 0, motivo: 'sin destinatarios' })

    // Filtrar por opt-in y obtener correos
    const { data: perfiles } = await admin.from('profiles')
      .select('email, notif_correo').in('id', ids)
    const correos = (perfiles ?? [])
      .filter((p: { email: string | null; notif_correo: boolean }) => p.notif_correo && p.email)
      .map((p: { email: string }) => p.email)
    if (correos.length === 0) return json(200, { enviados: 0, motivo: 'nadie con opt-in' })

    // Enviar por SendGrid (cada quien recibe su propio correo)
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
    if (!resp.ok) {
      const detalle = await resp.text()
      return json(502, { error: 'SendGrid rechazó el envío.', detalle })
    }
    return json(200, { enviados: correos.length })
  } catch (e) {
    return json(500, { error: (e as Error)?.message ?? String(e) })
  }
})
