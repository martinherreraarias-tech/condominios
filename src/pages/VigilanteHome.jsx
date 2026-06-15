import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function VigilanteHome() {
  const { profile, memberships, signOut } = useAuth()
  const navigate = useNavigate()
  const condominioId = memberships[0]?.condominio_id
  const [code, setCode] = useState('')
  const [scanning, setScanning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [avisos, setAvisos] = useState([])

  useEffect(() => {
    if (!condominioId) return
    const nowIso = new Date().toISOString()
    supabase.from('avisos').select('id, titulo, cuerpo, audiencia, created_at, expira_at')
      .or(`expira_at.is.null,expira_at.gt.${nowIso}`)
      .order('created_at', { ascending: false }).limit(8)
      .then(({ data }) => setAvisos(data ?? []))
  }, [condominioId])

  async function validar(raw) {
    const token = (raw || '').trim().toUpperCase()
    if (!token || !condominioId) return
    setBusy(true); setResult(null)

    const { data: v } = await supabase.from('visitas').select('*')
      .eq('condominio_id', condominioId).eq('qr_token', token).maybeSingle()

    if (!v) { setBusy(false); setResult({ ok: false, msg: 'Código no válido.' }); return }
    const now = new Date()
    if (v.valido_desde && new Date(v.valido_desde) > now) { setBusy(false); setResult({ ok: false, msg: 'El pase aún no es válido.' }); return }
    if (v.valido_hasta && new Date(v.valido_hasta) < now) { setBusy(false); setResult({ ok: false, msg: 'El pase está vencido.' }); return }
    if (v.estado === 'cancelada') { setBusy(false); setResult({ ok: false, msg: 'El pase fue cancelado.' }); return }

    const action = v.estado === 'dentro' ? 'salida' : 'entrada'
    const newEstado = action === 'entrada' ? 'dentro' : 'salio'

    await supabase.from('eventos_acceso').insert({
      condominio_id: condominioId, visita_id: v.id, tipo: action, vigilante_id: profile?.id,
    })
    await supabase.from('visitas').update({ estado: newEstado }).eq('id', v.id)

    let unidad = null, host = null
    if (v.unidad_id) {
      const { data } = await supabase.from('unidades').select('identificador').eq('id', v.unidad_id).maybeSingle()
      unidad = data?.identificador
    }
    if (v.anfitrion_id) {
      const { data } = await supabase.from('profiles').select('nombre, email').eq('id', v.anfitrion_id).maybeSingle()
      host = data
    }
    setBusy(false)
    setResult({ ok: true, action, visita: v, unidad, host })
    setCode('')
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="topbar__brand">Condominios</span>
        <span className="badge">Vigilancia</span>
        <div className="topbar__spacer" />
        <span className="topbar__user">{profile?.email}</span>
        <button className="btn btn--ghost" onClick={signOut}>Cerrar sesión</button>
      </header>

      <div className="container" style={{ maxWidth: 520 }}>
        <div className="page-head">
          <div>
            <h1 className="page-title">Control de acceso</h1>
            <p className="page-sub">Escanea el QR del visitante o teclea su código.</p>
          </div>
          <button className="btn btn--ghost" onClick={() => navigate('/paqueteria')}>Paquetería →</button>
        </div>

        {result && (
          <div className={result.ok ? 'result-ok' : 'result-bad'}>
            {result.ok ? (
              <>
                <h3>{result.action === 'entrada' ? '✓ Entrada registrada' : '✓ Salida registrada'}</h3>
                <div><strong>{result.visita.nombre_visitante}</strong> ({result.visita.tipo})</div>
                <div>Unidad: {result.unidad || '—'} · Anfitrión: {result.host?.nombre || result.host?.email || '—'}</div>
              </>
            ) : (
              <h3>✕ {result.msg}</h3>
            )}
          </div>
        )}

        <section className="panel" style={{ padding: 18 }}>
          <div className="field">
            <label>Código del pase</label>
            <input className="input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ej. K7M2Q9PX3R" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn--primary" onClick={() => validar(code)} disabled={busy || !code}>
              {busy ? 'Validando…' : 'Validar'}
            </button>
            <button className="btn btn--ghost" onClick={() => setScanning((s) => !s)}>
              {scanning ? 'Cerrar cámara' : 'Escanear con cámara'}
            </button>
          </div>
        </section>

        {scanning && (
          <section className="panel" style={{ padding: 14 }}>
            <Scanner onResult={(text) => { setScanning(false); validar(text) }} />
          </section>
        )}

        {avisos.length > 0 && (
          <section className="panel">
            <div className="panel__head"><span className="panel__title">Avisos</span></div>
            {avisos.map((a) => (
              <div className="aviso" key={a.id}>
                <div className="aviso__head">
                  <span className="aviso__title">{a.titulo}</span>
                  <span className={`pill ${a.audiencia === 'vigilancia' ? 'pill--accent' : 'pill--brand'}`}>
                    {a.audiencia === 'vigilancia' ? 'Vigilancia' : 'Comunidad'}
                  </span>
                  <span className="aviso__date">{new Date(a.created_at).toLocaleDateString('es-MX')}</span>
                </div>
                <div className="aviso__body">{a.cuerpo}</div>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  )
}

function Scanner({ onResult }) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: 220 }, false)
    let done = false
    scanner.render(
      (text) => { if (!done) { done = true; scanner.clear().catch(() => {}); onResult(text) } },
      () => {}
    )
    return () => { scanner.clear().catch(() => {}) }
  }, [])
  return <div id="reader" style={{ width: '100%' }} />
}
