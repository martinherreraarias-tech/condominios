import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const fmt = (t) => new Date(t).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function Paqueteria() {
  const { profile, memberships, signOut } = useAuth()
  const navigate = useNavigate()
  const condominioId = memberships[0]?.condominio_id
  const [unidades, setUnidades] = useState([])
  const [enCaseta, setEnCaseta] = useState([])
  const [entregados, setEntregados] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  async function load() {
    setLoading(true)
    const { data: un } = await supabase.from('unidades').select('id, identificador')
      .eq('condominio_id', condominioId).order('identificador')
    const { data: pk } = await supabase.from('paquetes')
      .select('id, descripcion, paqueteria, estado, entregado_a, recibido_at, entregado_at, unidades(identificador)')
      .eq('condominio_id', condominioId).order('recibido_at', { ascending: false })
    setUnidades(un ?? [])
    setEnCaseta((pk ?? []).filter((p) => p.estado === 'en_caseta'))
    setEntregados((pk ?? []).filter((p) => p.estado === 'entregado').slice(0, 10))
    setLoading(false)
  }
  useEffect(() => { if (condominioId) load() }, [condominioId])

  async function entregar(p) {
    const quien = window.prompt('¿Quién recogió el paquete? (opcional)')
    if (quien === null) return
    await supabase.from('paquetes').update({
      estado: 'entregado', entregado_a: quien.trim() || null, entregado_at: new Date().toISOString(),
    }).eq('id', p.id)
    load()
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

      <div className="container" style={{ maxWidth: 620 }}>
        <button className="back-link" onClick={() => navigate('/')}>← Volver a control de acceso</button>
        <div className="page-head">
          <div>
            <h1 className="page-title">Paquetería</h1>
            <p className="page-sub">Registra los paquetes que llegan a caseta.</p>
          </div>
          <button className="btn btn--primary" onClick={() => setShowNew(true)}>+ Registrar paquete</button>
        </div>

        <section className="panel">
          <div className="panel__head"><span className="panel__title">En caseta</span></div>
          {loading ? <div className="panel-empty">Cargando…</div>
            : enCaseta.length === 0 ? <div className="panel-empty">No hay paquetes pendientes.</div>
            : enCaseta.map((p) => (
              <div className="list-item" key={p.id}>
                <div className="list-item__main">
                  <div className="list-item__name">{p.unidades?.identificador} · {p.descripcion}</div>
                  <div className="list-item__sub">{p.paqueteria ? p.paqueteria + ' · ' : ''}recibido {fmt(p.recibido_at)}</div>
                </div>
                <button className="btn btn--ghost" onClick={() => entregar(p)}>Entregar</button>
              </div>
            ))}
        </section>

        {entregados.length > 0 && (
          <section className="panel">
            <div className="panel__head"><span className="panel__title">Entregados recientemente</span></div>
            {entregados.map((p) => (
              <div className="list-item" key={p.id}>
                <div className="list-item__main">
                  <div className="list-item__name">{p.unidades?.identificador} · {p.descripcion}</div>
                  <div className="list-item__sub">Entregado {p.entregado_at ? fmt(p.entregado_at) : ''}{p.entregado_a ? ' a ' + p.entregado_a : ''}</div>
                </div>
                <span className="pill pill--ok">Entregado</span>
              </div>
            ))}
          </section>
        )}
      </div>

      {showNew && (
        <NewPaqueteModal condominioId={condominioId} recibidoPor={profile?.id} unidades={unidades}
          onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load() }} />
      )}
    </div>
  )
}

function NewPaqueteModal({ condominioId, recibidoPor, unidades, onClose, onCreated }) {
  const [unidadId, setUnidadId] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [paqueteria, setPaqueteria] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!unidadId) { setError('Elige la unidad destino.'); return }
    setBusy(true); setError('')
    const { error } = await supabase.from('paquetes').insert({
      condominio_id: condominioId, unidad_id: unidadId, descripcion: descripcion.trim(),
      paqueteria: paqueteria.trim() || null, recibido_por: recibidoPor || null, estado: 'en_caseta',
    })
    setBusy(false)
    if (error) { setError(error.message); return }
    // Notificar por correo al residente (no bloquea la UI)
    supabase.functions.invoke('enviar-correo', {
      body: {
        unidad_id: unidadId,
        asunto: 'Tienes un paquete en caseta',
        mensaje: 'Llegó un paquete a tu nombre y está en caseta: ' + (descripcion.trim() || 'paquete') + '. Pásalo a recoger cuando puedas.',
      },
    }).catch(() => {})
    onCreated()
  }

  return (
    <Modal onClose={onClose}>
      <h2>Registrar paquete</h2>
      <p className="sub">Anota el paquete que acaba de llegar.</p>
      <form onSubmit={submit}>
        <div className="field"><label>Unidad destino</label>
          <select className="input" value={unidadId} onChange={(e) => setUnidadId(e.target.value)} required>
            <option value="">Elige la unidad…</option>
            {unidades.map((u) => <option key={u.id} value={u.id}>{u.identificador}</option>)}
          </select></div>
        <div className="field"><label>Descripción</label>
          <input className="input" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej. Caja mediana / sobre" required /></div>
        <div className="field"><label>Paquetería (opcional)</label>
          <input className="input" value={paqueteria} onChange={(e) => setPaqueteria(e.target.value)} placeholder="Ej. DHL, Amazon, Mercado Libre" /></div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Registrando…' : 'Registrar'}</button>
        </div>
      </form>
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
