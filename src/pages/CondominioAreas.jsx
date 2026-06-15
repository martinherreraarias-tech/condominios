import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const fmtFecha = (f) => new Date(f + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
const hhmm = (t) => (t || '').slice(0, 5)

export default function CondominioAreas() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const [cond, setCond] = useState(null)
  const [areas, setAreas] = useState([])
  const [reservas, setReservas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  async function load() {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    const { data: c } = await supabase.from('condominios').select('id, nombre').eq('id', id).maybeSingle()
    const { data: ar } = await supabase.from('areas_comunes').select('*').eq('condominio_id', id).order('nombre')
    const { data: re } = await supabase.from('reservas')
      .select('id, fecha, hora_inicio, hora_fin, areas_comunes(nombre), unidades(identificador)')
      .eq('condominio_id', id).eq('estado', 'confirmada').gte('fecha', today)
      .order('fecha').order('hora_inicio')
    setCond(c); setAreas(ar ?? []); setReservas(re ?? []); setLoading(false)
  }
  useEffect(() => { load() }, [id])

  async function toggleActiva(area) {
    await supabase.from('areas_comunes').update({ activa: !area.activa }).eq('id', area.id)
    load()
  }
  async function borrarArea(area) {
    if (!window.confirm(`¿Borrar el área "${area.nombre}"? Se eliminarán también sus reservas.`)) return
    const { error } = await supabase.from('areas_comunes').delete().eq('id', area.id)
    if (error) alert('No se pudo borrar: ' + error.message); else load()
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="topbar__brand">Condominios</span>
        <div className="topbar__spacer" />
        <span className="topbar__user">{profile?.email}</span>
        <button className="btn btn--ghost" onClick={signOut}>Cerrar sesión</button>
      </header>

      <div className="container">
        <button className="back-link" onClick={() => navigate(`/condominio/${id}`)}>← Volver al condominio</button>
        <div className="page-head">
          <div>
            <h1 className="page-title">Áreas comunes</h1>
            <p className="page-sub">{cond?.nombre}</p>
          </div>
          <button className="btn btn--primary" onClick={() => setShowNew(true)}>+ Nueva área</button>
        </div>

        <section className="panel">
          <div className="panel__head"><span className="panel__title">Áreas</span></div>
          {loading ? <div className="panel-empty">Cargando…</div>
            : areas.length === 0 ? <div className="panel-empty">Aún no hay áreas. Crea la primera.</div>
            : areas.map((a) => (
              <div className="list-item" key={a.id}>
                <div className="list-item__main">
                  <div className="list-item__name">{a.nombre}</div>
                  <div className="list-item__sub">
                    {a.descripcion || 'Sin descripción'}{a.capacidad ? ` · cap. ${a.capacidad}` : ''}
                  </div>
                </div>
                <span className={`pill ${a.activa ? 'pill--ok' : 'pill--danger'}`}>{a.activa ? 'Activa' : 'Inactiva'}</span>
                <button className="link-btn" onClick={() => toggleActiva(a)}>{a.activa ? 'Desactivar' : 'Activar'}</button>
                <button className="link-btn link-btn--danger" onClick={() => borrarArea(a)}>Borrar</button>
              </div>
            ))}
        </section>

        <section className="panel">
          <div className="panel__head"><span className="panel__title">Próximas reservas</span></div>
          {reservas.length === 0 ? <div className="panel-empty">No hay reservas próximas.</div>
            : reservas.map((r) => (
              <div className="list-item" key={r.id}>
                <div className="list-item__main">
                  <div className="list-item__name">{r.areas_comunes?.nombre}</div>
                  <div className="list-item__sub">{fmtFecha(r.fecha)} · {hhmm(r.hora_inicio)}–{hhmm(r.hora_fin)}</div>
                </div>
                <span className="pill pill--brand">{r.unidades?.identificador || 'Unidad'}</span>
              </div>
            ))}
        </section>
      </div>

      {showNew && (
        <NewAreaModal condominioId={id} onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load() }} />
      )}
    </div>
  )
}

function NewAreaModal({ condominioId, onClose, onCreated }) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [capacidad, setCapacidad] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await supabase.from('areas_comunes').insert({
      condominio_id: condominioId, nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      capacidad: capacidad ? parseInt(capacidad, 10) : null,
    })
    setBusy(false)
    if (error) setError(error.message); else onCreated()
  }

  return (
    <Modal onClose={onClose}>
      <h2>Nueva área</h2>
      <p className="sub">Da de alta un espacio reservable.</p>
      <form onSubmit={submit}>
        <div className="field"><label>Nombre</label>
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Salón de eventos" required /></div>
        <div className="field"><label>Descripción (opcional)</label>
          <input className="input" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej. Incluye cocina y mobiliario" /></div>
        <div className="field"><label>Capacidad (opcional)</label>
          <input className="input" type="number" min="1" value={capacidad} onChange={(e) => setCapacidad(e.target.value)} placeholder="Ej. 50" /></div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Creando…' : 'Crear área'}</button>
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
