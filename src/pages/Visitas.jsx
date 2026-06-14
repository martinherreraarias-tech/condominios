import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

function genToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const a = new Uint32Array(10)
  crypto.getRandomValues(a)
  return Array.from(a, (n) => chars[n % chars.length]).join('')
}

const estadoPill = {
  pendiente: { txt: 'Sin usar', cls: 'pill' },
  dentro: { txt: 'Dentro', cls: 'pill--ok' },
  salio: { txt: 'Salió', cls: 'pill--accent' },
  expirada: { txt: 'Vencida', cls: 'pill--danger' },
  cancelada: { txt: 'Cancelada', cls: 'pill--danger' },
}

export default function Visitas() {
  const { user, memberships, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const m = memberships[0]
  const [visitas, setVisitas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [qrFor, setQrFor] = useState(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('visitas')
      .select('id, nombre_visitante, tipo, qr_token, valido_hasta, estado')
      .eq('anfitrion_id', user.id).order('id', { ascending: false })
    setVisitas(data ?? [])
    setLoading(false)
  }
  useEffect(() => { if (user) load() }, [user])

  return (
    <div className="app">
      <header className="topbar">
        <span className="topbar__brand">Condominios</span>
        <div className="topbar__spacer" />
        <span className="topbar__user">{profile?.email}</span>
        <button className="btn btn--ghost" onClick={signOut}>Cerrar sesión</button>
      </header>

      <div className="container">
        <button className="back-link" onClick={() => navigate('/')}>← Volver</button>
        <div className="page-head">
          <div>
            <h1 className="page-title">Mis visitas</h1>
            <p className="page-sub">Genera un pase con QR para tus invitados o proveedores.</p>
          </div>
          <button className="btn btn--primary" onClick={() => setShowNew(true)} disabled={!m?.unidad_id}>
            + Nueva visita
          </button>
        </div>

        {!m?.unidad_id && (
          <div className="empty"><h3>Sin unidad asignada</h3><p>Pide a tu administrador que te asigne a una unidad para poder generar pases.</p></div>
        )}

        <section className="panel">
          <div className="panel__head"><span className="panel__title">Pases generados</span></div>
          {loading ? (
            <div className="panel-empty">Cargando…</div>
          ) : visitas.length === 0 ? (
            <div className="panel-empty">Aún no has generado pases.</div>
          ) : (
            visitas.map((v) => {
              const ev = estadoPill[v.estado] || estadoPill.pendiente
              return (
                <div className="list-item" key={v.id}>
                  <div className="list-item__main">
                    <div className="list-item__name">{v.nombre_visitante}</div>
                    <div className="list-item__sub">{v.tipo === 'proveedor' ? 'Proveedor' : 'Visita'} · vigencia {new Date(v.valido_hasta).toLocaleString('es-MX')}</div>
                  </div>
                  <span className={`pill ${ev.cls}`}>{ev.txt}</span>
                  <button className="link-btn" onClick={() => setQrFor(v)}>Ver QR</button>
                </div>
              )
            })
          )}
        </section>
      </div>

      {showNew && m?.unidad_id && (
        <NewVisitaModal
          condominioId={m.condominio_id} unidadId={m.unidad_id} anfitrionId={user.id}
          onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load() }}
        />
      )}
      {qrFor && <QrModal visita={qrFor} onClose={() => setQrFor(null)} />}
    </div>
  )
}

function NewVisitaModal({ condominioId, unidadId, anfitrionId, onClose, onCreated }) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('visita')
  const endOfToday = (() => { const d = new Date(); d.setHours(23, 59, 0, 0); const off = d.getTimezoneOffset(); const local = new Date(d.getTime() - off * 60000); return local.toISOString().slice(0, 16) })()
  const [validoHasta, setValidoHasta] = useState(endOfToday)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await supabase.from('visitas').insert({
      condominio_id: condominioId, unidad_id: unidadId, anfitrion_id: anfitrionId,
      nombre_visitante: nombre.trim(), tipo, qr_token: genToken(),
      valido_desde: new Date().toISOString(),
      valido_hasta: new Date(validoHasta).toISOString(), estado: 'pendiente',
    })
    setBusy(false)
    if (error) setError(error.message)
    else onCreated()
  }

  return (
    <Modal onClose={onClose}>
      <h2>Nueva visita</h2>
      <p className="sub">Se generará un QR para mostrar en la caseta.</p>
      <form onSubmit={submit}>
        <div className="field"><label>Nombre del visitante</label>
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Juan Pérez" required /></div>
        <div className="field"><label>Tipo</label>
          <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="visita">Visita</option>
            <option value="proveedor">Proveedor</option>
          </select></div>
        <div className="field"><label>Válido hasta</label>
          <input className="input" type="datetime-local" value={validoHasta} onChange={(e) => setValidoHasta(e.target.value)} required /></div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Generando…' : 'Generar pase'}</button>
        </div>
      </form>
    </Modal>
  )
}

function QrModal({ visita, onClose }) {
  return (
    <Modal onClose={onClose}>
      <h2>Pase de {visita.nombre_visitante}</h2>
      <p className="sub">Muestra este QR en la caseta. También sirve el código.</p>
      <div className="qr-box">
        <QRCodeCanvas value={visita.qr_token} size={200} />
        <div className="qr-code">{visita.qr_token}</div>
      </div>
      <div className="modal__actions">
        <button className="btn btn--primary" onClick={onClose}>Listo</button>
      </div>
    </Modal>
  )
}

function Modal({ children, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  )
}
