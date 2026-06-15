import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function CondominioNotificaciones() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const [cond, setCond] = useState(null)
  const [canal, setCanal] = useState('correo')
  const [remitente, setRemitente] = useState('')
  const [waSid, setWaSid] = useState('')
  const [waToken, setWaToken] = useState('')
  const [waFrom, setWaFrom] = useState('')
  const [activo, setActivo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const { data: c } = await supabase.from('condominios').select('id, nombre').eq('id', id).maybeSingle()
    const { data: cfg } = await supabase.from('notificacion_config').select('*').eq('condominio_id', id).maybeSingle()
    setCond(c)
    if (cfg) {
      setCanal(cfg.canal || 'correo'); setRemitente(cfg.remitente_nombre || '')
      setWaSid(cfg.wa_account_sid || ''); setWaToken(cfg.wa_auth_token || '')
      setWaFrom(cfg.wa_from || ''); setActivo(!!cfg.activo)
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  async function guardar(e) {
    e.preventDefault()
    setBusy(true); setOk(''); setError('')
    const { error } = await supabase.from('notificacion_config').upsert({
      condominio_id: id, canal, remitente_nombre: remitente.trim() || null,
      wa_account_sid: waSid.trim() || null, wa_auth_token: waToken.trim() || null,
      wa_from: waFrom.trim() || null, activo, updated_at: new Date().toISOString(),
    }, { onConflict: 'condominio_id' })
    setBusy(false)
    if (error) setError(error.message); else setOk('Configuración guardada.')
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="topbar__brand">Condominios</span>
        <div className="topbar__spacer" />
        <span className="topbar__user">{profile?.email}</span>
        <button className="btn btn--ghost" onClick={signOut}>Cerrar sesión</button>
      </header>

      <div className="container" style={{ maxWidth: 640 }}>
        <button className="back-link" onClick={() => navigate(`/condominio/${id}`)}>← Volver al condominio</button>
        <div className="page-head">
          <div>
            <h1 className="page-title">Notificaciones</h1>
            <p className="page-sub">{cond?.nombre}</p>
          </div>
        </div>

        {loading ? <p className="muted">Cargando…</p> : (
          <form onSubmit={guardar}>
            <section className="panel" style={{ padding: 18 }}>
              <div className="field"><label>Canal de notificación</label>
                <select className="input" value={canal} onChange={(e) => setCanal(e.target.value)}>
                  <option value="correo">Correo electrónico</option>
                  <option value="whatsapp">WhatsApp</option>
                </select></div>
              <div className="field"><label>Nombre del remitente (firma)</label>
                <input className="input" value={remitente} onChange={(e) => setRemitente(e.target.value)} placeholder="Ej. Administración Las Fortalezas" /></div>

              {canal === 'whatsapp' && (
                <div style={{ borderTop: '1px solid var(--line)', marginTop: 6, paddingTop: 14 }}>
                  <div className="reglas-info" style={{ marginBottom: 14 }}>
                    Para WhatsApp necesitas tu propia cuenta de <strong>Twilio</strong> con un remitente de WhatsApp aprobado.
                    Aquí pones tus credenciales; los mensajes se cobran por tu cuenta.
                  </div>
                  <div className="field"><label>Twilio Account SID</label>
                    <input className="input" value={waSid} onChange={(e) => setWaSid(e.target.value)} placeholder="AC..." /></div>
                  <div className="field"><label>Twilio Auth Token</label>
                    <input className="input" type="password" value={waToken} onChange={(e) => setWaToken(e.target.value)} placeholder="••••••••" /></div>
                  <div className="field"><label>Número remitente de WhatsApp</label>
                    <input className="input" value={waFrom} onChange={(e) => setWaFrom(e.target.value)} placeholder="whatsapp:+52..." /></div>
                </div>
              )}

              <label className="check-row">
                <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
                <span>Activar el envío de notificaciones por este canal</span>
              </label>

              {ok && <p style={{ color: 'var(--brand-700)', fontSize: 14 }}>{ok}</p>}
              {error && <p className="form-error">{error}</p>}
              <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar configuración'}</button>
            </section>
          </form>
        )}

        <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
          El envío real de correos se activa cuando se configure el proveedor de correo (SendGrid/SMTP).
          WhatsApp queda listo en cuanto pongas tus credenciales de Twilio y lo actives.
        </p>
      </div>
    </div>
  )
}
